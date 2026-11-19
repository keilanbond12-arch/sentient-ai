import { getStore } from "@netlify/blobs";
import type { Provider } from "@/lib/brain";

const STORE_NAME = "sentient-ai-data";

function store() {
  // Netlify injects the Blobs context into deployed Functions. Do not gate
  // this on NETLIFY / NETLIFY_SITE_ID: those are not reliable indicators
  // across all Next.js runtime adapters and caused false "not deployed" errors.
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const entry = await store().get(key, { type: "json", consistency: "strong" }) as T | null;
  return entry ?? fallback;
}

// Optimistic compare-and-swap prevents simultaneous requests from silently
// overwriting each other's updates. Retries handle concurrent writes.
async function updateJson<T>(key: string, fallback: T, update: (current: T) => T): Promise<T> {
  const blobs = store();
  for (let attempt = 0; attempt < 12; attempt++) {
    const entry = await blobs.getWithMetadata(key, { type: "json", consistency: "strong" }) as
      | { data: T; etag: string }
      | null;
    const current = entry?.data ?? fallback;
    const next = update(current);
    try {
      if (entry) await blobs.setJSON(key, next, { onlyIfMatch: entry.etag });
      else await blobs.setJSON(key, next, { onlyIfNew: true });
      return next;
    } catch (error) {
      if (attempt === 11) throw error;
    }
  }
  throw new Error("Storage is busy. Please retry.");
}

export async function listMemories() {
  return readJson<Array<{id:string;content:string;createdAt:string}>>("memories", []);
}
export async function addMemory(content: string) {
  const memory = { id: crypto.randomUUID(), content, createdAt: new Date().toISOString() };
  await updateJson("memories", [] as typeof memory[], current => [memory, ...current].slice(0, 200));
  return memory;
}
export async function deleteMemory(id: string) {
  await updateJson("memories", [] as Array<{id:string;content:string;createdAt:string}>, current => current.filter(m => m.id !== id));
}
export async function getGoogleConnection() {
  return readJson<{refreshToken:string;accessToken:string|null;expiryDate:number|null} | null>("google-connection", null);
}
export async function saveGoogleConnection(value: {refreshToken:string;accessToken:string|null;expiryDate:number|null}) {
  await store().setJSON("google-connection", value);
}
export async function updateGoogleTokens(value: {accessToken:string|null;expiryDate:number|null}) {
  await updateJson("google-connection", null as any, current => current ? {...current, ...value} : current);
}
export async function getChatMessages() {
  return readJson<Array<{role:string;content:string;createdAt:string}>>("chat-messages", []);
}
export async function saveChatTurn(userContent: string, assistantContent: string) {
  await updateJson("chat-messages", [] as Array<{role:string;content:string;createdAt:string}>, current => [
    ...current,
    {role:"user",content:userContent,createdAt:new Date().toISOString()},
    {role:"assistant",content:assistantContent,createdAt:new Date().toISOString()}
  ].slice(-200));
}
function currentHourKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-${String(now.getUTCDate()).padStart(2,"0")}-${String(now.getUTCHours()).padStart(2,"0")}`;
}
export async function getUsage(provider: Provider, limit: number) {
  const hour = currentHourKey();
  const counts = await readJson<Record<string,number>>(`usage-${hour}`, {});
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),now.getUTCHours()+1));
  return {provider, used: counts[provider] || 0, limit, resetsAt: reset.toISOString()};
}
export async function reserveUsage(provider: Provider, limit: number) {
  const hour = currentHourKey();
  const key = `usage-${hour}`;
  let denied = false;
  const counts = await updateJson<Record<string,number>>(key, {}, current => {
    const used = current[provider] || 0;
    denied = used >= limit;
    return denied ? current : {...current, [provider]: used + 1};
  });
  const used = counts[provider] || 0;
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),now.getUTCHours()+1));
  return {allowed: !denied, provider, used, limit, resetsAt: reset.toISOString()};
}
