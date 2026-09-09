import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { retrieveRelevantContext } from "../../../lib/rag";

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

    const systemInstruction = `You are TN LLM, an advanced multilingual AI assistant built for Tamil Nadu.
You support Tamil and English natively, as well as other global languages.
You are optimized for Tamil culture, history, government services, literature, and local knowledge.
Respond naturally in the language the user speaks to you, or what they request.
Be deeply respectful of Tamil culture, providing accurate, culturally relevant, and helpful information.
Keep responses relatively brief and clear, suitable for a chat interface.${augmentedContext}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: messages,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Error generating content:", error);
    
    // Check if it's a 429 quota error
    if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please check your Gemini API plan and billing details, or try again later." },
        { status: 429 }
      );
    }
    
    let errMsg = "Failed to generate response";
    try {
      if (error?.message) {
        const parsed = JSON.parse(error.message);
        if (parsed?.error?.message) {
          errMsg = parsed.error.message;
        } else {
          errMsg = error.message;
        }
      }
    } catch(e) {
      errMsg = error?.message || errMsg;
    }
    
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
