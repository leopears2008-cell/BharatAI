import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { retrieveContext } from "../../../lib/rag";
import { toolDeclarations, toolHandlers } from "../../../lib/tools";
import { getSession } from "../../../lib/auth";
import { db } from "../../../lib/db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    // If not authenticated, we could reject, but for demo let's allow anonymous or default to a mock user.
    const userId = session?.userId || "anonymous-123";

    const { messages, conversationId, language = "English" } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    // Identify or create conversation
    let currentConvId = conversationId;
    if (!currentConvId) {
      const conv = await db.conversations.create((userId as string), messages[0]?.content?.slice(0, 50) || "New Chat", language);
      currentConvId = conv.id;
    }

    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    const query = lastUserMessage?.parts?.[0]?.text || lastUserMessage?.content;
    
    // Save user message to DB
    if (query) {
       await db.messages.create(currentConvId, "user", query);
    }

    let augmentedContext = "";
    let citations: any[] = [];
    
    if (query) {
      const relevantDocs = await retrieveContext(query);
      if (relevantDocs.length > 0) {
        citations = relevantDocs;
        augmentedContext = "\n\nKNOWLEDGE BASE CONTEXT:\n" + 
           relevantDocs.map(doc => `[Source: ${doc.title}]: ${doc.text}`).join("\n\n") +
          "\n\nINSTRUCTIONS:\nUse the above context to answer accurately. Cite the source title if used. If the context is insufficient, state that clearly.";
      }
    }

    const systemInstruction = `You are BharatAI, a production-grade, highly secure, and professional multilingual AI assistant built for India.
You support multiple Indian languages (Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, etc.) alongside English.
Always respond in the user's preferred language: ${language}.
Provide accurate, grounded, and culturally respectful answers.
Use available tools if necessary.
${augmentedContext}`;

    // Convert frontend messages to GenAI SDK format
    const formattedMessages = messages.map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: m.parts || [{ text: m.content || "" }]
    }));

    // Start streaming
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents: formattedMessages,
      config: {
        systemInstruction,
        temperature: 0.3,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        
        try {
          for await (const chunk of responseStream) {
            // Handle function calls if any
            if (chunk.functionCalls && chunk.functionCalls.length > 0) {
              for (const call of chunk.functionCalls) {
                const handler = call.name ? toolHandlers[call.name as keyof typeof toolHandlers] : undefined;
                if (handler) {
                  const result = await handler(call.args as any);
                  // In a real stream, we'd need to send this back to the model for a second turn.
                  // For simplicity in this demo, we'll output the raw tool result or mock a single-turn resolution.
                  const text = `\n[Tool Executed: ${call.name}, Result: ${JSON.stringify(result)}]\n`;
                  fullResponse += text;
                  controller.enqueue(encoder.encode(text));
                }
              }
            } else if (chunk.text) {
              fullResponse += chunk.text;
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          
          // Save model response to DB
          await db.messages.create(currentConvId, "model", fullResponse, citations);
          
          // Also append citations if there are any
          if (citations.length > 0) {
            const citationsString = "\n\n---\n**Sources:**\n" + citations.map(c => `- ${c.title}`).join("\n");
            controller.enqueue(encoder.encode(citationsString));
          }

          // Let the client know the conversationId
          controller.enqueue(encoder.encode(`\n\n__META_CONV_ID__:${currentConvId}`));
          controller.close();
        } catch (err) {
          console.error("Stream processing error:", err);
          controller.error(err);
        }
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error generating content:", error);
    return NextResponse.json({ error: error.message || "Failed to generate response" }, { status: 500 });
  }
}
