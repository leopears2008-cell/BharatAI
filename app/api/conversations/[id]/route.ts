import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { db } from "../../../lib/db";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { id } = await context.params;
    const conversation = await db.conversations.findById(id);
    if (!conversation || conversation.userId !== String(session.userId)) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    const messages = await db.messages.findByConversationId(id);
    return NextResponse.json({ conversation, messages });
  } catch (error) {
    console.error("Conversation load error:", error);
    return NextResponse.json({ error: "Unable to load conversation." }, { status: 500 });
  }
}
