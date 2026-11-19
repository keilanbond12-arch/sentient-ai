import { NextRequest,NextResponse } from "next/server";
import { google } from "googleapis";
import { authorizedGoogleClient } from "@/lib/google";
export async function GET(req:NextRequest) {
  try {
    const q=req.nextUrl.searchParams.get("q") || "newer_than:14d";
    const auth=await authorizedGoogleClient();
    const gmail=google.gmail({version:"v1",auth});
    const list=await gmail.users.messages.list({userId:"me",q,maxResults:10});
    const messages=await Promise.all((list.data.messages||[]).slice(0,10).map(async m=>{
      const item=await gmail.users.messages.get({userId:"me",id:m.id!,format:"metadata",metadataHeaders:["From","Subject","Date"]});
      const headers=item.data.payload?.headers||[];
      return {id:m.id,from:headers.find(h=>h.name==="From")?.value,subject:headers.find(h=>h.name==="Subject")?.value,date:headers.find(h=>h.name==="Date")?.value,snippet:item.data.snippet};
    }));
    return NextResponse.json({messages});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Gmail request failed"},{status:500}); }
}
