import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { db } from "../../../lib/db";

type Ctx = { params: Promise<{ id: string }> };

async function authorize(req: NextRequest, id: string) {
  const session = await getSession(req);
  const userId = typeof session?.userId === "string" ? session.userId : null;
  if (!userId) {
    return { error: NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Your session has expired. Please sign in again." } }, { status: 401 }) };
  }
  const conv = await db.conversations.findById(id);
  if (!conv || conv.userId !== userId) {
    return { error: NextResponse.json({ error: { code: "NOT_FOUND", message: "Conversation not found." } }, { status: 404 }) };
  }
  return { conv };
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await authorize(req, id);
  if (auth.error) return auth.error;

  const msgs = await db.messages.findByConversationId(id);
  return NextResponse.json({
    id: auth.conv.id,
    title: auth.conv.title,
    language: auth.conv.language,
    messages: msgs.map((m) => ({ id: m.id, role: m.role, content: m.content, citations: m.citations ?? [] })),
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await authorize(req, id);
  if (auth.error) return auth.error;

  await db.conversations.delete(id);
  return NextResponse.json({ success: true });
}
