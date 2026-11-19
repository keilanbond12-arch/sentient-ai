import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const key = process.env.FORGEGUI_API_KEY;
  if (!key) return NextResponse.json({ error: "ForgeGUI is not connected. Add FORGEGUI_API_KEY in Netlify." }, { status: 503 });
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return NextResponse.json({ error: "Invalid ForgeGUI file ID." }, { status: 400 });
  try {
    const upstream = await fetch(`https://forgegui.net/api/v1/files/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` }, cache: "no-store"
    });
    if (!upstream.ok) {
      const error = await upstream.text();
      return NextResponse.json({ error: error.slice(0, 500) || "ForgeGUI download failed." }, { status: upstream.status });
    }
    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    headers.set("Content-Disposition", upstream.headers.get("content-disposition") || `attachment; filename="forgegui-${id}"`);
    headers.set("Cache-Control", "private, no-store");
    return new Response(await upstream.arrayBuffer(), { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Could not download the ForgeGUI asset." }, { status: 502 });
  }
}
