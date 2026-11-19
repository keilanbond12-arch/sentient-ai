import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "not-configured" });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Enter an image prompt." }, { status: 400 });
    }
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt.slice(0, 3000),
      size: "1024x1024"
    });
    const image = result.data?.[0]?.b64_json;
    if (!image) return NextResponse.json({ error: "No image was returned." }, { status: 502 });
    return NextResponse.json({ image, mimeType: "image/png" });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Image generation failed" },
      { status: 500 }
    );
  }
}
