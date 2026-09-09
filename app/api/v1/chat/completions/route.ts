import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer bl_")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid or missing API key. Hint: use 'Bearer bl_live_...'" } }, { status: 401, headers: corsHeaders });
    }

    const { messages, model, temperature } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Messages array is required" } }, { status: 400, headers: corsHeaders });
    }

    // Convert OpenAI format to Gemini format
    const geminiMessages = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : (m.role === "system" ? "user" : "user"),
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash", // always routing to gemini under the hood for this sandbox
      contents: geminiMessages,
      config: {
        temperature: temperature || 0.7,
      }
    });

    // Return OpenAI compatible format
    return NextResponse.json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model || "tn-llm-7b",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: response.text
          },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error("Chat completions error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500, headers: corsHeaders });
  }
}
