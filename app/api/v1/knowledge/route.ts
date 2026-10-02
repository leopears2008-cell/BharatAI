import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/db";

export async function GET() {
  try {
    const documents = await db.documents.findAll();
    return NextResponse.json({ documents: documents.map(({ id, title, url, createdAt }) => ({ id, title, url, createdAt })) });
  } catch (error) {
    console.error("Knowledge list error:", error);
    return NextResponse.json({ error: "Knowledge retrieval is temporarily unavailable." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Document id is required." }, { status: 400 });
    await db.documents.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Knowledge delete error:", error);
    return NextResponse.json({ error: "Unable to delete the document." }, { status: 500 });
  }
}
