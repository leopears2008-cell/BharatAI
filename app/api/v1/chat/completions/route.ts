import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import type { Content } from "@google/genai";
import { getModelClient, getModelName } from "../../../../lib/model";
import { rateLimit } from "../../../../lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** CORS is an allowlist (ALLOWED_ORIGINS), not a wildcard. */
function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/** Validates a Bearer key against SHA-256 hashes in API_KEY_HASHES (constant-time). */
function checkApiKey(header: string | null): { status: "ok"; hash: string } | { status: "invalid" | "unconfigured" } {
  const allowed = (process.env.API_KEY_HASHES ?? "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => s.length === 64);
  if (allowed.length === 0) return { status: "unconfigured" };

  const m = /^Bearer\s+(\S+)$/.exec(header ?? "");
  if (!m) return { status: "invalid" };

  const hash = createHash("sha256").update(m[1]).digest("hex");
  const given = Buffer.from(hash);
  let match = false;
  for (const a of allowed) {
    if (timingSafeEqual(given, Buffer.from(a))) match = true;
  }
  return match ? { status: "ok", hash } : { status: "invalid" };
}

function toText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (p && typeof p === "object" && (p as { type?: string }).type === "text" ? String((p as { text?: unknown }).text ?? "") : ""))
      .join("");
  }
  return "";
}

function err(req: NextRequest, status: number, code: string, message: string, extra?: Record<string, string>) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { ...corsHeaders(req), ...extra } });
}

export async function POST(req: NextRequest) {
  const auth = checkApiKey(req.headers.get("authorization"));
  if (auth.status === "unconfigured") return err(req, 503, "API_DISABLED", "API access is not configured on this deployment.");
  if (auth.status === "invalid") return err(req, 401, "UNAUTHORIZED", "Invalid or missing API key.");

  const rl = rateLimit(`api:${auth.hash}`, 60, 60_000);
  if (!rl.ok) return err(req, 429, "RATE_LIMITED", "You've reached the current usage limit.", { "Retry-After": String(rl.retryAfter) });

  let body: { messages?: unknown; temperature?: unknown; stream?: unknown };
  try {
    body = await req.json();
  } catch {
    return err(req, 400, "BAD_REQUEST", "Invalid JSON body.");
  }

  if (body.stream === true) return err(req, 400, "UNSUPPORTED", "Streaming is not supported on this endpoint.");
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 100) {
    return err(req, 400, "BAD_REQUEST", "messages must be a non-empty array (max 100).");
  }

  const system: string[] = [];
  const contents: Content[] = [];
  let totalChars = 0;
  for (const m of body.messages as { role?: string; content?: unknown }[]) {
    const text = toText(m?.content);
    totalChars += text.length;
    if (!text || !m || typeof m.role !== "string") return err(req, 400, "BAD_REQUEST", "Each message needs a role and text content.");
    if (m.role === "system") system.push(text);
    else contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text }] });
  }
  if (contents.length === 0 || totalChars > 100_000) return err(req, 400, "BAD_REQUEST", "Invalid messages.");

  const temperature = typeof body.temperature === "number" ? Math.min(2, Math.max(0, body.temperature)) : 0.7;
  const model = getModelName();

  try {
    const response = await getModelClient().models.generateContent({
      model,
      contents,
      config: { temperature, ...(system.length ? { systemInstruction: system.join("\n\n") } : {}) },
    });

    const reason = response.candidates?.[0]?.finishReason;
    const finish_reason = reason === "MAX_TOKENS" ? "length" : reason === "SAFETY" ? "content_filter" : "stop";
    const u = response.usageMetadata;

    return NextResponse.json(
      {
        id: `chatcmpl-${crypto.randomUUID()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model, // the model actually used
        choices: [{ index: 0, message: { role: "assistant", content: response.text ?? "" }, finish_reason }],
        // Only reported when the provider returns it; never a fake zero.
        ...(u && u.totalTokenCount !== undefined
          ? { usage: { prompt_tokens: u.promptTokenCount ?? 0, completion_tokens: u.candidatesTokenCount ?? 0, total_tokens: u.totalTokenCount } }
          : {}),
      },
      { headers: corsHeaders(req) }
    );
  } catch (e) {
    console.error("chat.completions provider error:", e);
    return err(req, 502, "LLM_UNAVAILABLE", "The AI service is temporarily unavailable. Please try again.");
  }
}
