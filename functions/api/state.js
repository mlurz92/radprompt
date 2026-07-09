const STATE_KEY = "radprompt:state:v1";
const MAX_BYTES = 20 * 1024 * 1024;

function json(payload, init = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(),
      ...(init.headers || {})
    }
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, PUT, OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}

function getKv(context) {
  return context.env && context.env.RADPROMPT_KV;
}

function validateState(value) {
  if (!value || typeof value !== "object") return "State muss ein JSON-Objekt sein.";
  if (value.schema && value.schema !== "radprompt-state") return "Ungültiges Schema.";
  if (!Array.isArray(value.folders)) return "folders muss ein Array sein.";
  if (!Array.isArray(value.prompts)) return "prompts muss ein Array sein.";
  if (value.folders.length > 500) return "Zu viele Ordner.";
  if (value.prompts.length > 5000) return "Zu viele Prompts.";
  for (const folder of value.folders) {
    if (!folder.id || !folder.name) return "Jeder Ordner benötigt id und name.";
  }
  for (const prompt of value.prompts) {
    if (!prompt.id || !prompt.title || typeof prompt.body !== "string") return "Jeder Prompt benötigt id, title und body.";
  }
  return null;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  const kv = getKv(context);
  if (!kv) {
    return json({ ok: false, code: "KV_BINDING_MISSING", message: "RADPROMPT_KV ist nicht gebunden." }, { status: 503 });
  }
  const raw = await kv.get(STATE_KEY);
  if (!raw) {
    return json({ ok: false, code: "STATE_EMPTY", message: "Noch kein RadPrompt-State in KV gespeichert." }, { status: 404 });
  }
  try {
    const state = JSON.parse(raw);
    return json({ ok: true, source: "kv", key: STATE_KEY, bytes: new TextEncoder().encode(raw).length, state });
  } catch (error) {
    return json({ ok: false, code: "STATE_INVALID_JSON", message: "Gespeicherter KV-State ist kein valides JSON." }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const kv = getKv(context);
  if (!kv) {
    return json({ ok: false, code: "KV_BINDING_MISSING", message: "RADPROMPT_KV ist nicht gebunden." }, { status: 503 });
  }
  const raw = await context.request.text();
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > MAX_BYTES) {
    return json({ ok: false, code: "STATE_TOO_LARGE", message: `State ist zu groß: ${bytes} Bytes.` }, { status: 413 });
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return json({ ok: false, code: "BAD_JSON", message: "Request Body ist kein valides JSON." }, { status: 400 });
  }
  const validationError = validateState(parsed);
  if (validationError) {
    return json({ ok: false, code: "BAD_STATE", message: validationError }, { status: 400 });
  }
  parsed.schema = "radprompt-state";
  parsed.version = Number(parsed.version || 1);
  parsed.updatedAt = new Date().toISOString();
  await kv.put(STATE_KEY, JSON.stringify(parsed));
  return json({ ok: true, source: "kv", key: STATE_KEY, bytes, updatedAt: parsed.updatedAt });
}
