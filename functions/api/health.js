const KEY = "radprompt:state:v2";
const LEGACY_KEY = "radprompt:state:v1";

export async function onRequestGet({env}) {
  const result = {ok: false, kv: Boolean(env.RADPROMPT_KV), readable: false, exists: false, revision: 0, schemaVersion: 0};
  if (!env.RADPROMPT_KV) {
    return Response.json({...result, error: "RADPROMPT_KV ist nicht gebunden."}, {status: 503, headers: {"cache-control": "no-store"}});
  }
  try {
    const value = await env.RADPROMPT_KV.get(KEY, "json") || await env.RADPROMPT_KV.get(LEGACY_KEY, "json");
    result.readable = true;
    result.exists = Boolean(value);
    result.revision = Number(value?.revision || 0);
    result.schemaVersion = Number(value?.schemaVersion || 0);
    result.ok = true;
    return Response.json(result, {headers: {"cache-control": "no-store"}});
  } catch (error) {
    return Response.json({...result, error: error instanceof Error ? error.message : "KV-Lesezugriff fehlgeschlagen."}, {status: 500, headers: {"cache-control": "no-store"}});
  }
}
