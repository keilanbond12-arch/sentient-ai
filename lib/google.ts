import { google } from "googleapis";
import { getGoogleConnection, updateGoogleTokens } from "@/lib/storage";

export function oauthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth environment variables are missing.");
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

export async function authorizedGoogleClient() {
  const saved = await getGoogleConnection();
  if (!saved) throw new Error("Google is not connected. Connect Google in Settings first.");
  const client = oauthClient();
  client.setCredentials({
    refresh_token: saved.refreshToken,
    access_token: saved.accessToken ?? undefined,
    expiry_date: saved.expiryDate ? Number(saved.expiryDate) : undefined
  });
  client.on("tokens", async tokens => {
    await updateGoogleTokens({
      accessToken: tokens.access_token ?? saved.accessToken,
      expiryDate: tokens.expiry_date ?? saved.expiryDate
    });
  });
  return client;
}
