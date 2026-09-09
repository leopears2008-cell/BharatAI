import { GoogleGenAI } from "@google/genai";
import { db, Document, Chunk } from "../db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Configuration
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const SIMILARITY_THRESHOLD = 0.65;
const EMBEDDING_MODEL = "text-embedding-004";

/**
 * Calculates the cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Splits text into overlapping chunks
 */
export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    chunks.push(chunk);
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

/**
 * Ingests a new document into the knowledge base
 */
export async function ingestDocument(title: string, content: string, url?: string): Promise<Document> {
  const doc = await db.documents.create(title, content, url);
  const textChunks = chunkText(content);

  for (const text of textChunks) {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });
    
    const embedding = response.embeddings?.[0]?.values;
    if (embedding) {
      await db.chunks.create(doc.id, text, embedding);
    }
  }

  return doc;
}

/**
 * Retrieves the most relevant chunks for a given query.
 */
export async function retrieveContext(query: string, topK: number = 3) {
  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: query,
    });
    const queryEmbedding = response.embeddings?.[0]?.values;
    if (!queryEmbedding) return [];

    const allChunks = await db.chunks.findAll();
    const scoredChunks = allChunks.map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scoredChunks.sort((a, b) => b.score - a.score);
    
    // Filter and resolve document metadata for citations
    const relevantChunks = scoredChunks
      .filter((chunk) => chunk.score > SIMILARITY_THRESHOLD)
      .slice(0, topK);

    const allDocs = await db.documents.findAll();
    
    return relevantChunks.map(chunk => {
      const parentDoc = allDocs.find(d => d.id === chunk.documentId);
      return {
        text: chunk.content,
        score: chunk.score,
        sourceId: parentDoc?.id,
        title: parentDoc?.title || "Unknown Document",
        url: parentDoc?.url
      };
    });
  } catch (error) {
    console.error("Error during RAG retrieval:", error);
    return [];
  }
}
