const STATE_KEY = "radprompt:state:v1";
const MAX_BODY_BYTES = 1_048_576;
const SCHEMA = "radprompt-state-v1";
const VERSION = 1;

const baseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept,If-Match,If-None-Match",
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

const textEncoder = new TextEncoder();

const nowIso = () => new Date().toISOString();

const createJsonResponse = (payload, status = 200, extraHeaders = {}) => new Response(JSON.stringify(payload, null, 2), {
  status,
  headers: {
    ...jsonHeaders,
    ...extraHeaders
  }
});

const createNoContentResponse = (extraHeaders = {}) => new Response(null, {
  status: 204,
  headers: {
    ...baseHeaders,
    ...extraHeaders
  }
});

const createErrorResponse = (status, error, detail = "", extra = {}) => createJsonResponse({
  ok: false,
  error,
  detail,
  ...extra,
  timestamp: nowIso()
}, status);

const hasKv = env => Boolean(env && env.RADPROMPT_KV && typeof env.RADPROMPT_KV.get === "function" && typeof env.RADPROMPT_KV.put === "function");

const stableStringify = value => {
  const seen = new WeakSet();
  const sort = input => {
    if (input === null || typeof input !== "object") return input;
    if (seen.has(input)) return null;
    seen.add(input);
    if (Array.isArray(input)) return input.map(sort);
    return Object.keys(input).sort().reduce((acc, key) => {
      acc[key] = sort(input[key]);
      return acc;
    }, {});
  };
  return JSON.stringify(sort(value));
};

const hashString = async value => {
  const bytes = textEncoder.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `"${hex.slice(0, 32)}"`;
};

const byteLength = value => textEncoder.encode(value).byteLength;

const safeText = async request => {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    const error = new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes.`);
    error.status = 413;
    throw error;
  }
  const text = await request.text();
  const size = byteLength(text);
  if (size > MAX_BODY_BYTES) {
    const error = new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes.`);
    error.status = 413;
    throw error;
  }
  return text;
};

const parseBody = async request => {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const error = new Error("Content-Type must be application/json.");
    error.status = 415;
    throw error;
  }
  const text = await safeText(request);
  if (!text.trim()) {
    const error = new Error("Request body is empty.");
    error.status = 400;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Request body is not valid JSON.");
    error.status = 400;
    throw error;
  }
};

const normalizeString = value => value === null || value === undefined ? "" : String(value);

const normalizeArray = value => Array.isArray(value) ? value : [];

const normalizeObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};

const normalizeFolder = (folder, index) => {
  const record = normalizeObject(folder);
  return {
    id: normalizeString(record.id).trim() || `folder-${index + 1}`,
    title: normalizeString(record.title).trim() || `Ordner ${index + 1}`,
    description: normalizeString(record.description).trim(),
    order: Number.isFinite(Number(record.order)) ? Number(record.order) : index,
    tone: normalizeString(record.tone).trim() || "graphite",
    locked: Boolean(record.locked),
    createdAt: normalizeString(record.createdAt).trim() || nowIso(),
    updatedAt: normalizeString(record.updatedAt).trim() || normalizeString(record.createdAt).trim() || nowIso()
  };
};

const normalizePrompt = (prompt, index, folderIds) => {
  const record = normalizeObject(prompt);
  const title = normalizeString(record.title).trim() || `Prompt ${index + 1}`;
  const body = normalizeString(record.body || record.prompt || record.text).replace(/\r\n?/g, "\n").trim();
  const folderId = folderIds.has(record.folderId) ? record.folderId : folderIds.has("folder-allgemein") ? "folder-allgemein" : Array.from(folderIds)[0] || "folder-allgemein";
  return {
    id: normalizeString(record.id).trim() || `prompt-${index + 1}`,
    title,
    body,
    folderId,
    order: Number.isFinite(Number(record.order)) ? Number(record.order) : index,
    favorite: Boolean(record.favorite),
    profSchaefer: Boolean(record.profSchaefer),
    tone: normalizeString(record.tone).trim() || "graphite",
    tags: normalizeArray(record.tags).map(item => normalizeString(item).trim()).filter(Boolean),
    placeholderDefaults: normalizeObject(record.placeholderDefaults),
    archived: Boolean(record.archived),
    createdAt: normalizeString(record.createdAt).trim() || nowIso(),
    updatedAt: normalizeString(record.updatedAt).trim() || normalizeString(record.createdAt).trim() || nowIso()
  };
};

const normalizeState = input => {
  const source = normalizeObject(input && input.state ? input.state : input);
  const folders = normalizeArray(source.folders).map(normalizeFolder).filter(folder => folder.id && folder.title);
  const effectiveFolders = folders.length ? folders : [
    normalizeFolder({ id: "folder-allgemein", title: "Allgemein", description: "Allgemeine Prompt-Templates", order: 0, tone: "graphite" }, 0)
  ];
  const folderIds = new Set(effectiveFolders.map(folder => folder.id));
  const prompts = normalizeArray(source.prompts).map((prompt, index) => normalizePrompt(prompt, index, folderIds)).filter(prompt => prompt.id && prompt.title && prompt.body);
  const promptIds = new Set(prompts.map(prompt => prompt.id));
  const favoriteOrder = normalizeArray(source.favoriteOrder).map(normalizeString).filter(id => promptIds.has(id));
  for (const prompt of prompts) {
    if (prompt.favorite && !favoriteOrder.includes(prompt.id)) favoriteOrder.push(prompt.id);
  }
  return {
    version: Number(source.version) || VERSION,
    schema: normalizeString(source.schema).trim() || SCHEMA,
    app: {
      name: normalizeString(source.app?.name).trim() || "RadPrompt",
      description: normalizeString(source.app?.description).trim() || "Radiologisches Prompt-Board für Cloudflare Pages und Workers KV",
      createdAt: normalizeString(source.app?.createdAt).trim() || nowIso(),
      updatedAt: nowIso(),
      seededAt: normalizeString(source.app?.seededAt).trim() || normalizeString(source.app?.createdAt).trim() || nowIso()
    },
    ui: {
      activeFolderId: normalizeString(source.ui?.activeFolderId).trim() || "all",
      activeFilter: normalizeString(source.ui?.activeFilter).trim() || "all",
      query: normalizeString(source.ui?.query),
      view: normalizeString(source.ui?.view).trim() || "board",
      compact: Boolean(source.ui?.compact),
      drawerOpen: Boolean(source.ui?.drawerOpen),
      selectedPromptId: normalizeString(source.ui?.selectedPromptId)
    },
    folders: effectiveFolders.map((folder, index) => ({ ...folder, order: Number.isFinite(Number(folder.order)) ? Number(folder.order) : index })).sort((a, b) => a.order - b.order),
    prompts: prompts.map((prompt, index) => ({ ...prompt, order: Number.isFinite(Number(prompt.order)) ? Number(prompt.order) : index })).sort((a, b) => a.order - b.order),
    favoriteOrder,
    documents: {
      profCtLabel: normalizeString(source.documents?.profCtLabel).trim() || "# Befundbeispiele Prof. Schäfer CT",
      profMrtLabel: normalizeString(source.documents?.profMrtLabel).trim() || "# Befundbeispiele Prof. Schäfer MRT",
      profCtUpdatedAt: normalizeString(source.documents?.profCtUpdatedAt).trim(),
      profMrtUpdatedAt: normalizeString(source.documents?.profMrtUpdatedAt).trim()
    }
  };
};

const validateState = state => {
  const errors = [];
  const warnings = [];
  const folderIds = new Set();
  const promptIds = new Set();
  if (!state || typeof state !== "object" || Array.isArray(state)) errors.push("State must be an object.");
  if (state.schema !== SCHEMA) warnings.push(`Unexpected schema: ${state.schema || "missing"}.`);
  if (!Array.isArray(state.folders) || !state.folders.length) errors.push("State must contain at least one folder.");
  if (!Array.isArray(state.prompts)) errors.push("State prompts must be an array.");
  for (const folder of normalizeArray(state.folders)) {
    if (!folder.id) errors.push("Folder without id.");
    if (!folder.title) errors.push(`Folder without title: ${folder.id || "unknown"}.`);
    if (folderIds.has(folder.id)) errors.push(`Duplicate folder id: ${folder.id}.`);
    folderIds.add(folder.id);
  }
  for (const prompt of normalizeArray(state.prompts)) {
    if (!prompt.id) errors.push(`Prompt without id: ${prompt.title || "unknown"}.`);
    if (!prompt.title) errors.push(`Prompt without title: ${prompt.id || "unknown"}.`);
    if (!prompt.body) errors.push(`Prompt without body: ${prompt.title || prompt.id || "unknown"}.`);
    if (promptIds.has(prompt.id)) errors.push(`Duplicate prompt id: ${prompt.id}.`);
    if (prompt.folderId && !folderIds.has(prompt.folderId)) errors.push(`Prompt references unknown folder: ${prompt.title || prompt.id}.`);
    promptIds.add(prompt.id);
  }
  for (const id of normalizeArray(state.favoriteOrder)) {
    if (!promptIds.has(id)) warnings.push(`favoriteOrder references unknown prompt id: ${id}.`);
  }
  return { ok: errors.length === 0, errors, warnings };
};

const loadState = async env => {
  const value = await env.RADPROMPT_KV.get(STATE_KEY, { type: "text" });
  if (!value) return null;
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    const error = new Error("Stored KV state is not valid JSON.");
    error.status = 500;
    throw error;
  }
  return normalizeState(parsed);
};

const storeState = async (env, state, request) => {
  const normalized = normalizeState(state);
  const validation = validateState(normalized);
  if (!validation.ok) {
    const error = new Error(validation.errors.join(" "));
    error.status = 422;
    error.validation = validation;
    throw error;
  }
  const serialized = JSON.stringify(normalized);
  const size = byteLength(serialized);
  if (size > MAX_BODY_BYTES) {
    const error = new Error(`Normalized state exceeds ${MAX_BODY_BYTES} bytes.`);
    error.status = 413;
    throw error;
  }
  const current = await env.RADPROMPT_KV.get(STATE_KEY, { type: "text" });
  const currentEtag = current ? await hashString(stableStringify(JSON.parse(current))) : null;
  const ifMatch = request.headers.get("if-match");
  if (ifMatch && currentEtag && ifMatch !== currentEtag && ifMatch !== "*") {
    const error = new Error("If-Match precondition failed.");
    error.status = 412;
    error.currentEtag = currentEtag;
    throw error;
  }
  const etag = await hashString(stableStringify(normalized));
  await env.RADPROMPT_KV.put(STATE_KEY, serialized, {
    metadata: {
      schema: normalized.schema,
      version: normalized.version,
      promptCount: normalized.prompts.length,
      folderCount: normalized.folders.length,
      favoriteCount: normalized.prompts.filter(prompt => prompt.favorite).length,
      size,
      updatedAt: normalized.app.updatedAt,
      etag
    }
  });
  return { normalized, validation, etag, size };
};

export async function onRequestOptions() {
  return createNoContentResponse();
}

export async function onRequestGet({ env, request }) {
  if (!hasKv(env)) {
    return createErrorResponse(500, "RADPROMPT_KV binding missing", "Create a Cloudflare Pages KV binding named RADPROMPT_KV.");
  }
  try {
    const state = await loadState(env);
    if (!state) {
      return createErrorResponse(404, "State not found", "No RadPrompt state has been stored in RADPROMPT_KV yet.");
    }
    const serialized = JSON.stringify(state);
    const etag = await hashString(stableStringify(state));
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ...baseHeaders,
          "ETag": etag,
          "Last-Modified": new Date(state.app.updatedAt || Date.now()).toUTCString()
        }
      });
    }
    return createJsonResponse({
      ok: true,
      key: STATE_KEY,
      state,
      metrics: {
        folders: state.folders.length,
        prompts: state.prompts.length,
        favorites: state.prompts.filter(prompt => prompt.favorite).length,
        bytes: byteLength(serialized)
      },
      timestamp: nowIso()
    }, 200, {
      "ETag": etag,
      "Last-Modified": new Date(state.app.updatedAt || Date.now()).toUTCString()
    });
  } catch (error) {
    return createErrorResponse(error.status || 500, "State read failed", error.message || "Unknown KV read error.");
  }
}

export async function onRequestPut({ env, request }) {
  if (!hasKv(env)) {
    return createErrorResponse(500, "RADPROMPT_KV binding missing", "Create a Cloudflare Pages KV binding named RADPROMPT_KV.");
  }
  try {
    const body = await parseBody(request);
    const stored = await storeState(env, body, request);
    return createJsonResponse({
      ok: true,
      key: STATE_KEY,
      etag: stored.etag,
      metrics: {
        folders: stored.normalized.folders.length,
        prompts: stored.normalized.prompts.length,
        favorites: stored.normalized.prompts.filter(prompt => prompt.favorite).length,
        bytes: stored.size
      },
      warnings: stored.validation.warnings,
      timestamp: nowIso()
    }, 200, {
      "ETag": stored.etag,
      "Last-Modified": new Date(stored.normalized.app.updatedAt || Date.now()).toUTCString()
    });
  } catch (error) {
    return createErrorResponse(error.status || 500, "State write failed", error.message || "Unknown KV write error.", error.validation ? { validation: error.validation } : error.currentEtag ? { currentEtag: error.currentEtag } : {});
  }
}

export async function onRequestPost(context) {
  return onRequestPut(context);
}

export async function onRequest({ request }) {
  return createErrorResponse(405, "Method not allowed", `${request.method} is not supported for /api/state.`);
}