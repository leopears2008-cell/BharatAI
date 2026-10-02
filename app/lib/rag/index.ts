import { GoogleGenAI } from "@google/genai";
import { db, Document } from "../db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-004";
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 180;
const SIMILARITY_THRESHOLD = 0.55;

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export function chunkText(text: string) {
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
    chunks.push(text.slice(start, start + CHUNK_SIZE));
    if (start + CHUNK_SIZE >= text.length) break;
  }
  return chunks;
}

export async function ingestDocument(title: string, content: string, url?: string): Promise<Document> {
  const doc = await db.documents.create(title, content, url);
  for (const chunk of chunkText(content)) {
    const response = await ai.models.embedContent({ model: EMBEDDING_MODEL, contents: chunk });
    const embedding = response.embeddings?.[0]?.values;
    if (embedding) await db.chunks.create(doc.id, chunk, embedding);
  }
  return doc;
}

export async function retrieveContext(query: string, topK = 4) {
  try {
    const response = await ai.models.embedContent({ model: EMBEDDING_MODEL, contents: query });
    const queryEmbedding = response.embeddings?.[0]?.values;
    if (!queryEmbedding) return [];

    const allChunks = await db.chunks.findAll();
    const allDocs = await db.documents.findAll();

    return allChunks
      .map(chunk => ({ ...chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
      .filter(chunk => chunk.score >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(chunk => {
        const doc = allDocs.find(d => d.id === chunk.documentId);
        return {
          text: chunk.content,
          score: chunk.score,
          sourceId: doc?.id,
          title: doc?.title || "Unknown document",
          url: doc?.url
        };
      });
  } catch (error) {
    console.error("RAG retrieval error:", error);
    return [];
  }
}
