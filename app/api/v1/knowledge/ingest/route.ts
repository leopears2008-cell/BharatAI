import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ error: "Missing title or content" }, { status: 400 });
    }

    // Generate embedding
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: content,
    });
    const embedding = response.embeddings?.[0]?.values;

    if (!embedding) throw new Error("Failed to generate embedding");

    // Read existing store
    const storePath = path.join(process.cwd(), "app/lib/vectorStore.json");
    let store = [];
    if (fs.existsSync(storePath)) {
      store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    }

    // Append document
    store.push({
      id: `doc_${Date.now()}`,
      title,
      content,
      embedding
    });

    // Write back
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));

    return NextResponse.json({ success: true, message: "Document ingested successfully" });
  } catch (error: any) {
    console.error("Ingestion error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
