const SCHEMA = "radprompt.v1";
const STATE_KEY = "radprompt:state:v1";
const BACKUP_PREFIX = "radprompt:backup:";
const LIMIT = 24 * 1024 * 1024;
const FOLDERS = [
  { id: "befundung", name: "Befundung", icon: "scan-search", order: 0 },
  { id: "prof-schaefer", name: "Prof. Schäfer", icon: "stethoscope", order: 1 },
  { id: "wissen", name: "Wissen", icon: "book-open", order: 2 },
  { id: "allgemein", name: "Allgemein", icon: "sparkles", order: 3 }
];
const SETTINGS = {
  selected: "all",
  sort: "manual",
  compact: false,
  autosave: true,
  viewMode: "grid",
  effects: true,
  denseCards: false,
  selectedFolder: "all",
  sortMode: "manual",
  activeView: "all"
};
const ASSETS = {
  prompts: "/data/Beispielprompts.txt",
  schaeferCt: "/data/Befundbeispiele Prof. Schäfer CT.txt",
  schaeferMrt: "/data/Befundbeispiele Prof. Schäfer MRT.txt"
};
const TITLES = {
  schaeferCt: "# Befundbeispiele Prof. Schäfer CT.txt",
  schaeferMrt: "# Befundbeispiele Prof. Schäfer MRT.txt"
};

export async function onRequest(context) {
  const h = helpers(context);
  context.data = context.data || {};
  context.data.radprompt = h;
  if (h.isApi && context.request.method === "OPTIONS") return new Response(null, { status: 204, headers: h.headers() });
  try {
    const response = await context.next();
    return h.finalize(response);
  } catch (error) {
    return h.error(error);
  }
}

function helpers(context) {
  const request = context.request;
  const url = new URL(request.url);
  const started = Date.now();
  const isApi = url.pathname === "/api" || url.pathname.startsWith("/api/");
  const h = {
    context,
    request,
    url,
    isApi,
    schema: SCHEMA,
    stateKey: STATE_KEY,
    backupPrefix: BACKUP_PREFIX,
    assets: ASSETS,
    titles: TITLES,
    headers,
    json,
    text,
    error,
    finalize,
    method,
    kv,
    requireKv,
    getKv,
    putKv,
    deleteKv,
    listKv,
    readJson,
    emptyState,
    normalizeState,
    normalizePrompt,
    normalizeFolder,
    normalizeDocument,
    normalizeSettings,
    summarize,
    parsePrompts,
    assetText,
    assetMeta,
    hashText,
    hashJson,
    byteLength,
    stable,
    uid,
    slug,
    clean,
    unique,
    now,
    parseBool,
    backupState,
    backupKey,
    limit,
    runtime,
    safeJsonParse,
    jsonReplacer
  };
  return h;

  function headers(extra = {}) {
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Access-Control-Allow-Origin": originOk() ? url.origin : "null",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Accept,If-Match,If-None-Match,X-RadPrompt-Hash",
      "Access-Control-Expose-Headers": "ETag,X-RadPrompt-Hash,X-RadPrompt-Version,X-RadPrompt-Bytes",
      "Vary": "Origin"
    });
    for (const [key, value] of Object.entries(extra || {})) {
      if (value !== undefined && value !== null) headers.set(key, String(value));
    }
    return headers;
  }

  function originOk() {
    const origin = request.headers.get("Origin");
    if (!origin) return true;
    try {
      return new URL(origin).origin === url.origin;
    } catch {
      return false;
    }
  }

  function json(body = {}, init = {}) {
    const payload = JSON.stringify(body, jsonReplacer, init.compact ? 0 : 2);
    const responseHeaders = headers(init.headers || {});
    responseHeaders.set("X-RadPrompt-Bytes", String(byteLength(payload)));
    return new Response(payload, { status: init.status || 200, headers: responseHeaders });
  }

  function text(body = "", init = {}) {
    const responseHeaders = isApi ? headers(init.headers || {}) : new Headers({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    if (init.type) responseHeaders.set("Content-Type", init.type);
    responseHeaders.set("X-RadPrompt-Bytes", String(byteLength(body)));
    return new Response(String(body), { status: init.status || 200, headers: responseHeaders });
  }

  function error(err) {
    const rawStatus = Number(err?.status || err?.statusCode || 500);
    const status = rawStatus >= 100 && rawStatus < 600 ? rawStatus : 500;
    return json({
      ok: false,
      status,
      message: status >= 500 ? "Interner RadPrompt-Fehler." : clean(err?.message || "Fehler", 800),
      runtime: runtime()
    }, { status });
  }

  function finalize(response) {
    if (!isApi) return response;
    const responseHeaders = headers(Object.fromEntries(response.headers.entries()));
    responseHeaders.set("X-RadPrompt-Runtime", String(Date.now() - started));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
  }

  function method(list) {
    const allowed = (Array.isArray(list) ? list : [list]).map(item => String(item).toUpperCase());
    if (!allowed.includes(request.method.toUpperCase())) {
      const err = new Error(`Methode ${request.method} nicht erlaubt.`);
      err.status = 405;
      throw err;
    }
  }

  function kv() {
    return context.env?.RADPROMPT_KV || null;
  }

  function requireKv() {
    if (!kv()) {
      const err = new Error("RADPROMPT_KV ist nicht gebunden.");
      err.status = 503;
      throw err;
    }
  }

  async function getKv(key, options) {
    requireKv();
    return options ? kv().get(String(key), options) : kv().get(String(key));
  }

  async function putKv(key, value, options = {}) {
    requireKv();
    const body = typeof value === "string" ? value : JSON.stringify(value, jsonReplacer);
    limit(body);
    const cleanOptions = {};
    if (options.metadata !== undefined) cleanOptions.metadata = options.metadata;
    if (options.expiration !== undefined) cleanOptions.expiration = options.expiration;
    if (options.expirationTtl !== undefined) cleanOptions.expirationTtl = options.expirationTtl;
    return Object.keys(cleanOptions).length ? kv().put(String(key), body, cleanOptions) : kv().put(String(key), body);
  }

  async function deleteKv(key) {
    requireKv();
    return kv().delete(String(key));
  }

  async function listKv(options = {}) {
    requireKv();
    const cleanOptions = {};
    if (options.prefix) cleanOptions.prefix = String(options.prefix);
    if (options.limit) cleanOptions.limit = Math.max(1, Math.min(1000, Number(options.limit) || 100));
    if (options.cursor) cleanOptions.cursor = String(options.cursor);
    return kv().list(cleanOptions);
  }

  async function readJson() {
    const raw = await request.clone().text();
    if (!raw.trim()) return {};
    if (byteLength(raw) > LIMIT) {
      const err = new Error("Request zu groß.");
      err.status = 413;
      throw err;
    }
    try {
      return JSON.parse(raw);
    } catch {
      const err = new Error("Ungültiges JSON.");
      err.status = 400;
      throw err;
    }
  }

  function safeJsonParse(raw, fallback = null) {
    try {
      return JSON.parse(String(raw || ""));
    } catch {
      return fallback;
    }
  }

  function emptyState() {
    const t = now();
    return {
      schema: SCHEMA,
      version: 0,
      updatedAt: t,
      folders: FOLDERS.map(folder => ({ ...folder, createdAt: t, updatedAt: t })),
      prompts: [],
      favorites: [],
      documents: {
        schaeferCt: { title: TITLES.schaeferCt, text: "", updatedAt: "" },
        schaeferMrt: { title: TITLES.schaeferMrt, text: "", updatedAt: "" }
      },
      settings: { ...SETTINGS },
      meta: { seededAt: "", source: "", hash: "" }
    };
  }

  function normalizeState(input = {}) {
    const raw = input && typeof input === "object" ? input : {};
    const base = emptyState();
    const folders = uniqueById((Array.isArray(raw.folders) && raw.folders.length ? raw.folders : base.folders).map(normalizeFolder).filter(folder => folder.id && folder.name));
    const folderIds = new Set(folders.map(folder => folder.id));
    const fallbackFolder = folders[0]?.id || "allgemein";
    const prompts = uniqueById((Array.isArray(raw.prompts) ? raw.prompts : []).map((prompt, index) => normalizePrompt(prompt, fallbackFolder, index)).filter(prompt => prompt.id && prompt.title));
    for (const prompt of prompts) {
      if (!folderIds.has(prompt.folderId)) prompt.folderId = fallbackFolder;
    }
    const promptIds = new Set(prompts.map(prompt => prompt.id));
    const favorites = unique([...(Array.isArray(raw.favorites) ? raw.favorites : []), ...prompts.filter(prompt => prompt.favorite).map(prompt => prompt.id)]).map(String).filter(id => promptIds.has(id));
    return {
      schema: SCHEMA,
      version: Math.max(0, Number(raw.version || 0)),
      updatedAt: validDate(raw.updatedAt) || base.updatedAt,
      folders: folders.sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.name.localeCompare(b.name, "de", { sensitivity: "base" })).map((folder, index) => ({ ...folder, order: index })),
      prompts: prompts.sort((a, b) => String(a.folderId).localeCompare(String(b.folderId)) || Number(a.order || 0) - Number(b.order || 0) || a.title.localeCompare(b.title, "de", { sensitivity: "base" })),
      favorites,
      documents: {
        schaeferCt: normalizeDocument(raw.documents?.schaeferCt, { title: TITLES.schaeferCt, text: "", updatedAt: "" }),
        schaeferMrt: normalizeDocument(raw.documents?.schaeferMrt, { title: TITLES.schaeferMrt, text: "", updatedAt: "" })
      },
      settings: normalizeSettings(raw.settings),
      meta: {
        seededAt: validDate(raw.meta?.seededAt) || "",
        source: clean(raw.meta?.source || "", 120),
        hash: clean(raw.meta?.hash || "", 128)
      }
    };
  }

  function normalizePrompt(prompt = {}, folder = "allgemein", order = 0) {
    const body = clean(prompt.body || "", 1600000);
    const title = clean(prompt.title || "Unbenannter Prompt", 180);
    const kind = clean(prompt.kind || classify(title, body), 60);
    return {
      id: slug(prompt.id || title) || uid("prompt"),
      title,
      description: clean(prompt.description || "", 500),
      folderId: slug(prompt.folderId || folder) || "allgemein",
      body,
      kind,
      accent: clean(prompt.accent || accent(title, kind), 40),
      favorite: Boolean(prompt.favorite),
      appendSchaeferCt: Boolean(prompt.appendSchaeferCt),
      appendSchaeferMrt: Boolean(prompt.appendSchaeferMrt),
      order: Number.isFinite(Number(prompt.order)) ? Number(prompt.order) : order,
      createdAt: validDate(prompt.createdAt) || now(),
      updatedAt: validDate(prompt.updatedAt) || now(),
      lastUsedAt: validDate(prompt.lastUsedAt) || ""
    };
  }

  function normalizeFolder(folder = {}) {
    return {
      id: slug(folder.id || folder.name) || uid("folder"),
      name: clean(folder.name || "Ordner", 180),
      icon: clean(folder.icon || "folder", 80),
      order: Number.isFinite(Number(folder.order)) ? Number(folder.order) : 0,
      createdAt: validDate(folder.createdAt) || now(),
      updatedAt: validDate(folder.updatedAt) || now()
    };
  }

  function normalizeDocument(document = {}, fallback = {}) {
    return {
      title: clean(document?.title || fallback.title || "", 240),
      text: clean(document?.text || fallback.text || "", 6000000),
      updatedAt: validDate(document?.updatedAt) || fallback.updatedAt || ""
    };
  }

  function normalizeSettings(settings = {}) {
    const raw = settings && typeof settings === "object" ? settings : {};
    const selected = clean(raw.selected || raw.selectedFolder || "all", 120) || "all";
    const sort = ["manual", "alpha", "recent", "used"].includes(raw.sort || raw.sortMode) ? raw.sort || raw.sortMode : "manual";
    const compact = Boolean(raw.compact ?? raw.compactMode ?? false);
    return {
      ...SETTINGS,
      ...raw,
      selected,
      selectedFolder: selected,
      activeView: selected === "favorites" ? "favorites" : clean(raw.activeView || "all", 80) || "all",
      sort,
      sortMode: sort,
      compact,
      compactMode: compact,
      autosave: raw.autosave === undefined ? true : Boolean(raw.autosave),
      viewMode: ["grid", "list"].includes(raw.viewMode) ? raw.viewMode : "grid",
      effects: raw.effects === undefined ? true : Boolean(raw.effects),
      denseCards: Boolean(raw.denseCards)
    };
  }

  function summarize(state) {
    const normalized = normalizeState(state);
    return {
      schema: normalized.schema,
      version: normalized.version,
      folders: normalized.folders.length,
      prompts: normalized.prompts.length,
      favorites: normalized.favorites.length,
      updatedAt: normalized.updatedAt,
      seededAt: normalized.meta.seededAt,
      hash: normalized.meta.hash,
      bytes: byteLength(JSON.stringify(normalized, jsonReplacer)),
      documents: {
        schaeferCt: byteLength(normalized.documents.schaeferCt.text),
        schaeferMrt: byteLength(normalized.documents.schaeferMrt.text)
      }
    };
  }

  function parsePrompts(text) {
    const source = clean(text, 6000000).replace(/\r\n?/g, "\n");
    const matches = [...source.matchAll(/^\/\/\s*(.+?):\s*$/gm)];
    const prompts = [];
    for (let index = 0; index < matches.length; index++) {
      const title = clean(matches[index][1], 180);
      const start = matches[index].index + matches[index][0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
      const body = clean(source.slice(start, end), 1600000);
      if (!title || !body) continue;
      const kind = classify(title, body);
      prompts.push(normalizePrompt({
        id: uniquePromptId(prompts, slug(title)),
        title,
        description: `${placeholders(body).length} Platzhalter`,
        folderId: folderFor(title, body, kind),
        body,
        kind,
        accent: accent(title, kind),
        favorite: prompts.length < 4,
        appendSchaeferCt: kind === "schaefer",
        appendSchaeferMrt: kind === "schaefer",
        order: prompts.length
      }, "allgemein", prompts.length));
    }
    return { ok: true, prompts, count: prompts.length, bytes: byteLength(source) };
  }

  async function assetText(path) {
    const errors = [];
    for (const candidate of assetCandidates(path)) {
      try {
        const response = await assetFetch(candidate);
        if (response.ok) return response.text();
        errors.push(`${candidate}:${response.status}`);
      } catch (error) {
        errors.push(`${candidate}:${error.message || error}`);
      }
    }
    const err = new Error(`Asset nicht gefunden: ${path}. ${errors.join("; ")}`);
    err.status = 404;
    throw err;
  }

  async function assetMeta(path) {
    const meta = { path, exists: false, readable: false, status: 0, bytes: 0, usedPath: "", contentType: "", hash: "" };
    for (const candidate of assetCandidates(path)) {
      try {
        const response = await assetFetch(candidate);
        meta.status = response.status;
        meta.usedPath = candidate;
        meta.contentType = response.headers.get("Content-Type") || "";
        if (response.ok) {
          const body = await response.text();
          meta.exists = true;
          meta.readable = true;
          meta.bytes = byteLength(body);
          meta.hash = await hashText(body);
          return meta;
        }
      } catch (error) {
        meta.error = error.message || String(error);
      }
    }
    return meta;
  }

  async function assetFetch(path) {
    const assetUrl = new URL(path, url.origin);
    if (context.env?.ASSETS?.fetch) return context.env.ASSETS.fetch(new Request(assetUrl.toString()));
    return fetch(assetUrl.toString());
  }

  function assetCandidates(path) {
    const raw = String(path || "").startsWith("/") ? String(path || "") : `/${path || ""}`;
    let decoded = raw;
    try {
      decoded = decodeURI(raw);
    } catch {
      decoded = raw;
    }
    const encoded = decoded.split("/").map((segment, index) => index ? encodeURIComponent(segment) : "").join("/");
    return unique([raw, decoded, encoded, raw.replace(/ /g, "%20"), decoded.replace(/ /g, "%20")]);
  }

  async function hashText(text) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text || "")));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  async function hashJson(value) {
    return hashText(stable(value));
  }

  function stable(value) {
    return JSON.stringify(sortDeep(value), jsonReplacer);
  }

  function sortDeep(value) {
    if (Array.isArray(value)) return value.map(sortDeep);
    if (value && typeof value === "object" && value.constructor === Object) {
      const output = {};
      for (const key of Object.keys(value).sort()) output[key] = sortDeep(value[key]);
      return output;
    }
    return value;
  }

  function jsonReplacer(key, value) {
    if (typeof value === "bigint") return value.toString();
    if (value === undefined) return null;
    return value;
  }

  function byteLength(value) {
    return new TextEncoder().encode(String(value || "")).length;
  }

  function uid(prefix) {
    const array = crypto.getRandomValues(new Uint32Array(2));
    return `${prefix}-${Date.now().toString(36)}-${array[0].toString(36)}${array[1].toString(36)}`;
  }

  function slug(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/Ä/g, "ae")
      .replace(/Ö/g, "oe")
      .replace(/Ü/g, "ue")
      .replace(/ß/g, "ss")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
  }

  function clean(value, max = 1000000) {
    return String(value ?? "").normalize("NFKC").replace(/\r\n?/g, "\n").trim().slice(0, max);
  }

  function unique(list) {
    return [...new Set((list || []).filter(item => item !== undefined && item !== null && String(item) !== ""))];
  }

  function uniqueById(list) {
    const seen = new Set();
    const output = [];
    for (const item of list || []) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      output.push(item);
    }
    return output;
  }

  function now() {
    return new Date().toISOString();
  }

  function validDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
  }

  function parseBool(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (value === undefined || value === null || value === "") return fallback;
    const normalized = String(value).toLowerCase();
    if (["1", "true", "yes", "ja", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "nein", "off"].includes(normalized)) return false;
    return fallback;
  }

  async function backupState(state, label = "state") {
    if (!kv()) return { ok: false, reason: "kv_missing", key: "" };
    const normalized = normalizeState(state);
    const body = JSON.stringify(normalized, jsonReplacer);
    const key = backupKey(label);
    await putKv(key, body, {
      metadata: { schema: SCHEMA, version: normalized.version, updatedAt: normalized.updatedAt, label, bytes: byteLength(body) },
      expirationTtl: 60 * 60 * 24 * 30
    });
    return { ok: true, key };
  }

  function backupKey(label = "state") {
    return `${BACKUP_PREFIX}${now().replace(/[:.]/g, "-")}:${slug(label) || "state"}`;
  }

  function limit(value) {
    const bytes = byteLength(value);
    if (bytes > LIMIT) {
      const err = new Error(`KV-Wert zu groß: ${bytes} Bytes.`);
      err.status = 413;
      throw err;
    }
  }

  function runtime() {
    return {
      endpoint: url.pathname,
      method: request.method,
      hostname: url.hostname,
      kvBound: Boolean(kv()),
      assetsBound: Boolean(context.env?.ASSETS?.fetch),
      durationMs: Date.now() - started,
      ray: request.headers.get("CF-Ray") || "",
      colo: request.cf?.colo || ""
    };
  }

  function classify(title, body) {
    const haystack = norm(`${title} ${body}`);
    if (haystack.includes("prof schafer") || haystack.includes("prof schaefer") || haystack.includes("befundstil")) return "schaefer";
    if (placeholders(body).length) return "special";
    return "standard";
  }

  function folderFor(title, body, kind) {
    const haystack = norm(`${title} ${body}`);
    if (kind === "schaefer") return "prof-schaefer";
    if (haystack.includes("protokoll") || haystack.includes("ubersicht") || haystack.includes("übersicht") || haystack.includes("staging")) return "wissen";
    if (haystack.includes("befund") || haystack.includes("bildinterpretation") || haystack.includes("radiologisch")) return "befundung";
    return "allgemein";
  }

  function accent(title, kind) {
    const haystack = norm(`${title} ${kind}`);
    if (kind === "schaefer") return "violet";
    if (haystack.includes("revision")) return "amber";
    if (haystack.includes("staging")) return "red";
    if (haystack.includes("protokoll")) return "cyan";
    if (haystack.includes("ubersicht") || haystack.includes("übersicht")) return "emerald";
    return "blue";
  }

  function placeholders(text) {
    return unique([...String(text || "").matchAll(/\*\*\*([^*]+?)\*\*\*/g)].map(match => clean(match[1], 140)));
  }

  function norm(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .toLowerCase();
  }

  function uniquePromptId(list, root) {
    const base = slug(root) || "prompt";
    const ids = new Set(list.map(item => item.id));
    if (!ids.has(base)) return base;
    let i = 2;
    while (ids.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }
}
