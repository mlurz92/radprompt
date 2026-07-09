const STATE_KEY = "radprompt:state:v1";
const PROBE_KEY = "radprompt:health:probe";

function json(payload, init = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function safeJson(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function onRequestGet(context) {
  const request = context.request;
  const url = new URL(request.url);
  const kv = context.env && context.env.RADPROMPT_KV;
  const result = {
    ok: false,
    kv: false,
    state: {
      exists: false,
      readable: false,
      validJson: false,
      schema: "",
      version: 0,
      folders: 0,
      prompts: 0,
      favorites: 0,
      bytes: 0,
      updatedAt: "",
      seedHash: ""
    },
    probes: {
      binding: Boolean(kv),
      read: false,
      write: false,
      list: { supported: false, keys: 0, cursor: "", truncated: false }
    },
    message: "RADPROMPT_KV ist nicht gebunden.",
    runtime: {
      endpoint: url.pathname,
      hostname: url.hostname,
      protocol: url.protocol,
      method: request.method,
      userAgent: request.headers.get("user-agent") || "",
      time: new Date().toISOString()
    }
  };

  if (!kv) return json(result, { status: 503 });
  result.kv = true;

  try {
    await kv.put(PROBE_KEY, JSON.stringify({ time: result.runtime.time }), { expirationTtl: 600 });
    const probe = await kv.get(PROBE_KEY);
    result.probes.write = Boolean(probe);
  } catch (error) {
    result.message = `KV-Schreibprobe fehlgeschlagen: ${error.message}`;
    return json(result, { status: 500 });
  }

  try {
    const raw = await kv.get(STATE_KEY);
    result.probes.read = true;
    result.state.readable = true;
    result.state.exists = Boolean(raw);
    result.state.bytes = raw ? new TextEncoder().encode(raw).length : 0;
    const parsed = safeJson(raw);
    result.state.validJson = Boolean(parsed);
    if (parsed) {
      result.state.schema = parsed.schema || "";
      result.state.version = Number(parsed.version || 0);
      result.state.folders = Array.isArray(parsed.folders) ? parsed.folders.length : 0;
      result.state.prompts = Array.isArray(parsed.prompts) ? parsed.prompts.length : 0;
      result.state.favorites = Array.isArray(parsed.prompts) ? parsed.prompts.filter(item => item.favorite).length : 0;
      result.state.updatedAt = parsed.updatedAt || "";
      result.state.seedHash = parsed.seedHash || "";
    }
  } catch (error) {
    result.message = `KV-Leseprobe fehlgeschlagen: ${error.message}`;
    return json(result, { status: 500 });
  }

  if (typeof kv.list === "function") {
    try {
      const listed = await kv.list({ prefix: "radprompt:", limit: 25 });
      result.probes.list = {
        supported: true,
        keys: listed.keys.length,
        cursor: listed.cursor || "",
        truncated: Boolean(listed.list_complete === false)
      };
    } catch (error) {
      result.probes.list = { supported: true, keys: 0, cursor: "", truncated: false, error: error.message };
    }
  }

  result.ok = result.probes.binding && result.probes.read && result.probes.write;
  result.message = result.state.exists ? "RADPROMPT_KV ist gebunden und les-/schreibbar." : "RADPROMPT_KV ist gebunden, aber der RadPrompt-State ist noch leer.";
  return json(result, { status: result.ok ? 200 : 500 });
}
