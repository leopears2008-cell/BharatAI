import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { Content } from "@google/genai";
import { getSession } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { retrieveContext } from "../../../lib/rag";
import { toolDeclarations, executeTool } from "../../../lib/tools";
import { getModelClient, getModelName } from "../../../lib/model";
import { rateLimit } from "../../../lib/rateLimit";
import { buildSystemInstruction, SUPPORTED_LANGUAGES } from "../../../lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOOL_ITERATIONS = 4;
const MAX_MESSAGE_CHARS = 8000;
const MAX_BODY_BYTES = 200_000;
const HISTORY_LIMIT = 30;

type Citation = { title: string; url?: string };

/** Newline-delimited JSON events streamed to the client. */
type StreamEvent =
  | { type: "meta"; conversationId: string; model: string }
  | { type: "delta"; text: string }
  | { type: "tool"; name: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "error"; message: string }
  | { type: "done" };

function jsonError(status: number, code: string, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

function extractUserText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const b = body as { message?: unknown; messages?: unknown };
  if (typeof b.message === "string") return b.message.trim();
  // Backward compatibility with the old { messages: [...] } payload.
  if (Array.isArray(b.messages)) {
    const last = [...b.messages].reverse().find((m) => m && m.role === "user");
    const text = last?.content ?? last?.parts?.[0]?.text;
    if (typeof text === "string") return text.trim();
  }
  return "";
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const started = Date.now();

  const session = await getSession(req);
  const userId = typeof session?.userId === "string" ? session.userId : null;
  if (!userId) return jsonError(401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.");

  const rl = rateLimit(`chat:${userId}`, 20, 60_000);
  if (!rl.ok) {
    return jsonError(429, "RATE_LIMITED", "You've reached the current usage limit.", { "Retry-After": String(rl.retryAfter) });
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return jsonError(413, "TOO_LARGE", "That message is too large.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid request.");
  }

  const text = extractUserText(body);
  if (!text) return jsonError(400, "BAD_REQUEST", "Please enter a message.");
  if (text.length > MAX_MESSAGE_CHARS) return jsonError(413, "TOO_LARGE", "That message is too long.");

  const raw = body as { language?: unknown; conversationId?: unknown };
  const language = (SUPPORTED_LANGUAGES as readonly string[]).includes(raw.language as string) ? (raw.language as string) : "English";

  // Resolve (and authorize) the conversation.
  let conversationId: string;
  if (typeof raw.conversationId === "string" && raw.conversationId) {
    const conv = await db.conversations.findById(raw.conversationId);
    if (!conv || conv.userId !== userId) return jsonError(404, "NOT_FOUND", "This conversation is no longer available.");
    conversationId = conv.id;
  } else {
    conversationId = (await db.conversations.create(userId, text.slice(0, 60), language)).id;
  }

  // Server-side history (the client no longer dictates it).
  const prior = (await db.messages.findByConversationId(conversationId)).filter((m) => m.content.trim()).slice(-HISTORY_LIMIT);
  while (prior.length && prior[0].role !== "user") prior.shift();
  const contents: Content[] = [
    ...prior.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    { role: "user", parts: [{ text }] },
  ];
  await db.messages.create(conversationId, "user", text);

  // RAG is best-effort; failures must not block a normal answer.
  const citations: Citation[] = [];
  let retrieved: { title: string; text: string }[] = [];
  try {
    const docs = await retrieveContext(text);
    retrieved = docs.map((d) => ({ title: d.title, text: d.text }));
    for (const d of docs) {
      if (!citations.some((c) => c.title === d.title)) citations.push({ title: d.title, url: d.url });
    }
  } catch (err) {
    console.error(JSON.stringify({ request_id: requestId, event: "rag_error", error: String(err) }));
  }

  const model = getModelName();
  let ai;
  try {
    ai = getModelClient();
  } catch (err) {
    console.error(JSON.stringify({ request_id: requestId, event: "model_config_error", error: String(err) }));
    return jsonError(503, "LLM_UNAVAILABLE", "The AI service is temporarily unavailable. Please try again.");
  }

  const systemInstruction = buildSystemInstruction(language, retrieved);
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (ev: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
        } catch {
          closed = true;
        }
      };

      let full = "";
      let toolCalls = 0;
      let finish = "stop";
      let failed = false;

      send({ type: "meta", conversationId, model });

      try {
        outer: for (let iteration = 0; iteration <= MAX_TOOL_ITERATIONS; iteration++) {
          const allowTools = iteration < MAX_TOOL_ITERATIONS;
          const stream = await ai.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.3,
              ...(allowTools ? { tools: [{ functionDeclarations: toolDeclarations }] } : {}),
            },
          });

          let turnText = "";
          const calls: { name: string; args: Record<string, unknown> }[] = [];

          for await (const chunk of stream) {
            if (req.signal.aborted) {
              finish = "aborted";
              break outer;
            }
            for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
              if (part.functionCall?.name) {
                calls.push({ name: part.functionCall.name, args: (part.functionCall.args ?? {}) as Record<string, unknown> });
              } else if (part.text && !part.thought) {
                turnText += part.text;
                full += part.text;
                send({ type: "delta", text: part.text });
              }
            }
          }

          if (calls.length === 0) break;
          if (!allowTools) {
            finish = "max_tool_iterations";
            break;
          }

          // Feed tool results back to the model; the user never sees raw results.
          const modelParts: Content["parts"] = [];
          if (turnText) modelParts.push({ text: turnText });
          for (const c of calls) modelParts.push({ functionCall: { name: c.name, args: c.args } });
          contents.push({ role: "model", parts: modelParts });

          const responseParts: Content["parts"] = [];
          for (const c of calls) {
            send({ type: "tool", name: c.name });
            toolCalls++;
            const outcome = await executeTool(c.name, c.args);
            responseParts.push({
              functionResponse: {
                name: c.name,
                response: outcome.ok ? { result: outcome.result } : { error: outcome.error },
              },
            });
          }
          contents.push({ role: "user", parts: responseParts });
        }

        if (citations.length > 0 && finish !== "aborted") send({ type: "citations", citations });
      } catch (err) {
        failed = true;
        finish = "error";
        console.error(JSON.stringify({ request_id: requestId, event: "stream_error", error: String(err) }));
        send({ type: "error", message: "The AI service is temporarily unavailable. Please try again." });
      } finally {
        // Keep whatever was generated, even on failure or user cancellation.
        if (full.trim()) {
          try {
            await db.messages.create(conversationId, "model", full, finish === "error" || finish === "aborted" ? undefined : citations);
          } catch (err) {
            console.error(JSON.stringify({ request_id: requestId, event: "persist_error", error: String(err) }));
          }
        }
        console.log(
          JSON.stringify({
            request_id: requestId,
            user_id: userId,
            conversation_id: conversationId,
            model,
            latency_ms: Date.now() - started,
            tool_calls: toolCalls,
            finish_reason: finish,
            error: failed,
          })
        );
        if (!failed) send({ type: "done" });
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {}
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      "X-Request-Id": requestId,
    },
  });
}
