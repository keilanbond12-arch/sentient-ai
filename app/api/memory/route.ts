import { NextRequest, NextResponse } from "next/server";
import { addMemory, deleteMemory, listMemories } from "@/lib/storage";

export const runtime = "nodejs";
export async function GET() {
  try { return NextResponse.json({ memories: await listMemories() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Memory storage unavailable" }, { status: 503 }); }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (content.length < 3 || content.length > 500) return NextResponse.json({ error: "Memory must be between 3 and 500 characters." }, { status: 400 });
    return NextResponse.json({ memory: await addMemory(content) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save memory." }, { status: 503 }); }
}
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Memory ID is required." }, { status: 400 });
    await deleteMemory(id);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete memory." }, { status: 503 }); }
}
