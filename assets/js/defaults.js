(() => {
  "use strict";

  const VERSION = 1;
  const SCHEMA = "radprompt-state-v1";
  const STATE_KEY = "radprompt.state.v1";
  const BACKUP_KEY = "radprompt.local-backup.v1";
  const UI_KEY = "radprompt.ui.v1";
  const DOC_KEY = "radprompt.documents.v1";
  const KV_STATE_ENDPOINT = "/api/state";
  const KV_HEALTH_ENDPOINT = "/api/health";
  const ALL = "all";
  const FAVORITES = "favorites";
  const PLACEHOLDER_RE = /\*\*\*([\s\S]*?)\*\*\*/g;
  const MODALITY_PLACEHOLDER = "Modalität";
  const TOPIC_PLACEHOLDER = "THEMA";
  const MODALITY_OPTIONS = Object.freeze(["CT", "MRT", "Röntgen", "CT&MRT"]);
  const TONES = Object.freeze(["steel", "violet", "cyan", "emerald", "amber", "graphite"]);
  const PROF_CT_LABEL = "# Befundbeispiele Prof. Schäfer CT";
  const PROF_MRT_LABEL = "# Befundbeispiele Prof. Schäfer MRT";
  const SOURCE_PATHS = Object.freeze({ prompts: "/assets/data/prompts.txt", profCt: "/assets/data/befundbeispiele-prof-schaefer-ct.txt", profMrt: "/assets/data/befundbeispiele-prof-schaefer-mrt.txt" });
  const DEFAULT_FOLDERS = Object.freeze([
    { id: "folder-bildinterpretation", title: "Bildinterpretation", description: "Analyse- und Befundprompts", tone: "steel", order: 0 },
    { id: "folder-prof-schaefer", title: "Prof. Schäfer Stil", description: "Kompakter Befundstil mit CT-/MRT-Korpus", tone: "amber", order: 1 },
    { id: "folder-befundung", title: "Befundung", description: "Korrektur, Beurteilung und RIS-Texte", tone: "cyan", order: 2 },
    { id: "folder-recherche", title: "Protokoll & Wissen", description: "Protokolle, Übersichten, Staging und DD", tone: "violet", order: 3 },
    { id: "folder-organisation", title: "Organisation", description: "SOPs, Listen und Workflows", tone: "emerald", order: 4 },
    { id: "folder-allgemein", title: "Allgemein", description: "Sonstige universelle Prompt-Templates", tone: "graphite", order: 5 }
  ]);
  const FALLBACK_PROMPTS = Object.freeze([
    { title: "Radiologische Bildinterpretation I", folderId: "folder-bildinterpretation", favorite: true, tone: "steel", body: "Klinische Angaben: ***Klinische Angaben***\nFragestellung: ***Fragestellung***\n\nDu bist ein erfahrener Facharzt für Radiologie mit meisterlicher Expertise in der Schnittbilddiagnostik. Analysiere die angehängten Bilddaten vollständig und erstelle einen RIS-fähigen Befund." },
    { title: "Protokoll- und Befundungshilfe", folderId: "folder-recherche", favorite: true, tone: "cyan", body: "Als Radiologie Experte empfiehlst du Untersuchungsprotokolle für eine ***Modalität*** Untersuchung zum Thema ***THEMA***. Beschränke dich nur auf radiologische Aspekte und schreibe strukturiert in Markdown." },
    { title: "Befundbericht Korrektur und Beurteilungsvorschlag", folderId: "folder-befundung", favorite: true, tone: "emerald", body: "Korrigiere folgenden radiologischen Befundbericht einer ***Modalität*** Untersuchung in Stil, Wortwahl und Grammatik. Thema: ***THEMA***. Antworte nur mit 3 Varianten und kurzer Beurteilung." },
    { title: "Radiologische Staging Hilfe", folderId: "folder-recherche", favorite: true, tone: "amber", body: "Erstelle ein radiologisches Dokument zum Thema ***THEMA***, welches alle relevanten Informationen zum Staging mittels ***Modalität*** bereitstellt." },
    { title: "Prof. Schäfer Stil Befundoptimierung", folderId: "folder-prof-schaefer", favorite: true, profSchaefer: true, tone: "amber", body: "Modalität: ***Modalität***\nAusgangsbefund: ***Ausgangsbefund***\n\nOptimiere den radiologischen Befund im kompakten Prof.-Schäfer-Stil." }
  ]);
  const COMMANDS = Object.freeze([
    { id: "cmd-new-prompt", title: "Prompt hinzufügen", description: "Neues Template erstellen", icon: "fa-plus", key: "N", action: "newPrompt" },
    { id: "cmd-new-folder", title: "Ordner hinzufügen", description: "Neuen Prompt-Ordner anlegen", icon: "fa-folder-plus", key: "F", action: "newFolder" },
    { id: "cmd-sync", title: "Jetzt synchronisieren", description: "State in Cloudflare KV speichern", icon: "fa-cloud-arrow-up", key: "S", action: "sync" },
    { id: "cmd-import", title: "Import", description: "RadPrompt JSON importieren", icon: "fa-file-import", key: "I", action: "import" },
    { id: "cmd-export", title: "Export", description: "RadPrompt JSON exportieren", icon: "fa-file-export", key: "E", action: "export" },
    { id: "cmd-seed", title: "Startset laden", description: "Prompt-Datei neu einlesen", icon: "fa-seedling", key: "R", action: "seed" },
    { id: "cmd-compact", title: "Widgetmodus", description: "Kompakte Board-Ansicht umschalten", icon: "fa-window-restore", key: "W", action: "compact" },
    { id: "cmd-health", title: "KV prüfen", description: "Binding und API testen", icon: "fa-heart-pulse", key: "H", action: "health" }
  ]);

  const nowIso = () => new Date().toISOString();
  const str = value => value == null ? "" : String(value);
  const line = value => str(value).replace(/\r\n?/g, "\n");
  const collapse = value => line(value).replace(/^\uFEFF/, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  const title = value => str(value).replace(/\s+/g, " ").replace(/[:\s]+$/g, "").trim();
  const phName = value => title(value).replace(/^\*+|\*+$/g, "").trim();
  const arr = value => Array.isArray(value) ? value : [];
  const jsonParse = value => { try { return typeof value === "string" && value.trim() ? JSON.parse(value) : null; } catch { return null; } };
  const clone = value => typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  const unique = values => { const seen = new Set(); const out = []; for (const item of arr(values)) { const key = str(item); if (!key || seen.has(key)) continue; seen.add(key); out.push(item); } return out; };
  const hash = value => { const text = str(value); let h = 2166136261; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const slug = value => title(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
  const idFor = (prefix, seed) => `${prefix}-${slug(seed).slice(0, 40)}-${hash(seed).slice(0, 8)}`;
  const uid = prefix => globalThis.crypto?.randomUUID ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const byOrder = (a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0) || str(a?.title).localeCompare(str(b?.title), "de", { numeric: true, sensitivity: "base" });

  const extractPlaceholders = body => {
    const found = [];
    const seen = new Set();
    PLACEHOLDER_RE.lastIndex = 0;
    let match;
    while ((match = PLACEHOLDER_RE.exec(line(body)))) {
      const name = phName(match[1]);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      found.push(name);
    }
    PLACEHOLDER_RE.lastIndex = 0;
    return found;
  };
  const isModalityPlaceholder = name => phName(name).toLowerCase() === MODALITY_PLACEHOLDER.toLowerCase();
  const isTopicPlaceholder = name => phName(name).toLowerCase() === TOPIC_PLACEHOLDER.toLowerCase();
  const hasPlaceholder = body => extractPlaceholders(body).length > 0;
  const isProfSchaeferPrompt = (t, body) => /prof\.?\s*schäfer|prof\.?\s*schaefer|schäfer[-\s]?stil|schaefer[-\s]?stil/i.test(`${t}\n${body}`);
  const isQuick = t => /bildinterpretation\s+i$|bildinterpretation\s+ii$|protokoll.*befundungshilfe|befundbericht.*korrektur|übersicht\s+plus|uebersicht\s+plus|staging\s+hilfe|prof\.?\s*schäfer/i.test(title(t));
  const inferFolderId = (t, body) => { const x = `${t}\n${body}`.toLowerCase(); if (isProfSchaeferPrompt(t, body)) return "folder-prof-schaefer"; if (/bildinterpretation|dicom|frame-by-frame|bildbefundung|schnittbild/.test(x)) return "folder-bildinterpretation"; if (/korrektur|beurteilungsvorschlag|befundoptimierung|ris|nominalstil/.test(x)) return "folder-befundung"; if (/protokoll|übersicht|uebersicht|staging|tnm|klassifikation|leitlinie|differenzialdiagnos/.test(x)) return "folder-recherche"; if (/sop|organisation|dienstplan|workflow/.test(x)) return "folder-organisation"; return "folder-allgemein"; };
  const inferTone = (i, t, body) => { const x = `${t}\n${body}`.toLowerCase(); if (isProfSchaeferPrompt(t, body)) return "amber"; if (/protokoll/.test(x)) return "cyan"; if (/korrektur/.test(x)) return "emerald"; if (/staging|tnm/.test(x)) return "amber"; if (/übersicht|uebersicht|klassifikation/.test(x)) return "violet"; if (/bildinterpretation/.test(x)) return i % 2 ? "violet" : "steel"; return TONES[i % TONES.length]; };
  const inferTags = (t, body) => { const x = `${t}\n${body}`.toLowerCase(); const tags = []; if (/ct|computertomographie/.test(x)) tags.push("CT"); if (/mrt|magnetresonan|\bmr\b/.test(x)) tags.push("MRT"); if (/röntgen|roentgen/.test(x)) tags.push("Röntgen"); if (isProfSchaeferPrompt(t, body)) tags.push("Prof. Schäfer"); if (hasPlaceholder(body)) tags.push("Platzhalter"); if (/protokoll/.test(x)) tags.push("Protokoll"); if (/staging|tnm/.test(x)) tags.push("Staging"); if (/übersicht|uebersicht/.test(x)) tags.push("Übersicht"); if (/korrektur/.test(x)) tags.push("Korrektur"); return tags; };

  const splitPromptSections = text => {
    const sections = [];
    let cur = null;
    const push = () => { if (!cur) return; const t = title(cur.title); const b = collapse(cur.lines.join("\n")); if (t && b) sections.push({ title: t, body: b }); cur = null; };
    for (const row of line(text).replace(/^\uFEFF/, "").split("\n")) {
      const m = row.match(/^#\s+(.+?):\s*$/);
      if (m) { const t = title(m[1]); if (/^radprompts?$/i.test(t)) continue; push(); cur = { title: t, lines: [] }; continue; }
      if (cur) cur.lines.push(row);
    }
    push();
    return sections;
  };
  const parsePromptText = text => splitPromptSections(text).map((s, i) => ({ title: s.title, body: s.body, folderId: inferFolderId(s.title, s.body), favorite: isQuick(s.title) || i < 2 || isProfSchaeferPrompt(s.title, s.body), profSchaefer: isProfSchaeferPrompt(s.title, s.body), tone: inferTone(i, s.title, s.body), tags: inferTags(s.title, s.body), placeholderDefaults: {} })).filter(p => p.body);

  const normalizeFolder = (folder, i = 0) => ({ id: title(folder?.id) || idFor("folder", folder?.title || `Ordner ${i + 1}`), title: title(folder?.title) || `Ordner ${i + 1}`, description: title(folder?.description), tone: TONES.includes(folder?.tone) ? folder.tone : TONES[i % TONES.length], order: Number.isFinite(Number(folder?.order)) ? Number(folder.order) : i, locked: Boolean(folder?.locked), createdAt: str(folder?.createdAt) || nowIso(), updatedAt: str(folder?.updatedAt) || str(folder?.createdAt) || nowIso() });
  const ensureFolders = folders => { const map = new Map(arr(folders).map((f, i) => normalizeFolder(f, i)).map(f => [f.id, f])); for (const f of DEFAULT_FOLDERS) if (!map.has(f.id)) map.set(f.id, normalizeFolder(f, f.order)); return [...map.values()].sort(byOrder).map((f, i) => ({ ...f, order: i })); };
  const normalizePrompt = (prompt, i = 0, folderIds = new Set(DEFAULT_FOLDERS.map(f => f.id))) => { const t = title(prompt?.title) || `Prompt ${i + 1}`; const b = collapse(prompt?.body || prompt?.prompt || prompt?.text || ""); const inferred = inferFolderId(t, b); const folderId = folderIds.has(prompt?.folderId) ? prompt.folderId : folderIds.has(inferred) ? inferred : "folder-allgemein"; const profSchaefer = Boolean(prompt?.profSchaefer) || isProfSchaeferPrompt(t, b); const defaults = prompt?.placeholderDefaults && typeof prompt.placeholderDefaults === "object" && !Array.isArray(prompt.placeholderDefaults) ? Object.fromEntries(Object.entries(prompt.placeholderDefaults).map(([k, v]) => [phName(k), str(v)]).filter(([k]) => k)) : {}; return { id: title(prompt?.id) || idFor("prompt", `${folderId}:${t}:${b.slice(0, 480)}`), title: t, body: b, folderId, order: Number.isFinite(Number(prompt?.order)) ? Number(prompt.order) : i, favorite: Boolean(prompt?.favorite) || isQuick(t), profSchaefer, tone: TONES.includes(prompt?.tone) ? prompt.tone : inferTone(i, t, b), tags: unique([...(arr(prompt?.tags).map(title).filter(Boolean)), ...inferTags(t, b)]), placeholderDefaults: defaults, archived: Boolean(prompt?.archived), createdAt: str(prompt?.createdAt) || nowIso(), updatedAt: str(prompt?.updatedAt) || str(prompt?.createdAt) || nowIso() }; };
  const uniquePromptIds = prompts => { const seen = new Set(); return prompts.map((p, i) => { let id = p.id || idFor("prompt", `${p.title}:${i}`); if (!seen.has(id)) { seen.add(id); return { ...p, id }; } let n = 2; while (seen.has(`${id}-${n}`)) n += 1; seen.add(`${id}-${n}`); return { ...p, id: `${id}-${n}` }; }); };
  const normalizeUi = ui => ({ activeFolderId: title(ui?.activeFolderId) || ALL, activeFilter: ["all", "favorites", "special", "prof"].includes(ui?.activeFilter) ? ui.activeFilter : "all", query: str(ui?.query), view: ["board", "dense"].includes(ui?.view) ? ui.view : "board", compact: Boolean(ui?.compact), drawerOpen: Boolean(ui?.drawerOpen), selectedPromptId: str(ui?.selectedPromptId) });

  const createState = (records = FALLBACK_PROMPTS, options = {}) => { const folders = ensureFolders(options.folders || DEFAULT_FOLDERS); const ids = new Set(folders.map(f => f.id)); const prompts = uniquePromptIds((arr(records).length ? records : FALLBACK_PROMPTS).map((p, i) => normalizePrompt(p, i, ids))).filter(p => p.body).sort(byOrder).map((p, i) => ({ ...p, order: i })); const favoriteOrder = unique([...(arr(options.favoriteOrder).map(str)), ...prompts.filter(p => p.favorite).map(p => p.id)]).filter(id => prompts.some(p => p.id === id)); const ts = nowIso(); return { version: VERSION, schema: SCHEMA, app: { name: "RadPrompt", description: "Radiologisches Prompt-Buttonboard", createdAt: str(options.createdAt) || ts, updatedAt: ts, seededAt: str(options.seededAt) || ts }, ui: normalizeUi(options.ui || {}), folders, prompts, favoriteOrder, documents: { profCtLabel: PROF_CT_LABEL, profMrtLabel: PROF_MRT_LABEL, profCtUpdatedAt: "", profMrtUpdatedAt: "" } }; };
  const normalizeState = state => { const raw = typeof state === "string" ? jsonParse(state) : state; if (!raw || typeof raw !== "object") return createState(); const folders = ensureFolders(raw.folders); const ids = new Set(folders.map(f => f.id)); const prompts = uniquePromptIds(arr(raw.prompts).map((p, i) => normalizePrompt(p, i, ids))).filter(p => p.body).sort(byOrder).map((p, i) => ({ ...p, order: Number.isFinite(Number(p.order)) ? Number(p.order) : i })); const promptIds = new Set(prompts.map(p => p.id)); const ui = normalizeUi(raw.ui || {}); if (ui.activeFolderId !== ALL && ui.activeFolderId !== FAVORITES && !ids.has(ui.activeFolderId)) ui.activeFolderId = ALL; if (ui.selectedPromptId && !promptIds.has(ui.selectedPromptId)) { ui.selectedPromptId = ""; ui.drawerOpen = false; } const hasVisibleInFolder = ui.activeFolderId === ALL || ui.activeFolderId === FAVORITES || prompts.some(p => !p.archived && p.folderId === ui.activeFolderId); if (!hasVisibleInFolder && !ui.query && ui.activeFilter === "all") ui.activeFolderId = ALL; const ts = nowIso(); return { version: VERSION, schema: SCHEMA, app: { name: "RadPrompt", description: str(raw?.app?.description) || "Radiologisches Prompt-Buttonboard", createdAt: str(raw?.app?.createdAt) || ts, updatedAt: str(raw?.app?.updatedAt) || ts, seededAt: str(raw?.app?.seededAt) || ts }, ui, folders, prompts, favoriteOrder: unique([...(arr(raw.favoriteOrder).map(str)), ...prompts.filter(p => p.favorite).map(p => p.id)]).filter(id => promptIds.has(id)), documents: { profCtLabel: PROF_CT_LABEL, profMrtLabel: PROF_MRT_LABEL, profCtUpdatedAt: str(raw?.documents?.profCtUpdatedAt), profMrtUpdatedAt: str(raw?.documents?.profMrtUpdatedAt) } }; };
  const stateFromPromptText = (text, options = {}) => createState(parsePromptText(text), options);
  const mergeSeedPrompts = (state, seedState) => { const base = normalizeState(state); const seed = normalizeState(seedState); const existing = new Set(base.prompts.map(p => title(p.title).toLowerCase())); const add = seed.prompts.filter(p => !existing.has(title(p.title).toLowerCase())); if (!add.length) return base; return normalizeState({ ...base, folders: ensureFolders([...base.folders, ...seed.folders]), prompts: [...base.prompts, ...add.map((p, i) => ({ ...p, id: idFor("prompt", `${p.title}:${p.body}`), order: base.prompts.length + i }))], favoriteOrder: [...base.favoriteOrder, ...add.filter(p => p.favorite).map(p => idFor("prompt", `${p.title}:${p.body}`))] }); };

  const getFolderById = (state, id) => normalizeState(state).folders.find(f => f.id === id) || null;
  const getPromptById = (state, id) => normalizeState(state).prompts.find(p => p.id === id) || null;
  const folderStats = state => { const s = normalizeState(state); const counts = new Map(s.folders.map(f => [f.id, 0])); for (const p of s.prompts) if (!p.archived) counts.set(p.folderId, (counts.get(p.folderId) || 0) + 1); return s.folders.map(f => ({ ...f, count: counts.get(f.id) || 0 })); };
  const favoritePrompts = state => { const s = normalizeState(state); const map = new Map(s.prompts.filter(p => p.favorite && !p.archived).map(p => [p.id, p])); const out = []; for (const id of s.favoriteOrder) if (map.has(id)) { out.push(map.get(id)); map.delete(id); } return [...out, ...[...map.values()].sort(byOrder)]; };
  const summary = state => { const s = normalizeState(state); const prompts = s.prompts.filter(p => !p.archived); const fav = prompts.filter(p => p.favorite); return { promptCount: prompts.length, folderCount: s.folders.length, favoriteCount: fav.length, specialCount: prompts.filter(p => hasPlaceholder(p.body)).length, profCount: prompts.filter(p => p.profSchaefer).length, label: `${prompts.length} Prompts · ${s.folders.length} Ordner · ${fav.length} Favoriten` }; };
  const normalizeSearch = value => str(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/\s+/g, " ").trim();
  const matches = (prompt, query) => { const q = normalizeSearch(query); if (!q) return true; const hay = normalizeSearch(`${prompt?.title}\n${prompt?.body}\n${arr(prompt?.tags).join(" ")}`); return q.split(" ").every(token => hay.includes(token)); };
  const filterPrompts = (state, ui = {}) => { const s = normalizeState(state); const activeFolderId = ui.activeFolderId ?? s.ui.activeFolderId; const activeFilter = ui.activeFilter ?? s.ui.activeFilter; const query = ui.query ?? s.ui.query; return s.prompts.filter(p => !p.archived).filter(p => activeFolderId === ALL || activeFolderId === FAVORITES || p.folderId === activeFolderId).filter(p => activeFolderId !== FAVORITES || p.favorite).filter(p => activeFilter === "favorites" ? p.favorite : activeFilter === "special" ? hasPlaceholder(p.body) : activeFilter === "prof" ? p.profSchaefer : true).filter(p => matches(p, query)).sort(byOrder); };

  const replacePlaceholders = (body, values = {}, options = {}) => { const normalized = Object.fromEntries(Object.entries(values || {}).map(([k, v]) => [phName(k), str(v)])); const missing = []; const used = []; PLACEHOLDER_RE.lastIndex = 0; const text = line(body).replace(PLACEHOLDER_RE, (full, raw) => { const name = phName(raw); used.push(name); const value = normalized[name] || ""; if (value.trim()) return value; missing.push(name); return options.keepUnfilled ? full : ""; }).trim(); PLACEHOLDER_RE.lastIndex = 0; return { text, missing: unique(missing), used: unique(used) }; };
  const createClipboardPayload = (prompt, values = {}, docs = {}, options = {}) => { const filled = replacePlaceholders(prompt?.body || "", { ...(prompt?.placeholderDefaults || {}), ...(values || {}) }, options); const parts = [filled.text]; const ct = line(docs.profCt || docs.ct || "").trim(); const mrt = line(docs.profMrt || docs.mrt || "").trim(); if (prompt?.profSchaefer) { if (ct) parts.push(`${PROF_CT_LABEL}\n\n${ct}`); if (mrt) parts.push(`${PROF_MRT_LABEL}\n\n${mrt}`); } return { text: parts.filter(Boolean).join("\n\n---\n\n").trim(), missing: filled.missing, used: filled.used, includesProfCt: Boolean(prompt?.profSchaefer && ct), includesProfMrt: Boolean(prompt?.profSchaefer && mrt) }; };
  const validatePlaceholderValues = (prompt, values = {}) => { const vals = Object.fromEntries(Object.entries(values || {}).map(([k, v]) => [phName(k), str(v)])); const missing = []; const invalid = []; for (const p of extractPlaceholders(prompt?.body || "")) { const v = vals[p] || ""; if (!v.trim()) missing.push(p); if (isModalityPlaceholder(p) && v.trim() && !MODALITY_OPTIONS.includes(v.trim())) invalid.push(p); } return { valid: !missing.length && !invalid.length, missing, invalid }; };

  const serializeState = state => JSON.stringify(normalizeState(state), null, 2);
  const parseImportedState = value => { const parsed = jsonParse(value); return parsed ? normalizeState(parsed) : null; };
  const withMeta = state => { const s = normalizeState(state); return { ...s, app: { ...s.app, updatedAt: nowIso() } }; };
  const getLocal = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const setLocal = (key, value) => { try { localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)); return true; } catch { return false; } };
  const removeLocal = key => { try { localStorage.removeItem(key); return true; } catch { return false; } };
  const readLocalState = () => normalizeState(jsonParse(getLocal(STATE_KEY)) || jsonParse(getLocal(BACKUP_KEY)) || createState());
  const saveLocalState = state => setLocal(STATE_KEY, serializeState(state));
  const saveBackupState = state => setLocal(BACKUP_KEY, serializeState(state));
  const clearLocalState = () => [STATE_KEY, BACKUP_KEY, UI_KEY, DOC_KEY].forEach(removeLocal);
  const readUiState = () => normalizeUi(jsonParse(getLocal(UI_KEY)) || {});
  const saveUiState = ui => setLocal(UI_KEY, normalizeUi(ui));
  const readDocumentCache = () => { const p = jsonParse(getLocal(DOC_KEY)) || {}; return { profCt: str(p.profCt), profMrt: str(p.profMrt), updatedAt: str(p.updatedAt) }; };
  const saveDocumentCache = docs => setLocal(DOC_KEY, { profCt: str(docs?.profCt), profMrt: str(docs?.profMrt), updatedAt: nowIso() });
  const sourcePaths = () => { const el = document.getElementById("seedSources"); return { prompts: el?.dataset?.promptsSrc || SOURCE_PATHS.prompts, profCt: el?.dataset?.profCtSrc || SOURCE_PATHS.profCt, profMrt: el?.dataset?.profMrtSrc || SOURCE_PATHS.profMrt }; };
  const fetchText = async url => { const res = await fetch(url, { cache: "no-store", headers: { Accept: "text/plain,*/*" } }); if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`); return line(await res.text()); };
  const loadSeedTexts = async (paths = sourcePaths()) => { const out = { prompts: "", profCt: "", profMrt: "", errors: [] }; await Promise.all([fetchText(paths.prompts).then(t => out.prompts = t).catch(e => out.errors.push({ source: "prompts", message: e.message })), fetchText(paths.profCt).then(t => out.profCt = t).catch(e => out.errors.push({ source: "profCt", message: e.message })), fetchText(paths.profMrt).then(t => out.profMrt = t).catch(e => out.errors.push({ source: "profMrt", message: e.message }))]); if (out.profCt || out.profMrt) saveDocumentCache(out); return out; };
  const createStateFromSeedFiles = async (paths = sourcePaths(), options = {}) => { const seed = await loadSeedTexts(paths); return { state: seed.prompts ? stateFromPromptText(seed.prompts, options) : createState(FALLBACK_PROMPTS, options), documents: { profCt: seed.profCt, profMrt: seed.profMrt }, errors: seed.errors }; };
  const safeFileName = value => `${slug(value || "radprompt-export")}-${new Date().toISOString().slice(0, 10)}.json`;
  const downloadJson = (data, filename) => { const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename || safeFileName("radprompt-export"); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const debounce = (fn, delay = 180) => { let t = 0; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; };
  const throttle = (fn, delay = 240) => { let last = 0, timer = 0; return (...args) => { const n = Date.now(); const left = delay - (n - last); if (left <= 0) { clearTimeout(timer); last = n; fn(...args); } else { clearTimeout(timer); timer = setTimeout(() => { last = Date.now(); fn(...args); }, left); } }; };
  const moveItem = (items, from, to) => { const list = [...arr(items)]; const [item] = list.splice(from, 1); list.splice(to, 0, item); return list; };
  const reorderByIds = (items, ids) => { const map = new Map(arr(items).map(i => [i.id, i])); const used = new Set(); const out = []; for (const id of arr(ids)) if (map.has(id) && !used.has(id)) { out.push(map.get(id)); used.add(id); } for (const item of arr(items).sort(byOrder)) if (!used.has(item.id)) out.push(item); return out.map((item, i) => ({ ...item, order: i })); };
  const applyPromptOrder = (state, ids, folderId = "") => { const s = normalizeState(state); const scoped = folderId && folderId !== ALL && folderId !== FAVORITES ? s.prompts.filter(p => p.folderId === folderId) : s.prompts; const ordered = reorderByIds(scoped, ids); const map = new Map(ordered.map(p => [p.id, p])); return withMeta({ ...s, prompts: s.prompts.map(p => map.get(p.id) || p) }); };
  const applyFolderOrder = (state, ids) => withMeta({ ...normalizeState(state), folders: reorderByIds(normalizeState(state).folders, ids) });
  const applyFavoriteOrder = (state, ids) => { const s = normalizeState(state); const valid = new Set(s.prompts.filter(p => p.favorite && !p.archived).map(p => p.id)); return withMeta({ ...s, favoriteOrder: unique(ids).filter(id => valid.has(id)) }); };
  const upsertPrompt = (state, prompt) => { const s = normalizeState(state); const p = normalizePrompt(prompt, s.prompts.length, new Set(s.folders.map(f => f.id))); const exists = s.prompts.some(x => x.id === p.id); const prompts = exists ? s.prompts.map(x => x.id === p.id ? { ...p, updatedAt: nowIso() } : x) : [...s.prompts, p]; const favoriteOrder = p.favorite ? unique([...s.favoriteOrder, p.id]) : s.favoriteOrder.filter(id => id !== p.id); return withMeta({ ...s, prompts, favoriteOrder }); };
  const removePrompt = (state, id) => { const s = normalizeState(state); return withMeta({ ...s, prompts: s.prompts.filter(p => p.id !== id), favoriteOrder: s.favoriteOrder.filter(x => x !== id) }); };
  const createNewPrompt = (state, folderId = "") => { const s = normalizeState(state); const target = folderId && folderId !== ALL && folderId !== FAVORITES ? folderId : s.folders[0]?.id || "folder-bildinterpretation"; return normalizePrompt({ id: uid("prompt"), title: "Neuer Prompt", folderId: target, tone: "steel", body: "Modalität: ***Modalität***\nThema: ***THEMA***\n\n", favorite: false, order: s.prompts.length }, s.prompts.length, new Set(s.folders.map(f => f.id))); };
  const createNewFolder = (name = "Neuer Ordner", description = "", order = 0) => normalizeFolder({ id: uid("folder"), title: name, description, order, tone: TONES[order % TONES.length] }, order);
  const upsertFolder = (state, folder) => { const s = normalizeState(state); const f = normalizeFolder(folder, s.folders.length); return withMeta({ ...s, folders: s.folders.some(x => x.id === f.id) ? s.folders.map(x => x.id === f.id ? { ...f, updatedAt: nowIso() } : x) : [...s.folders, f] }); };
  const toggleFavorite = (state, id) => { const s = normalizeState(state); let fav = false; const prompts = s.prompts.map(p => p.id === id ? (fav = !p.favorite, { ...p, favorite: fav, updatedAt: nowIso() }) : p); return withMeta({ ...s, prompts, favoriteOrder: fav ? unique([...s.favoriteOrder, id]) : s.favoriteOrder.filter(x => x !== id) }); };
  const validateState = state => { const s = normalizeState(state); const errors = []; const ids = new Set(); for (const p of s.prompts) { if (!p.id) errors.push(`Prompt ohne ID: ${p.title}`); if (ids.has(p.id)) errors.push(`Doppelte Prompt-ID: ${p.id}`); ids.add(p.id); if (!p.title) errors.push(`Prompt ohne Titel: ${p.id}`); if (!p.body) errors.push(`Prompt ohne Text: ${p.title}`); } return { ok: errors.length === 0, errors, warnings: [], metrics: summary(s), bytes: new Blob([serializeState(s)]).size }; };

  Object.defineProperty(globalThis, "RadPromptDefaults", { value: Object.freeze({ VERSION, SCHEMA, STATE_KEY, BACKUP_KEY, UI_KEY, DOC_KEY, KV_STATE_ENDPOINT, KV_HEALTH_ENDPOINT, ALL, FAVORITES, PLACEHOLDER_RE, MODALITY_PLACEHOLDER, TOPIC_PLACEHOLDER, MODALITY_OPTIONS, TONES, PROF_CT_LABEL, PROF_MRT_LABEL, SOURCE_PATHS, DEFAULT_FOLDERS: clone(DEFAULT_FOLDERS), FALLBACK_PROMPTS: clone(FALLBACK_PROMPTS), COMMANDS: clone(COMMANDS), nowIso, str, line, collapse, title, phName, arr, jsonParse, clone, unique, hash, slug, idFor, uid, byOrder, extractPlaceholders, isModalityPlaceholder, isTopicPlaceholder, hasPlaceholder, isProfSchaeferPrompt, isQuick, inferFolderId, inferTone, inferTags, splitPromptSections, parsePromptText, normalizeFolder, ensureFolders, normalizePrompt, normalizeUi, createState, normalizeState, stateFromPromptText, mergeSeedPrompts, getFolderById, getPromptById, folderStats, favoritePrompts, summary, normalizeSearch, matches, filterPrompts, replacePlaceholders, createClipboardPayload, validatePlaceholderValues, serializeState, parseImportedState, withMeta, getLocal, setLocal, removeLocal, readLocalState, saveLocalState, saveBackupState, clearLocalState, readUiState, saveUiState, readDocumentCache, saveDocumentCache, sourcePaths, fetchText, loadSeedTexts, createStateFromSeedFiles, safeFileName, downloadJson, debounce, throttle, moveItem, reorderByIds, applyPromptOrder, applyFolderOrder, applyFavoriteOrder, upsertPrompt, removePrompt, createNewPrompt, createNewFolder, upsertFolder, toggleFavorite, validateState }), writable: false, configurable: false });
})();
