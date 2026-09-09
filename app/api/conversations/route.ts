import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../lib/auth";
import { db } from "../../lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    const userId = (session?.userId as string) || "anonymous-123";

    const convs = await db.conversations.findByUserId(userId);
    return NextResponse.json(convs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
