import { NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";
import { oauthClient } from "@/lib/google";

export async function GET() {
  try {
    const state=randomBytes(24).toString("hex");
    const secret=process.env.APP_SECRET;
    if(!secret) throw new Error("APP_SECRET is missing.");
    const signature=createHmac("sha256",secret).update(state).digest("hex");
    const url=oauthClient().generateAuthUrl({
      access_type:"offline",prompt:"consent",include_granted_scopes:true,state:`${state}.${signature}`,
      scope:[
        "openid","email","profile",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive.readonly"
      ]
    });
    const res=NextResponse.redirect(url);
    res.cookies.set("google_oauth_state",`${state}.${signature}`,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:600,path:"/"});
    return res;
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"OAuth setup failed"},{status:500}); }
}
