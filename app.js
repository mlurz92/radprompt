(() => {
  "use strict";

  const APP = {
    schema: "radprompt.v1",
    api: { state: "/api/state", seed: "/api/seed", health: "/api/health", export: "/api/export" },
    data: { prompts: "/data/Beispielprompts.txt", ct: "/data/Befundbeispiele%20Prof.%20Sch%C3%A4fer%20CT.txt", mrt: "/data/Befundbeispiele%20Prof.%20Sch%C3%A4fer%20MRT.txt" },
    storage: { state: "radprompt.rebuilt.state.v2", ui: "radprompt.rebuilt.ui.v2", placeholders: "radprompt.rebuilt.placeholders.v2" },
    modalities: ["CT", "MRT", "Röntgen", "CT&MRT"],
    saveDelay: 1400,
    saveFloor: 1150,
    toastMs: 4200
  };

  const defaults = {
    folders: [
      { id: "befundung", name: "Befundung", icon: "scan-search", order: 0 },
      { id: "prof-schaefer", name: "Prof. Schäfer", icon: "stethoscope", order: 1 },
      { id: "wissen", name: "Wissen", icon: "book-open", order: 2 },
      { id: "allgemein", name: "Allgemein", icon: "sparkles", order: 3 }
    ],
    settings: { selected: "all", sort: "manual", compact: false }
  };

  const S = {
    state: emptyState(),
    placeholders: {},
    query: "",
    selectedId: "",
    remoteHash: "",
    dirty: false,
    saving: false,
    saveQueued: false,
    saveTimer: 0,
    saveLast: 0,
    fuse: null,
    sortable: null,
    localOnly: false
  };

  const D = {};

  document.addEventListener("DOMContentLoaded", boot);

  async function boot() {
    try {
      bindDom();
      bindEvents();
      loadLocalUi();
      await loadState();
      S.placeholders = readJson(APP.storage.placeholders, {});
      render();
      initSortable();
      handleLaunch();
      icons();
    } catch (error) {
      fatal(error);
    }
  }

  function bindDom() {
    Object.assign(D, {
      app: id("app"),
      search: id("searchInput"),
      status: id("syncStatus"),
      filters: id("filterStrip"),
      grid: id("promptGrid"),
      empty: id("emptyState"),
      detail: id("detailPanel"),
      detailEmpty: id("detailEmpty"),
      detailContent: id("detailContent"),
      detailFolder: id("detailFolder"),
      detailTitle: id("detailTitle"),
      detailMeta: id("detailMeta"),
      placeholderFields: id("placeholderFields"),
      preview: id("promptPreview"),
      sort: id("sortMode"),
      mPrompts: id("metricPrompts"),
      mFolders: id("metricFolders"),
      mFavorites: id("metricFavorites"),
      mUpdated: id("metricUpdated"),
      editorDialog: id("editorDialog"),
      editorForm: id("editorForm"),
      editorHeading: id("editorHeading"),
      seedDialog: id("seedDialog"),
      seedForm: id("seedForm"),
      seedPreview: id("seedPreview"),
      exportDialog: id("exportDialog"),
      healthDialog: id("healthDialog"),
      healthOutput: id("healthOutput"),
      toastStack: id("toastStack")
    });
  }

  function bindEvents() {
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("keydown", onKey);
    window.addEventListener("online", () => saveSoon(300));
    window.addEventListener("beforeunload", event => {
      if (!S.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  async function loadState() {
    setStatus("sync", "Lade");
    const local = readJson(APP.storage.state, null);
    try {
      const res = await fetch(APP.api.state, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!res.ok) throw new Error(`State ${res.status}`);
      const json = await res.json();
      S.state = normalizeState(json.state || json);
      S.remoteHash = json.summary?.hash || S.state.meta.hash || "";
      S.localOnly = false;
      writeJson(APP.storage.state, S.state);
      setStatus("ok", "Sync");
    } catch {
      S.state = normalizeState(local || emptyState());
      S.localOnly = true;
      setStatus("local", "Lokal");
      if (!S.state.prompts.length) toast("Lokaler Start", "API nicht erreichbar oder noch kein KV-State vorhanden.", "warning");
    }
  }

  function render() {
    S.state = normalizeState(S.state);
    rebuildFuse();
    renderMetrics();
    renderFilters();
    renderGrid();
    renderDetail();
    renderFolderOptions();
    applyUi();
    icons();
  }

  function renderMetrics() {
    text(D.mPrompts, S.state.prompts.length);
    text(D.mFolders, S.state.folders.length);
    text(D.mFavorites, S.state.favorites.length);
    text(D.mUpdated, fmtDate(S.state.updatedAt));
  }

  function renderFilters() {
    const selected = S.state.settings.selected || "all";
    const rows = [];
    rows.push(chip("all", "Alle", "layout-grid", S.state.prompts.length, selected === "all"));
    rows.push(chip("favorites", "Favoriten", "star", S.state.favorites.length, selected === "favorites"));
    for (const f of folders()) rows.push(chip(f.id, f.name, f.icon || "folder", S.state.prompts.filter(p => p.folderId === f.id).length, selected === f.id));
    D.filters.innerHTML = rows.join("");
    if (D.sort) D.sort.value = S.state.settings.sort || "manual";
  }

  function chip(idValue, label, icon, count, active) {
    return `<button class="chip ${active ? "is-active" : ""}" type="button" data-action="filter" data-filter="${esc(idValue)}"><i data-lucide="${esc(icon)}"></i><span>${html(label)}</span><small>${count}</small></button>`;
  }

  function renderGrid() {
    const list = visiblePrompts();
    D.grid.innerHTML = list.map(tile).join("");
    D.empty.hidden = list.length > 0;
    syncSortable();
  }

  function tile(p) {
    const folder = S.state.folders.find(f => f.id === p.folderId);
    const ph = placeholders(p.body);
    const selected = p.id === S.selectedId;
    const fav = isFav(p.id);
    const badges = [];
    badges.push(`<span class="badge"><i data-lucide="${esc(iconForKind(p.kind))}"></i><span>${html(kindLabel(p.kind))}</span></span>`);
    if (ph.length) badges.push(`<span class="badge"><i data-lucide="braces"></i><span>${ph.length}</span></span>`);
    if (p.appendSchaeferCt || p.kind === "schaefer") badges.push(`<span class="badge prompt-count-hide">CT</span>`);
    if (p.appendSchaeferMrt || p.kind === "schaefer") badges.push(`<span class="badge prompt-count-hide">MRT</span>`);
    return `<button class="tile ${selected ? "is-selected" : ""} ${fav ? "is-favorite" : ""}" type="button" data-action="select" data-id="${esc(p.id)}" data-prompt-id="${esc(p.id)}" data-accent="${esc(p.accent || "blue")}"><span class="tile__top"><h3>${html(p.title)}</h3><span class="tile__star"><i data-lucide="star"></i></span></span><span class="tile__badges">${badges.join("")}</span><span class="tile__foot"><span>${html(folder?.name || "Ohne Ordner")}</span><span>${html(shortDate(p.updatedAt))}</span></span></button>`;
  }

  function renderDetail() {
    const p = currentPrompt();
    D.app.classList.toggle("has-detail", Boolean(p));
    if (!p) {
      D.detailEmpty.hidden = false;
      D.detailContent.hidden = true;
      return;
    }
    const folder = S.state.folders.find(f => f.id === p.folderId);
    D.detailEmpty.hidden = true;
    D.detailContent.hidden = false;
    D.detailFolder.textContent = folder?.name || "Ohne Ordner";
    D.detailTitle.textContent = p.title;
    D.detailMeta.textContent = `${bytes(p.body)} Bytes · ${placeholders(p.body).length} Platzhalter`;
    D.placeholderFields.innerHTML = placeholders(p.body).map(name => field(p.id, name)).join("");
    D.preview.textContent = p.body || "";
    animateDetail();
  }

  function field(pid, name) {
    const val = getPlaceholder(pid, name);
    const key = norm(name);
    if (key === "modalitat" || key === "modalitaet") return `<label class="field"><span>${html(name)}</span><select data-placeholder="${esc(name)}" data-pid="${esc(pid)}"><option value="">Auswählen</option>${APP.modalities.map(x => `<option value="${esc(x)}" ${x === val ? "selected" : ""}>${html(x)}</option>`).join("")}</select></label>`;
    return `<label class="field"><span>${html(name)}</span><input data-placeholder="${esc(name)}" data-pid="${esc(pid)}" value="${esc(val)}" autocomplete="off" spellcheck="false"></label>`;
  }

  function animateDetail() {
    if (!D.detailContent || !D.detailContent.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    D.detailContent.getAnimations().forEach(a => a.cancel());
    D.detailContent.animate([{ opacity: 0, transform: "translateY(10px) scale(.992)", filter: "blur(8px)" }, { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" }], { duration: 360, easing: "cubic-bezier(.22,1,.36,1)" });
  }

  function visiblePrompts() {
    const selected = S.state.settings.selected || "all";
    let list = [...S.state.prompts];
    if (selected === "favorites") list = list.filter(p => isFav(p.id));
    else if (selected !== "all") list = list.filter(p => p.folderId === selected);
    if (S.query.trim()) list = search(list, S.query.trim());
    return sortPrompts(list);
  }

  function search(scope, q) {
    if (window.Fuse && S.fuse) {
      const ids = new Set(scope.map(p => p.id));
      return S.fuse.search(q).map(r => r.item).filter(p => ids.has(p.id));
    }
    const needle = norm(q);
    return scope.filter(p => norm(`${p.title} ${p.description} ${p.body}`).includes(needle));
  }

  function sortPrompts(list) {
    const mode = S.state.settings.sort || "manual";
    if (mode === "alpha") return list.sort((a, b) => a.title.localeCompare(b.title, "de", { sensitivity: "base" }));
    if (mode === "recent") return list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    if (mode === "used") return list.sort((a, b) => String(b.lastUsedAt || "").localeCompare(String(a.lastUsedAt || "")));
    if ((S.state.settings.selected || "all") === "favorites") {
      const rank = new Map(S.state.favorites.map((id, i) => [id, i]));
      return list.sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
    }
    return list.sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.title.localeCompare(b.title, "de", { sensitivity: "base" }));
  }

  function rebuildFuse() {
    S.fuse = window.Fuse ? new window.Fuse(S.state.prompts, { keys: [{ name: "title", weight: .5 }, { name: "description", weight: .18 }, { name: "body", weight: .25 }, { name: "folderId", weight: .07 }], threshold: .34, ignoreLocation: true, minMatchCharLength: 2 }) : null;
  }

  function onClick(e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    e.preventDefault();
    dispatch(el.dataset.action, el);
  }

  function onInput(e) {
    if (e.target === D.search) {
      S.query = e.target.value;
      renderGrid();
      icons();
      return;
    }
    if (e.target.dataset.placeholder) {
      setPlaceholder(e.target.dataset.pid, e.target.dataset.placeholder, e.target.value);
      writeJson(APP.storage.placeholders, S.placeholders);
    }
  }

  function onChange(e) {
    if (e.target === D.sort) {
      S.state.settings.sort = e.target.value;
      saveUi();
      renderGrid();
      return;
    }
    if (e.target.dataset.placeholder) {
      setPlaceholder(e.target.dataset.pid, e.target.dataset.placeholder, e.target.value);
      writeJson(APP.storage.placeholders, S.placeholders);
    }
  }

  function onSubmit(e) {
    if (e.target === D.editorForm) {
      e.preventDefault();
      saveEditor();
      return;
    }
    if (e.target === D.seedForm) {
      e.preventDefault();
      runSeed();
    }
  }

  function onKey(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      D.search.focus();
      D.search.select();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveNow(true);
    }
    if (e.key === "Escape") closeTopDialog();
  }

  async function dispatch(action, el) {
    if (action === "select") return selectPrompt(el.dataset.id || el.dataset.promptId);
    if (action === "filter") return setFilter(el.dataset.filter || "all");
    if (action === "copy") return copyPrompt(S.selectedId);
    if (action === "favorite") return toggleFav(S.selectedId);
    if (action === "close-detail") return closeDetail();
    if (action === "new") return openEditor(null);
    if (action === "edit") return openEditor(S.selectedId);
    if (action === "duplicate") return duplicatePrompt(S.selectedId);
    if (action === "delete") return deletePrompt(S.selectedId);
    if (action === "seed") return openSeed();
    if (action === "export") return openDialog(D.exportDialog);
    if (action === "health") return openHealth();
    if (action === "download") return downloadExport(el.dataset.format || "json");
    if (action === "copy-export") return copyExport(el.dataset.format || "json");
    if (action === "dialog-close") return closeTopDialog();
    if (action === "compact") return toggleCompact();
    if (action === "home") return setFilter("all");
  }

  function selectPrompt(pid) {
    if (!pid || !S.state.prompts.some(p => p.id === pid)) return;
    S.selectedId = pid;
    renderGrid();
    renderDetail();
    icons();
  }

  function setFilter(filter) {
    S.state.settings.selected = filter;
    S.query = "";
    D.search.value = "";
    saveUi();
    if (S.selectedId && !visiblePrompts().some(p => p.id === S.selectedId)) S.selectedId = "";
    render();
  }

  function closeDetail() {
    S.selectedId = "";
    renderGrid();
    renderDetail();
    icons();
  }

  async function copyPrompt(pid) {
    const p = S.state.prompts.find(x => x.id === pid);
    if (!p) return toast("Kein Prompt ausgewählt", "Bitte zuerst eine Kachel auswählen.", "warning");
    try {
      const output = buildPrompt(p);
      await clipboard(output);
      p.lastUsedAt = now();
      markDirty("Kopiert", 3500);
      toast("Prompt kopiert", p.title, "success");
    } catch (err) {
      toast("Kopieren fehlgeschlagen", err.message || "Zwischenablage nicht verfügbar.", "error");
    }
  }

  function buildPrompt(p) {
    let out = String(p.body || "");
    for (const name of placeholders(out)) out = out.split(`***${name}***`).join(getPlaceholder(p.id, name) || `***${name}***`);
    const parts = [out.trim()];
    if ((p.appendSchaeferCt || p.kind === "schaefer") && S.state.documents.schaeferCt.text) parts.push(`# Befundbeispiele Prof. Schäfer CT\n\n${S.state.documents.schaeferCt.text.trim()}`);
    if ((p.appendSchaeferMrt || p.kind === "schaefer") && S.state.documents.schaeferMrt.text) parts.push(`# Befundbeispiele Prof. Schäfer MRT\n\n${S.state.documents.schaeferMrt.text.trim()}`);
    return parts.filter(Boolean).join("\n\n").trim() + "\n";
  }

  async function clipboard(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const t = document.createElement("textarea");
    t.className = "clipboard-proxy";
    t.value = text;
    t.setAttribute("readonly", "readonly");
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    if (!ok) throw new Error("Clipboard-Fallback fehlgeschlagen.");
  }

  function toggleFav(pid) {
    const p = S.state.prompts.find(x => x.id === pid);
    if (!p) return;
    if (isFav(pid)) S.state.favorites = S.state.favorites.filter(x => x !== pid);
    else S.state.favorites.push(pid);
    p.favorite = isFav(pid);
    p.updatedAt = now();
    markDirty("Favorit geändert");
    render();
  }

  function openEditor(pid) {
    const p = pid ? S.state.prompts.find(x => x.id === pid) : null;
    fillEditorFolders();
    val("editorId", p?.id || "");
    val("editorTitle", p?.title || "Neuer Prompt");
    val("editorDescription", p?.description || "");
    val("editorBody", p?.body || "");
    val("editorFolder", p?.folderId || currentFolderForNew());
    val("editorKind", p?.kind || "standard");
    val("editorAccent", p?.accent || "blue");
    check("editorFavorite", p ? isFav(p.id) : false);
    check("editorCt", Boolean(p?.appendSchaeferCt));
    check("editorMrt", Boolean(p?.appendSchaeferMrt));
    D.editorHeading.textContent = p ? "Prompt bearbeiten" : "Prompt erstellen";
    openDialog(D.editorDialog);
    setTimeout(() => id("editorTitle").focus(), 40);
  }

  function saveEditor() {
    const pid = val("editorId");
    const existing = S.state.prompts.find(p => p.id === pid);
    const folderId = val("editorFolder") || currentFolderForNew();
    const body = val("editorBody");
    const data = {
      id: existing?.id || uniqueId(slug(val("editorTitle") || "prompt")),
      title: clean(val("editorTitle") || "Unbenannter Prompt", 180),
      description: clean(val("editorDescription"), 500),
      folderId,
      body: clean(body, 1600000),
      kind: val("editorKind") || classify(val("editorTitle"), body),
      accent: val("editorAccent") || "blue",
      favorite: checked("editorFavorite"),
      appendSchaeferCt: checked("editorCt"),
      appendSchaeferMrt: checked("editorMrt"),
      order: existing?.order ?? nextOrder(folderId),
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
      lastUsedAt: existing?.lastUsedAt || ""
    };
    const p = normalizePrompt(data, folderId);
    const i = S.state.prompts.findIndex(x => x.id === p.id);
    if (i >= 0) S.state.prompts[i] = p;
    else S.state.prompts.push(p);
    if (p.favorite && !S.state.favorites.includes(p.id)) S.state.favorites.push(p.id);
    if (!p.favorite) S.state.favorites = S.state.favorites.filter(x => x !== p.id);
    S.selectedId = p.id;
    closeTopDialog();
    markDirty("Prompt gespeichert");
    render();
    toast("Gespeichert", p.title, "success");
  }

  function duplicatePrompt(pid) {
    const p = S.state.prompts.find(x => x.id === pid);
    if (!p) return;
    const copy = normalizePrompt({ ...p, id: uniqueId(`${p.id}-kopie`), title: `${p.title} Kopie`, favorite: false, order: nextOrder(p.folderId), createdAt: now(), updatedAt: now(), lastUsedAt: "" }, p.folderId);
    S.state.prompts.push(copy);
    S.selectedId = copy.id;
    markDirty("Dupliziert");
    render();
  }

  function deletePrompt(pid) {
    const p = S.state.prompts.find(x => x.id === pid);
    if (!p) return;
    if (!confirm(`Prompt löschen?\n\n${p.title}`)) return;
    S.state.prompts = S.state.prompts.filter(x => x.id !== pid);
    S.state.favorites = S.state.favorites.filter(x => x !== pid);
    delete S.placeholders[pid];
    writeJson(APP.storage.placeholders, S.placeholders);
    S.selectedId = "";
    markDirty("Gelöscht");
    render();
  }

  function openSeed() {
    openDialog(D.seedDialog);
    seedPreview();
  }

  async function seedPreview() {
    D.seedPreview.textContent = "Vorschau läuft…";
    try {
      const res = await fetch(`${APP.api.seed}?text=0`, { cache: "no-store" });
      D.seedPreview.textContent = JSON.stringify(await res.json(), null, 2);
    } catch (err) {
      D.seedPreview.textContent = `Server-Vorschau nicht erreichbar. Client-Fallback verfügbar.\n${err.message || err}`;
    }
  }

  async function runSeed() {
    const form = new FormData(D.seedForm);
    const opts = ["prompts", "schaeferCt", "schaeferMrt", "replace", "favoriteFirst"].reduce((a, k) => ({ ...a, [k]: form.has(k) }), {});
    setStatus("seed", "Import");
    try {
      const res = await fetch(APP.api.seed, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(opts) });
      if (!res.ok) throw new Error(`Seed ${res.status}`);
      const json = await res.json();
      S.state = normalizeState(json.state || json);
      S.remoteHash = json.summary?.hash || S.state.meta.hash || "";
      S.dirty = false;
      writeJson(APP.storage.state, S.state);
      closeTopDialog();
      setStatus("ok", "Sync");
      render();
      toast("Startset geladen", "KV wurde aktualisiert.", "success");
    } catch {
      await seedClient(opts);
    }
  }

  async function seedClient(opts) {
    try {
      const next = opts.replace ? emptyState() : normalizeState(S.state);
      if (opts.prompts) {
        const text = await fetchText(APP.data.prompts);
        next.prompts = opts.replace ? [] : next.prompts;
        mergePrompts(next, parsePromptFile(text));
      }
      if (opts.schaeferCt) next.documents.schaeferCt = { title: "# Befundbeispiele Prof. Schäfer CT.txt", text: await fetchText(APP.data.ct), updatedAt: now() };
      if (opts.schaeferMrt) next.documents.schaeferMrt = { title: "# Befundbeispiele Prof. Schäfer MRT.txt", text: await fetchText(APP.data.mrt), updatedAt: now() };
      if (opts.favoriteFirst && !next.favorites.length) next.favorites = next.prompts.slice(0, 4).map(p => p.id);
      S.state = normalizeState(next);
      closeTopDialog();
      markDirty("Lokal importiert");
      render();
      toast("Lokal importiert", "Server-Import war nicht erreichbar, der Client-Fallback wurde genutzt.", "warning");
    } catch (err) {
      setStatus("error", "Fehler");
      toast("Import fehlgeschlagen", err.message || "Seed-Dateien nicht lesbar.", "error");
    }
  }

  async function fetchText(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.text();
  }

  function parsePromptFile(text) {
    const src = String(text || "").replace(/\r\n?/g, "\n");
    const matches = [...src.matchAll(/^\/\/\s*(.+?):\s*$/gm)];
    const list = [];
    for (let i = 0; i < matches.length; i++) {
      const title = clean(matches[i][1], 180);
      const start = matches[i].index + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : src.length;
      const body = clean(src.slice(start, end), 1600000);
      if (!title || !body) continue;
      const kind = classify(title, body);
      const folderId = folderForPrompt(title, body, kind);
      list.push(normalizePrompt({ id: uniqueId(slug(title)), title, description: `${placeholders(body).length} Platzhalter`, folderId, body, kind, accent: accentFor(title, kind), favorite: list.length < 4, appendSchaeferCt: kind === "schaefer", appendSchaeferMrt: kind === "schaefer", order: list.length, createdAt: now(), updatedAt: now(), lastUsedAt: "" }, folderId));
    }
    return list;
  }

  function mergePrompts(state, prompts) {
    const byTitle = new Map(state.prompts.map(p => [norm(p.title), p]));
    for (const p of prompts) {
      const old = byTitle.get(norm(p.title));
      if (old) Object.assign(old, p, { id: old.id, updatedAt: now() });
      else state.prompts.push(p);
    }
    state.favorites = unique([...state.favorites, ...state.prompts.filter(p => p.favorite).map(p => p.id)]).filter(id => state.prompts.some(p => p.id === id));
  }

  async function openHealth() {
    openDialog(D.healthDialog);
    D.healthOutput.textContent = "Diagnostik läuft…";
    try {
      const res = await fetch(APP.api.health, { cache: "no-store" });
      D.healthOutput.textContent = JSON.stringify(await res.json(), null, 2);
    } catch (err) {
      D.healthOutput.textContent = err.stack || err.message || String(err);
    }
  }

  async function downloadExport(format) {
    try {
      const res = await fetch(`${APP.api.export}?format=${encodeURIComponent(format)}&download=1`, { cache: "no-store" });
      const text = res.ok ? await res.text() : localExport(format);
      const ext = format === "json" ? "json" : "txt";
      download(text, `radprompt-${format}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`);
    } catch {
      download(localExport(format), `radprompt-${format}.txt`);
    }
  }

  async function copyExport(format) {
    await clipboard(localExport(format));
    toast("Export kopiert", format, "success");
  }

  function localExport(format) {
    if (format === "json") return JSON.stringify({ ok: true, exportedAt: now(), state: S.state }, null, 2);
    if (format === "schaefer-ct") return S.state.documents.schaeferCt.text || "";
    if (format === "schaefer-mrt") return S.state.documents.schaeferMrt.text || "";
    const lines = ["RadPrompt Export", ""];
    for (const f of folders()) {
      const ps = S.state.prompts.filter(p => p.folderId === f.id).sort((a, b) => a.order - b.order);
      if (!ps.length) continue;
      lines.push(`# ${f.name}`, "");
      for (const p of ps) lines.push(`// ${p.title}:`, "", p.body.trim(), "", "-".repeat(88), "");
    }
    if (format === "fulltxt") {
      if (S.state.documents.schaeferCt.text) lines.push("# Befundbeispiele Prof. Schäfer CT", "", S.state.documents.schaeferCt.text.trim(), "");
      if (S.state.documents.schaeferMrt.text) lines.push("# Befundbeispiele Prof. Schäfer MRT", "", S.state.documents.schaeferMrt.text.trim(), "");
    }
    return lines.join("\n").trim() + "\n";
  }

  function download(text, filename) {
    const blob = new Blob([text], { type: filename.endsWith(".json") ? "application/json;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.className = "download-proxy";
    a.href = url;
    a.download = filename.replace(/[\\/:*?"<>|]+/g, "-");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function initSortable() {
    if (!window.Sortable || !D.grid) return;
    S.sortable = new Sortable(D.grid, { animation: 180, draggable: ".tile", dataIdAttr: "data-id", ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", onEnd: applyOrder });
    syncSortable();
  }

  function syncSortable() {
    if (!S.sortable) return;
    S.sortable.option("disabled", Boolean(S.query) || (S.state.settings.sort || "manual") !== "manual");
  }

  function applyOrder() {
    const ids = [...D.grid.querySelectorAll(".tile")].map(el => el.dataset.id);
    const selected = S.state.settings.selected || "all";
    if (selected === "favorites") S.state.favorites = unique([...ids, ...S.state.favorites.filter(id => !ids.includes(id))]);
    else {
      const rank = new Map(ids.map((id, i) => [id, i]));
      for (const p of S.state.prompts) if (rank.has(p.id)) p.order = rank.get(p.id);
    }
    markDirty("Sortiert");
    render();
  }

  function markDirty(label = "Geändert", delay = APP.saveDelay) {
    S.state.updatedAt = now();
    S.state.version = Math.max(1, Number(S.state.version || 0) + 1);
    S.dirty = true;
    writeJson(APP.storage.state, S.state);
    setStatus("dirty", label);
    saveSoon(delay);
  }

  function saveSoon(delay = APP.saveDelay) {
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(() => saveNow(false), delay);
  }

  async function saveNow(user) {
    if (!S.dirty && !user) return;
    if (S.saving) {
      S.saveQueued = true;
      return;
    }
    const elapsed = Date.now() - S.saveLast;
    if (elapsed < APP.saveFloor && !user) return saveSoon(APP.saveFloor - elapsed + 80);
    S.saving = true;
    S.saveLast = Date.now();
    setStatus("saving", "Speichert");
    try {
      const body = { state: S.state };
      if (S.remoteHash) body.expectedHash = S.remoteHash;
      let res = await fetch(APP.api.state, { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
      if (res.status === 409) res = await fetch(APP.api.state, { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ state: S.state }) });
      if (!res.ok) throw new Error(`State ${res.status}`);
      const json = await res.json();
      S.state = normalizeState(json.state || S.state);
      S.remoteHash = json.summary?.hash || S.state.meta.hash || S.remoteHash;
      S.dirty = false;
      S.localOnly = false;
      writeJson(APP.storage.state, S.state);
      setStatus("ok", "Sync");
      if (user) toast("Gespeichert", "Cloudflare KV wurde aktualisiert.", "success");
    } catch {
      S.localOnly = true;
      setStatus("local", "Lokal");
      writeJson(APP.storage.state, S.state);
      if (user) toast("Nur lokal gespeichert", "KV ist nicht erreichbar.", "warning");
    } finally {
      S.saving = false;
      if (S.saveQueued) {
        S.saveQueued = false;
        saveSoon(APP.saveDelay);
      }
      renderMetrics();
    }
  }

  function handleLaunch() {
    const u = new URL(location.href);
    const action = u.searchParams.get("action") || "";
    const title = u.searchParams.get("title") || "";
    const textValue = u.searchParams.get("text") || "";
    const sharedUrl = u.searchParams.get("url") || "";
    if (title || textValue || sharedUrl) {
      openEditor(null);
      val("editorTitle", title || "Geteilter Prompt");
      val("editorBody", [textValue, sharedUrl].filter(Boolean).join("\n\n"));
      return;
    }
    if (action === "new-prompt") openEditor(null);
    if (action === "import") openSeed();
    if (action === "diagnostics") openHealth();
    if (action === "export") openDialog(D.exportDialog);
  }

  function currentPrompt() { return S.state.prompts.find(p => p.id === S.selectedId) || null; }
  function folders() { return [...S.state.folders].sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.name.localeCompare(b.name, "de", { sensitivity: "base" })); }
  function isFav(pid) { return S.state.favorites.includes(pid); }
  function placeholders(text) { return unique([...String(text || "").matchAll(/\*\*\*([^*]+?)\*\*\*/g)].map(m => clean(m[1], 140))); }
  function getPlaceholder(pid, name) { return S.placeholders?.[pid]?.[name] || ""; }
  function setPlaceholder(pid, name, value) { if (!S.placeholders[pid]) S.placeholders[pid] = {}; S.placeholders[pid][name] = String(value || ""); }
  function bytes(text) { return new TextEncoder().encode(String(text || "")).length; }
  function unique(list) { return [...new Set((list || []).filter(Boolean))]; }
  function now() { return new Date().toISOString(); }
  function id(x) { return document.getElementById(x); }
  function html(x) { return String(x ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c])); }
  function esc(x) { return html(x).replace(/`/g, "&#096;"); }
  function text(el, value) { if (el) el.textContent = value ?? ""; }
  function val(idValue, value) { const el = id(idValue); if (!el) return ""; if (arguments.length > 1) el.value = value ?? ""; return el.value; }
  function check(idValue, value) { const el = id(idValue); if (el) el.checked = Boolean(value); }
  function checked(idValue) { return Boolean(id(idValue)?.checked); }
  function clean(value, max = 1000000) { return String(value ?? "").normalize("NFKC").replace(/\r\n?/g, "\n").trim().slice(0, max); }
  function norm(value) { return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").toLowerCase(); }
  function slug(value) { return norm(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90); }
  function uniqueId(root) { const base = slug(root) || "prompt"; const ids = new Set(S.state.prompts.map(p => p.id)); if (!ids.has(base)) return base; let i = 2; while (ids.has(`${base}-${i}`)) i++; return `${base}-${i}`; }
  function fmtDate(value) { const d = new Date(value); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(d) : "–"; }
  function shortDate(value) { const d = new Date(value); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(d) : "–"; }
  function iconForKind(kind) { return kind === "schaefer" ? "stethoscope" : kind === "special" ? "braces" : "file-text"; }
  function kindLabel(kind) { return kind === "schaefer" ? "Schäfer" : kind === "special" ? "Felder" : "Prompt"; }
  function classify(title, body) { const h = norm(`${title} ${body}`); if (h.includes("prof schafer") || h.includes("prof schaefer") || h.includes("befundstil")) return "schaefer"; if (placeholders(body).length) return "special"; return "standard"; }
  function folderForPrompt(title, body, kind) { const h = norm(`${title} ${body}`); if (kind === "schaefer") return "prof-schaefer"; if (h.includes("protokoll") || h.includes("ubersicht") || h.includes("staging")) return "wissen"; if (h.includes("befund") || h.includes("bildinterpretation") || h.includes("radiologisch")) return "befundung"; return "allgemein"; }
  function accentFor(title, kind) { const h = norm(`${title} ${kind}`); if (kind === "schaefer") return "violet"; if (h.includes("revision")) return "amber"; if (h.includes("staging")) return "red"; if (h.includes("protokoll")) return "cyan"; if (h.includes("ubersicht")) return "emerald"; return "blue"; }
  function currentFolderForNew() { const s = S.state.settings.selected; return s && s !== "all" && s !== "favorites" ? s : S.state.folders[0]?.id || "allgemein"; }
  function nextOrder(folderId) { const list = S.state.prompts.filter(p => p.folderId === folderId); return list.length ? Math.max(...list.map(p => Number(p.order || 0))) + 1 : 0; }

  function normalizeState(input) {
    const raw = input && typeof input === "object" ? input : {};
    const base = emptyState();
    const foldersRaw = Array.isArray(raw.folders) && raw.folders.length ? raw.folders : base.folders;
    const folders = foldersRaw.map((f, i) => ({ id: slug(f.id || f.name || `folder-${i}`), name: clean(f.name || "Ordner", 180), icon: clean(f.icon || "folder", 80), order: Number.isFinite(Number(f.order)) ? Number(f.order) : i, createdAt: f.createdAt || now(), updatedAt: f.updatedAt || now() })).filter(f => f.id && f.name);
    const folderIds = new Set(folders.map(f => f.id));
    const fallback = folders[0]?.id || "allgemein";
    const prompts = Array.isArray(raw.prompts) ? raw.prompts.map((p, i) => normalizePrompt(p, fallback, i)).filter(p => p.id && p.title) : [];
    for (const p of prompts) if (!folderIds.has(p.folderId)) p.folderId = fallback;
    const promptIds = new Set(prompts.map(p => p.id));
    const favorites = unique([...(Array.isArray(raw.favorites) ? raw.favorites : []), ...prompts.filter(p => p.favorite).map(p => p.id)]).filter(x => promptIds.has(x));
    return { schema: APP.schema, version: Math.max(0, Number(raw.version || 0)), updatedAt: raw.updatedAt || now(), folders, prompts, favorites, documents: { schaeferCt: doc(raw.documents?.schaeferCt, "# Befundbeispiele Prof. Schäfer CT.txt"), schaeferMrt: doc(raw.documents?.schaeferMrt, "# Befundbeispiele Prof. Schäfer MRT.txt") }, settings: { ...defaults.settings, ...(raw.settings || {}) }, meta: { seededAt: "", source: "", hash: "", ...(raw.meta || {}) } };
  }

  function normalizePrompt(p, fallback, order = 0) { const body = clean(p?.body || "", 1600000); const title = clean(p?.title || "Unbenannter Prompt", 180); const kind = clean(p?.kind || classify(title, body), 60); return { id: slug(p?.id || title) || `prompt-${order}`, title, description: clean(p?.description || "", 500), folderId: slug(p?.folderId || fallback), body, kind, accent: clean(p?.accent || accentFor(title, kind), 30), favorite: Boolean(p?.favorite), appendSchaeferCt: Boolean(p?.appendSchaeferCt), appendSchaeferMrt: Boolean(p?.appendSchaeferMrt), order: Number.isFinite(Number(p?.order)) ? Number(p.order) : order, createdAt: p?.createdAt || now(), updatedAt: p?.updatedAt || now(), lastUsedAt: p?.lastUsedAt || "" }; }
  function doc(d, title) { return { title: clean(d?.title || title, 240), text: clean(d?.text || "", 6000000), updatedAt: d?.updatedAt || "" }; }
  function emptyState() { const t = now(); return { schema: APP.schema, version: 0, updatedAt: t, folders: defaults.folders.map(f => ({ ...f, createdAt: t, updatedAt: t })), prompts: [], favorites: [], documents: { schaeferCt: { title: "# Befundbeispiele Prof. Schäfer CT.txt", text: "", updatedAt: "" }, schaeferMrt: { title: "# Befundbeispiele Prof. Schäfer MRT.txt", text: "", updatedAt: "" } }, settings: { ...defaults.settings }, meta: { seededAt: "", source: "", hash: "" } }; }

  function renderFolderOptions() { const opts = folders().map(f => `<option value="${esc(f.id)}">${html(f.name)}</option>`).join(""); const el = id("editorFolder"); if (el) el.innerHTML = opts; }
  function fillEditorFolders() { renderFolderOptions(); }
  function openDialog(d) { if (!d) return; if (typeof d.showModal === "function") d.showModal(); else d.hidden = false; icons(); }
  function closeTopDialog() { const ds = [...document.querySelectorAll("dialog[open]")]; const d = ds.at(-1); if (d) d.close(); }
  function toggleCompact() { S.state.settings.compact = !S.state.settings.compact; saveUi(); applyUi(); }
  function applyUi() { document.documentElement.classList.toggle("is-compact", Boolean(S.state.settings.compact)); }
  function loadLocalUi() { const ui = readJson(APP.storage.ui, {}); if (ui && typeof ui === "object") S.state.settings = { ...S.state.settings, ...ui }; }
  function saveUi() { writeJson(APP.storage.ui, { selected: S.state.settings.selected, sort: S.state.settings.sort, compact: S.state.settings.compact }); }
  function setStatus(state, label) { D.status.dataset.state = state; D.status.textContent = label; }
  function readJson(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
  function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function icons() { if (window.lucide?.createIcons) window.lucide.createIcons(); }
  function toast(title, message = "", type = "info") { const n = document.createElement("article"); n.className = `toast toast--${type}`; n.innerHTML = `<i data-lucide="${type === "success" ? "check-circle-2" : type === "warning" ? "alert-triangle" : type === "error" ? "x-circle" : "info"}"></i><div><strong>${html(title)}</strong>${message ? `<p>${html(message)}</p>` : ""}</div><button type="button" aria-label="Schließen"><i data-lucide="x"></i></button>`; n.querySelector("button").addEventListener("click", () => n.remove()); D.toastStack.appendChild(n); icons(); setTimeout(() => n.remove(), APP.toastMs); }
  function fatal(error) { document.body.innerHTML = `<main class="fatal"><section class="fatal__card"><h1>RadPrompt konnte nicht starten</h1><p>${html(error?.message || error || "Unbekannter Fehler")}</p><button class="primary-btn" type="button" id="reloadFatal">Neu laden</button></section></main>`; id("reloadFatal")?.addEventListener("click", () => location.reload()); }
})();
