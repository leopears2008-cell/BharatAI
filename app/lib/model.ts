import { GoogleGenAI } from "@google/genai";

export class ModelConfigError extends Error {}

let client: GoogleGenAI | null = null;

/** Lazily created so a missing key fails the request, not the build/import. */
export function getModelClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ModelConfigError("GEMINI_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/** Single source of truth for the model actually called and reported to users. */
export function getModelName(): string {
  return process.env.MODEL_NAME || "gemini-3.6-flash";
}
