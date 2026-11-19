import { NextResponse } from "next/server";
import { getGoogleConnection } from "@/lib/storage";
export async function GET() {
  try { return NextResponse.json({ connected: !!(await getGoogleConnection()) }); }
  catch { return NextResponse.json({ connected: false }); }
}
