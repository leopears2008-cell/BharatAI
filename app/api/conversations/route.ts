import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../lib/auth";
import { db } from "../../lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    return NextResponse.json(await db.conversations.findByUserId(String(session.userId)));
  } catch (error) {
    console.error("Conversation list error:", error);
    return NextResponse.json({ error: "Unable to load conversations." }, { status: 500 });
  }
}
