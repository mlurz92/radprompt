(() => {
  "use strict";

  const D = globalThis.RadPromptDefaults;
  if (!D) return;

  const app = { state: null, docs: { profCt: "", profMrt: "" }, els: {}, sortables: new Map(), placeholderMemory: new Map(), copyLocks: new Set(), commands: [], activeCommand: -1, syncBusy: false, syncQueued: false, deferredInstallPrompt: null, live: null };
  const id = value => document.getElementById(value);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const on = (target, event, fn, options) => target && target.addEventListener(event, fn, options);
  const raf = fn => requestAnimationFrame(fn);
  const esc = value => { const s = String(value ?? ""); if (globalThis.CSS?.escape) return CSS.escape(s); return s.replace(/[\0-\x1f\x7f]|^-?\d|^-$|[^\w-]/g, c => c === "\0" ? "\uFFFD" : `\\${c.codePointAt(0).toString(16)} `); };
  const interactive = node => Boolean(node?.closest?.("button,input,textarea,select,a,label,[contenteditable='true']"));

  const bind = () => {
    app.els = {
      app: id("app"), syncPill: id("syncPill"), syncLabel: id("syncLabel"), appMenuButton: id("appMenuButton"), appMenu: id("appMenu"), toggleCompactButton: id("toggleCompactButton"), openCommandButton: id("openCommandButton"), newPromptButton: id("newPromptButton"), forceSyncButton: id("forceSyncButton"), menuSeedButton: id("menuSeedButton"), menuHealthButton: id("menuHealthButton"), menuResetLocalButton: id("menuResetLocalButton"), menuInstallButton: id("menuInstallButton"), favoriteRail: id("favoriteRail"), newFolderButton: id("newFolderButton"), folderList: id("folderList"), librarySummary: id("librarySummary"), metricPrompts: id("metricPrompts"), metricFolders: id("metricFolders"), metricFavorites: id("metricFavorites"), clearFiltersButton: id("clearFiltersButton"), currentFolderTitle: id("currentFolderTitle"), currentFolderDescription: id("currentFolderDescription"), searchInput: id("searchInput"), importButton: id("importButton"), exportButton: id("exportButton"), promptGrid: id("promptGrid"), activeFilterRow: id("activeFilterRow"), emptyState: id("emptyState"), emptyNewPromptButton: id("emptyNewPromptButton"), detailDrawer: id("detailDrawer"), closeDrawerButton: id("closeDrawerButton"), drawerTitle: id("drawerTitle"), promptEditorForm: id("promptEditorForm"), editorPromptId: id("editorPromptId"), editorTitle: id("editorTitle"), editorFolder: id("editorFolder"), editorTone: id("editorTone"), editorFavorite: id("editorFavorite"), editorProfSchaefer: id("editorProfSchaefer"), editorBody: id("editorBody"), editorPlaceholderChips: id("editorPlaceholderChips"), refreshPlaceholdersButton: id("refreshPlaceholdersButton"), deletePromptButton: id("deletePromptButton"), copyFromEditorButton: id("copyFromEditorButton"), folderDialog: id("folderDialog"), folderForm: id("folderForm"), folderDialogTitle: id("folderDialogTitle"), folderIdInput: id("folderIdInput"), folderNameInput: id("folderNameInput"), folderDescriptionInput: id("folderDescriptionInput"), commandDialog: id("commandDialog"), commandSearchInput: id("commandSearchInput"), commandList: id("commandList"), closeCommandButton: id("closeCommandButton"), importDialog: id("importDialog"), importForm: id("importForm"), importTextarea: id("importTextarea"), toastStack: id("toastStack"), folderItemTemplate: id("folderItemTemplate"), promptCardTemplate: id("promptCardTemplate"), favoriteButtonTemplate: id("favoriteButtonTemplate"), placeholderInputTemplate: id("placeholderInputTemplate"), placeholderSelectTemplate: id("placeholderSelectTemplate"), commandItemTemplate: id("commandItemTemplate")
    };
    const missing = Object.entries(app.els).filter(([k, v]) => !v && k !== "menuInstallButton").map(([k]) => k);
    if (missing.length) throw new Error(`Fehlende UI-Elemente: ${missing.join(", ")}`);
  };

  const live = () => { const el = document.createElement("div"); el.setAttribute("aria-live", "polite"); el.style.position = "fixed"; el.style.inset = "auto auto 0 0"; el.style.width = "1px"; el.style.height = "1px"; el.style.overflow = "hidden"; el.style.clipPath = "inset(50%)"; document.body.append(el); app.live = el; };
  const announce = text => { if (!app.live) return; app.live.textContent = ""; setTimeout(() => app.live.textContent = text, 20); };
  const setState = value => app.els.app.dataset.appState = value;
  const syncStateLabel = (state, label) => { app.els.syncPill.dataset.syncState = state; app.els.syncLabel.textContent = label; app.els.syncPill.title = label; };
  const toast = (title, message = "", kind = "info", timeout = 3600) => { const el = document.createElement("article"); el.className = "rp-toast"; const icon = kind === "success" ? "fa-check" : kind === "error" ? "fa-triangle-exclamation" : kind === "warning" ? "fa-circle-exclamation" : "fa-circle-info"; el.innerHTML = `<i class="fa-solid ${icon}"></i><div><strong></strong><span></span></div><button type="button" aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button>`; $("strong", el).textContent = title; $("span", el).textContent = message; const close = () => el.remove(); on($("button", el), "click", close); app.els.toastStack.append(el); announce(`${title}${message ? ". " + message : ""}`); if (timeout) setTimeout(close, timeout); };
  const openDialog = (dialog, focus) => { try { dialog.showModal(); } catch { dialog.setAttribute("open", ""); } raf(() => (focus || $("input,textarea,select,button", dialog))?.focus({ preventScroll: true })); };
  const closeDialog = dialog => { try { if (dialog?.open) dialog.close(); } catch { dialog?.removeAttribute("open"); } };
  const toggleMenu = force => { const show = force ?? app.els.appMenu.hidden; app.els.appMenu.hidden = !show; app.els.appMenuButton.setAttribute("aria-expanded", String(show)); };

  const loadRemote = async () => { const res = await fetch(D.KV_STATE_ENDPOINT, { cache: "no-store", headers: { Accept: "application/json" } }); if (res.status === 404 || res.status === 204) return null; if (!res.ok) throw new Error(`KV HTTP ${res.status}`); const data = await res.json(); return data?.state ? D.normalizeState(data.state) : D.normalizeState(data); };
  const saveRemote = async state => { const res = await fetch(D.KV_STATE_ENDPOINT, { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: D.serializeState(state) }); if (!res.ok) { let msg = `KV HTTP ${res.status}`; try { msg = (await res.json()).error || msg; } catch {} throw new Error(msg); } return res.json().catch(() => ({})); };
  const setAppState = state => { app.state = D.normalizeState(state); const ui = D.readUiState(); app.state.ui = D.normalizeUi({ ...app.state.ui, ...ui, query: app.state.ui.query || ui.query }); };
  const persist = (remote = true) => { app.state = D.withMeta(app.state); D.saveLocalState(app.state); D.saveBackupState(app.state); D.saveUiState(app.state.ui); if (remote) setTimeout(() => sync({ silent: true }), 350); };

  const loadInitial = async () => {
    syncStateLabel("syncing", "Lade");
    const cached = D.readDocumentCache();
    app.docs = { profCt: cached.profCt, profMrt: cached.profMrt };
    let seed = null;
    try { seed = await D.createStateFromSeedFiles(undefined, { ui: D.readUiState() }); app.docs.profCt ||= seed.documents.profCt; app.docs.profMrt ||= seed.documents.profMrt; } catch {}
    try {
      const remote = await loadRemote();
      if (remote?.prompts?.length) setAppState(seed?.state ? D.mergeSeedPrompts(remote, seed.state) : remote);
      else setAppState(seed?.state || D.readLocalState());
      syncStateLabel("online", remote ? "KV" : "Startset");
    } catch (error) {
      setAppState(seed?.state ? D.mergeSeedPrompts(D.readLocalState(), seed.state) : D.readLocalState());
      syncStateLabel("error", navigator.onLine ? "Lokal" : "Offline");
      toast("Lokaler Modus", error.message || "KV nicht erreichbar", "warning", 4800);
    }
    if (app.docs.profCt || app.docs.profMrt) D.saveDocumentCache(app.docs);
    persist(false);
  };

  const sync = async ({ silent = false, force = false } = {}) => {
    if (app.syncBusy) { app.syncQueued = true; return false; }
    app.syncBusy = true;
    syncStateLabel("syncing", "Sync");
    try {
      const check = D.validateState(app.state);
      if (!check.ok) throw new Error(check.errors.join(" · "));
      await saveRemote(app.state);
      syncStateLabel("online", "KV aktuell");
      if (!silent || force) toast("Synchronisiert", "State wurde in Cloudflare KV gespeichert.", "success");
      app.syncBusy = false;
      if (app.syncQueued) { app.syncQueued = false; sync({ silent: true }); }
      return true;
    } catch (error) {
      D.saveLocalState(app.state); D.saveBackupState(app.state);
      syncStateLabel("error", navigator.onLine ? "Lokal" : "Offline");
      if (!silent || force) toast("KV-Sync fehlgeschlagen", error.message || "Lokale Speicherung aktiv.", "warning", 5200);
      app.syncBusy = false;
      return false;
    }
  };

  const currentFolder = () => { const v = app.state.ui.activeFolderId; if (v === D.ALL) return { id: D.ALL, title: "Alle Prompts", description: "Alle Prompt-Buttons für schnellen produktiven Zugriff." }; if (v === D.FAVORITES) return { id: D.FAVORITES, title: "Favoriten", description: "Die wichtigsten Prompt-Buttons als kompakte Widgetleiste." }; return D.getFolderById(app.state, v) || { id: D.ALL, title: "Alle Prompts", description: "Alle Prompt-Buttons für schnellen produktiven Zugriff." }; };
  const promptIcon = prompt => { const x = `${prompt.title} ${(prompt.tags || []).join(" ")}`.toLowerCase(); if (prompt.profSchaefer) return "fa-file-medical"; if (/staging|tnm/.test(x)) return "fa-diagram-project"; if (/protokoll/.test(x)) return "fa-list-check"; if (/übersicht|uebersicht/.test(x)) return "fa-book-medical"; if (/korrektur/.test(x)) return "fa-pen-to-square"; if (/bildinterpretation|dicom/.test(x)) return "fa-eye"; return D.hasPlaceholder(prompt.body) ? "fa-sliders" : "fa-copy"; };
  const cardSelector = promptId => `[data-prompt-id="${esc(promptId)}"]`;
  const cardValues = promptId => { const values = {}; const card = app.els.promptGrid.querySelector(cardSelector(promptId)); if (!card) return values; $$('[data-placeholder-input]', card).forEach(input => values[input.dataset.placeholderName] = input.value); return values; };
  const remember = promptId => { const values = cardValues(promptId); if (Object.keys(values).length) app.placeholderMemory.set(promptId, { ...(app.placeholderMemory.get(promptId) || {}), ...values }); };

  const renderTop = () => {
    const s = D.summary(app.state);
    app.els.librarySummary.textContent = s.label;
    app.els.metricPrompts.textContent = s.promptCount;
    app.els.metricFolders.textContent = s.folderCount;
    app.els.metricFavorites.textContent = s.favoriteCount;
    app.els.app.classList.toggle("is-compact", Boolean(app.state.ui.compact));
    app.els.app.dataset.view = app.state.ui.view;
    app.els.searchInput.value = app.state.ui.query || "";
    $$(".rp-chip").forEach(btn => { const active = btn.dataset.filter === app.state.ui.activeFilter; btn.classList.toggle("is-active", active); btn.setAttribute("aria-pressed", String(active)); });
    $$(".rp-view-toggle button").forEach(btn => { const active = btn.dataset.view === app.state.ui.view; btn.classList.toggle("is-active", active); btn.setAttribute("aria-pressed", String(active)); });
  };

  const renderFolders = () => {
    const frag = document.createDocumentFragment();
    const stats = D.folderStats(app.state);
    const sum = D.summary(app.state);
    const make = (folder, count, icon, fixed = false) => { const n = app.els.folderItemTemplate.content.firstElementChild.cloneNode(true); n.dataset.folderId = folder.id; n.classList.toggle("is-active", app.state.ui.activeFolderId === folder.id); $("i", n).className = `fa-solid ${icon}`; $('[data-folder-title]', n).textContent = folder.title; $('[data-folder-meta]', n).textContent = folder.description; $('[data-folder-count]', n).textContent = count; if (fixed) $('.rp-grip', n).style.visibility = "hidden"; return n; };
    frag.append(make({ id: D.ALL, title: "Alle Prompts", description: "Schnellzugriff" }, sum.promptCount, "fa-border-all", true));
    frag.append(make({ id: D.FAVORITES, title: "Favoriten", description: "Widgetleiste" }, sum.favoriteCount, "fa-star", true));
    stats.forEach(f => frag.append(make(f, f.count, "fa-folder", false)));
    app.els.folderList.replaceChildren(frag);
  };

  const renderFavorites = () => {
    const frag = document.createDocumentFragment();
    D.favoritePrompts(app.state).forEach(prompt => { const btn = app.els.favoriteButtonTemplate.content.firstElementChild.cloneNode(true); btn.dataset.promptId = prompt.id; $('[data-favorite-title]', btn).textContent = prompt.title; btn.title = prompt.title; on(btn, "click", event => event.altKey || event.ctrlKey || event.metaKey ? openEditor(prompt.id) : copyPrompt(prompt.id)); frag.append(btn); });
    app.els.favoriteRail.replaceChildren(frag);
    setupSortable("favorites");
  };

  const renderContext = () => {
    const folder = currentFolder();
    app.els.currentFolderTitle.textContent = folder.title;
    app.els.currentFolderDescription.textContent = folder.description || "Prompt klicken, Platzhalter ausfüllen, kopieren.";
    const tokens = [];
    if (app.state.ui.query) tokens.push(`Suche: ${app.state.ui.query}`);
    if (app.state.ui.activeFilter !== "all") tokens.push(`Filter: ${app.state.ui.activeFilter}`);
    app.els.activeFilterRow.hidden = !tokens.length;
    app.els.activeFilterRow.replaceChildren(...tokens.map(t => { const span = document.createElement("span"); span.textContent = t; return span; }));
  };

  const renderFolderSelect = () => {
    const current = app.els.editorFolder.value;
    app.els.editorFolder.replaceChildren(...app.state.folders.sort(D.byOrder).map(f => { const o = document.createElement("option"); o.value = f.id; o.textContent = f.title; return o; }));
    if (current && app.state.folders.some(f => f.id === current)) app.els.editorFolder.value = current;
  };

  const placeholderNode = (prompt, name) => {
    const select = D.isModalityPlaceholder(name);
    const node = (select ? app.els.placeholderSelectTemplate : app.els.placeholderInputTemplate).content.firstElementChild.cloneNode(true);
    const input = $('[data-placeholder-input]', node);
    $('[data-placeholder-label]', node).textContent = name;
    input.dataset.placeholderName = name;
    const memory = app.placeholderMemory.get(prompt.id) || {};
    input.value = memory[name] ?? prompt.placeholderDefaults?.[name] ?? "";
    if (select) {
      input.replaceChildren(new Option("Bitte wählen", ""), ...D.MODALITY_OPTIONS.map(x => new Option(x, x)));
      input.value = D.MODALITY_OPTIONS.includes(input.value) ? input.value : "";
    } else input.placeholder = D.isTopicPlaceholder(name) ? "Thema eingeben" : name;
    const save = () => { app.placeholderMemory.set(prompt.id, { ...(app.placeholderMemory.get(prompt.id) || {}), [name]: input.value }); };
    on(input, "input", save); on(input, "change", save); on(input, "keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); copyPrompt(prompt.id); } });
    return node;
  };

  const renderCards = () => {
    const prompts = D.filterPrompts(app.state, app.state.ui);
    const frag = document.createDocumentFragment();
    prompts.forEach(prompt => {
      const card = app.els.promptCardTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.promptId = prompt.id; card.dataset.tone = prompt.tone || "steel"; card.setAttribute("aria-label", `${prompt.title} kopieren`);
      const folder = D.getFolderById(app.state, prompt.folderId);
      const placeholders = D.extractPlaceholders(prompt.body);
      $(".rp-card-icon i", card).className = `fa-solid ${promptIcon(prompt)}`;
      $('[data-prompt-title]', card).textContent = prompt.title;
      $('[data-prompt-meta]', card).textContent = [folder?.title || "Ordner", prompt.favorite ? "Favorit" : "", placeholders.length ? `${placeholders.length} Felder` : "", prompt.profSchaefer ? "Schäfer" : ""].filter(Boolean).join(" · ");
      const fav = $('[data-action="favorite"]', card); fav.classList.toggle("is-active", prompt.favorite); $("i", fav).className = prompt.favorite ? "fa-solid fa-star" : "fa-regular fa-star";
      const zone = $('[data-placeholder-zone]', card); placeholders.slice(0, app.state.ui.view === "dense" ? 0 : 3).forEach(name => zone.append(placeholderNode(prompt, name)));
      $('[data-prompt-badge]', card).textContent = prompt.profSchaefer ? "Schäfer + Korpus" : placeholders.length ? `${placeholders.length} Felder` : "Direktkopie";
      on(card, "click", e => { const act = e.target.closest("[data-action]")?.dataset.action; if (act) { e.preventDefault(); e.stopPropagation(); if (act === "copy") copyPrompt(prompt.id); if (act === "favorite") toggleFavorite(prompt.id); if (act === "expand") openEditor(prompt.id); return; } if (!interactive(e.target)) copyPrompt(prompt.id); });
      on(card, "keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target === card) { e.preventDefault(); copyPrompt(prompt.id); } });
      frag.append(card);
    });
    app.els.promptGrid.classList.toggle("is-dense", app.state.ui.view === "dense");
    app.els.promptGrid.replaceChildren(frag);
    app.els.emptyState.hidden = prompts.length > 0;
    setupSortable("prompts");
  };

  const render = () => { renderTop(); renderFolders(); renderFavorites(); renderContext(); renderFolderSelect(); renderCards(); setupSortable("folders"); };

  const ensureDocs = async () => { if (app.docs.profCt && app.docs.profMrt) return app.docs; const p = D.sourcePaths(); const errors = []; if (!app.docs.profCt) await D.fetchText(p.profCt).then(t => app.docs.profCt = t).catch(e => errors.push(e.message)); if (!app.docs.profMrt) await D.fetchText(p.profMrt).then(t => app.docs.profMrt = t).catch(e => errors.push(e.message)); if (app.docs.profCt || app.docs.profMrt) D.saveDocumentCache(app.docs); if (errors.length) toast("Schäfer-Korpus unvollständig", errors.join(" · "), "warning", 6200); return app.docs; };
  const copyText = async text => { if (navigator.clipboard?.writeText && window.isSecureContext) return navigator.clipboard.writeText(text); const area = document.createElement("textarea"); area.value = text; area.readOnly = true; area.style.position = "fixed"; area.style.left = "-9999px"; document.body.append(area); area.select(); const ok = document.execCommand("copy"); area.remove(); if (!ok) throw new Error("Zwischenablage nicht verfügbar"); };
  const copyPrompt = async promptId => { if (app.copyLocks.has(promptId)) return; const prompt = D.getPromptById(app.state, promptId); if (!prompt) return; app.copyLocks.add(promptId); remember(promptId); if (prompt.profSchaefer) await ensureDocs(); const values = { ...(prompt.placeholderDefaults || {}), ...(app.placeholderMemory.get(promptId) || {}), ...cardValues(promptId) }; const check = D.validatePlaceholderValues(prompt, values); if (!check.valid) { app.copyLocks.delete(promptId); const card = app.els.promptGrid.querySelector(cardSelector(promptId)); const first = [...check.missing, ...check.invalid].map(n => card?.querySelector(`[data-placeholder-name="${esc(n)}"]`)).find(Boolean); first?.focus(); toast("Platzhalter ausfüllen", [...check.missing, ...check.invalid].join(", "), "warning", 5200); return; } const payload = D.createClipboardPayload(prompt, values, app.docs); try { await copyText(payload.text); toast("Prompt kopiert", prompt.title, "success", 2400); } catch (e) { toast("Kopieren fehlgeschlagen", e.message, "error", 5200); } finally { setTimeout(() => app.copyLocks.delete(promptId), 250); } };

  const toggleFavorite = promptId => { remember(promptId); app.state = D.toggleFavorite(app.state, promptId); persist(true); render(); };
  const setFolder = folderId => { app.state.ui.activeFolderId = folderId || D.ALL; if (folderId === D.FAVORITES) app.state.ui.activeFilter = "all"; persist(false); render(); };
  const setFilter = filter => { app.state.ui.activeFilter = ["all", "favorites", "special", "prof"].includes(filter) ? filter : "all"; persist(false); render(); };
  const clearFilters = () => { app.state.ui.activeFilter = "all"; app.state.ui.query = ""; app.state.ui.activeFolderId = D.ALL; persist(false); render(); };
  const setView = view => { app.state.ui.view = view === "dense" ? "dense" : "board"; persist(false); render(); };
  const toggleCompact = () => { app.state.ui.compact = !app.state.ui.compact; if (app.state.ui.compact) app.state.ui.view = "dense"; persist(false); render(); };

  const openEditor = promptId => { const p = D.getPromptById(app.state, promptId); if (!p) return; app.state.ui.drawerOpen = true; app.state.ui.selectedPromptId = promptId; app.els.drawerTitle.textContent = p.title; app.els.editorPromptId.value = p.id; app.els.editorTitle.value = p.title; app.els.editorFolder.value = p.folderId; app.els.editorTone.value = p.tone; app.els.editorFavorite.checked = p.favorite; app.els.editorProfSchaefer.checked = p.profSchaefer; app.els.editorBody.value = p.body; renderPlaceholderChips(); app.els.detailDrawer.setAttribute("aria-hidden", "false"); D.saveUiState(app.state.ui); raf(() => app.els.editorTitle.focus()); };
  const closeEditor = () => { app.state.ui.drawerOpen = false; app.state.ui.selectedPromptId = ""; app.els.detailDrawer.setAttribute("aria-hidden", "true"); D.saveUiState(app.state.ui); };
  const editorPrompt = () => { const old = D.getPromptById(app.state, app.els.editorPromptId.value); const body = D.collapse(app.els.editorBody.value); const title = D.title(app.els.editorTitle.value); return { ...(old || {}), id: app.els.editorPromptId.value || D.uid("prompt"), title, body, folderId: app.els.editorFolder.value, tone: app.els.editorTone.value, favorite: app.els.editorFavorite.checked, profSchaefer: app.els.editorProfSchaefer.checked || D.isProfSchaeferPrompt(title, body), tags: D.inferTags(title, body), order: old?.order ?? app.state.prompts.length, createdAt: old?.createdAt || D.nowIso(), updatedAt: D.nowIso(), placeholderDefaults: old?.placeholderDefaults || {} }; };
  const saveEditor = () => { const p = editorPrompt(); if (!p.title || !p.body) return toast("Unvollständig", "Name und Prompttext ausfüllen.", "warning"); app.state = D.upsertPrompt(app.state, p); app.state.ui.selectedPromptId = p.id; persist(true); render(); openEditor(p.id); toast("Gespeichert", p.title, "success"); };
  const createPrompt = () => { const p = D.createNewPrompt(app.state, app.state.ui.activeFolderId); app.state = D.upsertPrompt(app.state, p); persist(true); render(); openEditor(p.id); };
  const deletePrompt = () => { const p = D.getPromptById(app.state, app.els.editorPromptId.value); if (!p || !confirm(`Prompt löschen?\n\n${p.title}`)) return; app.state = D.removePrompt(app.state, p.id); closeEditor(); persist(true); render(); toast("Gelöscht", p.title, "success"); };
  const copyFromEditor = async () => { const p = editorPrompt(); if (p.profSchaefer) await ensureDocs(); try { await copyText(D.createClipboardPayload(p, {}, app.docs, { keepUnfilled: true }).text); toast("Editor-Prompt kopiert", p.title, "success"); } catch (e) { toast("Kopieren fehlgeschlagen", e.message, "error"); } };
  const renderPlaceholderChips = () => { const chips = D.extractPlaceholders(app.els.editorBody.value).map(name => { const el = document.createElement("span"); el.textContent = D.isModalityPlaceholder(name) ? `${name}: Dropdown` : name; return el; }); app.els.editorPlaceholderChips.replaceChildren(...chips); };

  const openFolderDialog = (folder = null) => { app.els.folderDialogTitle.textContent = folder ? "Ordner bearbeiten" : "Ordner anlegen"; app.els.folderIdInput.value = folder?.id || ""; app.els.folderNameInput.value = folder?.title || ""; app.els.folderDescriptionInput.value = folder?.description || ""; openDialog(app.els.folderDialog, app.els.folderNameInput); };
  const saveFolder = () => { const name = D.title(app.els.folderNameInput.value); if (!name) return toast("Ordnername fehlt", "Bitte Namen eintragen.", "warning"); const old = D.getFolderById(app.state, app.els.folderIdInput.value); const folder = old ? { ...old, title: name, description: D.title(app.els.folderDescriptionInput.value), updatedAt: D.nowIso() } : D.createNewFolder(name, D.title(app.els.folderDescriptionInput.value), app.state.folders.length); app.state = D.upsertFolder(app.state, folder); app.state.ui.activeFolderId = folder.id; persist(true); closeDialog(app.els.folderDialog); render(); };
  const exportState = async () => { const text = D.serializeState(app.state); D.downloadJson(text, D.safeFileName("radprompt-export")); try { await copyText(text); toast("Export erstellt", "JSON heruntergeladen und kopiert.", "success"); } catch { toast("Export erstellt", "JSON heruntergeladen.", "success"); } };
  const importState = () => { const imported = D.parseImportedState(app.els.importTextarea.value); if (!imported) return toast("Import fehlgeschlagen", "Ungültiges JSON.", "error"); app.state = imported; persist(true); closeDialog(app.els.importDialog); render(); toast("Import abgeschlossen", D.summary(app.state).label, "success"); };
  const reloadSeed = async () => { toggleMenu(false); syncStateLabel("syncing", "Startset"); try { const seed = await D.createStateFromSeedFiles(undefined, { ui: app.state.ui }); app.state = D.normalizeState(seed.state); app.docs = { profCt: seed.documents.profCt || app.docs.profCt, profMrt: seed.documents.profMrt || app.docs.profMrt }; if (app.docs.profCt || app.docs.profMrt) D.saveDocumentCache(app.docs); persist(true); render(); toast("Startset geladen", D.summary(app.state).label, "success"); } catch (e) { toast("Startset fehlgeschlagen", e.message, "error", 6200); } };
  const health = async () => { toggleMenu(false); try { const res = await fetch(D.KV_HEALTH_ENDPOINT, { cache: "no-store", headers: { Accept: "application/json" } }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`); syncStateLabel(data.kv ? "online" : "error", data.kv ? "KV ok" : "KV fehlt"); toast(data.kv ? "KV aktiv" : "KV fehlt", data.message || "Health geprüft", data.kv ? "success" : "warning", 5200); } catch (e) { syncStateLabel("error", "KV Fehler"); toast("Health fehlgeschlagen", e.message, "error", 5200); } };
  const resetLocal = () => { if (!confirm("Lokalen Browsercache löschen? KV bleibt unverändert.")) return; D.clearLocalState(); location.reload(); };
  const install = async () => { toggleMenu(false); if (app.deferredInstallPrompt) { app.deferredInstallPrompt.prompt(); app.deferredInstallPrompt = null; } else toast("Als App nutzen", "Im Browsermenü die Option App installieren oder An Taskleiste anheften wählen.", "info", 5200); };

  const renderCommands = (query = "") => { const promptCommands = app.state.prompts.filter(p => !p.archived).map(p => ({ id: `prompt-${p.id}`, title: p.title, description: `Prompt kopieren · ${D.getFolderById(app.state, p.folderId)?.title || "Ordner"}`, icon: promptIcon(p), key: "↵", action: "copyPrompt", promptId: p.id })); app.commands = [...D.COMMANDS, ...promptCommands].filter(c => !query || D.matches({ title: c.title, body: c.description, tags: [c.action] }, query)).slice(0, 80); app.activeCommand = app.commands.length ? 0 : -1; const nodes = app.commands.map((c, i) => { const n = app.els.commandItemTemplate.content.firstElementChild.cloneNode(true); n.dataset.index = i; n.classList.toggle("is-active", i === app.activeCommand); $("i", n).className = `fa-solid ${c.icon || "fa-bolt"}`; $('[data-command-title]', n).textContent = c.title; $('[data-command-description]', n).textContent = c.description; $('[data-command-key]', n).textContent = c.key || ""; on(n, "click", () => execCommand(c)); return n; }); app.els.commandList.replaceChildren(...nodes); };
  const openCommand = () => { renderCommands(""); app.els.commandSearchInput.value = ""; openDialog(app.els.commandDialog, app.els.commandSearchInput); };
  const selectCommand = i => { if (!app.commands.length) return; app.activeCommand = (i + app.commands.length) % app.commands.length; $$(".rp-command-item", app.els.commandList).forEach((n, j) => n.classList.toggle("is-active", j === app.activeCommand)); $$(".rp-command-item", app.els.commandList)[app.activeCommand]?.scrollIntoView({ block: "nearest" }); };
  const execCommand = c => { closeDialog(app.els.commandDialog); ({ newPrompt: createPrompt, newFolder: () => openFolderDialog(), sync: () => sync({ force: true }), import: () => openDialog(app.els.importDialog, app.els.importTextarea), export: exportState, seed: reloadSeed, compact: toggleCompact, health, copyPrompt: () => copyPrompt(c.promptId) }[c.action] || (() => {}))(); };

  const destroySortable = key => { const s = app.sortables.get(key); if (s) try { s.destroy(); } catch {} app.sortables.delete(key); };
  const setupSortable = key => { if (!globalThis.Sortable) return; if (key === "folders") { destroySortable(key); app.sortables.set(key, Sortable.create(app.els.folderList, { animation: 150, draggable: ".rp-folder-item:not([data-folder-id='all']):not([data-folder-id='favorites'])", handle: ".rp-grip", ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", onEnd: () => { const ids = $$(".rp-folder-item", app.els.folderList).map(n => n.dataset.folderId).filter(x => x && x !== D.ALL && x !== D.FAVORITES); app.state = D.applyFolderOrder(app.state, ids); persist(true); render(); } })); }
    if (key === "prompts") { destroySortable(key); app.sortables.set(key, Sortable.create(app.els.promptGrid, { animation: 150, draggable: ".rp-card", handle: ".rp-card-icon,h2", ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", onEnd: () => { const ids = $$(".rp-card", app.els.promptGrid).map(n => n.dataset.promptId).filter(Boolean); app.state = D.applyPromptOrder(app.state, ids, app.state.ui.activeFolderId); persist(true); render(); } })); }
    if (key === "favorites") { destroySortable(key); app.sortables.set(key, Sortable.create(app.els.favoriteRail, { animation: 150, draggable: ".rp-fav-btn", handle: ".rp-fav-grip", direction: "horizontal", ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", onEnd: () => { const ids = $$(".rp-fav-btn", app.els.favoriteRail).map(n => n.dataset.promptId).filter(Boolean); app.state = D.applyFavoriteOrder(app.state, ids); persist(true); render(); } })); } };

  const events = () => {
    on(app.els.appMenuButton, "click", e => { e.stopPropagation(); toggleMenu(); });
    on(document, "click", e => { if (!app.els.appMenu.hidden && !e.target.closest("#appMenu,#appMenuButton")) toggleMenu(false); });
    on(app.els.toggleCompactButton, "click", toggleCompact); on(app.els.openCommandButton, "click", openCommand); on(app.els.newPromptButton, "click", createPrompt); on(app.els.emptyNewPromptButton, "click", createPrompt); on(app.els.newFolderButton, "click", () => openFolderDialog()); on(app.els.forceSyncButton, "click", () => sync({ force: true })); on(app.els.menuSeedButton, "click", reloadSeed); on(app.els.menuHealthButton, "click", health); on(app.els.menuResetLocalButton, "click", resetLocal); on(app.els.menuInstallButton, "click", install); on(app.els.clearFiltersButton, "click", clearFilters); on(app.els.importButton, "click", () => openDialog(app.els.importDialog, app.els.importTextarea)); on(app.els.exportButton, "click", exportState);
    on(app.els.folderList, "click", e => { const item = e.target.closest(".rp-folder-item"); if (item) setFolder(item.dataset.folderId); });
    on(app.els.folderList, "keydown", e => { const item = e.target.closest(".rp-folder-item"); if (item && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setFolder(item.dataset.folderId); } });
    on(app.els.folderList, "dblclick", e => { const item = e.target.closest(".rp-folder-item"); const folder = D.getFolderById(app.state, item?.dataset.folderId); if (folder) openFolderDialog(folder); });
    $$(".rp-chip").forEach(b => on(b, "click", () => setFilter(b.dataset.filter))); $$(".rp-view-toggle button").forEach(b => on(b, "click", () => setView(b.dataset.view)));
    on(app.els.searchInput, "input", D.debounce(e => { app.state.ui.query = e.target.value; persist(false); render(); }, 120));
    on(app.els.closeDrawerButton, "click", closeEditor); on(app.els.promptEditorForm, "submit", e => { e.preventDefault(); saveEditor(); }); on(app.els.editorBody, "input", D.debounce(renderPlaceholderChips, 80)); on(app.els.refreshPlaceholdersButton, "click", renderPlaceholderChips); on(app.els.deletePromptButton, "click", deletePrompt); on(app.els.copyFromEditorButton, "click", copyFromEditor);
    on(app.els.folderForm, "submit", e => { e.preventDefault(); if (e.submitter?.value === "cancel") closeDialog(app.els.folderDialog); else saveFolder(); });
    on(app.els.importForm, "submit", e => { e.preventDefault(); if (e.submitter?.value === "cancel") closeDialog(app.els.importDialog); else importState(); });
    on(app.els.closeCommandButton, "click", () => closeDialog(app.els.commandDialog)); on(app.els.commandSearchInput, "input", e => renderCommands(e.target.value)); on(app.els.commandSearchInput, "keydown", e => { if (e.key === "ArrowDown") { e.preventDefault(); selectCommand(app.activeCommand + 1); } if (e.key === "ArrowUp") { e.preventDefault(); selectCommand(app.activeCommand - 1); } if (e.key === "Enter") { e.preventDefault(); execCommand(app.commands[app.activeCommand]); } if (e.key === "Escape") closeDialog(app.els.commandDialog); });
    on(document, "keydown", e => { const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCommand(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") { e.preventDefault(); createPrompt(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); app.els.detailDrawer.getAttribute("aria-hidden") === "false" ? saveEditor() : sync({ force: true }); } else if (!typing && e.key === "/") { e.preventDefault(); app.els.searchInput.focus(); } else if (e.key === "Escape") { toggleMenu(false); closeDialog(app.els.commandDialog); closeDialog(app.els.importDialog); closeDialog(app.els.folderDialog); if (!typing && app.els.detailDrawer.getAttribute("aria-hidden") === "false") closeEditor(); } });
    on(window, "beforeinstallprompt", e => { e.preventDefault(); app.deferredInstallPrompt = e; }); on(window, "online", () => sync({ silent: true })); on(window, "offline", () => syncStateLabel("error", "Offline")); on(document, "visibilitychange", () => { if (document.visibilityState === "hidden" && app.state) { D.saveLocalState(app.state); D.saveBackupState(app.state); } });
  };

  const init = async () => {
    bind(); live(); events(); setState("booting"); await loadInitial(); render(); if (app.state.ui.drawerOpen && app.state.ui.selectedPromptId) openEditor(app.state.ui.selectedPromptId); setState("ready"); setTimeout(() => sync({ silent: true }), 1000);
  };
  const start = () => init().catch(e => { setState("error"); syncStateLabel("error", "Fehler"); toast("Startfehler", e.message || "Unbekannter Fehler", "error", 0); console.error(e); });
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start, { once: true }) : start();
})();
