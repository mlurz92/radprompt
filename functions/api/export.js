export async function onRequestGet(context) {
  const h = context.data.radprompt;
  h.requireMethod(["GET", "HEAD"]);
  h.requireKv();
  const format = normalizeFormat(h.url.searchParams.get("format") || h.url.searchParams.get("type") || "json");
  const download = h.url.searchParams.get("download") === "1" || h.url.searchParams.get("attachment") === "1";
  const pretty = h.url.searchParams.get("pretty") !== "0";
  const includeMeta = h.url.searchParams.get("meta") !== "0";
  const includeDocuments = h.url.searchParams.get("documents") !== "0";
  const folder = normalizeString(h.url.searchParams.get("folder") || "", 140);
  const favoriteOnly = h.url.searchParams.get("favorites") === "1";
  const raw = await h.getKv(h.stateKey);
  const state = raw ? h.normalizeState(h.safeJsonParse(raw, h.emptyState())) : h.emptyState();
  const filtered = filterState(state, { folder, favoriteOnly, includeDocuments });
  const hash = filtered.meta?.hash || await h.hashJson({ ...h.normalizeState(filtered), meta: { ...(filtered.meta || {}), hash: "" } });
  const timestamp = new Date().toISOString();
  const summary = h.summarizeState(filtered);
  if (format === "json") {
    const payload = includeMeta ? { ok: true, exportedAt: timestamp, source: raw ? "kv" : "empty", state: filtered, summary, runtime: h.runtimeInfo() } : filtered;
    const body = pretty ? JSON.stringify(payload, h.jsonReplacer, 2) : JSON.stringify(payload, h.jsonReplacer);
    return exportResponse(body, { filename: filename("radprompt-export", "json", timestamp), contentType: "application/json; charset=utf-8", download, hash, version: filtered.version, bytes: h.byteLength(body) });
  }
  if (format === "state") {
    const body = pretty ? JSON.stringify(filtered, h.jsonReplacer, 2) : JSON.stringify(filtered, h.jsonReplacer);
    return exportResponse(body, { filename: filename("radprompt-state", "json", timestamp), contentType: "application/json; charset=utf-8", download, hash, version: filtered.version, bytes: h.byteLength(body) });
  }
  if (format === "manifest") {
    const bodyObject = { schema: filtered.schema, version: filtered.version, updatedAt: filtered.updatedAt, exportedAt: timestamp, hash, folders: filtered.folders.map(folderItem => ({ id: folderItem.id, name: folderItem.name, icon: folderItem.icon, order: folderItem.order, prompts: filtered.prompts.filter(prompt => prompt.folderId === folderItem.id).length })), prompts: filtered.prompts.map(prompt => ({ id: prompt.id, title: prompt.title, folderId: prompt.folderId, kind: prompt.kind, accent: prompt.accent, favorite: Boolean(prompt.favorite), placeholders: extractPlaceholdersLocal(prompt.body), appendSchaeferCt: Boolean(prompt.appendSchaeferCt), appendSchaeferMrt: Boolean(prompt.appendSchaeferMrt), order: prompt.order, updatedAt: prompt.updatedAt, lastUsedAt: prompt.lastUsedAt || "" })), favorites: filtered.favorites, documents: { schaeferCt: { title: filtered.documents?.schaeferCt?.title || h.documentTitles.schaeferCt, bytes: h.byteLength(filtered.documents?.schaeferCt?.text || ""), hash: filtered.documents?.schaeferCt?.text ? await h.hashText(filtered.documents.schaeferCt.text) : "", updatedAt: filtered.documents?.schaeferCt?.updatedAt || "" }, schaeferMrt: { title: filtered.documents?.schaeferMrt?.title || h.documentTitles.schaeferMrt, bytes: h.byteLength(filtered.documents?.schaeferMrt?.text || ""), hash: filtered.documents?.schaeferMrt?.text ? await h.hashText(filtered.documents.schaeferMrt.text) : "", updatedAt: filtered.documents?.schaeferMrt?.updatedAt || "" } }, summary };
    const body = pretty ? JSON.stringify(bodyObject, h.jsonReplacer, 2) : JSON.stringify(bodyObject, h.jsonReplacer);
    return exportResponse(body, { filename: filename("radprompt-manifest", "json", timestamp), contentType: "application/json; charset=utf-8", download, hash, version: filtered.version, bytes: h.byteLength(body) });
  }
  if (format === "prompts") {
    const body = renderPromptsText(filtered, { includeMeta, includeDocuments: false });
    return exportResponse(body, { filename: filename("radprompt-prompts", "txt", timestamp), contentType: "text/plain; charset=utf-8", download, hash: await h.hashText(body), version: filtered.version, bytes: h.byteLength(body) });
  }
  if (format === "fulltxt") {
    const body = renderPromptsText(filtered, { includeMeta, includeDocuments: true });
    return exportResponse(body, { filename: filename("radprompt-volltext", "txt", timestamp), contentType: "text/plain; charset=utf-8", download, hash: await h.hashText(body), version: filtered.version, bytes: h.byteLength(body) });
  }
  if (format === "schaefer-ct") {
    const body = filtered.documents?.schaeferCt?.text || "";
    return exportResponse(body, { filename: safeFilename("Befundbeispiele Prof. Schäfer CT.txt"), contentType: "text/plain; charset=utf-8", download: true, hash: await h.hashText(body), version: filtered.version, bytes: h.byteLength(body) });
  }
  if (format === "schaefer-mrt") {
    const body = filtered.documents?.schaeferMrt?.text || "";
    return exportResponse(body, { filename: safeFilename("Befundbeispiele Prof. Schäfer MRT.txt"), contentType: "text/plain; charset=utf-8", download: true, hash: await h.hashText(body), version: filtered.version, bytes: h.byteLength(body) });
  }
  return h.json({ ok: false, message: "Unbekanntes Exportformat. Erlaubt: json, state, manifest, prompts, fulltxt, schaefer-ct, schaefer-mrt.", runtime: h.runtimeInfo() }, { status: 400 });
}
export async function onRequestHead(context) { const response = await onRequestGet(context); return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers }); }
function exportResponse(body, options) { const headers = new Headers(); headers.set("Content-Type", options.contentType); headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"); headers.set("Pragma", "no-cache"); headers.set("Expires", "0"); headers.set("X-Content-Type-Options", "nosniff"); headers.set("X-RadPrompt-Hash", String(options.hash || "")); headers.set("X-RadPrompt-Version", String(options.version || 0)); headers.set("X-RadPrompt-Bytes", String(options.bytes || new TextEncoder().encode(String(body || "")).length)); headers.set("Content-Disposition", `${options.download ? "attachment" : "inline"}; filename="${asciiFilename(options.filename)}"; filename*=UTF-8''${encodeRFC5987ValueChars(options.filename)}`); return new Response(body, { status: 200, headers }); }
function normalizeFormat(value) { const normalized = String(value || "json").trim().toLowerCase().replace(/_/g, "-"); return { txt: "prompts", text: "prompts", prompt: "prompts", prompttxt: "prompts", "prompt-txt": "prompts", full: "fulltxt", "full-text": "fulltxt", ct: "schaefer-ct", mrt: "schaefer-mrt", schaeferct: "schaefer-ct", schaefermrt: "schaefer-mrt" }[normalized] || normalized; }
function filterState(state, options) { const next = structuredCloneSafe(state); let prompts = Array.isArray(next.prompts) ? next.prompts : []; if (options.folder) prompts = prompts.filter(prompt => prompt.folderId === options.folder); if (options.favoriteOnly) prompts = prompts.filter(prompt => next.favorites.includes(prompt.id) || prompt.favorite); const promptIds = new Set(prompts.map(prompt => prompt.id)); const folderIds = new Set(prompts.map(prompt => prompt.folderId)); next.prompts = prompts; next.favorites = (next.favorites || []).filter(id => promptIds.has(id)); next.folders = (next.folders || []).filter(folder => folderIds.has(folder.id) || !options.folder); if (!options.includeDocuments) next.documents = { schaeferCt: { ...(next.documents?.schaeferCt || {}), text: "" }, schaeferMrt: { ...(next.documents?.schaeferMrt || {}), text: "" } }; return next; }
function renderPromptsText(state, options) { const lines = []; if (options.includeMeta) lines.push("RadPrompt Export", "", `Schema: ${state.schema || ""}`, `Version: ${state.version || 0}`, `Aktualisiert: ${state.updatedAt || ""}`, `Prompts: ${state.prompts.length}`, `Ordner: ${state.folders.length}`, `Favoriten: ${state.favorites.length}`, "", "=".repeat(88), ""); const folders = [...(state.folders || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.name || "").localeCompare(String(b.name || ""), "de", { sensitivity: "base" })); const prompts = [...(state.prompts || [])].sort((a, b) => String(a.folderId || "").localeCompare(String(b.folderId || ""), "de", { sensitivity: "base" }) || Number(a.order || 0) - Number(b.order || 0) || String(a.title || "").localeCompare(String(b.title || ""), "de", { sensitivity: "base" })); for (const folder of folders) { const folderPrompts = prompts.filter(prompt => prompt.folderId === folder.id); if (!folderPrompts.length) continue; lines.push(`# ${folder.name}`, ""); for (const prompt of folderPrompts) { lines.push(`// ${prompt.title}:`); if (prompt.description) lines.push(`Beschreibung: ${prompt.description}`); lines.push(`Typ: ${prompt.kind || "standard"}`, `Favorit: ${state.favorites.includes(prompt.id) || prompt.favorite ? "ja" : "nein"}`); const placeholders = extractPlaceholdersLocal(prompt.body); if (placeholders.length) lines.push(`Platzhalter: ${placeholders.join("; ")}`); if (prompt.appendSchaeferCt) lines.push("Anhang: Prof. Schäfer CT"); if (prompt.appendSchaeferMrt) lines.push("Anhang: Prof. Schäfer MRT"); lines.push("", String(prompt.body || "").trim(), "", "-".repeat(88), ""); } } if (options.includeDocuments) { if (state.documents?.schaeferCt?.text) lines.push("# Befundbeispiele Prof. Schäfer CT", "", String(state.documents.schaeferCt.text).trim(), "", "=".repeat(88), ""); if (state.documents?.schaeferMrt?.text) lines.push("# Befundbeispiele Prof. Schäfer MRT", "", String(state.documents.schaeferMrt.text).trim(), ""); } return lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim() + "\n"; }
function extractPlaceholdersLocal(text) { const found = []; String(text || "").replace(/\*\*\*([^*]+?)\*\*\*/g, (_, name) => { const cleaned = normalizeString(name, 120).replace(/\s+/g, " "); if (cleaned) found.push(cleaned); return ""; }); return [...new Set(found)]; }
function filename(base, ext, timestamp) { return safeFilename(`${base}-${timestamp.slice(0, 19).replace(/[:T]/g, "-")}.${ext}`); }
function safeFilename(value) { return String(value || "radprompt-export.txt").normalize("NFKC").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "radprompt-export.txt"; }
function asciiFilename(value) { return safeFilename(value).replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_"); }
function encodeRFC5987ValueChars(value) { return encodeURIComponent(String(value)).replace(/['()]/g, escape).replace(/\*/g, "%2A"); }
function normalizeString(value, max = 1000000) { return String(value ?? "").normalize("NFKC").trim().slice(0, max); }
function structuredCloneSafe(value) { if (typeof structuredClone === "function") { try { return structuredClone(value); } catch {} } return JSON.parse(JSON.stringify(value)); }
