import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { createSession, clearSession } from "../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    let user = await db.users.findByEmail(email);
    if (!user) {
      // Auto-register for demo purposes
      user = await db.users.create({ email, name: email.split("@")[0] });
    }

    await createSession(user.id);
    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true });
}
