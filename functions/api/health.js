const STATE_KEY = "radprompt:state:v1";
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept"
};
const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), { status, headers });
const head = status => new Response(null, { status, headers });
const hasKv = context => {
  const kv = context?.env?.RADPROMPT_KV;
  return Boolean(kv && typeof kv.get === "function" && typeof kv.put === "function" && typeof kv.delete === "function");
};
const stateInfo = async kv => {
  const value = await kv.get(STATE_KEY, "json");
  if (!value) return { exists: false, validJson: false, prompts: 0, folders: 0, favorites: 0 };
  const folders = Array.isArray(value.folders) ? value.folders.length : 0;
  const prompts = Array.isArray(value.prompts) ? value.prompts.length : 0;
  const favorites = Array.isArray(value.prompts) ? value.prompts.filter(prompt => prompt.favorite).length : 0;
  return { exists: true, validJson: true, schema: value.schema || "", version: value.version || 0, prompts, folders, favorites };
};
const writeProbe = async kv => {
  const key = `radprompt:health:${crypto.randomUUID()}`;
  const payload = JSON.stringify({ ok: true, timestamp: new Date().toISOString() });
  await kv.put(key, payload, { expirationTtl: 60 });
  const read = await kv.get(key);
  await kv.delete(key);
  return read === payload;
};
export async function onRequestOptions() {
  return head(204);
}
export async function onRequestHead(context) {
  return head(hasKv(context) ? 204 : 503);
}
export async function onRequestGet(context) {
  if (!hasKv(context)) {
    return json({ ok: false, kv: false, message: "RADPROMPT_KV ist nicht gebunden. Im Cloudflare Pages Dashboard muss ein KV namespace binding mit dem Variable name RADPROMPT_KV gesetzt und danach neu deployed werden." }, 503);
  }
  try {
    const kv = context.env.RADPROMPT_KV;
    const probe = await writeProbe(kv);
    const state = await stateInfo(kv);
    const message = state.exists ? `RADPROMPT_KV aktiv. State vorhanden: ${state.prompts} Prompts, ${state.folders} Ordner, ${state.favorites} Favoriten.` : "RADPROMPT_KV aktiv. Noch kein gespeicherter RadPrompt-State vorhanden.";
    return json({ ok: probe, kv: true, message, state, probes: { writeReadDelete: probe }, timestamp: new Date().toISOString() }, probe ? 200 : 500);
  } catch (error) {
    return json({ ok: false, kv: true, message: error.message || "KV-Health-Check fehlgeschlagen." }, 500);
  }
}
export async function onRequest() {
  return json({ ok: false, error: "Method not allowed" }, 405);
}
