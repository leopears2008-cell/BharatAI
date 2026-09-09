import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const storePath = path.join(process.cwd(), "app/lib/vectorStore.json");

export async function GET() {
  try {
    if (!fs.existsSync(storePath)) {
      return NextResponse.json({ documents: [] });
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    const documents = store.map((doc: any) => ({ id: doc.id, title: doc.title }));
    return NextResponse.json({ documents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    
    if (!fs.existsSync(storePath)) {
      return NextResponse.json({ error: "No vector store found" }, { status: 404 });
    }
    
    let store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    store = store.filter((doc: any) => doc.id !== id);
    
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
