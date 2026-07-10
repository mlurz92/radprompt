const KEY = "radprompt:state:v2";
const LEGACY_KEY = "radprompt:state:v1";
const MAX_BYTES = 24 * 1024 * 1024;

const json = (payload, init = {}) => new Response(JSON.stringify(payload), {
  ...init,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff",
    ...(init.headers || {})
  }
});

const error = (status, message, details = undefined) => json({ok: false, error: message, details}, {status});
const timeValue = value => Number.isFinite(Date.parse(value || "")) ? Date.parse(value) : 0;
const clone = value => JSON.parse(JSON.stringify(value));

function normalize(input) {
  const source = input && typeof input === "object" ? clone(input) : {};
  const timestamp = source.updatedAt || new Date().toISOString();
  source.schemaVersion = 2;
  source.revision = Number(source.revision) || 0;
  source.updatedAt = timestamp;
  source.folders = Array.isArray(source.folders) ? source.folders : [];
  source.prompts = Array.isArray(source.prompts) ? source.prompts : [];
  source.tombstones = source.tombstones && typeof source.tombstones === "object" ? source.tombstones : {};
  source.tombstones.folders = source.tombstones.folders && typeof source.tombstones.folders === "object" ? source.tombstones.folders : {};
  source.tombstones.prompts = source.tombstones.prompts && typeof source.tombstones.prompts === "object" ? source.tombstones.prompts : {};
  source.resources = source.resources && typeof source.resources === "object" ? source.resources : {};
  source.resources.schaeferCT = String(source.resources.schaeferCT || "");
  source.resources.schaeferMRT = String(source.resources.schaeferMRT || "");

  source.folders = source.folders.filter(item => item && item.id && item.name).map((item, index) => ({
    id: String(item.id),
    name: String(item.name).trim().slice(0, 100) || "Unbenannter Ordner",
    parentId: item.parentId && item.parentId !== item.id ? String(item.parentId) : null,
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
    createdAt: item.createdAt || timestamp,
    updatedAt: item.updatedAt || timestamp
  }));
  source.prompts = source.prompts.filter(item => item && item.id).map((item, index) => ({
    id: String(item.id),
    title: String(item.title || "Unbenannter Prompt").trim().slice(0, 180) || "Unbenannter Prompt",
    content: String(item.content || ""),
    folderId: item.folderId ? String(item.folderId) : null,
    favorite: Boolean(item.favorite),
    includeSchaeferExamples: Boolean(item.includeSchaeferExamples),
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
    createdAt: item.createdAt || timestamp,
    updatedAt: item.updatedAt || timestamp
  }));

  const folderIds = new Set(source.folders.map(item => item.id));
  source.folders.forEach(item => { if (item.parentId && !folderIds.has(item.parentId)) item.parentId = null; });
  source.prompts.forEach(item => { if (item.folderId && !folderIds.has(item.folderId)) item.folderId = null; });
  return source;
}

function mergeTombstones(a = {}, b = {}) {
  const output = {...a};
  for (const [id, stamp] of Object.entries(b)) {
    if (timeValue(stamp) > timeValue(output[id])) output[id] = stamp;
  }
  return output;
}

function mergeCollection(a, b, tombstones) {
  const map = new Map();
  for (const item of [...a, ...b]) {
    const previous = map.get(item.id);
    if (!previous || timeValue(item.updatedAt) >= timeValue(previous.updatedAt)) map.set(item.id, clone(item));
  }
  return Array.from(map.values()).filter(item => timeValue(tombstones[item.id]) < timeValue(item.updatedAt));
}

function mergeStates(currentInput, incomingInput) {
  if (!currentInput) return normalize(incomingInput);
  const current = normalize(currentInput);
  const incoming = normalize(incomingInput);
  const tombstones = {
    folders: mergeTombstones(current.tombstones.folders, incoming.tombstones.folders),
    prompts: mergeTombstones(current.tombstones.prompts, incoming.tombstones.prompts)
  };
  return normalize({
    schemaVersion: 2,
    revision: Math.max(current.revision, incoming.revision),
    updatedAt: timeValue(incoming.updatedAt) >= timeValue(current.updatedAt) ? incoming.updatedAt : current.updatedAt,
    folders: mergeCollection(current.folders, incoming.folders, tombstones.folders),
    prompts: mergeCollection(current.prompts, incoming.prompts, tombstones.prompts),
    tombstones,
    resources: {
      schaeferCT: incoming.resources.schaeferCT.length >= current.resources.schaeferCT.length ? incoming.resources.schaeferCT : current.resources.schaeferCT,
      schaeferMRT: incoming.resources.schaeferMRT.length >= current.resources.schaeferMRT.length ? incoming.resources.schaeferMRT : current.resources.schaeferMRT
    }
  });
}

function validate(state) {
  if (!Array.isArray(state.prompts) || !Array.isArray(state.folders)) return "Prompts und Ordner müssen Arrays sein.";
  if (state.prompts.length > 10000 || state.folders.length > 3000) return "Der Datenbestand überschreitet die vorgesehenen Grenzen.";
  if (state.prompts.some(item => !item.id || !item.title || typeof item.content !== "string")) return "Mindestens ein Prompt ist ungültig.";
  if (state.folders.some(item => !item.id || !item.name)) return "Mindestens ein Ordner ist ungültig.";
  return null;
}

export async function onRequestGet({env}) {
  if (!env.RADPROMPT_KV) return error(503, "RADPROMPT_KV ist nicht gebunden.");
  const value = await env.RADPROMPT_KV.get(KEY, "json") || await env.RADPROMPT_KV.get(LEGACY_KEY, "json");
  if (!value) return new Response(null, {status: 204, headers: {"cache-control": "no-store"}});
  return json(normalize(value), {headers: {etag: `W/\"${Number(value.revision) || 0}\"`}});
}

export async function onRequestPut({request, env}) {
  if (!env.RADPROMPT_KV) return error(503, "RADPROMPT_KV ist nicht gebunden.");
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BYTES) return error(413, "Der RadPrompt-Datenbestand ist zu groß.");

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return error(413, "Der RadPrompt-Datenbestand ist zu groß.");

  let incoming;
  try {
    incoming = normalize(JSON.parse(raw));
  } catch {
    return error(400, "Ungültiges JSON.");
  }
  const validationError = validate(incoming);
  if (validationError) return error(422, validationError);

  const current = await env.RADPROMPT_KV.get(KEY, "json") || await env.RADPROMPT_KV.get(LEGACY_KEY, "json");
  const merged = mergeStates(current, incoming);
  merged.revision = Math.max(Number(current?.revision || 0), Number(incoming.revision || 0)) + 1;
  merged.updatedAt = new Date().toISOString();
  await env.RADPROMPT_KV.put(KEY, JSON.stringify(merged));
  return json(merged, {headers: {etag: `W/\"${merged.revision}\"`}});
}

export const onRequestPost = onRequestPut;

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      allow: "GET, PUT, POST, OPTIONS",
      "cache-control": "no-store",
      "access-control-allow-methods": "GET, PUT, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-radprompt-client"
    }
  });
}
