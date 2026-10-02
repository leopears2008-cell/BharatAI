import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "../../../../lib/rag";

export async function POST(req: NextRequest) {
  try {
    const { title, content, url } = await req.json();
    if (typeof title !== "string" || !title.trim() || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const document = await ingestDocument(title.trim(), content, typeof url === "string" ? url : undefined);
    return NextResponse.json({ success: true, document: { id: document.id, title: document.title } });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json({ error: "Knowledge ingestion is temporarily unavailable." }, { status: 500 });
  }
}
