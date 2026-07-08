// RadPrompt – Cloudflare Pages Function
// Speichert den gesamten App-Zustand als ein JSON-Objekt im KV-Namespace RADPROMPT_KV (Key: "data").
// Kein Build-Schritt nötig: Cloudflare Pages erkennt den /functions-Ordner automatisch.

const KEY = "data";
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export async function onRequestGet({ env }) {
  if (!env.RADPROMPT_KV) {
    return new Response(JSON.stringify({ error: "kv_not_bound" }), { status: 501, headers });
  }
  const value = await env.RADPROMPT_KV.get(KEY);
  return new Response(value ?? "null", { status: 200, headers });
}

export async function onRequestPut({ request, env }) {
  if (!env.RADPROMPT_KV) {
    return new Response(JSON.stringify({ error: "kv_not_bound" }), { status: 501, headers });
  }
  const body = await request.text();
  if (body.length > 20_000_000) {
    return new Response(JSON.stringify({ error: "too_large" }), { status: 413, headers });
  }
  try { JSON.parse(body); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
  }
  await env.RADPROMPT_KV.put(KEY, body);
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), { status: 200, headers });
}
