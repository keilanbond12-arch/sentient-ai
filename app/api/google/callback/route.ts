import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { oauthClient } from "@/lib/google";
import { saveGoogleConnection } from "@/lib/storage";

export async function GET(req:NextRequest) {
  try {
    const code=req.nextUrl.searchParams.get("code");
    const state=req.nextUrl.searchParams.get("state") || "";
    const cookie=req.cookies.get("google_oauth_state")?.value || "";
    const secret=process.env.APP_SECRET || "";
    const [stateValue,signature]=state.split(".");
    const expected=createHmac("sha256",secret).update(stateValue || "").digest("hex");
    if(!code || !cookie || state!==cookie || !signature || signature.length!==expected.length || !timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) {
      return NextResponse.json({error:"Invalid OAuth state."},{status:400});
    }
    const {tokens}=await oauthClient().getToken(code);
    if(!tokens.refresh_token) throw new Error("Google did not return a refresh token. Revoke the app in Google Account permissions and reconnect.");
    await saveGoogleConnection({
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      expiryDate: tokens.expiry_date ?? null
    });
    const res=NextResponse.redirect(new URL("/",req.url)); res.cookies.delete("google_oauth_state"); return res;
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Google connection failed"},{status:500}); }
}
