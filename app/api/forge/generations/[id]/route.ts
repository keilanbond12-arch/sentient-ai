import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const key = process.env.FORGEGUI_API_KEY;
  if (!key) return NextResponse.json({ error: "ForgeGUI is not connected. Add FORGEGUI_API_KEY in Netlify." }, { status: 503 });
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return NextResponse.json({ error: "Invalid generation ID." }, { status: 400 });
  try {
    const response = await fetch(`https://forgegui.net/api/v1/generations/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` }, cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Could not check the ForgeGUI task." }, { status: 502 });
  }
}
