import { NextRequest,NextResponse } from "next/server";
import { google } from "googleapis";
import { authorizedGoogleClient } from "@/lib/google";
export async function GET(req:NextRequest) {
  try {
    const q=req.nextUrl.searchParams.get("q")||"";
    const auth=await authorizedGoogleClient();
    const drive=google.drive({version:"v3",auth});
    const query=q ? `trashed=false and name contains '${q.replace(/['\\]/g,"")}'` : "trashed=false";
    const result=await drive.files.list({q:query,pageSize:20,orderBy:"modifiedTime desc",fields:"files(id,name,mimeType,modifiedTime,webViewLink)"});
    return NextResponse.json({files:result.data.files||[]});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Drive request failed"},{status:500}); }
}
