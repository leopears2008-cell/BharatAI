import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../lib/auth";
import { db } from "../../lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    const userId = typeof session?.userId === "string" ? session.userId : null;
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Your session has expired. Please sign in again." } }, { status: 401 });
    }

    const convs = await db.conversations.findByUserId(userId);
    return NextResponse.json(convs.map((c) => ({ id: c.id, title: c.title, language: c.language, updatedAt: c.updatedAt })));
  } catch (error) {
    console.error("Failed to list conversations:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load conversations." } }, { status: 500 });
  }
}
