import { GoogleGenAI } from "@google/genai";
import vectorStore from "./vectorStore.json";

// Initialize Gemini for generating query embeddings
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Calculates the cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
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
 * Retrieves the most relevant documents for a given query.
 * @param query The user's query string
 * @param topK Number of documents to retrieve
 * @returns Array of the most relevant documents
 */
export async function retrieveRelevantContext(query: string, topK: number = 2) {
  try {
    // Generate an embedding for the user's query
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: query,
    });
    const queryEmbedding = response.embeddings?.[0]?.values;

    if (!queryEmbedding) return [];

    // Calculate similarity scores for all documents in the store
    const scoredDocs = vectorStore.map((doc) => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // Sort by descending score and take top K
    scoredDocs.sort((a, b) => b.score - a.score);
    
    // Filter out low relevance matches (score threshold)
    const relevantDocs = scoredDocs.filter((doc) => doc.score > 0.65).slice(0, topK);

    return relevantDocs;
  } catch (error) {
    console.error("Error during RAG retrieval:", error);
    return [];
  }
}
