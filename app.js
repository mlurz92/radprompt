(() => {
  "use strict";

  const API = { state: "/api/state", seed: "/api/seed", health: "/api/health", export: "/api/export" };
  const STORAGE = { state: "radprompt.minimal.state.v1", ui: "radprompt.minimal.ui.v1", fields: "radprompt.minimal.fields.v1" };
  const DATA = { prompts: "/data/Beispielprompts.txt", schaeferCt: "/data/Befundbeispiele%20Prof.%20Sch%C3%A4fer%20CT.txt", schaeferMrt: "/data/Befundbeispiele%20Prof.%20Sch%C3%A4fer%20MRT.txt" };
  const MODALITIES = ["CT", "MRT", "Röntgen", "CT&MRT"];
  const DEFAULT_FOLDERS = [
    { id: "befundung", name: "Befundung", icon: "scan-search", order: 0 },
    { id: "prof-schaefer", name: "Prof. Schäfer", icon: "stethoscope", order: 1 },
    { id: "wissen", name: "Wissen", icon: "book-open", order: 2 },
    { id: "allgemein", name: "Allgemein", icon: "sparkles", order: 3 }
  ];
  const DEFAULT_DOCUMENTS = { schaeferCt: { title: "# Befundbeispiele Prof. Schäfer CT.txt", text: "", updatedAt: "" }, schaeferMrt: { title: "# Befundbeispiele Prof. Schäfer MRT.txt", text: "", updatedAt: "" } };
  const DEFAULT_SETTINGS = { selected: "all", sort: "manual", autosave: true };
  const app = { state: emptyState(), selected: "", query: "", values: {}, dirty: false, hash: "", timer: 0, saving: false, sortable: null, fuse: null };
  const $ = (id) => document.getElementById(id);
  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cache();
    bind();
    app.values = read(STORAGE.fields, {});
    await loadState();
    render();
    initSortable();
    handleActionFromUrl();
    document.documentElement.dataset.ready = "true";
  }

  function cache() {
    Object.assign(els, {
      shell: $("app"), search: $("searchInput"), rail: $("filterRail"), grid: $("deckGrid"), empty: $("emptyState"), detail: $("detailPanel"), detailTitle: $("detailTitle"), detailKind: $("detailKind"), detailBadges: $("detailBadges"), fields: $("placeholderFields"), preview: $("promptPreview"), prompts: $("metricPrompts"), favorites: $("metricFavorites"), updated: $("metricUpdated"), sync: $("syncStatus"), editor: $("editorDialog"), editorForm: $("editorForm"), importDialog: $("importDialog"), importForm: $("importForm"), importPreview: $("importPreview"), exportDialog: $("exportDialog"), exportPreview: $("exportPreview"), diagnostics: $("diagnosticsDialog"), diagnosticsOutput: $("diagnosticsOutput"), toast: $("toastStack")
    });
  }

  function bind() {
    document.addEventListener("click", click);
    document.addEventListener("input", input);
    document.addEventListener("change", input);
    document.addEventListener("submit", submit);
    document.addEventListener("keydown", keydown);
    window.addEventListener("beforeunload", e => { if (app.dirty) { e.preventDefault(); e.returnValue = ""; } });
  }

  async function loadState() {
    status("Lade");
    const local = read(STORAGE.state, null);
    try {
      const res = await fetch(API.state, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!res.ok) throw new Error(`State ${res.status}`);
      const json = await res.json();
      app.state = normalize(json.state || json);
      app.hash = json.summary?.hash || app.state.meta.hash || "";
      write(STORAGE.state, app.state);
      status("Bereit");
    } catch {
      app.state = normalize(local || emptyState());
      status("Lokal");
    }
  }

  function render() {
    app.state = normalize(app.state);
    buildFuse();
    renderStats();
    renderFilters();
    renderGrid();
    renderDetail();
    icons();
  }

  function renderStats() {
    els.prompts.textContent = String(app.state.prompts.length);
    els.favorites.textContent = String(app.state.favorites.length);
    els.updated.textContent = shortDate(app.state.updatedAt);
  }

  function renderFilters() {
    const selected = app.state.settings.selected || "all";
    const folders = sortedFolders();
    const rows = [{ id: "all", name: "Alle", count: app.state.prompts.length }, { id: "favorites", name: "Favoriten", count: app.state.favorites.length }, ...folders.map(f => ({ id: f.id, name: f.name, count: app.state.prompts.filter(p => p.folderId === f.id).length }))];
    els.rail.innerHTML = rows.map(f => `<button class="filter-chip${selected === f.id ? " is-active" : ""}" type="button" data-action="filter" data-id="${esc(f.id)}"><span>${html(f.name)}</span><strong>${f.count}</strong></button>`).join("");
  }

  function renderGrid() {
    const prompts = visiblePrompts();
    els.grid.innerHTML = prompts.map(tile).join("");
    els.empty.hidden = prompts.length > 0;
    if (app.selected && !app.state.prompts.some(p => p.id === app.selected)) app.selected = "";
  }

  function tile(p) {
    const folder = app.state.folders.find(f => f.id === p.folderId);
    const ph = placeholders(p.body).length;
    const fav = app.state.favorites.includes(p.id);
    const sch = p.kind === "schaefer" || p.appendSchaeferCt || p.appendSchaeferMrt;
    return `<article class="tile${app.selected === p.id ? " is-selected" : ""}" role="listitem" tabindex="0" data-action="select" data-id="${esc(p.id)}" data-accent="${esc(p.accent || "blue")}"><h3 class="tile-title">${html(p.title)}</h3><div class="tile-meta"><span class="mini-badge">${html(folder?.name || "Prompt")}</span>${fav ? `<span class="mini-badge is-hot">★</span>` : ""}${ph ? `<span class="mini-badge">${ph} Felder</span>` : ""}${sch ? `<span class="mini-badge is-purple">Schäfer</span>` : ""}</div></article>`;
  }

  function renderDetail() {
    const p = selectedPrompt();
    if (!p) {
      els.detail.hidden = true;
      document.documentElement.classList.remove("has-detail");
      return;
    }
    els.detail.hidden = false;
    document.documentElement.classList.add("has-detail");
    const folder = app.state.folders.find(f => f.id === p.folderId);
    const ph = placeholders(p.body);
    els.detailTitle.textContent = p.title;
    els.detailKind.textContent = p.kind === "schaefer" ? "Prof. Schäfer" : p.kind === "special" ? "Spezial" : "Standard";
    els.detailBadges.innerHTML = [`<span class="soft-pill">${html(folder?.name || "Prompt")}</span>`, app.state.favorites.includes(p.id) ? `<span class="soft-pill">Favorit</span>` : "", p.appendSchaeferCt ? `<span class="soft-pill">CT-Anhang</span>` : "", p.appendSchaeferMrt ? `<span class="soft-pill">MRT-Anhang</span>` : "", ph.length ? `<span class="soft-pill">${ph.length} Platzhalter</span>` : ""].filter(Boolean).join("");
    els.fields.innerHTML = ph.map(name => field(p.id, name)).join("");
    els.preview.value = output(p, false);
    icons();
  }

  function field(id, name) {
    const value = app.values[id]?.[name] || "";
    if (normKey(name) === "modalitat" || normKey(name) === "modalitaet") return `<label>${html(name)}<select data-field="${esc(name)}" data-prompt="${esc(id)}"><option value="">Auswählen</option>${MODALITIES.map(v => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${html(v)}</option>`).join("")}</select></label>`;
    return `<label>${html(name)}<input type="text" value="${esc(value)}" data-field="${esc(name)}" data-prompt="${esc(id)}" autocomplete="off" spellcheck="false"></label>`;
  }

  function click(e) {
    const c = e.target.closest("[data-action]");
    if (!c) return;
    const a = c.dataset.action;
    if (["select", "filter", "copy-selected", "toggle-favorite", "duplicate", "edit", "new-prompt", "save", "import", "export", "diagnostics", "close-detail", "close-dialog", "delete-current", "download-export"].includes(a)) e.preventDefault();
    if (a === "select") selectPrompt(c.dataset.id);
    if (a === "filter") setFilter(c.dataset.id);
    if (a === "copy-selected") copySelected();
    if (a === "toggle-favorite") toggleFavorite();
    if (a === "duplicate") duplicateSelected();
    if (a === "edit") openEditor(app.selected);
    if (a === "new-prompt") openEditor("");
    if (a === "save") save(true);
    if (a === "import") openImport();
    if (a === "export") openExport();
    if (a === "diagnostics") openDiagnostics();
    if (a === "close-detail") { app.selected = ""; render(); }
    if (a === "close-dialog") closeDialogs();
    if (a === "delete-current") deleteCurrent();
    if (a === "download-export") downloadExport(c.dataset.format || "json");
  }

  function input(e) {
    if (e.target === els.search) { app.query = e.target.value.trim(); renderGrid(); icons(); return; }
    if (e.target.dataset.field) {
      const id = e.target.dataset.prompt;
      const name = e.target.dataset.field;
      app.values[id] ||= {};
      app.values[id][name] = e.target.value;
      write(STORAGE.fields, app.values);
      if (id === app.selected) els.preview.value = output(selectedPrompt(), false);
    }
  }

  function submit(e) {
    if (e.target === els.editorForm) { e.preventDefault(); saveEditor(); }
    if (e.target === els.importForm) { e.preventDefault(); runImport(); }
  }

  function keydown(e) {
    if (e.key === "Escape") { if (!els.detail.hidden) { app.selected = ""; render(); } closeDialogs(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(true); }
    if (e.key === "Enter" && e.target.closest(".tile")) selectPrompt(e.target.closest(".tile").dataset.id);
  }

  function setFilter(id) {
    app.state.settings.selected = id || "all";
    app.state.settings.selectedFolder = app.state.settings.selected;
    app.selected = "";
    write(STORAGE.ui, app.state.settings);
    render();
  }

  function selectPrompt(id) {
    app.selected = id || "";
    renderGrid();
    renderDetail();
  }

  function selectedPrompt() {
    return app.state.prompts.find(p => p.id === app.selected) || null;
  }

  function visiblePrompts() {
    let prompts = [...app.state.prompts];
    const selected = app.state.settings.selected || "all";
    if (selected === "favorites") prompts = prompts.filter(p => app.state.favorites.includes(p.id));
    else if (selected !== "all") prompts = prompts.filter(p => p.folderId === selected);
    if (app.query) prompts = search(prompts, app.query);
    return sort(prompts);
  }

  function search(scope, query) {
    if (window.Fuse && app.fuse) {
      const allowed = new Set(scope.map(p => p.id));
      return app.fuse.search(query).map(r => r.item).filter(p => allowed.has(p.id));
    }
    const q = norm(query);
    return scope.filter(p => norm(`${p.title} ${p.description} ${p.body}`).includes(q));
  }

  function sort(prompts) {
    const mode = app.state.settings.sort || "manual";
    if (mode === "alpha") return prompts.sort((a, b) => a.title.localeCompare(b.title, "de", { sensitivity: "base" }));
    if (mode === "recent") return prompts.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return prompts.sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.title.localeCompare(b.title, "de", { sensitivity: "base" }));
  }

  function sortedFolders() {
    return [...app.state.folders].sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.name.localeCompare(b.name, "de", { sensitivity: "base" }));
  }

  function buildFuse() {
    app.fuse = window.Fuse ? new window.Fuse(app.state.prompts, { keys: [{ name: "title", weight: 0.5 }, { name: "description", weight: 0.16 }, { name: "body", weight: 0.28 }, { name: "folderId", weight: 0.06 }], threshold: 0.34, ignoreLocation: true }) : null;
  }

  function initSortable() {
    if (!window.Sortable || app.sortable) return;
    app.sortable = new window.Sortable(els.grid, { animation: 140, draggable: ".tile", dataIdAttr: "data-id", ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", onEnd: reorderVisible });
  }

  function reorderVisible() {
    if (app.query || (app.state.settings.sort || "manual") !== "manual") return;
    const ids = [...els.grid.querySelectorAll(".tile")].map(x => x.dataset.id);
    ids.forEach((id, index) => { const p = app.state.prompts.find(x => x.id === id); if (p) { p.order = index; p.updatedAt = now(); } });
    mark("Sortiert");
  }

  function output(p, appendDocs = true) {
    if (!p) return "";
    let text = p.body || "";
    for (const name of placeholders(text)) text = text.split(`***${name}***`).join(app.values[p.id]?.[name] || `***${name}***`);
    if (appendDocs && (p.kind === "schaefer" || p.appendSchaeferCt) && app.state.documents.schaeferCt.text) text += `\n\n# Befundbeispiele Prof. Schäfer CT\n\n${app.state.documents.schaeferCt.text.trim()}`;
    if (appendDocs && (p.kind === "schaefer" || p.appendSchaeferMrt) && app.state.documents.schaeferMrt.text) text += `\n\n# Befundbeispiele Prof. Schäfer MRT\n\n${app.state.documents.schaeferMrt.text.trim()}`;
    return text.trim() + "\n";
  }

  async function copySelected() {
    const p = selectedPrompt();
    if (!p) return;
    await copyText(output(p, true));
    p.lastUsedAt = now();
    mark("Kopiert", 3500);
    toast("Prompt kopiert", p.title);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const ta = document.createElement("textarea");
    ta.className = "clipboard-fallback";
    ta.value = text;
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  function toggleFavorite() {
    const p = selectedPrompt();
    if (!p) return;
    if (app.state.favorites.includes(p.id)) app.state.favorites = app.state.favorites.filter(id => id !== p.id);
    else app.state.favorites.push(p.id);
    p.favorite = app.state.favorites.includes(p.id);
    mark("Favoriten");
    render();
  }

  function duplicateSelected() {
    const p = selectedPrompt();
    if (!p) return;
    const copy = normalizePrompt({ ...p, id: uniqueId(slug(p.title)), title: `${p.title} Kopie`, favorite: false, order: nextOrder(p.folderId), createdAt: now(), updatedAt: now(), lastUsedAt: "" });
    app.state.prompts.push(copy);
    app.selected = copy.id;
    mark("Dupliziert");
    render();
  }

  function openEditor(id) {
    const p = id ? app.state.prompts.find(x => x.id === id) : null;
    $("editorId").value = p?.id || "";
    $("editorTitle").value = p?.title || "Neuer Prompt";
    $("editorDescription").value = p?.description || "";
    $("editorBody").value = p?.body || "";
    $("editorKind").value = p?.kind || "standard";
    $("editorAccent").value = p?.accent || "blue";
    $("editorFavorite").checked = p ? app.state.favorites.includes(p.id) : false;
    $("editorCt").checked = Boolean(p?.appendSchaeferCt);
    $("editorMrt").checked = Boolean(p?.appendSchaeferMrt);
    $("editorFolder").innerHTML = sortedFolders().map(f => `<option value="${esc(f.id)}">${html(f.name)}</option>`).join("");
    $("editorFolder").value = p?.folderId || sortedFolders()[0]?.id || "allgemein";
    showDialog(els.editor);
  }

  function saveEditor() {
    const id = $("editorId").value;
    const existing = app.state.prompts.find(p => p.id === id);
    const raw = { id: id || uniqueId(slug($("editorTitle").value || "prompt")), title: $("editorTitle").value, description: $("editorDescription").value, body: $("editorBody").value, folderId: $("editorFolder").value, kind: $("editorKind").value, accent: $("editorAccent").value, favorite: $("editorFavorite").checked, appendSchaeferCt: $("editorCt").checked, appendSchaeferMrt: $("editorMrt").checked, order: existing?.order ?? nextOrder($("editorFolder").value), createdAt: existing?.createdAt || now(), updatedAt: now(), lastUsedAt: existing?.lastUsedAt || "" };
    const p = normalizePrompt(raw);
    if (existing) Object.assign(existing, p); else app.state.prompts.push(p);
    if (p.favorite && !app.state.favorites.includes(p.id)) app.state.favorites.push(p.id);
    if (!p.favorite) app.state.favorites = app.state.favorites.filter(x => x !== p.id);
    app.selected = p.id;
    closeDialogs();
    mark("Gespeichert");
    render();
  }

  function deleteCurrent() {
    const id = $("editorId").value || app.selected;
    const p = app.state.prompts.find(x => x.id === id);
    if (!p || !confirm(`Prompt löschen?\n\n${p.title}`)) return;
    app.state.prompts = app.state.prompts.filter(x => x.id !== id);
    app.state.favorites = app.state.favorites.filter(x => x !== id);
    if (app.selected === id) app.selected = "";
    closeDialogs();
    mark("Gelöscht");
    render();
  }

  function openImport() {
    showDialog(els.importDialog);
    fetch(`${API.seed}?text=0`, { cache: "no-store" }).then(r => r.json()).then(j => { els.importPreview.textContent = JSON.stringify(j, null, 2); }).catch(e => { els.importPreview.textContent = String(e.message || e); });
  }

  async function runImport() {
    const data = Object.fromEntries(new FormData(els.importForm).entries());
    const payload = { prompts: !!data.prompts, schaeferCt: !!data.schaeferCt, schaeferMrt: !!data.schaeferMrt, replace: !!data.replace, favoriteFirst: !!data.favoriteFirst };
    try {
      const res = await fetch(API.seed, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Import ${res.status}`);
      const json = await res.json();
      app.state = normalize(json.state || app.state);
      app.hash = json.summary?.hash || "";
      app.dirty = false;
      write(STORAGE.state, app.state);
      closeDialogs();
      render();
      toast("Startset geladen", "Import abgeschlossen");
    } catch (e) {
      toast("Import fehlgeschlagen", e.message || String(e));
    }
  }

  function openExport() {
    els.exportPreview.textContent = JSON.stringify({ prompts: app.state.prompts.length, favorites: app.state.favorites.length, updatedAt: app.state.updatedAt }, null, 2);
    showDialog(els.exportDialog);
  }

  async function downloadExport(format) {
    try {
      const res = await fetch(`${API.export}?format=${encodeURIComponent(format)}&download=1`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Export ${res.status}`);
      download(await res.text(), `radprompt-${format}-${now().slice(0, 19).replace(/[:T]/g, "-")}.${format === "json" ? "json" : "txt"}`);
    } catch {
      const text = format === "json" ? JSON.stringify(app.state, null, 2) : app.state.prompts.map(p => `// ${p.title}:\n\n${p.body}`).join("\n\n");
      download(text, `radprompt-${format}.${format === "json" ? "json" : "txt"}`);
    }
  }

  function download(text, filename) {
    const a = document.createElement("a");
    a.className = "download-link";
    a.href = URL.createObjectURL(new Blob([text], { type: filename.endsWith(".json") ? "application/json" : "text/plain" }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function openDiagnostics() {
    showDialog(els.diagnostics);
    fetch(API.health, { cache: "no-store" }).then(r => r.json()).then(j => { els.diagnosticsOutput.textContent = JSON.stringify(j, null, 2); }).catch(e => { els.diagnosticsOutput.textContent = String(e.message || e); });
  }

  function showDialog(d) { if (d?.showModal && !d.open) d.showModal(); }
  function closeDialogs() { document.querySelectorAll("dialog[open]").forEach(d => d.close()); }

  function handleActionFromUrl() {
    const url = new URL(location.href);
    const action = url.searchParams.get("action");
    const title = url.searchParams.get("title");
    const text = url.searchParams.get("text");
    const sharedUrl = url.searchParams.get("url");
    if (title || text || sharedUrl) {
      openEditor("");
      $("editorTitle").value = title || "Geteilter Prompt";
      $("editorBody").value = [text, sharedUrl].filter(Boolean).join("\n\n");
      return;
    }
    if (action === "new-prompt") openEditor("");
    if (action === "import") openImport();
    if (action === "export") openExport();
    if (action === "diagnostics") openDiagnostics();
  }

  function mark(label, delay = 1400) {
    app.state = normalize(app.state);
    app.state.updatedAt = now();
    app.state.version = Math.max(1, Number(app.state.version || 0) + 1);
    app.dirty = true;
    write(STORAGE.state, app.state);
    status(label);
    clearTimeout(app.timer);
    app.timer = setTimeout(() => save(false), delay);
  }

  async function save(manual) {
    if (app.saving) return;
    if (!app.dirty && !manual) return;
    app.saving = true;
    status("Speichert");
    try {
      const body = { state: normalize(app.state), expectedHash: app.hash || undefined };
      let res = await fetch(API.state, { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
      if (res.status === 409) res = await fetch(API.state, { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ state: normalize(app.state) }) });
      if (!res.ok) throw new Error(`State ${res.status}`);
      const json = await res.json();
      app.state = normalize(json.state || app.state);
      app.hash = json.summary?.hash || app.state.meta.hash || "";
      app.dirty = false;
      write(STORAGE.state, app.state);
      status("Bereit");
      if (manual) toast("Gespeichert", "Cloudflare KV aktualisiert");
      renderStats();
    } catch (e) {
      status("Lokal");
      if (manual) toast("Lokal gespeichert", e.message || "API nicht erreichbar");
    } finally {
      app.saving = false;
    }
  }

  function status(text) { els.sync.textContent = text; }
  function toast(title, message = "") { const n = document.createElement("div"); n.className = "toast"; n.innerHTML = `<strong>${html(title)}</strong><span>${html(message)}</span>`; els.toast.appendChild(n); setTimeout(() => n.remove(), 3600); }
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function placeholders(text) { return uniq([...String(text || "").matchAll(/\*\*\*([^*]+?)\*\*\*/g)].map(m => m[1].trim()).filter(Boolean)); }
  function nextOrder(folderId) { const list = app.state.prompts.filter(p => p.folderId === folderId); return list.length ? Math.max(...list.map(p => Number(p.order || 0))) + 1 : 0; }
  function uniqueId(root) { const base = slug(root) || "prompt"; const ids = new Set(app.state.prompts.map(p => p.id)); if (!ids.has(base)) return base; let i = 2; while (ids.has(`${base}-${i}`)) i++; return `${base}-${i}`; }
  function emptyState() { const t = now(); return { schema: "radprompt.v1", version: 0, updatedAt: t, folders: DEFAULT_FOLDERS.map(f => ({ ...f, createdAt: t, updatedAt: t })), prompts: [], favorites: [], documents: JSON.parse(JSON.stringify(DEFAULT_DOCUMENTS)), settings: { ...DEFAULT_SETTINGS }, meta: { seededAt: "", source: "", hash: "" } }; }
  function normalize(s) { const base = emptyState(); const raw = s && typeof s === "object" ? s : {}; const folders = (Array.isArray(raw.folders) && raw.folders.length ? raw.folders : base.folders).map(normalizeFolder); const folderIds = new Set(folders.map(f => f.id)); const fallback = folders[0]?.id || "allgemein"; const prompts = (Array.isArray(raw.prompts) ? raw.prompts : []).map((p, i) => normalizePrompt(p, fallback, i)).map(p => { if (!folderIds.has(p.folderId)) p.folderId = fallback; return p; }); const ids = new Set(prompts.map(p => p.id)); const favorites = uniq([...(Array.isArray(raw.favorites) ? raw.favorites : []), ...prompts.filter(p => p.favorite).map(p => p.id)]).filter(id => ids.has(id)); return { schema: "radprompt.v1", version: Number(raw.version || 0), updatedAt: valid(raw.updatedAt) || base.updatedAt, folders: folders.sort((a, b) => a.order - b.order), prompts, favorites, documents: { schaeferCt: { ...DEFAULT_DOCUMENTS.schaeferCt, ...(raw.documents?.schaeferCt || {}) }, schaeferMrt: { ...DEFAULT_DOCUMENTS.schaeferMrt, ...(raw.documents?.schaeferMrt || {}) } }, settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}), ...(read(STORAGE.ui, {}) || {}) }, meta: { seededAt: "", source: "", hash: "", ...(raw.meta || {}) } }; }
  function normalizeFolder(f = {}) { return { id: slug(f.id || f.name) || "ordner", name: clean(f.name || "Ordner", 180), icon: clean(f.icon || "folder", 80), order: Number.isFinite(Number(f.order)) ? Number(f.order) : 0, createdAt: valid(f.createdAt) || now(), updatedAt: valid(f.updatedAt) || now() }; }
  function normalizePrompt(p = {}, folder = "allgemein", order = 0) { const body = clean(p.body || "", 1600000); const title = clean(p.title || "Unbenannter Prompt", 180); const kind = clean(p.kind || (placeholders(body).length ? "special" : "standard"), 50); return { id: slug(p.id || title) || `prompt-${Date.now()}`, title, description: clean(p.description || "", 500), folderId: slug(p.folderId || folder) || folder, body, kind, accent: clean(p.accent || (kind === "schaefer" ? "violet" : "blue"), 40), favorite: Boolean(p.favorite), appendSchaeferCt: Boolean(p.appendSchaeferCt), appendSchaeferMrt: Boolean(p.appendSchaeferMrt), order: Number.isFinite(Number(p.order)) ? Number(p.order) : order, createdAt: valid(p.createdAt) || now(), updatedAt: valid(p.updatedAt) || now(), lastUsedAt: valid(p.lastUsedAt) || "" }; }
  function read(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  function valid(x) { if (!x) return ""; const d = new Date(x); return Number.isFinite(d.getTime()) ? d.toISOString() : ""; }
  function now() { return new Date().toISOString(); }
  function shortDate(x) { const d = new Date(x); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(d) : "—"; }
  function clean(x, max = 1000000) { return String(x ?? "").normalize("NFKC").replace(/\r\n?/g, "\n").trim().slice(0, max); }
  function slug(x) { return String(x || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120); }
  function norm(x) { return String(x || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function normKey(x) { return norm(x).replace(/[^a-z0-9]+/g, ""); }
  function uniq(a) { return [...new Set(a.filter(Boolean))]; }
  function html(x) { return String(x ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c])); }
  function esc(x) { return html(x).replace(/`/g, "&#096;"); }
})();
