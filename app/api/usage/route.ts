import { NextResponse } from "next/server";
import { getUsage } from "@/lib/storage";
import { MODEL_LIMITS, type Provider } from "@/lib/brain";

export const runtime = "nodejs";
export async function GET() {
  try {
    const providers: Provider[] = ["openai", "claude", "gemini", "deepseek"];
    const usage = await Promise.all(providers.map(provider => getUsage(provider, MODEL_LIMITS[provider])));
    return NextResponse.json({ usage, resetsAt: usage[0]?.resetsAt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Usage storage unavailable" }, { status: 503 });
  }
}
