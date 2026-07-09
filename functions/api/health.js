const STATE_KEY = "radprompt:state:v1";
const HEALTH_PREFIX = "radprompt:health:";
const SCHEMA = "radprompt-state-v1";

const baseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer"
};

const jsonHeaders = {
  ...baseHeaders,
  "Content-Type": "application/json; charset=utf-8"
};

const encoder = new TextEncoder();

const nowIso = () => new Date().toISOString();

const createJsonResponse = (payload, status = 200, extraHeaders = {}) => new Response(JSON.stringify(payload, null, 2), {
  status,
  headers: {
    ...jsonHeaders,
    ...extraHeaders
  }
});

const createHeadResponse = (status = 204, extraHeaders = {}) => new Response(null, {
  status,
  headers: {
    ...baseHeaders,
    ...extraHeaders
  }
});

const hasKvBinding = env => Boolean(
  env &&
  env.RADPROMPT_KV &&
  typeof env.RADPROMPT_KV.get === "function" &&
  typeof env.RADPROMPT_KV.put === "function" &&
  typeof env.RADPROMPT_KV.delete === "function"
);

const hasKvList = env => Boolean(env?.RADPROMPT_KV && typeof env.RADPROMPT_KV.list === "function");

const byteLength = value => encoder.encode(String(value ?? "")).byteLength;

const safeJsonParse = value => {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const hashString = async value => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(value ?? "")));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
};

const normalizeStateMetrics = value => {
  const parsed = safeJsonParse(value);
  if (!parsed || typeof parsed !== "object") {
    return {
      exists: Boolean(value),
      readable: Boolean(value),
      validJson: false,
      schema: "",
      version: 0,
      folders: 0,
      prompts: 0,
      favorites: 0,
      bytes: value ? byteLength(value) : 0,
      updatedAt: "",
      seededAt: "",
      hash: ""
    };
  }
  const prompts = Array.isArray(parsed.prompts) ? parsed.prompts : [];
  const folders = Array.isArray(parsed.folders) ? parsed.folders : [];
  return {
    exists: true,
    readable: true,
    validJson: true,
    schema: typeof parsed.schema === "string" ? parsed.schema : "",
    version: Number(parsed.version) || 0,
    folders: folders.length,
    prompts: prompts.length,
    favorites: prompts.filter(prompt => prompt && prompt.favorite).length,
    bytes: byteLength(value),
    updatedAt: typeof parsed.app?.updatedAt === "string" ? parsed.app.updatedAt : "",
    seededAt: typeof parsed.app?.seededAt === "string" ? parsed.app.seededAt : "",
    hash: ""
  };
};

const getStateInfo = async env => {
  const value = await env.RADPROMPT_KV.get(STATE_KEY, { type: "text" });
  const metrics = normalizeStateMetrics(value);
  metrics.hash = value ? await hashString(value) : "";
  return metrics;
};

const runWriteProbe = async env => {
  const timestamp = nowIso();
  const key = `${HEALTH_PREFIX}${crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
  const value = JSON.stringify({
    ok: true,
    source: "RadPrompt health check",
    timestamp
  });
  const metadata = {
    source: "radprompt-health",
    timestamp,
    bytes: byteLength(value)
  };
  const started = Date.now();
  await env.RADPROMPT_KV.put(key, value, {
    expirationTtl: 60,
    metadata
  });
  const readBack = await env.RADPROMPT_KV.getWithMetadata(key, { type: "text" }).catch(async () => ({
    value: await env.RADPROMPT_KV.get(key, { type: "text" }),
    metadata: null
  }));
  const deleted = await env.RADPROMPT_KV.delete(key).then(() => true).catch(() => false);
  const durationMs = Date.now() - started;
  const parsed = safeJsonParse(readBack?.value);
  const verified = Boolean(parsed && parsed.ok === true && parsed.timestamp === timestamp);
  return {
    key,
    write: true,
    read: Boolean(readBack?.value),
    verified,
    deleted,
    durationMs,
    metadataReturned: Boolean(readBack?.metadata),
    metadata
  };
};

const runListProbe = async env => {
  if (!hasKvList(env)) {
    return {
      supported: false,
      keys: 0,
      cursor: "",
      truncated: false
    };
  }
  const listed = await env.RADPROMPT_KV.list({ prefix: "radprompt:", limit: 20 });
  return {
    supported: true,
    keys: Array.isArray(listed.keys) ? listed.keys.length : 0,
    cursor: listed.cursor || "",
    truncated: Boolean(listed.list_complete === false)
  };
};

const buildRuntimeInfo = request => {
  const url = new URL(request.url);
  return {
    endpoint: url.pathname,
    hostname: url.hostname,
    protocol: url.protocol,
    method: request.method,
    userAgent: request.headers.get("user-agent") || "",
    cfRay: request.headers.get("cf-ray") || "",
    colo: request.cf?.colo || "",
    country: request.cf?.country || "",
    timezone: request.cf?.timezone || "",
    tlsVersion: request.cf?.tlsVersion || "",
    httpProtocol: request.cf?.httpProtocol || ""
  };
};

const createMissingKvPayload = request => ({
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
    seededAt: "",
    hash: ""
  },
  probes: {
    binding: false,
    read: false,
    write: false,
    list: {
      supported: false,
      keys: 0,
      cursor: "",
      truncated: false
    }
  },
  message: "RADPROMPT_KV ist nicht gebunden. Im Cloudflare Pages Dashboard muss ein KV namespace binding mit dem Namen RADPROMPT_KV gesetzt werden.",
  runtime: buildRuntimeInfo(request),
  timestamp: nowIso()
});

const createHealthPayload = async (env, request) => {
  if (!hasKvBinding(env)) return createMissingKvPayload(request);
  const started = Date.now();
  const state = await getStateInfo(env);
  const writeProbe = await runWriteProbe(env);
  const listProbe = await runListProbe(env);
  const schemaOk = !state.exists || state.schema === SCHEMA;
  const kvOk = Boolean(writeProbe.write && writeProbe.read && writeProbe.verified && writeProbe.deleted);
  const ok = Boolean(kvOk && schemaOk);
  return {
    ok,
    kv: kvOk,
    schema: schemaOk,
    state,
    probes: {
      binding: true,
      read: true,
      write: writeProbe,
      list: listProbe
    },
    message: ok
      ? state.exists
        ? `RADPROMPT_KV aktiv. State vorhanden: ${state.prompts} Prompts, ${state.folders} Ordner, ${state.favorites} Favoriten.`
        : "RADPROMPT_KV aktiv. Noch kein gespeicherter RadPrompt-State vorhanden."
      : schemaOk
        ? "RADPROMPT_KV erreichbar, aber Schreib-/Leseprobe nicht vollständig erfolgreich."
        : `RADPROMPT_KV erreichbar, gespeicherter State mit unerwartetem Schema: ${state.schema || "missing"}.`,
    runtime: buildRuntimeInfo(request),
    durationMs: Date.now() - started,
    timestamp: nowIso()
  };
};

export async function onRequestOptions() {
  return createHeadResponse(204);
}

export async function onRequestHead({ env, request }) {
  try {
    const payload = await createHealthPayload(env, request);
    return createHeadResponse(payload.kv ? 204 : 503, {
      "X-RadPrompt-KV": payload.kv ? "ok" : "missing-or-failed",
      "X-RadPrompt-State": payload.state?.exists ? "present" : "absent"
    });
  } catch {
    return createHeadResponse(503, {
      "X-RadPrompt-KV": "failed"
    });
  }
}

export async function onRequestGet({ env, request }) {
  try {
    const payload = await createHealthPayload(env, request);
    return createJsonResponse(payload, 200, {
      "X-RadPrompt-KV": payload.kv ? "ok" : "missing-or-failed",
      "X-RadPrompt-State": payload.state?.exists ? "present" : "absent"
    });
  } catch (error) {
    return createJsonResponse({
      ok: false,
      kv: false,
      error: "Health check failed",
      message: error.message || "Unbekannter Fehler bei der KV-Diagnostik.",
      runtime: buildRuntimeInfo(request),
      timestamp: nowIso()
    }, 200, {
      "X-RadPrompt-KV": "failed"
    });
  }
}

export async function onRequest({ request }) {
  return createJsonResponse({
    ok: false,
    kv: false,
    error: "Method not allowed",
    message: `${request.method} is not supported for /api/health.`,
    runtime: buildRuntimeInfo(request),
    timestamp: nowIso()
  }, 405, {
    "Allow": "GET,HEAD,OPTIONS"
  });
}