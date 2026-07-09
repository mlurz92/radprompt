const KEY = "radprompt:state:v1";
const MAX_BYTES = 1048576;
const SCHEMA = "radprompt-state-v1";
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept"
};
const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), { status, headers });
const hasKv = env => env?.RADPROMPT_KV && typeof env.RADPROMPT_KV.get === "function" && typeof env.RADPROMPT_KV.put === "function";
const readBody = async request => {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) throw new Error("Content-Type muss application/json sein.");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error("State ist zu groß.");
  try { return JSON.parse(text); } catch { throw new Error("JSON ist ungültig."); }
};
const normalize = state => {
  const src = state?.state && typeof state.state === "object" ? state.state : state;
  if (!src || typeof src !== "object") throw new Error("State fehlt.");
  const folders = Array.isArray(src.folders) ? src.folders : [];
  const prompts = Array.isArray(src.prompts) ? src.prompts : [];
  if (!folders.length) throw new Error("State enthält keine Ordner.");
  if (!prompts.length) throw new Error("State enthält keine Prompts.");
  const ids = new Set();
  for (const prompt of prompts) {
    if (!prompt || typeof prompt !== "object") throw new Error("Ungültiger Prompt.");
    if (!prompt.id || !prompt.title || !prompt.body) throw new Error("Prompt benötigt id, title und body.");
    if (ids.has(prompt.id)) throw new Error(`Doppelte Prompt-ID: ${prompt.id}`);
    ids.add(prompt.id);
  }
  return { ...src, version: 1, schema: SCHEMA, app: { ...(src.app || {}), updatedAt: new Date().toISOString() } };
};
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (!hasKv(env)) return json({ ok: false, kv: false, error: "RADPROMPT_KV ist nicht gebunden." }, 500);
  try {
    if (request.method === "GET") {
      const value = await env.RADPROMPT_KV.get(KEY, "json");
      if (!value) return json({ ok: false, error: "State not found" }, 404);
      return json({ ok: true, key: KEY, state: value, timestamp: new Date().toISOString() });
    }
    if (request.method === "PUT" || request.method === "POST") {
      const payload = await readBody(request);
      const state = normalize(payload);
      await env.RADPROMPT_KV.put(KEY, JSON.stringify(state), { metadata: { schema: SCHEMA, updatedAt: state.app.updatedAt } });
      return json({ ok: true, key: KEY, metrics: { folders: state.folders.length, prompts: state.prompts.length, favorites: state.prompts.filter(prompt => prompt.favorite).length, bytes: new TextEncoder().encode(JSON.stringify(state)).length }, timestamp: state.app.updatedAt });
    }
    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    return json({ ok: false, error: error.message || "Unbekannter Fehler" }, 400);
  }
}
