const STATE_KEY = "radprompt:state:v1";
const MAX_BODY_BYTES = 1048576;
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept,If-Match,If-None-Match"
};
const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), { status, headers });
const noContent = () => new Response(null, { status: 204, headers });
const getKv = context => {
  const kv = context?.env?.RADPROMPT_KV;
  if (!kv || typeof kv.get !== "function" || typeof kv.put !== "function") throw new Error("RADPROMPT_KV ist nicht gebunden.");
  return kv;
};
const readJsonBody = async request => {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) throw new Error("Content-Type muss application/json sein.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error("Request body ist zu groß.");
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && parsed.state ? parsed.state : parsed;
  } catch {
    throw new Error("Ungültiges JSON.");
  }
};
const normalizeString = value => value === null || value === undefined ? "" : String(value);
const isObject = value => value && typeof value === "object" && !Array.isArray(value);
const normalizeState = state => {
  if (!isObject(state)) throw new Error("State muss ein JSON-Objekt sein.");
  const folders = Array.isArray(state.folders) ? state.folders : [];
  const prompts = Array.isArray(state.prompts) ? state.prompts : [];
  const favoriteOrder = Array.isArray(state.favoriteOrder) ? state.favoriteOrder : [];
  if (!folders.length) throw new Error("State enthält keine Ordner.");
  if (!prompts.length) throw new Error("State enthält keine Prompts.");
  const folderIds = new Set();
  const promptIds = new Set();
  for (const folder of folders) {
    if (!isObject(folder) || !normalizeString(folder.id) || !normalizeString(folder.title)) throw new Error("Ungültiger Ordner im State.");
    if (folderIds.has(folder.id)) throw new Error(`Doppelte Ordner-ID: ${folder.id}`);
    folderIds.add(folder.id);
  }
  for (const prompt of prompts) {
    if (!isObject(prompt) || !normalizeString(prompt.id) || !normalizeString(prompt.title) || !normalizeString(prompt.body)) throw new Error("Ungültiger Prompt im State.");
    if (promptIds.has(prompt.id)) throw new Error(`Doppelte Prompt-ID: ${prompt.id}`);
    promptIds.add(prompt.id);
  }
  return {
    version: Number(state.version) || 1,
    schema: normalizeString(state.schema) || "radprompt-state-v1",
    app: isObject(state.app) ? state.app : {},
    ui: isObject(state.ui) ? state.ui : {},
    folders,
    prompts,
    favoriteOrder: favoriteOrder.map(normalizeString).filter(id => promptIds.has(id)),
    documents: isObject(state.documents) ? state.documents : {}
  };
};
const metrics = state => ({
  folders: state.folders.length,
  prompts: state.prompts.length,
  favorites: state.prompts.filter(prompt => prompt.favorite).length,
  bytes: new TextEncoder().encode(JSON.stringify(state)).byteLength
});
export async function onRequestOptions() {
  return noContent();
}
export async function onRequestGet(context) {
  try {
    const kv = getKv(context);
    const value = await kv.get(STATE_KEY, "json");
    if (!value) return json({ ok: false, error: "State not found" }, 404);
    const state = normalizeState(value);
    return json({ ok: true, key: STATE_KEY, state, metrics: metrics(state), timestamp: new Date().toISOString() });
  } catch (error) {
    return json({ ok: false, error: error.message || "State konnte nicht gelesen werden." }, 500);
  }
}
export async function onRequestPut(context) {
  try {
    const kv = getKv(context);
    const state = normalizeState(await readJsonBody(context.request));
    const updated = { ...state, app: { ...state.app, updatedAt: new Date().toISOString() } };
    await kv.put(STATE_KEY, JSON.stringify(updated), { metadata: { schema: updated.schema, updatedAt: updated.app.updatedAt } });
    return json({ ok: true, key: STATE_KEY, metrics: metrics(updated), timestamp: updated.app.updatedAt });
  } catch (error) {
    return json({ ok: false, error: error.message || "State konnte nicht gespeichert werden." }, 400);
  }
}
export async function onRequestPost(context) {
  return onRequestPut(context);
}
export async function onRequest() {
  return json({ ok: false, error: "Method not allowed" }, 405);
}
