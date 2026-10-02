import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { createSession, clearSession } from "../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    let user = await db.users.findByEmail(email.toLowerCase());
    if (!user) {
      user = await db.users.create({ email: email.toLowerCase(), name: email.split("@")[0] });
    }

    await createSession(user.id);
    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: error instanceof Error && error.message.includes("JWT_SECRET") ? error.message : "Authentication service is unavailable." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true });
}
