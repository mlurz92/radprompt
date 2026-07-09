const KEY = "radprompt:state:v1";
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
const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), { status, headers });
const hasKv = env => env?.RADPROMPT_KV && typeof env.RADPROMPT_KV.get === "function" && typeof env.RADPROMPT_KV.put === "function" && typeof env.RADPROMPT_KV.delete === "function";
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method === "HEAD") return new Response(null, { status: hasKv(env) ? 204 : 500, headers });
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
  if (!hasKv(env)) return json({ ok: false, kv: false, message: "RADPROMPT_KV ist nicht gebunden. Im Cloudflare Pages Dashboard muss ein KV namespace binding mit dem Variable name RADPROMPT_KV gesetzt werden." }, 500);
  const probeKey = `radprompt:health:${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();
  try {
    await env.RADPROMPT_KV.put(probeKey, startedAt, { expirationTtl: 60 });
    const probeValue = await env.RADPROMPT_KV.get(probeKey);
    await env.RADPROMPT_KV.delete(probeKey);
    const state = await env.RADPROMPT_KV.get(KEY, "json");
    const stateOk = state && typeof state === "object";
    const prompts = Array.isArray(state?.prompts) ? state.prompts.length : 0;
    const folders = Array.isArray(state?.folders) ? state.folders.length : 0;
    const favorites = Array.isArray(state?.prompts) ? state.prompts.filter(prompt => prompt.favorite).length : 0;
    return json({ ok: true, kv: true, message: stateOk ? `RADPROMPT_KV aktiv. State vorhanden: ${prompts} Prompts, ${folders} Ordner, ${favorites} Favoriten.` : "RADPROMPT_KV aktiv. Noch kein gespeicherter RadPrompt-State vorhanden.", probes: { write: true, read: probeValue === startedAt, delete: true }, state: { exists: Boolean(state), prompts, folders, favorites, schema: state?.schema || "" }, timestamp: new Date().toISOString() });
  } catch (error) {
    return json({ ok: false, kv: true, message: "RADPROMPT_KV ist gebunden, aber die Probe ist fehlgeschlagen.", error: error.message || "Unbekannter Fehler" }, 500);
  }
}
