(() => {
  "use strict";
  const CONFIG = {
    schema: "radprompt.v1",
    api: { state: "/api/state", health: "/api/health", seed: "/api/seed", export: "/api/export" },
    storage: { state: "radprompt.local.state.v1", ui: "radprompt.local.ui.v1", placeholders: "radprompt.local.placeholders.v1" },
    files: { prompts: "/data/Beispielprompts.txt", schaeferCt: "/data/Befundbeispiele%20Prof.%20Sch%C3%A4fer%20CT.txt", schaeferMrt: "/data/Befundbeispiele%20Prof.%20Sch%C3%A4fer%20MRT.txt" },
    modalityOptions: ["CT", "MRT", "Röntgen", "CT&MRT"],
    saveDelay: 1500,
    saveFloor: 1200,
    toastLife: 4600,
    maxBody: 5000000
  };
  const DEFAULT_FOLDERS = [
    { id: "befundung", name: "Befundung", icon: "scan-search", order: 0 },
    { id: "prof-schaefer", name: "Prof. Schäfer", icon: "stethoscope", order: 1 },
    { id: "wissen", name: "Wissen", icon: "book-open", order: 2 },
    { id: "allgemein", name: "Allgemein", icon: "sparkles", order: 3 }
  ];
  const DEFAULT_SETTINGS = { compactMode: false, effects: true, autosave: true, viewMode: "grid", sortMode: "manual", activeView: "all", selectedFolder: "all", denseCards: false };
  const DOCS = { schaeferCt: { title: "# Befundbeispiele Prof. Schäfer CT.txt", text: "", updatedAt: "" }, schaeferMrt: { title: "# Befundbeispiele Prof. Schäfer MRT.txt", text: "", updatedAt: "" } };
  const R = { state: emptyState(), placeholderValues: {}, visiblePromptIds: [], query: "", remoteHash: "", currentEditorId: "", dirty: false, localOnly: false, saveTimer: 0, saveInFlight: false, savePending: false, saveLastStart: 0, folderSortable: null, promptSortable: null, fuse: null, bootActionHandled: false };
  const D = {};
  document.addEventListener("DOMContentLoaded", boot);
  async function boot() {
    try {
      cacheDom();
      bindEvents();
      loadLocalUi();
      await loadState();
      loadPlaceholderCache();
      render();
      initSortables();
      handleInitialAction();
      refreshIcons();
    } catch (error) {
      showFatal(error);
    }
  }
  function cacheDom() {
    Object.assign(D, {
      root: document.documentElement,
      body: document.body,
      app: byId("app"),
      search: byId("searchInput"),
      promptGrid: byId("promptGrid"),
      folderList: byId("folderList"),
      favoritesBar: byId("favoritesBar"),
      emptyState: byId("emptyState"),
      toastStack: byId("toastStack"),
      editor: byId("editorDrawer"),
      editorForm: byId("editorForm"),
      command: byId("commandDialog"),
      commandInput: byId("commandInput"),
      commandList: byId("commandList"),
      importDialog: byId("importDialog"),
      exportDialog: byId("exportDialog"),
      healthDialog: byId("diagnosticsDialog"),
      folderDialog: byId("folderDialog"),
      syncStatus: byId("syncStatus"),
      metricsFolders: byId("metricFolders"),
      metricsPrompts: byId("metricPrompts"),
      metricsFavorites: byId("metricFavorites"),
      metricsUpdated: byId("metricUpdated")
    });
  }
  function bindEvents() {
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("beforeunload", event => { if (R.dirty && !R.saveInFlight) { event.preventDefault(); event.returnValue = ""; } });
    window.addEventListener("online", () => { toast("Netzwerk verfügbar", "Synchronisierung wird erneut versucht.", "success"); scheduleSave(250); });
    window.addEventListener("offline", () => toast("Offline", "Änderungen werden lokal zwischengespeichert.", "warning"));
    const direct = { newPromptButton: () => openEditorForNew({}), syncButton: () => saveNow({ force: true, user: true }), importButton: () => openImportDialog(), exportButton: () => openExportDialog(), diagnosticsButton: () => openDiagnosticsDialog(), commandButton: () => openCommand(), menuButton: () => toggleMenu() };
    for (const [id, fn] of Object.entries(direct)) byId(id)?.addEventListener("click", event => { event.preventDefault(); fn(); });
  }
  async function loadState() {
    setSync("lade", "Lade Zustand");
    const local = readJsonStorage(CONFIG.storage.state, null);
    try {
      const response = await fetch(CONFIG.api.state, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`State API ${response.status}`);
      const payload = await response.json();
      R.state = normalizeState(payload.state || payload);
      R.remoteHash = payload.summary?.hash || payload.hash || R.state.meta.hash || "";
      R.localOnly = false;
      writeJsonStorage(CONFIG.storage.state, R.state);
      setSync("ok", "Synchronisiert");
    } catch {
      R.state = normalizeState(local || emptyState());
      R.localOnly = true;
      setSync("lokal", local ? "Lokaler Zustand" : "Neuer lokaler Zustand");
      if (local) toast("API nicht erreichbar", "RadPrompt arbeitet mit lokalem Browserzustand weiter.", "warning");
    }
  }
  function loadLocalUi() {
    const ui = readJsonStorage(CONFIG.storage.ui, {});
    if (ui && typeof ui === "object") R.state.settings = { ...DEFAULT_SETTINGS, ...ui };
  }
  function persistLocalUi() { writeJsonStorage(CONFIG.storage.ui, normalizeSettings(R.state.settings)); }
  function loadPlaceholderCache() { R.placeholderValues = readJsonStorage(CONFIG.storage.placeholders, {}) || {}; }
  function persistPlaceholderCache() { writeJsonStorage(CONFIG.storage.placeholders, R.placeholderValues); }
  function render() {
    R.state = normalizeState(R.state);
    rebuildFuse();
    renderMetrics();
    renderFolders();
    renderFavorites();
    renderPrompts();
    renderEditor();
    renderCommandList();
    applyUi();
    refreshIcons();
  }
  function renderMetrics() {
    setText(D.metricsFolders, R.state.folders.length);
    setText(D.metricsPrompts, R.state.prompts.length);
    setText(D.metricsFavorites, R.state.favorites.length);
    setText(D.metricsUpdated, formatDateTime(R.state.updatedAt));
  }
  function renderFolders() {
    if (!D.folderList) return;
    const selected = selectedFolder();
    const folders = sortedFolders();
    const staticRows = [folderRow({ id: "all", name: "Alle Prompts", icon: "layout-grid", count: R.state.prompts.length, active: selected === "all", sortable: false }), folderRow({ id: "favorites", name: "Favoriten", icon: "star", count: R.state.favorites.length, active: selected === "favorites", sortable: false })];
    const dynamicRows = folders.map(folder => folderRow({ id: folder.id, name: folder.name, icon: folder.icon || "folder", count: R.state.prompts.filter(prompt => prompt.folderId === folder.id).length, active: selected === folder.id, sortable: true }));
    D.folderList.innerHTML = [...staticRows, ...dynamicRows].join("");
    syncFolderSortable();
  }
  function folderRow(folder) {
    return `<button class="folder-row${folder.active ? " is-active" : ""}${folder.sortable ? " is-sortable" : ""}" type="button" data-action="select-folder" data-folder-id="${esc(folder.id)}" data-id="${esc(folder.id)}"><span class="folder-row__icon"><i data-lucide="${esc(folder.icon)}"></i></span><span class="folder-row__label">${html(folder.name)}</span><span class="folder-row__count">${folder.count}</span></button>`;
  }
  function renderFavorites() {
    if (!D.favoritesBar) return;
    const map = new Map(R.state.prompts.map(prompt => [prompt.id, prompt]));
    const favorites = R.state.favorites.map(id => map.get(id)).filter(Boolean);
    D.favoritesBar.innerHTML = favorites.length ? favorites.map(prompt => `<button class="favorite-pill" type="button" data-action="copy-prompt" data-prompt-id="${esc(prompt.id)}" title="${esc(prompt.title)}"><i data-lucide="zap"></i><span>${html(prompt.title)}</span></button>`).join("") : `<div class="favorites-empty">Keine Favoriten markiert</div>`;
  }
  function renderPrompts() {
    if (!D.promptGrid) return;
    const prompts = visiblePrompts();
    R.visiblePromptIds = prompts.map(prompt => prompt.id);
    D.promptGrid.dataset.sortableEnabled = canSortPromptGrid() ? "true" : "false";
    D.promptGrid.innerHTML = prompts.map(promptCard).join("");
    if (D.emptyState) D.emptyState.hidden = prompts.length > 0;
    syncPromptSortable();
  }
  function promptCard(prompt) {
    const folder = R.state.folders.find(item => item.id === prompt.folderId);
    const placeholders = extractPlaceholders(prompt.body);
    const favorite = isFavorite(prompt.id);
    const cls = ["prompt-card", favorite ? "is-favorite" : "", prompt.kind === "schaefer" || prompt.appendSchaeferCt || prompt.appendSchaeferMrt ? "is-schaefer" : ""].filter(Boolean).join(" ");
    const tags = [prompt.kind || "standard", prompt.appendSchaeferCt ? "CT-Anhang" : "", prompt.appendSchaeferMrt ? "MRT-Anhang" : ""].filter(Boolean).join(" · ");
    return `<article class="${cls}" data-prompt-id="${esc(prompt.id)}" data-id="${esc(prompt.id)}" data-accent="${esc(prompt.accent || "blue")}"><header class="prompt-card__header"><div class="prompt-card__title-wrap"><h3 class="prompt-card__title">${html(prompt.title)}</h3><p class="prompt-card__meta">${html(folder?.name || "Ohne Ordner")}${tags ? " · " + html(tags) : ""}</p></div><button class="icon-button prompt-card__favorite" type="button" data-action="toggle-favorite" data-prompt-id="${esc(prompt.id)}" aria-label="Favorit"><i data-lucide="star"></i></button></header>${prompt.description ? `<p class="prompt-card__description">${html(prompt.description)}</p>` : ""}${placeholders.length ? `<div class="prompt-card__fields">${placeholders.map(name => placeholderField(prompt.id, name)).join("")}</div>` : ""}<div class="prompt-card__actions"><button class="primary-action" type="button" data-action="copy-prompt" data-prompt-id="${esc(prompt.id)}"><i data-lucide="copy"></i><span>Kopieren</span></button><button class="secondary-action" type="button" data-action="edit-prompt" data-prompt-id="${esc(prompt.id)}"><i data-lucide="panel-right-open"></i><span>Öffnen</span></button><button class="secondary-action" type="button" data-action="duplicate-prompt" data-prompt-id="${esc(prompt.id)}"><i data-lucide="copy-plus"></i><span>Duplizieren</span></button></div></article>`;
  }
  function placeholderField(promptId, name) {
    const value = getPlaceholderValue(promptId, name);
    if (["modalitat", "modalitaet"].includes(normalizeKey(name))) {
      return `<label class="placeholder-field"><span>${html(name)}</span><select data-placeholder-input="true" data-prompt-id="${esc(promptId)}" data-placeholder-name="${esc(name)}"><option value="">Auswählen</option>${CONFIG.modalityOptions.map(option => `<option value="${esc(option)}"${option === value ? " selected" : ""}>${html(option)}</option>`).join("")}</select></label>`;
    }
    return `<label class="placeholder-field"><span>${html(name)}</span><input type="text" value="${esc(value)}" data-placeholder-input="true" data-prompt-id="${esc(promptId)}" data-placeholder-name="${esc(name)}" autocomplete="off" spellcheck="false"></label>`;
  }
  function renderEditor() {
    if (!D.editor) return;
    fillFolderSelects();
    const prompt = R.currentEditorId ? R.state.prompts.find(item => item.id === R.currentEditorId) : null;
    D.editor.classList.toggle("is-active", Boolean(prompt));
    D.root.classList.toggle("is-editor-open", Boolean(prompt));
    if (!prompt) return;
    setVal("editorPromptId", prompt.id);
    setVal("editorTitle", prompt.title);
    setVal("editorDescription", prompt.description || "");
    setVal("editorBody", prompt.body || "");
    setVal("editorFolder", prompt.folderId || firstFolderId());
    setVal("editorKind", prompt.kind || "standard");
    setVal("editorAccent", prompt.accent || "blue");
    setChecked("editorFavorite", isFavorite(prompt.id));
    setChecked("editorSchaeferCt", Boolean(prompt.appendSchaeferCt || prompt.kind === "schaefer"));
    setChecked("editorSchaeferMrt", Boolean(prompt.appendSchaeferMrt || prompt.kind === "schaefer"));
  }
  function fillFolderSelects() {
    document.querySelectorAll("[data-folder-select],#editorFolder").forEach(select => {
      const value = select.value || selectedFolder();
      select.innerHTML = sortedFolders().map(folder => `<option value="${esc(folder.id)}">${html(folder.name)}</option>`).join("");
      if ([...select.options].some(option => option.value === value)) select.value = value;
    });
  }
  function renderCommandList() {
    if (!D.commandList) return;
    const rows = [commandRow("new-prompt", "Neuen Prompt erstellen", "Plus", "plus"), commandRow("import", "Startset laden", "Seed", "database"), commandRow("export", "Export öffnen", "JSON/TXT", "download"), commandRow("diagnostics", "Diagnostik ausführen", "KV/API", "activity"), commandRow("toggle-compact", R.state.settings.compactMode ? "Kompaktmodus deaktivieren" : "Kompaktmodus aktivieren", "Ansicht", "panel-left")];
    visiblePrompts().slice(0, 12).forEach(prompt => rows.push(commandRow("copy-prompt", prompt.title, "Prompt kopieren", "copy", prompt.id)));
    D.commandList.innerHTML = rows.join("");
  }
  function commandRow(action, title, meta, icon, promptId = "") { return `<button class="command-row" type="button" data-action="${esc(action)}"${promptId ? ` data-prompt-id="${esc(promptId)}"` : ""}><span class="command-row__icon"><i data-lucide="${esc(icon)}"></i></span><span class="command-row__main">${html(title)}</span><span class="command-row__meta">${html(meta)}</span></button>`; }
  function applyUi() {
    const s = R.state.settings;
    D.root.classList.toggle("is-compact", Boolean(s.compactMode));
    D.root.classList.toggle("is-effects-off", !s.effects);
    D.root.classList.toggle("is-dense", Boolean(s.denseCards));
    D.root.dataset.viewMode = s.viewMode || "grid";
    D.root.dataset.sortMode = s.sortMode || "manual";
    if (D.search && D.search.value !== R.query) D.search.value = R.query;
    const mapping = { sortMode: s.sortMode, viewMode: s.viewMode };
    for (const [id, value] of Object.entries(mapping)) if (byId(id)) byId(id).value = value;
    document.querySelectorAll("[data-setting]").forEach(input => { const key = input.dataset.setting; if (input.type === "checkbox") input.checked = Boolean(s[key]); });
  }
  async function onClick(event) {
    const control = event.target.closest("[data-action],button");
    if (!control) return;
    const action = control.dataset.action || inferAction(control.id);
    if (!action) return;
    event.preventDefault();
    await dispatch(action, control);
  }
  function onInput(event) {
    const target = event.target;
    if (target === D.search) { R.query = target.value.trim(); renderPrompts(); renderCommandList(); refreshIcons(); return; }
    if (target.matches("[data-placeholder-input='true']")) { setPlaceholderValue(target.dataset.promptId, target.dataset.placeholderName, target.value); persistPlaceholderCache(); return; }
    if (target === D.commandInput) filterCommandList(target.value);
  }
  function onChange(event) {
    const target = event.target;
    if (target.matches("[data-placeholder-input='true']")) { setPlaceholderValue(target.dataset.promptId, target.dataset.placeholderName, target.value); persistPlaceholderCache(); return; }
    const setting = target.dataset.setting;
    if (setting) { R.state.settings[setting] = target.type === "checkbox" ? target.checked : target.value; persistLocalUi(); applyUi(); return; }
    if (target.id === "sortMode") { R.state.settings.sortMode = target.value; persistLocalUi(); renderPrompts(); return; }
    if (target.id === "viewMode") { R.state.settings.viewMode = target.value; persistLocalUi(); renderPrompts(); return; }
  }
  function onSubmit(event) {
    const form = event.target;
    if (form === D.editorForm) { event.preventDefault(); saveEditor(); return; }
    if (form.id === "folderForm") { event.preventDefault(); saveFolderFromForm(form); return; }
    if (form.id === "importForm") { event.preventDefault(); submitSeed(form); }
  }
  function onKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openCommand(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveNow({ force: true, user: true }); return; }
    if (event.key === "Escape") { if (R.currentEditorId) closeEditor(); closeTopDialog(); }
  }
  async function dispatch(action, control) {
    const id = control.dataset.promptId || R.currentEditorId || "";
    const folderId = control.dataset.folderId || "";
    if (action === "new-prompt") return openEditorForNew({});
    if (["edit-prompt", "expand-prompt", "open-prompt"].includes(action)) return openEditor(id);
    if (action === "copy-prompt") return copyPrompt(id);
    if (action === "toggle-favorite") return toggleFavorite(id);
    if (action === "duplicate-prompt") return duplicatePrompt(id);
    if (action === "delete-prompt") return deletePrompt(id);
    if (action === "close-editor") return closeEditor();
    if (action === "select-folder") return selectFolder(folderId);
    if (action === "new-folder") return openFolderDialog();
    if (action === "delete-folder") return deleteFolder(folderId);
    if (["sync", "save-state"].includes(action)) return saveNow({ force: true, user: true });
    if (action === "reload-state") return reloadRemoteState();
    if (action === "import") return openImportDialog();
    if (action === "export") return openExportDialog();
    if (action === "download-export") return downloadExport(control.dataset.format || "json");
    if (action === "copy-export") return copyExport(control.dataset.format || "json");
    if (["diagnostics", "health"].includes(action)) return openDiagnosticsDialog();
    if (action === "run-diagnostics") return runDiagnostics();
    if (action === "command") return openCommand();
    if (action === "toggle-menu") return toggleMenu();
    if (action === "close-dialog") return closeTopDialog();
    if (action === "toggle-compact") return applySetting("compactMode", !R.state.settings.compactMode);
    if (action === "clear-search") return clearSearch();
  }
  function inferAction(id) { return ({ newPromptButton: "new-prompt", syncButton: "sync", importButton: "import", exportButton: "export", diagnosticsButton: "diagnostics", commandButton: "command", menuButton: "toggle-menu" })[id] || ""; }
  function selectFolder(folderId) { R.state.settings.selectedFolder = folderId || "all"; R.state.settings.activeView = folderId === "favorites" ? "favorites" : "all"; R.query = ""; persistLocalUi(); render(); }
  function selectedFolder() { return R.state.settings.selectedFolder || "all"; }
  function visiblePrompts() {
    let prompts = [...R.state.prompts];
    const selected = selectedFolder();
    if (selected === "favorites") { const rank = new Map(R.state.favorites.map((id, i) => [id, i])); prompts = prompts.filter(prompt => rank.has(prompt.id) || prompt.favorite).sort((a, b) => (rank.get(a.id) ?? 999999) - (rank.get(b.id) ?? 999999)); }
    else if (selected !== "all") prompts = prompts.filter(prompt => prompt.folderId === selected);
    if (R.query) prompts = searchPrompts(prompts, R.query);
    return sortPrompts(prompts);
  }
  function searchPrompts(scope, query) {
    if (!query.trim()) return scope;
    const ids = new Set(scope.map(prompt => prompt.id));
    if (window.Fuse && R.fuse) return R.fuse.search(query).map(result => result.item).filter(prompt => ids.has(prompt.id));
    const needle = normalizeSearch(query);
    return scope.filter(prompt => normalizeSearch([prompt.title, prompt.description, prompt.body, prompt.kind, prompt.folderId].join(" ")).includes(needle));
  }
  function sortPrompts(prompts) {
    const mode = R.state.settings.sortMode || "manual";
    if (selectedFolder() === "favorites" && !R.query) return prompts;
    if (mode === "alpha") return [...prompts].sort((a, b) => a.title.localeCompare(b.title, "de", { sensitivity: "base" }));
    if (mode === "recent") return [...prompts].sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
    if (mode === "used") return [...prompts].sort((a, b) => String(b.lastUsedAt || "").localeCompare(String(a.lastUsedAt || "")));
    return [...prompts].sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.title.localeCompare(b.title, "de", { sensitivity: "base" }));
  }
  function sortedFolders() { return [...R.state.folders].sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.name.localeCompare(b.name, "de", { sensitivity: "base" })); }
  function rebuildFuse() { R.fuse = window.Fuse ? new window.Fuse(R.state.prompts, { keys: [{ name: "title", weight: .48 }, { name: "description", weight: .2 }, { name: "body", weight: .24 }, { name: "kind", weight: .04 }, { name: "folderId", weight: .04 }], threshold: .34, ignoreLocation: true, minMatchCharLength: 2 }) : null; }
  function openEditor(id) { const prompt = R.state.prompts.find(item => item.id === id); if (!prompt) return toast("Prompt nicht gefunden", "Der Prompt existiert nicht mehr.", "error"); R.currentEditorId = prompt.id; renderEditor(); focusEditorTitle(); }
  function openEditorForNew(seed) { const now = new Date().toISOString(); const folderId = seed.folderId || (selectedFolder() !== "all" && selectedFolder() !== "favorites" ? selectedFolder() : firstFolderId()); const title = clean(seed.title || "Neuer Prompt", 180); const body = clean(seed.body || seed.text || "", CONFIG.maxBody); const prompt = normalizePrompt({ id: uniquePromptId(slugify(title) || "prompt"), title, description: clean(seed.description || "", 500), folderId, body, kind: seed.kind || classifyPrompt(title, body), accent: seed.accent || "blue", favorite: Boolean(seed.favorite), appendSchaeferCt: Boolean(seed.appendSchaeferCt), appendSchaeferMrt: Boolean(seed.appendSchaeferMrt), order: nextPromptOrder(folderId), createdAt: now, updatedAt: now }); R.state.prompts.push(prompt); if (prompt.favorite) addFavorite(prompt.id); R.currentEditorId = prompt.id; markDirty("Prompt erstellt"); render(); focusEditorTitle(); }
  function saveEditor() { const id = val("editorPromptId") || R.currentEditorId; const index = R.state.prompts.findIndex(prompt => prompt.id === id); if (index < 0) return; const previous = R.state.prompts[index]; const title = clean(val("editorTitle") || previous.title || "Unbenannter Prompt", 180); const body = clean(val("editorBody") || "", CONFIG.maxBody); const kind = val("editorKind") || classifyPrompt(title, body); const favorite = checked("editorFavorite"); const prompt = normalizePrompt({ ...previous, title, description: clean(val("editorDescription") || "", 500), body, folderId: val("editorFolder") || previous.folderId || firstFolderId(), kind, accent: val("editorAccent") || previous.accent || "blue", favorite, appendSchaeferCt: kind === "schaefer" ? true : checked("editorSchaeferCt"), appendSchaeferMrt: kind === "schaefer" ? true : checked("editorSchaeferMrt"), updatedAt: new Date().toISOString() }); R.state.prompts[index] = prompt; favorite ? addFavorite(prompt.id) : removeFavorite(prompt.id); markDirty("Prompt gespeichert"); render(); toast("Prompt gespeichert", prompt.title, "success"); }
  function closeEditor() { R.currentEditorId = ""; renderEditor(); }
  function focusEditorTitle() { requestAnimationFrame(() => byId("editorTitle")?.focus()); }
  async function copyPrompt(id) { const prompt = R.state.prompts.find(item => item.id === id); if (!prompt) return toast("Prompt nicht gefunden", "Kopieren nicht möglich.", "error"); try { await writeClipboard(buildPromptOutput(prompt)); prompt.lastUsedAt = new Date().toISOString(); markDirty("Verwendung gespeichert", { silent: true, delay: 4000 }); renderFavorites(); refreshIcons(); toast("Prompt kopiert", prompt.title, "success"); } catch (error) { toast("Kopieren fehlgeschlagen", error.message || "Zwischenablage blockiert.", "error"); } }
  function buildPromptOutput(prompt) { let output = String(prompt.body || ""); for (const name of extractPlaceholders(output)) output = output.split(`***${name}***`).join(getPlaceholderValue(prompt.id, name) || `***${name}***`); const sections = [output.trim()]; if ((prompt.appendSchaeferCt || prompt.kind === "schaefer") && R.state.documents.schaeferCt.text) sections.push(`# Befundbeispiele Prof. Schäfer CT\n\n${R.state.documents.schaeferCt.text.trim()}`); if ((prompt.appendSchaeferMrt || prompt.kind === "schaefer") && R.state.documents.schaeferMrt.text) sections.push(`# Befundbeispiele Prof. Schäfer MRT\n\n${R.state.documents.schaeferMrt.text.trim()}`); return sections.filter(Boolean).join("\n\n").trim() + "\n"; }
  async function writeClipboard(text) { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } const textarea = document.createElement("textarea"); textarea.value = text; textarea.className = "clipboard-fallback"; textarea.setAttribute("readonly", "readonly"); textarea.setAttribute("aria-hidden", "true"); document.body.appendChild(textarea); textarea.focus({ preventScroll: true }); textarea.select(); textarea.setSelectionRange(0, textarea.value.length); let ok = false; try { ok = document.execCommand("copy"); } finally { textarea.remove(); } if (!ok) throw new Error("Clipboard-Fallback nicht erfolgreich."); return true; }
  function toggleFavorite(id) { const prompt = R.state.prompts.find(item => item.id === id); if (!prompt) return; if (isFavorite(id)) { removeFavorite(id); prompt.favorite = false; toast("Favorit entfernt", prompt.title, "info"); } else { addFavorite(id); prompt.favorite = true; toast("Favorit hinzugefügt", prompt.title, "success"); } prompt.updatedAt = new Date().toISOString(); markDirty("Favoriten geändert"); render(); }
  function duplicatePrompt(id) { const source = R.state.prompts.find(item => item.id === id); if (!source) return; const now = new Date().toISOString(); const copy = normalizePrompt({ ...source, id: uniquePromptId(`${source.id}-kopie`), title: `${source.title} Kopie`, favorite: false, order: nextPromptOrder(source.folderId), createdAt: now, updatedAt: now, lastUsedAt: "" }); R.state.prompts.push(copy); R.currentEditorId = copy.id; markDirty("Prompt dupliziert"); render(); toast("Prompt dupliziert", copy.title, "success"); }
  function deletePrompt(id) { const prompt = R.state.prompts.find(item => item.id === id); if (!prompt) return; if (!window.confirm(`Prompt wirklich löschen?\n\n${prompt.title}`)) return; R.state.prompts = R.state.prompts.filter(item => item.id !== id); removeFavorite(id); delete R.placeholderValues[id]; if (R.currentEditorId === id) R.currentEditorId = ""; persistPlaceholderCache(); markDirty("Prompt gelöscht"); render(); toast("Prompt gelöscht", prompt.title, "success"); }
  function openFolderDialog(folderId = "") { const folder = R.state.folders.find(item => item.id === folderId); setVal("folderId", folder?.id || ""); setVal("folderName", folder?.name || ""); setVal("folderIcon", folder?.icon || "folder"); openDialog(D.folderDialog); }
  function saveFolderFromForm() { const id = cleanId(val("folderId")); const name = clean(val("folderName"), 180); const icon = clean(val("folderIcon") || "folder", 80); if (!name) return toast("Ordnername fehlt", "Bitte einen Namen eingeben.", "warning"); const now = new Date().toISOString(); if (id) { const folder = R.state.folders.find(item => item.id === id); if (folder) Object.assign(folder, { name, icon, updatedAt: now }); } else { const folder = { id: uniqueFolderId(name), name, icon, order: nextFolderOrder(), createdAt: now, updatedAt: now }; R.state.folders.push(folder); R.state.settings.selectedFolder = folder.id; } closeTopDialog(); markDirty("Ordner gespeichert"); render(); }
  function deleteFolder(folderId) { if (!folderId || ["all", "favorites"].includes(folderId)) return; const folder = R.state.folders.find(item => item.id === folderId); if (!folder) return; const target = R.state.folders.find(item => item.id !== folderId)?.id || "allgemein"; if (!window.confirm(`Ordner wirklich löschen?\n\n${folder.name}`)) return; R.state.prompts.filter(prompt => prompt.folderId === folderId).forEach(prompt => { prompt.folderId = target; prompt.updatedAt = new Date().toISOString(); }); R.state.folders = R.state.folders.filter(item => item.id !== folderId); if (selectedFolder() === folderId) R.state.settings.selectedFolder = "all"; markDirty("Ordner gelöscht"); render(); }
  function addFavorite(id) { if (!R.state.favorites.includes(id)) R.state.favorites.push(id); }
  function removeFavorite(id) { R.state.favorites = R.state.favorites.filter(item => item !== id); }
  function isFavorite(id) { return R.state.favorites.includes(id); }
  function initSortables() { if (!window.Sortable) return; if (D.folderList && !R.folderSortable) R.folderSortable = new window.Sortable(D.folderList, { animation: 180, draggable: ".folder-row.is-sortable", dataIdAttr: "data-id", ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag", onEnd: applyFolderOrder }); if (D.promptGrid && !R.promptSortable) R.promptSortable = new window.Sortable(D.promptGrid, { animation: 180, draggable: ".prompt-card", dataIdAttr: "data-id", ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag", onEnd: applyPromptOrder }); syncFolderSortable(); syncPromptSortable(); }
  function syncFolderSortable() { R.folderSortable?.option("disabled", false); }
  function canSortPromptGrid() { return Boolean(window.Sortable && !R.query && (R.state.settings.sortMode || "manual") === "manual"); }
  function syncPromptSortable() { R.promptSortable?.option("disabled", !canSortPromptGrid()); }
  function applyFolderOrder() { const ids = [...D.folderList.querySelectorAll(".folder-row.is-sortable[data-folder-id]")].map(item => item.dataset.folderId); const order = new Map(ids.map((id, index) => [id, index])); R.state.folders.forEach(folder => { if (order.has(folder.id)) { folder.order = order.get(folder.id); folder.updatedAt = new Date().toISOString(); } }); markDirty("Ordner sortiert"); renderFolders(); refreshIcons(); }
  function applyPromptOrder() { if (!D.promptGrid || !canSortPromptGrid()) return; const ids = [...D.promptGrid.querySelectorAll(".prompt-card[data-prompt-id]")].map(item => item.dataset.promptId); if (!ids.length) return; if (selectedFolder() === "favorites") { const known = new Set(ids); R.state.favorites = ids.concat(R.state.favorites.filter(id => !known.has(id))); markDirty("Favoriten sortiert"); render(); return; } const rank = new Map(ids.map((id, i) => [id, i])); R.state.prompts.forEach(prompt => { if (rank.has(prompt.id)) { prompt.order = rank.get(prompt.id); prompt.updatedAt = new Date().toISOString(); } }); markDirty("Prompts sortiert"); render(); }
  function markDirty(label = "Geändert", options = {}) { R.state = normalizeState(R.state); R.state.updatedAt = new Date().toISOString(); R.state.version = Math.max(1, Number(R.state.version || 0) + 1); R.dirty = true; writeJsonStorage(CONFIG.storage.state, R.state); setSync("dirty", label); if (R.state.settings.autosave !== false) scheduleSave(options.delay ?? CONFIG.saveDelay, options); }
  function scheduleSave(delay = CONFIG.saveDelay, options = {}) { clearTimeout(R.saveTimer); R.saveTimer = window.setTimeout(() => saveNow({ silent: options.silent }), Math.max(delay, 0)); }
  async function saveNow(options = {}) { if (!R.dirty && !options.force) { if (options.user) toast("Kein Speichern nötig", "Der Zustand ist bereits aktuell.", "info"); return; } if (R.saveInFlight) { R.savePending = true; return; } const elapsed = Date.now() - R.saveLastStart; if (elapsed < CONFIG.saveFloor && !options.force) { scheduleSave(CONFIG.saveFloor - elapsed + 50, options); return; } R.saveInFlight = true; R.saveLastStart = Date.now(); setSync("speichert", "Speichert"); try { const payload = { state: normalizeState(R.state) }; if (R.remoteHash) payload.expectedHash = R.remoteHash; let response = await fetch(CONFIG.api.state, { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) }); if (response.status === 409) response = await fetch(CONFIG.api.state, { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ state: normalizeState(R.state), force: true }) }); if (!response.ok) throw new Error(`State API ${response.status}`); const result = await response.json(); if (result.state) R.state = normalizeState(result.state); R.remoteHash = result.summary?.hash || result.hash || R.state.meta.hash || R.remoteHash; R.localOnly = false; R.dirty = false; writeJsonStorage(CONFIG.storage.state, R.state); setSync("ok", "Gespeichert"); if (options.user) toast("Gespeichert", "Der Zustand wurde in Cloudflare KV synchronisiert.", "success"); } catch { R.localOnly = true; setSync("lokal", "Lokal gespeichert"); writeJsonStorage(CONFIG.storage.state, R.state); if (!options.silent) toast("Speichern in KV fehlgeschlagen", "Der Zustand bleibt lokal erhalten.", "warning"); } finally { R.saveInFlight = false; if (R.savePending) { R.savePending = false; scheduleSave(CONFIG.saveDelay); } renderMetrics(); } }
  async function reloadRemoteState() { await loadState(); render(); toast("Neu geladen", "Der aktuelle Zustand wurde erneut geladen.", "success"); }
  function openImportDialog() { openDialog(D.importDialog); previewSeed(); }
  async function previewSeed() { const target = byId("seedPreview"); if (target) target.textContent = "Seed-Vorschau wird geladen…"; try { const response = await fetch(`${CONFIG.api.seed}?text=0`, { headers: { Accept: "application/json" }, cache: "no-store" }); if (!response.ok) throw new Error(`Seed API ${response.status}`); if (target) target.textContent = JSON.stringify(await response.json(), null, 2); } catch (error) { if (target) target.textContent = JSON.stringify({ ok: false, message: "Seed-Vorschau nicht verfügbar. Client-Fallback wird beim Import versucht.", error: error.message }, null, 2); } }
  function readSeedOptions(form) { const read = name => { const el = form.querySelector(`[name='${name}']`); if (!el) return true; return el.type === "checkbox" ? el.checked : parseBool(el.value, true); }; return { prompts: read("prompts"), schaeferCt: read("schaeferCt"), schaeferMrt: read("schaeferMrt"), replace: read("replace"), favoriteFirst: read("favoriteFirst"), dryRun: false }; }
  async function submitSeed(form) { const opts = readSeedOptions(form); setSync("import", "Import läuft"); try { const response = await fetch(CONFIG.api.seed, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(opts) }); if (!response.ok) throw new Error(`Seed API ${response.status}`); const result = await response.json(); if (result.state) R.state = normalizeState(result.state); R.remoteHash = result.summary?.hash || R.state.meta.hash || ""; R.dirty = false; R.localOnly = false; writeJsonStorage(CONFIG.storage.state, R.state); closeTopDialog(); setSync("ok", "Importiert"); render(); toast("Startset geladen", "Prompts und Prof.-Schäfer-Dokumente wurden importiert.", "success"); } catch { await clientSeedFallback(opts); } }
  async function clientSeedFallback(opts) { try { const current = opts.replace ? emptyState() : normalizeState(R.state); if (opts.prompts) mergePrompts(current, parsePromptFile(await fetchText(CONFIG.files.prompts)).prompts); if (opts.schaeferCt) current.documents.schaeferCt = { title: DOCS.schaeferCt.title, text: await fetchText(CONFIG.files.schaeferCt), updatedAt: new Date().toISOString() }; if (opts.schaeferMrt) current.documents.schaeferMrt = { title: DOCS.schaeferMrt.title, text: await fetchText(CONFIG.files.schaeferMrt), updatedAt: new Date().toISOString() }; if (opts.favoriteFirst && !current.favorites.length) current.favorites = current.prompts.slice(0, 4).map(prompt => prompt.id); R.state = normalizeState(current); markDirty("Client-Import"); closeTopDialog(); render(); toast("Startset lokal geladen", "Server-Import nicht erreichbar, Client-Fallback wurde verwendet.", "warning"); } catch (error) { setSync("fehler", "Importfehler"); toast("Import fehlgeschlagen", error.message || "Seed-Dateien konnten nicht gelesen werden.", "error"); } }
  async function fetchText(path) { const response = await fetch(path, { cache: "no-store" }); if (!response.ok) throw new Error(`${path} konnte nicht geladen werden.`); return response.text(); }
  function openExportDialog() { openDialog(D.exportDialog); const target = byId("exportPreview"); if (target) target.textContent = JSON.stringify(exportPayload("manifest"), null, 2); }
  async function downloadExport(format = "json") { try { const text = renderExportText(format); const ext = ["prompts", "fulltxt", "schaefer-ct", "schaefer-mrt"].includes(format) ? "txt" : "json"; downloadText(text, `radprompt-${format}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`); toast("Export erstellt", format, "success"); } catch (error) { toast("Export fehlgeschlagen", error.message, "error"); } }
  async function copyExport(format = "json") { try { await writeClipboard(renderExportText(format)); toast("Export kopiert", format, "success"); } catch (error) { toast("Kopieren fehlgeschlagen", error.message, "error"); } }
  function renderExportText(format) { if (format === "manifest") return JSON.stringify(exportPayload("manifest"), null, 2); if (format === "state") return JSON.stringify(R.state, null, 2); if (format === "prompts") return promptTextExport(false); if (format === "fulltxt") return promptTextExport(true); if (format === "schaefer-ct") return R.state.documents.schaeferCt.text || ""; if (format === "schaefer-mrt") return R.state.documents.schaeferMrt.text || ""; return JSON.stringify(exportPayload("json"), null, 2); }
  function exportPayload(type) { const summary = { schema: R.state.schema, version: R.state.version, updatedAt: R.state.updatedAt, folders: R.state.folders.length, prompts: R.state.prompts.length, favorites: R.state.favorites.length, documents: { schaeferCt: bytes(R.state.documents.schaeferCt.text), schaeferMrt: bytes(R.state.documents.schaeferMrt.text) } }; if (type === "manifest") return { ok: true, exportedAt: new Date().toISOString(), summary, folders: sortedFolders().map(folder => ({ id: folder.id, name: folder.name, icon: folder.icon, order: folder.order, prompts: R.state.prompts.filter(prompt => prompt.folderId === folder.id).length })), prompts: R.state.prompts.map(prompt => ({ id: prompt.id, title: prompt.title, folderId: prompt.folderId, kind: prompt.kind, favorite: isFavorite(prompt.id), placeholders: extractPlaceholders(prompt.body), appendSchaeferCt: Boolean(prompt.appendSchaeferCt), appendSchaeferMrt: Boolean(prompt.appendSchaeferMrt), order: prompt.order })) }; return { ok: true, exportedAt: new Date().toISOString(), summary, state: R.state }; }
  function promptTextExport(includeDocs) { const lines = ["RadPrompt Export", "", `Exportiert: ${new Date().toISOString()}`, `Prompts: ${R.state.prompts.length}`, ""]; for (const folder of sortedFolders()) { const prompts = R.state.prompts.filter(prompt => prompt.folderId === folder.id).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)); if (!prompts.length) continue; lines.push(`# ${folder.name}`, ""); for (const prompt of prompts) lines.push(`// ${prompt.title}:`, "", String(prompt.body || "").trim(), "", "-".repeat(88), ""); } if (includeDocs && R.state.documents.schaeferCt.text) lines.push("# Befundbeispiele Prof. Schäfer CT", "", R.state.documents.schaeferCt.text.trim(), ""); if (includeDocs && R.state.documents.schaeferMrt.text) lines.push("# Befundbeispiele Prof. Schäfer MRT", "", R.state.documents.schaeferMrt.text.trim(), ""); return lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim() + "\n"; }
  function downloadText(text, filename) { const blob = new Blob([text], { type: filename.endsWith(".json") ? "application/json;charset=utf-8" : "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename.replace(/[\\/:*?"<>|]+/g, "-"); link.className = "download-link"; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function openDiagnosticsDialog() { openDialog(D.healthDialog); runDiagnostics(); }
  async function runDiagnostics() { const target = byId("diagnosticsOutput"); if (target) target.textContent = "Diagnostik läuft…"; try { const response = await fetch(CONFIG.api.health, { headers: { Accept: "application/json" }, cache: "no-store" }); const payload = await response.json(); if (target) target.textContent = JSON.stringify(payload, null, 2); toast(payload.ok ? "Diagnostik erfolgreich" : "Diagnostik mit Hinweis", payload.message || "Bitte Ausgabe prüfen.", payload.ok ? "success" : "warning"); } catch (error) { if (target) target.textContent = String(error.stack || error.message || error); toast("Diagnostik fehlgeschlagen", "Health-Endpunkt nicht erreichbar.", "error"); } }
  function openCommand() { openDialog(D.command); renderCommandList(); requestAnimationFrame(() => { if (D.commandInput) { D.commandInput.value = ""; D.commandInput.focus(); } }); }
  function filterCommandList(query) { const needle = normalizeSearch(query || ""); D.commandList?.querySelectorAll(".command-row").forEach(row => { row.hidden = needle && !normalizeSearch(row.textContent || "").includes(needle); }); }
  function openDialog(dialog) { if (!dialog) return; dialog.hidden = false; if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal(); else dialog.classList.add("is-open"); D.root.classList.add("has-dialog"); refreshIcons(); }
  function closeTopDialog() { const dialogs = [...document.querySelectorAll("dialog[open],.modal.is-open")]; const dialog = dialogs.at(-1); if (!dialog) return; if (typeof dialog.close === "function" && dialog.open) dialog.close(); else dialog.hidden = true; dialog.classList.remove("is-open"); D.root.classList.toggle("has-dialog", document.querySelectorAll("dialog[open],.modal.is-open").length > 0); }
  function toggleMenu() { D.root.classList.toggle("is-menu-open"); }
  function clearSearch() { R.query = ""; if (D.search) D.search.value = ""; renderPrompts(); }
  function applySetting(name, value) { R.state.settings[name] = value; persistLocalUi(); render(); }
  function setSync(kind, label) { if (D.syncStatus) { D.syncStatus.dataset.state = kind; D.syncStatus.textContent = label; } }
  function toast(title, message = "", type = "info") { if (!D.toastStack) return; const node = document.createElement("article"); node.className = `toast toast--${type}`; node.innerHTML = `<div class="toast__icon"><i data-lucide="${esc(toastIcon(type))}"></i></div><div class="toast__body"><strong>${html(title)}</strong>${message ? `<p>${html(message)}</p>` : ""}</div><button class="toast__close" type="button" aria-label="Hinweis schließen"><i data-lucide="x"></i></button>`; node.querySelector("button").addEventListener("click", () => node.remove(), { once: true }); D.toastStack.appendChild(node); refreshIcons(); setTimeout(() => node.remove(), CONFIG.toastLife); }
  function toastIcon(type) { return type === "success" ? "check-circle-2" : type === "warning" ? "alert-triangle" : type === "error" ? "x-circle" : "info"; }
  function handleInitialAction() { if (R.bootActionHandled) return; R.bootActionHandled = true; const url = new URL(location.href); const action = url.searchParams.get("action") || ""; const sharedTitle = url.searchParams.get("title") || ""; const sharedText = url.searchParams.get("text") || ""; const sharedUrl = url.searchParams.get("url") || ""; if (sharedTitle || sharedText || sharedUrl) return openEditorForNew({ title: sharedTitle || "Geteilter Prompt", body: [sharedText, sharedUrl].filter(Boolean).join("\n\n"), description: sharedUrl ? "Aus Share-Target übernommen" : "" }); if (action === "new-prompt") openEditorForNew({}); else if (action === "import") openImportDialog(); else if (action === "diagnostics") openDiagnosticsDialog(); else if (action === "export") openExportDialog(); }
  function parsePromptFile(text) { const source = String(text || "").replace(/\r\n?/g, "\n"); const matches = [...source.matchAll(/^\/\/\s*(.+?):\s*$/gm)]; const prompts = []; for (let i = 0; i < matches.length; i++) { const title = clean(matches[i][1], 180); const start = matches[i].index + matches[i][0].length; const end = i + 1 < matches.length ? matches[i + 1].index : source.length; const body = clean(source.slice(start, end), CONFIG.maxBody); if (!title || !body) continue; const kind = classifyPrompt(title, body); prompts.push(normalizePrompt({ id: uniqueLocalId(prompts, slugify(title)), title, description: describePrompt(title, body, kind), folderId: classifyFolder(title, body, kind), body, kind, accent: accentForPrompt(title, kind), favorite: prompts.length < 4, appendSchaeferCt: kind === "schaefer", appendSchaeferMrt: kind === "schaefer", order: prompts.length })); } return { prompts }; }
  function mergePrompts(state, prompts) { const byId = new Map(state.prompts.map(prompt => [prompt.id, prompt])); for (const prompt of prompts) { if (byId.has(prompt.id)) Object.assign(byId.get(prompt.id), prompt, { updatedAt: new Date().toISOString() }); else state.prompts.push(prompt); } state.favorites = unique([...state.favorites, ...state.prompts.filter(prompt => prompt.favorite).map(prompt => prompt.id)]).filter(id => state.prompts.some(prompt => prompt.id === id)); }
  function emptyState() { const now = new Date().toISOString(); return { schema: CONFIG.schema, version: 0, updatedAt: now, folders: DEFAULT_FOLDERS.map(folder => ({ ...folder, createdAt: now, updatedAt: now })), prompts: [], favorites: [], documents: clone(DOCS), settings: { ...DEFAULT_SETTINGS }, meta: { seededAt: "", source: "", hash: "" } }; }
  function normalizeState(input) { const raw = input && typeof input === "object" ? input : {}; const base = emptyState(); const folders = (Array.isArray(raw.folders) && raw.folders.length ? raw.folders : base.folders).map(normalizeFolder).filter(folder => folder.id && folder.name); const folderIds = new Set(folders.map(folder => folder.id)); const fallback = folders[0]?.id || "allgemein"; const prompts = (Array.isArray(raw.prompts) ? raw.prompts : []).map(prompt => normalizePrompt(prompt, fallback)).filter(prompt => prompt.id && prompt.title).map((prompt, index) => { if (!folderIds.has(prompt.folderId)) prompt.folderId = fallback; if (!Number.isFinite(Number(prompt.order))) prompt.order = index; return prompt; }); const promptIds = new Set(prompts.map(prompt => prompt.id)); const favorites = unique([...(Array.isArray(raw.favorites) ? raw.favorites : []), ...prompts.filter(prompt => prompt.favorite).map(prompt => prompt.id)]).filter(id => promptIds.has(id)); return { schema: CONFIG.schema, version: Math.max(0, Number(raw.version || 0)), updatedAt: validDate(raw.updatedAt) || new Date().toISOString(), folders: folders.sort((a, b) => Number(a.order || 0) - Number(b.order || 0)), prompts, favorites, documents: { schaeferCt: normalizeDocument(raw.documents?.schaeferCt, DOCS.schaeferCt), schaeferMrt: normalizeDocument(raw.documents?.schaeferMrt, DOCS.schaeferMrt) }, settings: normalizeSettings({ ...raw.settings, ...R.state?.settings }), meta: { seededAt: "", source: "", hash: "", ...(raw.meta || {}) } }; }
  function normalizeFolder(input) { const now = new Date().toISOString(); return { id: cleanId(input?.id || slugify(input?.name || "ordner")), name: clean(input?.name || "Ordner", 180), icon: clean(input?.icon || "folder", 80), order: Number.isFinite(Number(input?.order)) ? Number(input.order) : 0, createdAt: validDate(input?.createdAt) || now, updatedAt: validDate(input?.updatedAt) || now }; }
  function normalizePrompt(input, fallback = "allgemein") { const now = new Date().toISOString(); const body = clean(input?.body || "", CONFIG.maxBody); const title = clean(input?.title || "Unbenannter Prompt", 180); const kind = clean(input?.kind || classifyPrompt(title, body), 64); return { id: cleanId(input?.id || slugify(title) || `prompt-${Date.now().toString(36)}`), title, description: clean(input?.description || "", 500), folderId: cleanId(input?.folderId || fallback), body, kind, accent: clean(input?.accent || accentForPrompt(title, kind), 48), favorite: Boolean(input?.favorite), appendSchaeferCt: Boolean(input?.appendSchaeferCt), appendSchaeferMrt: Boolean(input?.appendSchaeferMrt), order: Number.isFinite(Number(input?.order)) ? Number(input.order) : 0, createdAt: validDate(input?.createdAt) || now, updatedAt: validDate(input?.updatedAt) || now, lastUsedAt: validDate(input?.lastUsedAt) || "" }; }
  function normalizeDocument(input, fallback) { return { title: clean(input?.title || fallback.title, 240), text: clean(input?.text || fallback.text || "", CONFIG.maxBody * 2), updatedAt: validDate(input?.updatedAt) || fallback.updatedAt || "" }; }
  function normalizeSettings(input = {}) { return { ...DEFAULT_SETTINGS, ...(input || {}), viewMode: ["grid", "list"].includes(input.viewMode) ? input.viewMode : "grid", sortMode: ["manual", "alpha", "recent", "used"].includes(input.sortMode) ? input.sortMode : "manual" }; }
  function classifyPrompt(title, body) { const haystack = normalizeSearch(`${title} ${body}`); if (haystack.includes("prof schafer") || haystack.includes("prof schaefer") || haystack.includes("befundstil")) return "schaefer"; if (extractPlaceholders(body).length) return "special"; return "standard"; }
  function classifyFolder(title, body, kind) { const haystack = normalizeSearch(`${title} ${body}`); if (kind === "schaefer") return "prof-schaefer"; if (haystack.includes("protokoll") || haystack.includes("staging") || haystack.includes("ubersicht") || haystack.includes("übersicht")) return "wissen"; if (haystack.includes("befund") || haystack.includes("radiologisch") || haystack.includes("bildinterpretation")) return "befundung"; return "allgemein"; }
  function accentForPrompt(title, kind) { const haystack = normalizeSearch(`${title} ${kind}`); if (kind === "schaefer") return "violet"; if (haystack.includes("revision")) return "amber"; if (haystack.includes("staging")) return "red"; if (haystack.includes("protokoll")) return "cyan"; if (haystack.includes("ubersicht") || haystack.includes("übersicht")) return "emerald"; return "blue"; }
  function describePrompt(title, body, kind) { if (kind === "schaefer") return "Prompt zur kompakten Prof.-Schäfer-Stiloptimierung mit optionalem CT-/MRT-Beispielanhang."; const placeholders = extractPlaceholders(body); return placeholders.length ? `Prompt mit ${placeholders.length} Platzhalter${placeholders.length === 1 ? "" : "n"}.` : title; }
  function extractPlaceholders(text) { const found = []; String(text || "").replace(/\*\*\*([^*]+?)\*\*\*/g, (_, name) => { const cleaned = clean(name, 140).replace(/\s+/g, " "); if (cleaned) found.push(cleaned); return ""; }); return unique(found); }
  function getPlaceholderValue(promptId, name) { return R.placeholderValues?.[promptId]?.[name] || ""; }
  function setPlaceholderValue(promptId, name, value) { if (!promptId || !name) return; if (!R.placeholderValues[promptId]) R.placeholderValues[promptId] = {}; R.placeholderValues[promptId][name] = String(value || ""); }
  function firstFolderId() { return R.state.folders[0]?.id || "allgemein"; }
  function nextPromptOrder(folderId) { const list = R.state.prompts.filter(prompt => prompt.folderId === folderId); return list.length ? Math.max(...list.map(prompt => Number(prompt.order || 0))) + 1 : 0; }
  function nextFolderOrder() { return R.state.folders.length ? Math.max(...R.state.folders.map(folder => Number(folder.order || 0))) + 1 : 0; }
  function uniquePromptId(base) { const root = cleanId(base || "prompt") || "prompt"; const ids = new Set(R.state.prompts.map(prompt => prompt.id)); if (!ids.has(root)) return root; let i = 2; while (ids.has(`${root}-${i}`)) i++; return `${root}-${i}`; }
  function uniqueLocalId(list, base) { const root = cleanId(base || "prompt") || "prompt"; const ids = new Set(list.map(item => item.id)); if (!ids.has(root)) return root; let i = 2; while (ids.has(`${root}-${i}`)) i++; return `${root}-${i}`; }
  function uniqueFolderId(name) { const root = cleanId(slugify(name) || "ordner"); const ids = new Set(R.state.folders.map(folder => folder.id)); if (!ids.has(root)) return root; let i = 2; while (ids.has(`${root}-${i}`)) i++; return `${root}-${i}`; }
  function slugify(value) { return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100); }
  function cleanId(value) { return slugify(value || "").slice(0, 140); }
  function clean(value, max = 1000000) { return String(value ?? "").normalize("NFKC").replace(/\r\n?/g, "\n").trim().slice(0, max); }
  function normalizeSearch(value) { return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").toLowerCase(); }
  function normalizeKey(value) { return normalizeSearch(value).replace(/[^a-z0-9]+/g, ""); }
  function unique(list) { return [...new Set((Array.isArray(list) ? list : []).filter(item => item !== undefined && item !== null && String(item) !== ""))]; }
  function validDate(value) { if (!value) return ""; const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toISOString() : ""; }
  function byId(id) { return document.getElementById(id); }
  function setText(el, value) { if (el) el.textContent = String(value ?? ""); }
  function val(id) { return byId(id)?.value || ""; }
  function setVal(id, value) { const el = byId(id); if (el) el.value = value ?? ""; }
  function checked(id) { return Boolean(byId(id)?.checked); }
  function setChecked(id, value) { const el = byId(id); if (el) el.checked = Boolean(value); }
  function html(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[c]); }
  function esc(value) { return html(value).replace(/`/g, "&#096;"); }
  function formatDateTime(value) { const date = value ? new Date(value) : null; return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(date) : "—"; }
  function bytes(value) { return new TextEncoder().encode(String(value || "")).length; }
  function parseBool(value, fallback = false) { if (typeof value === "boolean") return value; if (value === undefined || value === null || value === "") return fallback; return ["1", "true", "yes", "ja", "on"].includes(String(value).toLowerCase()); }
  function readJsonStorage(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
  function writeJsonStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function clone(value) { if (typeof structuredClone === "function") { try { return structuredClone(value); } catch {} } return JSON.parse(JSON.stringify(value)); }
  function refreshIcons() { if (window.lucide?.createIcons) { try { window.lucide.createIcons(); } catch {} } }
  function showFatal(error) { console.error(error); document.body.innerHTML = `<main class="app-fatal" role="alert"><section class="app-fatal__card"><h1>RadPrompt konnte nicht gestartet werden</h1><p>${html(error?.message || "Unbekannter Initialisierungsfehler")}</p><button id="fatalReload" type="button">Neu laden</button></section></main>`; byId("fatalReload")?.addEventListener("click", () => location.reload()); }
})();
