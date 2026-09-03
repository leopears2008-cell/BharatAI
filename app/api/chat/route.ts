import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { retrieveRelevantContext } from "../../lib/rag";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    // Extract the latest user query for RAG retrieval
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    let augmentedContext = "";
    
    if (lastUserMessage && lastUserMessage.parts && lastUserMessage.parts[0].text) {
      const query = lastUserMessage.parts[0].text;
      const relevantDocs = await retrieveRelevantContext(query);
      
      if (relevantDocs.length > 0) {
        augmentedContext = "\n\nRELEVANT KNOWLEDGE BASE DOCUMENTS:\n" + 
          relevantDocs.map(doc => `[${doc.title}]: ${doc.content}`).join("\n\n") +
          "\n\nUse the above documents to inform your response if they are relevant to the user's query.";
      }
    }

    const systemInstruction = `You are BharatAI, an Indian multilingual LLM.
You support Tamil, Hindi, Telugu, Kannada, Malayalam, and English.
You are optimized for Indian education, government services, and local knowledge.
Respond naturally in the language the user speaks to you, or what they request.
Be deeply respectful of Indian culture, providing accurate, culturally relevant, and helpful information.
Keep responses relatively brief and clear, suitable for a chat interface.${augmentedContext}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: messages,
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: [{ googleSearch: {} }] // Enable live search for current government/education updates
      },
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
