import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "BharatAI",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}
