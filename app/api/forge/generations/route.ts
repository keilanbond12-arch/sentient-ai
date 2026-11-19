import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const allowedTypes = new Set(["thumbnail", "gui", "avatar", "icon", "clothing", "model_3d", "music", "sfx", "animation"]);

export async function POST(req: NextRequest) {
  const key = process.env.FORGEGUI_API_KEY;
  if (!key) return NextResponse.json({ error: "ForgeGUI is not connected yet. Add FORGEGUI_API_KEY in Netlify environment variables." }, { status: 503 });

  try {
    const body = await req.json();
    const type = typeof body.type === "string" ? body.type : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!allowedTypes.has(type)) return NextResponse.json({ error: "Choose a supported ForgeGUI asset type." }, { status: 400 });
    const promptLimit = type === "sfx" ? 450 : type === "music" ? 3000 : 10000;
    if (!prompt || prompt.length > promptLimit) return NextResponse.json({ error: `Enter a prompt (maximum ${promptLimit} characters for this asset type).` }, { status: 400 });

    const parameters = sanitizeParameters(type, body.parameters);
    const payload: Record<string, unknown> = { type, prompt, parameters };
    if (Number.isInteger(body.max_credits) && body.max_credits >= 0) payload.max_credits = body.max_credits;

    const response = await fetch("https://forgegui.net/api/v1/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID()
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || data?.error || `ForgeGUI returned HTTP ${response.status}`;
      return NextResponse.json({ error: String(message) }, { status: response.status });
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("ForgeGUI generation request failed", error);
    return NextResponse.json({ error: "Could not start the ForgeGUI generation." }, { status: 502 });
  }
}

function sanitizeParameters(type: string, input: unknown) {
  const p = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const out: Record<string, unknown> = {};
  if (["thumbnail", "gui", "icon"].includes(type)) {
    if (["roblox", "minecraft", "fortnite", "unity"].includes(String(p.platform))) out.platform = p.platform;
    if (type === "thumbnail" && ["auto", "default", "horror", "cartoony", "anime", "survival"].includes(String(p.style))) out.style = p.style;
  }
  if (type === "sfx") {
    if (["general", "ui", "movement", "collectible", "combat", "ambient"].includes(String(p.category))) out.category = p.category;
    if (typeof p.duration_seconds === "number" && p.duration_seconds >= 0.5 && p.duration_seconds <= 22) out.duration_seconds = p.duration_seconds;
    if (typeof p.loop === "boolean") out.loop = p.loop;
  }
  if (type === "animation") {
    if (Number.isInteger(p.duration_seconds) && Number(p.duration_seconds) >= 1 && Number(p.duration_seconds) <= 12) out.duration_seconds = p.duration_seconds;
    out.rig = "r15";
  }
  if (type === "model_3d") out.platform = "roblox";
  return out;
}
