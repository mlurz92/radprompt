(() => {
  "use strict";

  const D = globalThis.RadPromptDefaults;

  if (!D) {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.insertAdjacentHTML("afterbegin", '<section class="rp-noscript"><strong>RadPrompt konnte nicht starten.</strong><span>Die Datei assets/js/defaults.js wurde nicht geladen.</span></section>');
    });
    return;
  }

  const app = {
    state: null,
    documents: { profCt: "", profMrt: "" },
    els: {},
    sortables: new Map(),
    commandItems: [],
    activeCommandIndex: -1,
    deferredInstallPrompt: null,
    autosaveTimer: 0,
    syncBusy: false,
    syncQueued: false,
    lastRenderKey: "",
    lastPromptRenderIds: [],
    placeholderMemory: new Map(),
    copyLock: new Set(),
    focusAfterRender: "",
    liveRegion: null,
    initialised: false,
    pointerMode: matchMedia("(pointer: coarse)").matches ? "coarse" : "fine"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const byId = id => document.getElementById(id);
  const on = (target, event, handler, options) => target && target.addEventListener(event, handler, options);
  const raf = callback => requestAnimationFrame(callback);
  const safe = value => String(value ?? "");
  const isInteractive = element => Boolean(element?.closest?.("button, input, textarea, select, option, label, a, [role='button'], [contenteditable='true']"));
  const icon = name => `<i class="fa-solid ${name}" aria-hidden="true"></i>`;
  const cssEscape = value => {
    const text = safe(value);
    if (globalThis.CSS && typeof globalThis.CSS.escape === "function") return CSS.escape(text);
    return text.replace(/[\0-\x1f\x7f]|^-?\d|^-$|[^\w-]/g, char => {
      if (char === "\0") return "\uFFFD";
      return `\\${char.codePointAt(0).toString(16)} `;
    });
  };

  const bindElements = () => {
    app.els = {
      app: byId("app"),
      seedSources: byId("seedSources"),
      syncPill: byId("syncPill"),
      syncLabel: byId("syncLabel"),
      appMenuButton: byId("appMenuButton"),
      openCommandButton: byId("openCommandButton"),
      toggleCompactButton: byId("toggleCompactButton"),
      newPromptButton: byId("newPromptButton"),
      newFolderButton: byId("newFolderButton"),
      clearFiltersButton: byId("clearFiltersButton"),
      folderList: byId("folderList"),
      librarySummary: byId("librarySummary"),
      metricPrompts: byId("metricPrompts"),
      metricFolders: byId("metricFolders"),
      metricFavorites: byId("metricFavorites"),
      forceSyncButton: byId("forceSyncButton"),
      currentFolderTitle: byId("currentFolderTitle"),
      currentFolderDescription: byId("currentFolderDescription"),
      searchInput: byId("searchInput"),
      favoriteRail: byId("favoriteRail"),
      manageFavoritesButton: byId("manageFavoritesButton"),
      promptGrid: byId("promptGrid"),
      activeFilterRow: byId("activeFilterRow"),
      emptyState: byId("emptyState"),
      emptyNewPromptButton: byId("emptyNewPromptButton"),
      importButton: byId("importButton"),
      exportButton: byId("exportButton"),
      detailDrawer: byId("detailDrawer"),
      drawerTitle: byId("drawerTitle"),
      closeDrawerButton: byId("closeDrawerButton"),
      promptEditorForm: byId("promptEditorForm"),
      editorPromptId: byId("editorPromptId"),
      editorTitle: byId("editorTitle"),
      editorFolder: byId("editorFolder"),
      editorTone: byId("editorTone"),
      editorFavorite: byId("editorFavorite"),
      editorProfSchaefer: byId("editorProfSchaefer"),
      editorBody: byId("editorBody"),
      editorPlaceholderChips: byId("editorPlaceholderChips"),
      refreshPlaceholdersButton: byId("refreshPlaceholdersButton"),
      deletePromptButton: byId("deletePromptButton"),
      copyFromEditorButton: byId("copyFromEditorButton"),
      folderDialog: byId("folderDialog"),
      folderForm: byId("folderForm"),
      folderDialogTitle: byId("folderDialogTitle"),
      folderIdInput: byId("folderIdInput"),
      folderNameInput: byId("folderNameInput"),
      folderDescriptionInput: byId("folderDescriptionInput"),
      commandDialog: byId("commandDialog"),
      commandSearchInput: byId("commandSearchInput"),
      commandList: byId("commandList"),
      closeCommandButton: byId("closeCommandButton"),
      importDialog: byId("importDialog"),
      importForm: byId("importForm"),
      importTextarea: byId("importTextarea"),
      appMenuDialog: byId("appMenuDialog"),
      closeAppMenuButton: byId("closeAppMenuButton"),
      menuSeedButton: byId("menuSeedButton"),
      menuHealthButton: byId("menuHealthButton"),
      menuResetLocalButton: byId("menuResetLocalButton"),
      menuInstallButton: byId("menuInstallButton"),
      toastStack: byId("toastStack"),
      folderItemTemplate: byId("folderItemTemplate"),
      promptCardTemplate: byId("promptCardTemplate"),
      favoriteButtonTemplate: byId("favoriteButtonTemplate"),
      placeholderInputTemplate: byId("placeholderInputTemplate"),
      placeholderSelectTemplate: byId("placeholderSelectTemplate"),
      commandItemTemplate: byId("commandItemTemplate")
    };
  };

  const requireElements = () => {
    const optional = new Set(["menuInstallButton"]);
    const missing = Object.entries(app.els).filter(([key, value]) => !value && !optional.has(key)).map(([key]) => key);
    if (missing.length) throw new Error(`Fehlende DOM-Elemente: ${missing.join(", ")}`);
  };

  const createLiveRegion = () => {
    const region = document.createElement("div");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    region.style.position = "fixed";
    region.style.width = "1px";
    region.style.height = "1px";
    region.style.overflow = "hidden";
    region.style.clipPath = "inset(50%)";
    region.style.whiteSpace = "nowrap";
    document.body.append(region);
    app.liveRegion = region;
  };

  const announce = message => {
    if (!app.liveRegion) return;
    app.liveRegion.textContent = "";
    setTimeout(() => {
      app.liveRegion.textContent = message;
    }, 20);
  };

  const setSyncState = (state, label) => {
    if (!app.els.syncPill || !app.els.syncLabel) return;
    app.els.syncPill.dataset.syncState = state;
    app.els.syncLabel.textContent = label;
    app.els.syncPill.setAttribute("aria-label", `Synchronisationsstatus: ${label}`);
  };

  const setBootState = state => {
    if (app.els.app) app.els.app.dataset.appState = state;
  };

  const showToast = (title, message = "", kind = "info", timeout = 3600) => {
    const stack = app.els.toastStack;
    if (!stack) return null;
    const toast = document.createElement("article");
    toast.className = "rp-toast";
    toast.dataset.kind = kind;
    toast.setAttribute("role", kind === "error" || kind === "warning" ? "alert" : "status");
    const iconMap = { success: "fa-check", error: "fa-triangle-exclamation", warning: "fa-circle-exclamation", info: "fa-circle-info" };
    toast.innerHTML = `<span class="rp-toast-icon">${icon(iconMap[kind] || iconMap.info)}</span><span class="rp-toast-copy"><strong></strong><span></span></span><button type="button" aria-label="Hinweis schließen"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
    $("strong", toast).textContent = title;
    $(".rp-toast-copy span", toast).textContent = message;
    const close = () => {
      if (!toast.isConnected) return;
      toast.classList.add("is-leaving");
      setTimeout(() => toast.remove(), 240);
    };
    on($("button", toast), "click", close);
    stack.append(toast);
    announce(`${title}${message ? `. ${message}` : ""}`);
    if (timeout > 0) setTimeout(close, timeout);
    return toast;
  };

  const closeDialog = dialog => {
    if (!dialog) return;
    try {
      if (dialog.open) dialog.close();
    } catch {
      dialog.removeAttribute("open");
    }
  };

  const openDialog = (dialog, focusTarget = null) => {
    if (!dialog) return;
    try {
      if (!dialog.open) dialog.showModal();
    } catch {
      dialog.setAttribute("open", "");
    }
    raf(() => {
      const target = focusTarget || $("input, textarea, select, button", dialog);
      if (target) target.focus({ preventScroll: true });
    });
  };

  const isDialogOpen = dialog => Boolean(dialog && dialog.open);

  const currentFolder = () => {
    const id = app.state?.ui?.activeFolderId || D.VIRTUAL_FOLDER_ALL;
    if (id === D.VIRTUAL_FOLDER_ALL) return { id, title: "Alle Prompts", description: "Schneller Zugriff auf alle Prompt-Templates des Boards." };
    if (id === D.VIRTUAL_FOLDER_FAVORITES) return { id, title: "Favoriten", description: "Häufig genutzte Prompt-Templates für den produktiven Schnellzugriff." };
    return D.getFolderById(app.state, id) || { id: D.VIRTUAL_FOLDER_ALL, title: "Alle Prompts", description: "Schneller Zugriff auf alle Prompt-Templates des Boards." };
  };

  const selectedPromptSelector = promptId => `[data-prompt-id="${cssEscape(promptId)}"]`;

  const readCardPlaceholderValues = promptId => {
    const card = app.els.promptGrid?.querySelector(selectedPromptSelector(promptId));
    const values = {};
    if (!card) return values;
    $$("[data-placeholder-input]", card).forEach(input => {
      const name = input.dataset.placeholderName;
      if (!name) return;
      values[name] = input.value;
    });
    return values;
  };

  const rememberCardValues = promptId => {
    const values = readCardPlaceholderValues(promptId);
    if (Object.keys(values).length) app.placeholderMemory.set(promptId, { ...(app.placeholderMemory.get(promptId) || {}), ...values });
  };

  const getKnownPlaceholderValues = prompt => ({
    ...(prompt?.placeholderDefaults || {}),
    ...(app.placeholderMemory.get(prompt?.id) || {}),
    ...readCardPlaceholderValues(prompt?.id)
  });

  const saveUi = () => {
    if (!app.state) return;
    D.saveUiState(app.state.ui);
  };

  const normalizeAndSetState = state => {
    const ui = app.state?.ui || D.readUiState();
    const normalized = D.normalizeState(state);
    const mergedUi = D.normalizeUi({
      ...normalized.ui,
      ...ui,
      query: app.els.searchInput?.value ?? ui.query ?? normalized.ui.query ?? ""
    });
    app.state = D.normalizeState({ ...normalized, ui: mergedUi });
  };

  const queuePersist = (remote = true) => {
    if (!app.state) return;
    app.state = D.withUpdatedStateMeta(app.state);
    D.saveLocalState(app.state);
    D.saveBackupState(app.state);
    saveUi();
    clearTimeout(app.autosaveTimer);
    if (!remote) return;
    app.autosaveTimer = setTimeout(() => {
      syncState({ silent: true });
    }, 650);
  };

  const fetchRemoteState = async () => {
    const response = await fetch(D.KV_STATE_ENDPOINT, { method: "GET", headers: { "Accept": "application/json" }, cache: "no-cache" });
    if (response.status === 404 || response.status === 204) return null;
    if (!response.ok) throw new Error(`KV-Status ${response.status}`);
    const payload = await response.json();
    if (payload?.state) return D.normalizeState(payload.state);
    if (payload?.schema || payload?.prompts || payload?.folders) return D.normalizeState(payload);
    return null;
  };

  const putRemoteState = async state => {
    const response = await fetch(D.KV_STATE_ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: D.serializeState(state)
    });
    if (!response.ok) {
      let detail = "";
      try {
        detail = (await response.json())?.error || "";
      } catch {
        detail = await response.text().catch(() => "");
      }
      throw new Error(detail || `KV-Status ${response.status}`);
    }
    return response.json().catch(() => ({}));
  };

  const syncState = async ({ silent = false, force = false } = {}) => {
    if (!app.state) return false;
    if (app.syncBusy) {
      app.syncQueued = true;
      return false;
    }
    app.syncBusy = true;
    app.syncQueued = false;
    setSyncState("syncing", "Synchronisiere");
    try {
      const validation = D.validateState(app.state);
      if (!validation.ok) throw new Error(validation.errors.join(" · "));
      await putRemoteState(app.state);
      setSyncState("online", "KV aktuell");
      if (!silent || force) showToast("Synchronisiert", "RadPrompt-State wurde in Cloudflare KV gespeichert.", "success");
      app.syncBusy = false;
      if (app.syncQueued) {
        app.syncQueued = false;
        syncState({ silent: true });
      }
      return true;
    } catch (error) {
      setSyncState("error", navigator.onLine ? "Lokal" : "Offline");
      D.saveLocalState(app.state);
      D.saveBackupState(app.state);
      if (!silent || force) showToast("KV-Sync fehlgeschlagen", error.message || "Lokaler Speicher bleibt aktiv.", "warning", 5200);
      app.syncBusy = false;
      return false;
    }
  };

  const ensureDocumentsLoaded = async () => {
    if (app.documents.profCt && app.documents.profMrt) return app.documents;
    const paths = D.getSourcePathsFromDom();
    const next = { ...app.documents };
    const errors = [];
    if (!next.profCt) {
      try {
        next.profCt = await D.fetchText(paths.profCt);
      } catch (error) {
        errors.push(`CT-Beispiele: ${error.message}`);
      }
    }
    if (!next.profMrt) {
      try {
        next.profMrt = await D.fetchText(paths.profMrt);
      } catch (error) {
        errors.push(`MRT-Beispiele: ${error.message}`);
      }
    }
    app.documents = next;
    if (next.profCt || next.profMrt) D.saveDocumentCache(next);
    if (errors.length) showToast("Schäfer-Dokumente nicht vollständig geladen", errors.join(" · "), "warning", 6200);
    return app.documents;
  };

  const mergeSeedDocuments = seed => {
    if (!seed?.documents) return;
    app.documents = {
      profCt: seed.documents.profCt || app.documents.profCt,
      profMrt: seed.documents.profMrt || app.documents.profMrt
    };
    if (app.documents.profCt || app.documents.profMrt) D.saveDocumentCache(app.documents);
  };

  const loadInitialState = async () => {
    setSyncState("syncing", "Lade Daten");
    const cachedDocs = D.readDocumentCache();
    app.documents = { profCt: cachedDocs.profCt, profMrt: cachedDocs.profMrt };
    const ui = D.readUiState();
    try {
      const remote = await fetchRemoteState();
      if (remote?.prompts?.length) {
        normalizeAndSetState({ ...remote, ui: { ...remote.ui, ...ui } });
        D.saveLocalState(app.state);
        D.saveBackupState(app.state);
        setSyncState("online", "KV geladen");
      } else {
        const seeded = await D.createStateFromSeedFiles(undefined, { ui });
        normalizeAndSetState(seeded.state);
        mergeSeedDocuments(seeded);
        queuePersist(true);
        setSyncState("syncing", "Startset");
        if (seeded.errors.length) showToast("Startset teilweise geladen", seeded.errors.map(item => `${item.source}: ${item.message}`).join(" · "), "warning", 6200);
      }
    } catch (error) {
      try {
        const local = D.readLocalState();
        normalizeAndSetState({ ...local, ui: { ...local.ui, ...ui } });
        setSyncState("error", navigator.onLine ? "Lokal" : "Offline");
        showToast("Lokaler Modus", error.message || "Cloudflare KV nicht erreichbar.", "warning", 5200);
      } catch {
        const seeded = await D.createStateFromSeedFiles(undefined, { ui }).catch(() => ({ state: D.createState(D.FALLBACK_PROMPTS, { ui }), documents: {}, errors: [] }));
        normalizeAndSetState(seeded.state);
        mergeSeedDocuments(seeded);
        setSyncState("error", "Fallback");
      }
    }
    await ensureDocumentsLoaded();
  };

  const applyGlobalUiState = () => {
    if (!app.state) return;
    app.els.app?.classList.toggle("is-compact", Boolean(app.state.ui.compact));
    if (app.els.app) {
      app.els.app.dataset.view = app.state.ui.view || "board";
      app.els.app.dataset.pointer = app.pointerMode;
    }
    if (app.els.searchInput && app.els.searchInput.value !== app.state.ui.query) app.els.searchInput.value = app.state.ui.query || "";
    $$(".rp-view-toggle button").forEach(button => {
      const active = button.dataset.view === (app.state.ui.view || "board");
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $$(".rp-filter-chip").forEach(button => {
      const active = button.dataset.filter === (app.state.ui.activeFilter || "all");
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };

  const renderMetrics = () => {
    const summary = D.buildLibrarySummary(app.state);
    app.els.librarySummary.textContent = summary.label;
    app.els.metricPrompts.textContent = summary.promptCount;
    app.els.metricFolders.textContent = summary.folderCount;
    app.els.metricFavorites.textContent = summary.favoriteCount;
  };

  const renderFolderSelect = () => {
    const select = app.els.editorFolder;
    if (!select) return;
    const currentValue = select.value;
    select.replaceChildren();
    app.state.folders.sort(D.sortByOrderTitle).forEach(folder => {
      const option = document.createElement("option");
      option.value = folder.id;
      option.textContent = folder.title;
      select.append(option);
    });
    if (currentValue && app.state.folders.some(folder => folder.id === currentValue)) select.value = currentValue;
  };

  const renderFolders = () => {
    const list = app.els.folderList;
    const template = app.els.folderItemTemplate;
    if (!list || !template) return;
    const stats = D.buildFolderStats(app.state);
    const activeId = app.state.ui.activeFolderId || D.VIRTUAL_FOLDER_ALL;
    const summary = D.buildLibrarySummary(app.state);
    const fragment = document.createDocumentFragment();
    const allButton = template.content.firstElementChild.cloneNode(true);
    allButton.dataset.folderId = D.VIRTUAL_FOLDER_ALL;
    allButton.classList.toggle("is-active", activeId === D.VIRTUAL_FOLDER_ALL);
    allButton.setAttribute("role", "button");
    allButton.setAttribute("tabindex", "0");
    allButton.setAttribute("aria-current", activeId === D.VIRTUAL_FOLDER_ALL ? "true" : "false");
    $("[data-folder-title]", allButton).textContent = "Alle Prompts";
    $("[data-folder-meta]", allButton).textContent = "Schnellzugriff";
    $("[data-folder-count]", allButton).textContent = summary.promptCount;
    const allIcon = $(".rp-folder-icon i", allButton);
    if (allIcon) allIcon.className = "fa-solid fa-border-all";
    const allGrip = $(".rp-folder-grip", allButton);
    if (allGrip) allGrip.style.visibility = "hidden";
    fragment.append(allButton);
    const favoriteButton = template.content.firstElementChild.cloneNode(true);
    favoriteButton.dataset.folderId = D.VIRTUAL_FOLDER_FAVORITES;
    favoriteButton.classList.toggle("is-active", activeId === D.VIRTUAL_FOLDER_FAVORITES);
    favoriteButton.setAttribute("role", "button");
    favoriteButton.setAttribute("tabindex", "0");
    favoriteButton.setAttribute("aria-current", activeId === D.VIRTUAL_FOLDER_FAVORITES ? "true" : "false");
    $("[data-folder-title]", favoriteButton).textContent = "Favoriten";
    $("[data-folder-meta]", favoriteButton).textContent = "Top-Prompts";
    $("[data-folder-count]", favoriteButton).textContent = summary.favoriteCount;
    const favIcon = $(".rp-folder-icon i", favoriteButton);
    if (favIcon) favIcon.className = "fa-solid fa-star";
    const favGrip = $(".rp-folder-grip", favoriteButton);
    if (favGrip) favGrip.style.visibility = "hidden";
    fragment.append(favoriteButton);
    stats.forEach(folder => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.folderId = folder.id;
      node.dataset.tone = folder.tone || "graphite";
      node.classList.toggle("is-active", activeId === folder.id);
      node.setAttribute("role", "button");
      node.setAttribute("tabindex", "0");
      node.setAttribute("aria-current", activeId === folder.id ? "true" : "false");
      $("[data-folder-title]", node).textContent = folder.title;
      $("[data-folder-meta]", node).textContent = folder.description || "Ordner";
      $("[data-folder-count]", node).textContent = folder.count;
      fragment.append(node);
    });
    list.replaceChildren(fragment);
  };

  const renderActiveContext = () => {
    const folder = currentFolder();
    app.els.currentFolderTitle.textContent = folder.title;
    app.els.currentFolderDescription.textContent = folder.description || "Buttons klicken, Platzhalter ausfüllen, Prompt direkt in die Zwischenablage kopieren.";
    const tokens = [];
    if (app.state.ui.activeFilter && app.state.ui.activeFilter !== "all") tokens.push({ label: `Filter: ${app.state.ui.activeFilter}`, icon: "fa-filter" });
    if (app.state.ui.query) tokens.push({ label: `Suche: ${app.state.ui.query}`, icon: "fa-magnifying-glass" });
    if (folder.id !== D.VIRTUAL_FOLDER_ALL) tokens.push({ label: folder.title, icon: folder.id === D.VIRTUAL_FOLDER_FAVORITES ? "fa-star" : "fa-folder" });
    const row = app.els.activeFilterRow;
    row.replaceChildren();
    if (!tokens.length) {
      row.hidden = true;
      return;
    }
    tokens.forEach(token => {
      const span = document.createElement("span");
      span.className = "rp-filter-token";
      span.innerHTML = `${icon(token.icon)}<span></span>`;
      $("span", span).textContent = token.label;
      row.append(span);
    });
    row.hidden = false;
  };

  const getPromptIconClass = prompt => {
    const text = `${prompt.title}\n${(prompt.tags || []).join(" ")}`.toLowerCase();
    if (prompt.profSchaefer) return "fa-file-medical";
    if (/staging|tnm/.test(text)) return "fa-diagram-project";
    if (/protokoll|sequenz|kontrast/.test(text)) return "fa-list-check";
    if (/übersicht|uebersicht|klassifikation|wissen/.test(text)) return "fa-book-medical";
    if (/korrektur|beurteilung/.test(text)) return "fa-pen-to-square";
    if (/bildinterpretation|dicom|bildanalyse/.test(text)) return "fa-eye";
    return D.hasPlaceholder(prompt.body) ? "fa-sliders" : "fa-copy";
  };

  const createPlaceholderControl = (prompt, placeholder) => {
    const kind = D.getPlaceholderKind ? D.getPlaceholderKind(placeholder) : D.isModalityPlaceholder(placeholder) ? "select" : "text";
    const template = kind === "select" ? app.els.placeholderSelectTemplate : app.els.placeholderInputTemplate;
    const node = template.content.firstElementChild.cloneNode(true);
    const label = $("[data-placeholder-label]", node);
    const input = $("[data-placeholder-input]", node);
    const memory = app.placeholderMemory.get(prompt.id) || {};
    const options = D.getPlaceholderOptions ? D.getPlaceholderOptions(placeholder) : D.isModalityPlaceholder(placeholder) ? D.MODALITY_OPTIONS : [];
    label.textContent = placeholder;
    input.dataset.placeholderName = placeholder;
    input.value = memory[placeholder] ?? prompt.placeholderDefaults?.[placeholder] ?? "";
    input.autocomplete = D.isModalityPlaceholder(placeholder) ? "off" : placeholder.toLowerCase().includes("thema") ? "off" : "on";
    if (kind === "select" && options.length) {
      const current = input.value;
      input.replaceChildren();
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Bitte wählen";
      input.append(empty);
      options.forEach(optionValue => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        input.append(option);
      });
      input.value = options.includes(current) ? current : "";
    }
    if (kind !== "select") input.placeholder = D.isTopicPlaceholder?.(placeholder) ? "Thema eingeben" : placeholder;
    const remember = () => {
      const values = app.placeholderMemory.get(prompt.id) || {};
      values[placeholder] = input.value;
      app.placeholderMemory.set(prompt.id, values);
    };
    on(input, "input", remember);
    on(input, "change", remember);
    on(input, "keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        remember();
        copyPrompt(prompt.id);
      }
      if (event.key === "Escape") input.blur();
    });
    return node;
  };

  const renderPromptCard = prompt => {
    const card = app.els.promptCardTemplate.content.firstElementChild.cloneNode(true);
    const placeholders = D.getPromptPlaceholders(prompt);
    card.dataset.promptId = prompt.id;
    card.dataset.folderId = prompt.folderId;
    card.dataset.tone = prompt.tone || "graphite";
    card.classList.toggle("is-special", placeholders.length > 0);
    card.classList.toggle("is-prof", Boolean(prompt.profSchaefer));
    if (app.focusAfterRender === prompt.id) card.classList.add("is-focused");
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${prompt.title} kopieren`);
    const titleNode = $("[data-prompt-title]", card);
    const metaNode = $("[data-prompt-meta]", card);
    if (titleNode) titleNode.textContent = prompt.title;
    const iconNode = $(".rp-card-icon i", card);
    if (iconNode) iconNode.className = `fa-solid ${getPromptIconClass(prompt)}`;
    const folder = D.getFolderById(app.state, prompt.folderId);
    const meta = [folder?.title || "Ordner"];
    if (prompt.favorite) meta.push("Favorit");
    if (placeholders.length) meta.push(`${placeholders.length} Felder`);
    if (prompt.profSchaefer) meta.push("Schäfer");
    if (metaNode) metaNode.textContent = meta.join(" · ");
    const favButton = $('[data-action="favorite"]', card);
    if (favButton) {
      favButton.classList.toggle("is-active", Boolean(prompt.favorite));
      favButton.setAttribute("aria-pressed", String(Boolean(prompt.favorite)));
      favButton.setAttribute("title", prompt.favorite ? "Favorit entfernen" : "Als Favorit markieren");
      const favIcon = $("i", favButton);
      if (favIcon) favIcon.className = prompt.favorite ? "fa-solid fa-star" : "fa-regular fa-star";
    }
    const expandButton = $('[data-action="expand"]', card);
    if (expandButton) expandButton.setAttribute("title", "Prompt bearbeiten");
    const copyButton = $('[data-action="copy"]', card);
    if (copyButton) copyButton.setAttribute("title", "Prompt kopieren");
    const zone = $("[data-placeholder-zone]", card);
    if (zone) placeholders.forEach(placeholder => zone.append(createPlaceholderControl(prompt, placeholder)));
    const badge = $("[data-prompt-badge]", card);
    if (badge) {
      if (prompt.profSchaefer) {
        badge.textContent = "Prof. Schäfer + CT/MRT";
        badge.dataset.kind = "prof";
      } else if (placeholders.length) {
        badge.textContent = `${placeholders.length} Platzhalter`;
        badge.dataset.kind = "special";
      } else {
        badge.textContent = "Direktkopie";
        badge.dataset.kind = "normal";
      }
    }
    on(card, "click", event => {
      const actionElement = event.target.closest("[data-action]");
      const action = actionElement?.dataset.action;
      if (action) {
        event.preventDefault();
        event.stopPropagation();
        if (action === "copy") copyPrompt(prompt.id);
        if (action === "favorite") toggleFavorite(prompt.id);
        if (action === "expand") openEditor(prompt.id);
        return;
      }
      if (isInteractive(event.target)) return;
      event.preventDefault();
      copyPrompt(prompt.id);
    });
    on(card, "keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && event.target === card) {
        event.preventDefault();
        copyPrompt(prompt.id);
      }
      if (event.key.toLowerCase() === "e" && event.target === card) {
        event.preventDefault();
        openEditor(prompt.id);
      }
      if (event.key.toLowerCase() === "f" && event.target === card) {
        event.preventDefault();
        toggleFavorite(prompt.id);
      }
    });
    return card;
  };

  const buildPromptRenderKey = prompts => JSON.stringify({
    ids: prompts.map(prompt => prompt.id),
    query: app.state.ui.query,
    folder: app.state.ui.activeFolderId,
    filter: app.state.ui.activeFilter,
    view: app.state.ui.view,
    compact: app.state.ui.compact,
    pointer: app.pointerMode,
    promptState: app.state.prompts.map(prompt => `${prompt.id}:${prompt.favorite}:${prompt.updatedAt}:${prompt.order}:${prompt.folderId}:${prompt.tone}:${prompt.profSchaefer}:${D.extractPlaceholders(prompt.body).join(",")}`).join("|")
  });

  const renderPrompts = () => {
    const prompts = D.filterPrompts(app.state, app.state.ui);
    const renderKey = buildPromptRenderKey(prompts);
    const grid = app.els.promptGrid;
    grid.classList.toggle("is-dense", app.state.ui.view === "dense");
    if (renderKey !== app.lastRenderKey) {
      const fragment = document.createDocumentFragment();
      prompts.forEach(prompt => fragment.append(renderPromptCard(prompt)));
      grid.replaceChildren(fragment);
      app.lastRenderKey = renderKey;
      app.lastPromptRenderIds = prompts.map(prompt => prompt.id);
      setupPromptSortable();
    } else {
      prompts.forEach(prompt => {
        const card = grid.querySelector(selectedPromptSelector(prompt.id));
        if (!card) return;
        const favButton = $('[data-action="favorite"]', card);
        if (!favButton) return;
        favButton.classList.toggle("is-active", Boolean(prompt.favorite));
        favButton.setAttribute("aria-pressed", String(Boolean(prompt.favorite)));
        const favIcon = $("i", favButton);
        if (favIcon) favIcon.className = prompt.favorite ? "fa-solid fa-star" : "fa-regular fa-star";
      });
    }
    app.els.emptyState.hidden = prompts.length > 0;
    if (app.focusAfterRender) {
      const target = grid.querySelector(selectedPromptSelector(app.focusAfterRender));
      if (target) {
        raf(() => {
          target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
          target.focus({ preventScroll: true });
          setTimeout(() => target.classList.remove("is-focused"), 1400);
        });
      }
      app.focusAfterRender = "";
    }
  };

  const renderFavorites = () => {
    const rail = app.els.favoriteRail;
    const template = app.els.favoriteButtonTemplate;
    if (!rail || !template) return;
    const fragment = document.createDocumentFragment();
    D.getFavoritePrompts(app.state).forEach(prompt => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.promptId = prompt.id;
      node.setAttribute("aria-label", `${prompt.title} kopieren`);
      const title = $("[data-favorite-title]", node);
      if (title) title.textContent = prompt.title;
      on(node, "click", event => {
        event.preventDefault();
        if (event.altKey || event.ctrlKey || event.metaKey) openEditor(prompt.id);
        else copyPrompt(prompt.id);
      });
      on(node, "keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          copyPrompt(prompt.id);
        }
      });
      fragment.append(node);
    });
    rail.replaceChildren(fragment);
    setupFavoriteSortable();
  };

  const renderEditorIfOpen = () => {
    const selectedId = app.state.ui.selectedPromptId;
    const prompt = selectedId ? D.getPromptById(app.state, selectedId) : null;
    if (!prompt || app.els.detailDrawer.getAttribute("aria-hidden") !== "false") return;
    fillEditor(prompt);
  };

  const render = ({ preserveEditor = true } = {}) => {
    if (!app.state) return;
    applyGlobalUiState();
    renderMetrics();
    renderFolderSelect();
    renderFolders();
    renderActiveContext();
    renderFavorites();
    renderPrompts();
    if (preserveEditor) renderEditorIfOpen();
    setupFolderSortable();
  };

  const fillEditor = prompt => {
    app.els.drawerTitle.textContent = prompt.title || "Prompt bearbeiten";
    app.els.editorPromptId.value = prompt.id;
    app.els.editorTitle.value = prompt.title;
    app.els.editorFolder.value = prompt.folderId;
    app.els.editorTone.value = prompt.tone || "graphite";
    app.els.editorFavorite.checked = Boolean(prompt.favorite);
    app.els.editorProfSchaefer.checked = Boolean(prompt.profSchaefer);
    app.els.editorBody.value = prompt.body;
    autoGrowTextarea(app.els.editorBody);
    renderEditorPlaceholderChips();
  };

  const openEditor = promptId => {
    const prompt = D.getPromptById(app.state, promptId);
    if (!prompt) return;
    app.state.ui.drawerOpen = true;
    app.state.ui.selectedPromptId = promptId;
    fillEditor(prompt);
    app.els.detailDrawer.setAttribute("aria-hidden", "false");
    saveUi();
    raf(() => app.els.editorTitle.focus({ preventScroll: true }));
  };

  const closeEditor = () => {
    app.state.ui.drawerOpen = false;
    app.state.ui.selectedPromptId = "";
    app.els.detailDrawer.setAttribute("aria-hidden", "true");
    saveUi();
  };

  const editorToPrompt = () => {
    const existing = D.getPromptById(app.state, app.els.editorPromptId.value);
    const body = D.collapseWhitespace(app.els.editorBody.value);
    const title = D.normalizeTitle(app.els.editorTitle.value);
    const prompt = {
      ...(existing || {}),
      id: app.els.editorPromptId.value || D.uid("prompt"),
      title,
      body,
      folderId: app.els.editorFolder.value,
      tone: app.els.editorTone.value,
      favorite: app.els.editorFavorite.checked,
      profSchaefer: app.els.editorProfSchaefer.checked || D.isProfSchaeferPrompt(title, body),
      placeholderDefaults: existing?.placeholderDefaults || {},
      tags: D.inferTags(title, body),
      createdAt: existing?.createdAt || D.nowIso(),
      updatedAt: D.nowIso(),
      order: Number.isFinite(Number(existing?.order)) ? Number(existing.order) : app.state.prompts.length
    };
    return prompt;
  };

  const saveEditor = () => {
    const prompt = editorToPrompt();
    if (!prompt.title || !prompt.body) {
      showToast("Unvollständiger Prompt", "Name und Prompttext müssen ausgefüllt sein.", "warning");
      return false;
    }
    app.state = D.upsertPrompt(app.state, prompt);
    app.state.ui.selectedPromptId = prompt.id;
    app.focusAfterRender = prompt.id;
    app.lastRenderKey = "";
    queuePersist(true);
    render({ preserveEditor: false });
    openEditor(prompt.id);
    showToast("Prompt gespeichert", prompt.title, "success");
    return true;
  };

  const renderEditorPlaceholderChips = () => {
    const container = app.els.editorPlaceholderChips;
    if (!container) return;
    const placeholders = D.extractPlaceholders(app.els.editorBody.value);
    container.replaceChildren();
    placeholders.forEach(name => {
      const chip = document.createElement("span");
      chip.className = "rp-placeholder-chip";
      chip.dataset.placeholder = name;
      chip.textContent = D.isModalityPlaceholder(name) ? `${name}: Dropdown` : name;
      container.append(chip);
    });
  };

  const createPrompt = () => {
    const prompt = D.createNewPrompt(app.state, app.state.ui.activeFolderId);
    app.state = D.upsertPrompt(app.state, prompt);
    app.state.ui.selectedPromptId = prompt.id;
    app.focusAfterRender = prompt.id;
    app.lastRenderKey = "";
    queuePersist(true);
    render({ preserveEditor: false });
    openEditor(prompt.id);
    showToast("Prompt angelegt", "Neues Template im aktuellen Ordner.", "success");
  };

  const deleteCurrentPrompt = () => {
    const id = app.els.editorPromptId.value;
    const prompt = D.getPromptById(app.state, id);
    if (!prompt) return;
    if (!confirm(`Prompt wirklich löschen?\n\n${prompt.title}`)) return;
    app.state = D.removePrompt(app.state, id);
    closeEditor();
    app.lastRenderKey = "";
    queuePersist(true);
    render({ preserveEditor: false });
    showToast("Prompt gelöscht", prompt.title, "success");
  };

  const toggleFavorite = promptId => {
    rememberCardValues(promptId);
    const before = D.getPromptById(app.state, promptId);
    app.state = D.toggleFavorite(app.state, promptId);
    app.lastRenderKey = "";
    queuePersist(true);
    render();
    const after = D.getPromptById(app.state, promptId);
    if (before && after) showToast(after.favorite ? "Favorit markiert" : "Favorit entfernt", before.title, "success", 2200);
  };

  const missingPlaceholderFocus = (promptId, missing) => {
    const card = app.els.promptGrid.querySelector(selectedPromptSelector(promptId));
    if (!card) return;
    const first = missing.map(name => card.querySelector(`[data-placeholder-name="${cssEscape(name)}"]`)).find(Boolean);
    if (first) {
      first.focus({ preventScroll: true });
      first.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  };

  const copyText = async text => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand("copy");
    textarea.remove();
    if (!ok) throw new Error("Clipboard-API nicht verfügbar");
    return true;
  };

  const copyPrompt = async (promptId, explicitValues = null) => {
    if (app.copyLock.has(promptId)) return;
    const prompt = D.getPromptById(app.state, promptId);
    if (!prompt) return;
    app.copyLock.add(promptId);
    rememberCardValues(promptId);
    if (prompt.profSchaefer) await ensureDocumentsLoaded();
    const values = explicitValues || getKnownPlaceholderValues(prompt);
    const validation = D.validatePlaceholderValues ? D.validatePlaceholderValues(prompt, values) : { valid: true, missing: [], invalid: [] };
    if (!validation.valid) {
      app.copyLock.delete(promptId);
      const missing = [...validation.missing, ...validation.invalid];
      missingPlaceholderFocus(promptId, missing);
      const invalidText = validation.invalid.length ? ` Ungültig: ${validation.invalid.join(", ")}.` : "";
      showToast("Platzhalter prüfen", `${validation.missing.length ? `Offen: ${validation.missing.join(", ")}.` : ""}${invalidText}`, "warning", 5200);
      return;
    }
    const payload = D.createClipboardPayload(prompt, values, app.documents);
    if (payload.missing.length) {
      app.copyLock.delete(promptId);
      missingPlaceholderFocus(promptId, payload.missing);
      showToast("Platzhalter offen", payload.missing.join(", "), "warning", 4200);
      return;
    }
    if (!payload.text) {
      app.copyLock.delete(promptId);
      showToast("Kein Prompttext", "Der Prompt enthält keinen kopierbaren Inhalt.", "warning");
      return;
    }
    try {
      await copyText(payload.text);
      const card = app.els.promptGrid.querySelector(selectedPromptSelector(promptId));
      if (card) {
        card.classList.remove("is-copying");
        void card.offsetWidth;
        card.classList.add("is-copying");
      }
      const extra = prompt.profSchaefer ? [payload.includesProfCt ? "CT-Beispiele" : "", payload.includesProfMrt ? "MRT-Beispiele" : ""].filter(Boolean).join(" + ") : "";
      showToast("Prompt kopiert", extra ? `${prompt.title} · inkl. ${extra}` : prompt.title, "success", 2800);
    } catch (error) {
      showToast("Kopieren fehlgeschlagen", error.message || "Zwischenablage nicht erreichbar.", "error", 5200);
    } finally {
      setTimeout(() => app.copyLock.delete(promptId), 300);
    }
  };

  const copyFromEditor = async () => {
    const prompt = editorToPrompt();
    if (prompt.profSchaefer) await ensureDocumentsLoaded();
    const values = {};
    D.extractPlaceholders(prompt.body).forEach(name => {
      values[name] = prompt.placeholderDefaults?.[name] || "";
    });
    const payload = D.createClipboardPayload(prompt, values, app.documents, { keepUnfilled: true });
    try {
      await copyText(payload.text);
      showToast("Editor-Prompt kopiert", prompt.title, "success");
    } catch (error) {
      showToast("Kopieren fehlgeschlagen", error.message || "Zwischenablage nicht erreichbar.", "error");
    }
  };

  const openFolderDialog = (folder = null) => {
    app.els.folderDialogTitle.textContent = folder ? "Ordner bearbeiten" : "Ordner anlegen";
    app.els.folderIdInput.value = folder?.id || "";
    app.els.folderNameInput.value = folder?.title || "";
    app.els.folderDescriptionInput.value = folder?.description || "";
    openDialog(app.els.folderDialog, app.els.folderNameInput);
  };

  const saveFolderDialog = () => {
    const id = app.els.folderIdInput.value;
    const title = D.normalizeTitle(app.els.folderNameInput.value);
    const description = D.normalizeTitle(app.els.folderDescriptionInput.value);
    if (!title) {
      showToast("Ordner ohne Namen", "Bitte einen Ordnernamen eintragen.", "warning");
      return false;
    }
    const existing = id ? D.getFolderById(app.state, id) : null;
    const folder = existing ? { ...existing, title, description, updatedAt: D.nowIso() } : D.createNewFolder(title, description, app.state.folders.length);
    app.state = D.upsertFolder(app.state, folder);
    app.state.ui.activeFolderId = folder.id;
    app.lastRenderKey = "";
    queuePersist(true);
    closeDialog(app.els.folderDialog);
    render();
    showToast(existing ? "Ordner aktualisiert" : "Ordner angelegt", folder.title, "success");
    return true;
  };

  const setActiveFolder = folderId => {
    app.state.ui.activeFolderId = folderId || D.VIRTUAL_FOLDER_ALL;
    if (folderId === D.VIRTUAL_FOLDER_FAVORITES) app.state.ui.activeFilter = "all";
    queuePersist(false);
    render();
  };

  const setActiveFilter = filter => {
    app.state.ui.activeFilter = D.VALID_FILTERS.has(filter) ? filter : "all";
    queuePersist(false);
    render();
  };

  const clearFilters = () => {
    app.state.ui.activeFilter = "all";
    app.state.ui.query = "";
    if (app.els.searchInput) app.els.searchInput.value = "";
    queuePersist(false);
    render();
  };

  const exportState = async () => {
    const json = D.serializeState(app.state);
    try {
      await copyText(json);
      D.downloadJson(json, D.safeFileName("radprompt-export"));
      showToast("Export erstellt", "JSON wurde kopiert und als Datei heruntergeladen.", "success", 4200);
    } catch {
      D.downloadJson(json, D.safeFileName("radprompt-export"));
      showToast("Export erstellt", "JSON-Datei wurde heruntergeladen.", "success", 3600);
    }
  };

  const openImport = () => {
    app.els.importTextarea.value = "";
    openDialog(app.els.importDialog, app.els.importTextarea);
  };

  const importState = () => {
    const imported = D.parseImportedState(app.els.importTextarea.value);
    if (!imported) {
      showToast("Import fehlgeschlagen", "Ungültiges JSON oder inkompatibles Format.", "error", 5200);
      return false;
    }
    const validation = D.validateState(imported);
    if (!validation.ok) {
      showToast("Import nicht valide", validation.errors.join(" · "), "error", 6200);
      return false;
    }
    normalizeAndSetState(imported);
    app.lastRenderKey = "";
    queuePersist(true);
    closeDialog(app.els.importDialog);
    render({ preserveEditor: false });
    showToast("Import abgeschlossen", validation.metrics.label, "success", 4200);
    return true;
  };

  const reloadSeed = async () => {
    setSyncState("syncing", "Startset");
    try {
      const seeded = await D.createStateFromSeedFiles(undefined, { ui: app.state.ui });
      const keepUi = app.state.ui;
      normalizeAndSetState({ ...seeded.state, ui: keepUi });
      mergeSeedDocuments(seeded);
      app.lastRenderKey = "";
      queuePersist(true);
      render({ preserveEditor: false });
      closeDialog(app.els.appMenuDialog);
      showToast("Startset geladen", D.buildLibrarySummary(app.state).label, seeded.errors.length ? "warning" : "success", seeded.errors.length ? 6200 : 3600);
      if (seeded.errors.length) showToast("Hinweise", seeded.errors.map(item => `${item.source}: ${item.message}`).join(" · "), "warning", 6800);
    } catch (error) {
      setSyncState("error", navigator.onLine ? "Lokal" : "Offline");
      showToast("Startset fehlgeschlagen", error.message || "Dateien nicht lesbar.", "error", 6200);
    }
  };

  const runHealthCheck = async () => {
    setSyncState("syncing", "Prüfe KV");
    try {
      const response = await fetch(D.KV_HEALTH_ENDPOINT, { headers: { "Accept": "application/json" }, cache: "no-cache" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      setSyncState(payload.kv ? "online" : "error", payload.kv ? "KV ok" : "KV fehlt");
      showToast(payload.kv ? "KV-Binding aktiv" : "KV-Binding fehlt", payload.message || JSON.stringify(payload), payload.kv ? "success" : "warning", 5200);
    } catch (error) {
      setSyncState("error", "KV Fehler");
      showToast("Health-Check fehlgeschlagen", error.message || "API nicht erreichbar.", "error", 5200);
    }
  };

  const resetLocal = () => {
    if (!confirm("Lokalen RadPrompt-Cache wirklich löschen? Der KV-Stand bleibt unverändert.")) return;
    D.clearLocalState();
    showToast("Lokaler Cache gelöscht", "Seite wird neu geladen.", "success");
    setTimeout(() => location.reload(), 600);
  };

  const toggleCompact = () => {
    app.state.ui.compact = !app.state.ui.compact;
    queuePersist(false);
    render();
  };

  const setView = view => {
    if (!D.VALID_VIEWS.has(view)) return;
    app.state.ui.view = view;
    queuePersist(false);
    app.lastRenderKey = "";
    render();
  };

  const handleInstall = async () => {
    if (app.deferredInstallPrompt) {
      app.deferredInstallPrompt.prompt();
      const result = await app.deferredInstallPrompt.userChoice.catch(() => null);
      app.deferredInstallPrompt = null;
      showToast("Installation", result?.outcome === "accepted" ? "RadPrompt wird installiert." : "Installation abgebrochen.", result?.outcome === "accepted" ? "success" : "info");
      return;
    }
    showToast("Installation", "Im Browsermenü „App installieren“ oder „An Taskleiste anheften“ verwenden.", "info", 5200);
  };

  const renderCommandList = (query = "") => {
    const list = app.els.commandList;
    const template = app.els.commandItemTemplate;
    if (!list || !template) return;
    const promptCommands = app.state.prompts.filter(prompt => !prompt.archived).map(prompt => ({
      id: `prompt-${prompt.id}`,
      title: prompt.title,
      description: `Prompt kopieren · ${D.getFolderById(app.state, prompt.folderId)?.title || "Ordner"}`,
      icon: getPromptIconClass(prompt),
      key: "↵",
      action: "copyPrompt",
      promptId: prompt.id
    }));
    const commands = [...D.COMMANDS, ...promptCommands].filter(item => {
      if (!query) return true;
      return D.promptMatchesQuery({ title: item.title, body: item.description, tags: [item.action] }, query);
    }).slice(0, 90);
    app.commandItems = commands;
    app.activeCommandIndex = commands.length ? 0 : -1;
    const fragment = document.createDocumentFragment();
    commands.forEach((command, index) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.commandId = command.id;
      node.classList.toggle("is-active", index === app.activeCommandIndex);
      const commandIcon = $(".rp-command-icon i", node);
      if (commandIcon) commandIcon.className = `fa-solid ${command.icon || "fa-bolt"}`;
      $("[data-command-title]", node).textContent = command.title;
      $("[data-command-description]", node).textContent = command.description;
      $("[data-command-key]", node).textContent = command.key || "";
      on(node, "click", () => executeCommand(command));
      fragment.append(node);
    });
    list.replaceChildren(fragment);
  };

  const openCommand = () => {
    renderCommandList("");
    app.els.commandSearchInput.value = "";
    openDialog(app.els.commandDialog, app.els.commandSearchInput);
  };

  const setActiveCommand = index => {
    const count = app.commandItems.length;
    if (!count) {
      app.activeCommandIndex = -1;
      return;
    }
    app.activeCommandIndex = ((index % count) + count) % count;
    $$(".rp-command-item", app.els.commandList).forEach((node, idx) => node.classList.toggle("is-active", idx === app.activeCommandIndex));
    const active = $$(".rp-command-item", app.els.commandList)[app.activeCommandIndex];
    if (active) active.scrollIntoView({ block: "nearest" });
  };

  const executeCommand = command => {
    if (!command) return;
    closeDialog(app.els.commandDialog);
    const actions = {
      newPrompt: createPrompt,
      newFolder: () => openFolderDialog(),
      sync: () => syncState({ force: true }),
      import: openImport,
      export: exportState,
      seed: reloadSeed,
      compact: toggleCompact,
      health: runHealthCheck,
      copyPrompt: () => copyPrompt(command.promptId)
    };
    const fn = actions[command.action];
    if (fn) fn();
  };

  const destroySortable = key => {
    const sortable = app.sortables.get(key);
    if (sortable) {
      try {
        sortable.destroy();
      } catch {
        app.sortables.delete(key);
      }
    }
    app.sortables.delete(key);
  };

  const setupFolderSortable = () => {
    if (!globalThis.Sortable || !app.els.folderList || app.sortables.has("folders")) return;
    const sortable = Sortable.create(app.els.folderList, {
      animation: 180,
      draggable: ".rp-folder-item[data-folder-id]:not([data-folder-id='all']):not([data-folder-id='favorites'])",
      handle: ".rp-folder-grip",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      forceFallback: app.pointerMode === "coarse",
      fallbackTolerance: 6,
      touchStartThreshold: 4,
      onStart: () => document.body.classList.add("rp-is-sorting"),
      onEnd: () => {
        document.body.classList.remove("rp-is-sorting");
        const ids = $$(".rp-folder-item", app.els.folderList).map(node => node.dataset.folderId).filter(id => id && id !== D.VIRTUAL_FOLDER_ALL && id !== D.VIRTUAL_FOLDER_FAVORITES);
        app.state = D.applyFolderOrder(app.state, ids);
        app.lastRenderKey = "";
        queuePersist(true);
        render();
      }
    });
    app.sortables.set("folders", sortable);
  };

  const setupPromptSortable = () => {
    if (!globalThis.Sortable || !app.els.promptGrid) return;
    destroySortable("prompts");
    const sortable = Sortable.create(app.els.promptGrid, {
      animation: 190,
      draggable: ".rp-prompt-card",
      handle: ".rp-card-icon, .rp-card-title-wrap",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      forceFallback: app.pointerMode === "coarse",
      fallbackTolerance: 7,
      touchStartThreshold: 5,
      onStart: () => document.body.classList.add("rp-is-sorting"),
      onEnd: () => {
        document.body.classList.remove("rp-is-sorting");
        const ids = $$(".rp-prompt-card", app.els.promptGrid).map(node => node.dataset.promptId).filter(Boolean);
        const folderId = app.state.ui.activeFolderId;
        app.state = D.applyPromptOrder(app.state, ids, folderId);
        app.lastRenderKey = "";
        queuePersist(true);
        render();
      }
    });
    app.sortables.set("prompts", sortable);
  };

  const setupFavoriteSortable = () => {
    if (!globalThis.Sortable || !app.els.favoriteRail) return;
    destroySortable("favorites");
    const sortable = Sortable.create(app.els.favoriteRail, {
      animation: 180,
      draggable: ".rp-favorite-button",
      handle: ".rp-favorite-grip",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      direction: "horizontal",
      forceFallback: app.pointerMode === "coarse",
      fallbackTolerance: 7,
      touchStartThreshold: 5,
      onStart: () => document.body.classList.add("rp-is-sorting"),
      onEnd: () => {
        document.body.classList.remove("rp-is-sorting");
        const ids = $$(".rp-favorite-button", app.els.favoriteRail).map(node => node.dataset.promptId).filter(Boolean);
        app.state = D.applyFavoriteOrder(app.state, ids);
        queuePersist(true);
        render();
      }
    });
    app.sortables.set("favorites", sortable);
  };

  const autoGrowTextarea = textarea => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 260), Math.round(window.innerHeight * .72))}px`;
  };

  const bindEvents = () => {
    on(app.els.newPromptButton, "click", createPrompt);
    on(app.els.emptyNewPromptButton, "click", createPrompt);
    on(app.els.newFolderButton, "click", () => openFolderDialog());
    on(app.els.forceSyncButton, "click", () => syncState({ force: true }));
    on(app.els.openCommandButton, "click", openCommand);
    on(app.els.toggleCompactButton, "click", toggleCompact);
    on(app.els.clearFiltersButton, "click", clearFilters);
    on(app.els.importButton, "click", openImport);
    on(app.els.exportButton, "click", exportState);
    on(app.els.manageFavoritesButton, "click", () => {
      document.body.classList.toggle("rp-is-sorting");
      showToast("Favoriten-Bar", "Favoriten per Drag & Drop sortieren.", "info", 2400);
      setTimeout(() => document.body.classList.remove("rp-is-sorting"), 2800);
    });
    on(app.els.closeDrawerButton, "click", closeEditor);
    on(app.els.refreshPlaceholdersButton, "click", renderEditorPlaceholderChips);
    on(app.els.deletePromptButton, "click", deleteCurrentPrompt);
    on(app.els.copyFromEditorButton, "click", copyFromEditor);
    on(app.els.editorBody, "input", D.debounce(event => {
      autoGrowTextarea(event.target);
      renderEditorPlaceholderChips();
    }, 80));
    on(app.els.promptEditorForm, "submit", event => {
      event.preventDefault();
      saveEditor();
    });
    on(app.els.folderForm, "submit", event => {
      event.preventDefault();
      if (event.submitter?.value === "cancel") {
        closeDialog(app.els.folderDialog);
        return;
      }
      saveFolderDialog();
    });
    on(app.els.importForm, "submit", event => {
      event.preventDefault();
      if (event.submitter?.value === "cancel") {
        closeDialog(app.els.importDialog);
        return;
      }
      importState();
    });
    on(app.els.closeCommandButton, "click", () => closeDialog(app.els.commandDialog));
    on(app.els.commandSearchInput, "input", event => renderCommandList(event.target.value));
    on(app.els.commandSearchInput, "keydown", event => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveCommand(app.activeCommandIndex + 1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveCommand(app.activeCommandIndex - 1);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        executeCommand(app.commandItems[app.activeCommandIndex]);
      }
      if (event.key === "Escape") closeDialog(app.els.commandDialog);
    });
    on(app.els.appMenuButton, "click", () => openDialog(app.els.appMenuDialog));
    on(app.els.closeAppMenuButton, "click", () => closeDialog(app.els.appMenuDialog));
    on(app.els.menuSeedButton, "click", reloadSeed);
    on(app.els.menuHealthButton, "click", runHealthCheck);
    on(app.els.menuResetLocalButton, "click", resetLocal);
    on(app.els.menuInstallButton, "click", handleInstall);
    on(app.els.folderList, "click", event => {
      const item = event.target.closest(".rp-folder-item");
      if (!item) return;
      setActiveFolder(item.dataset.folderId);
    });
    on(app.els.folderList, "keydown", event => {
      const item = event.target.closest(".rp-folder-item");
      if (!item) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setActiveFolder(item.dataset.folderId);
      }
    });
    on(app.els.folderList, "dblclick", event => {
      const item = event.target.closest(".rp-folder-item");
      const id = item?.dataset.folderId;
      if (!id || id === D.VIRTUAL_FOLDER_ALL || id === D.VIRTUAL_FOLDER_FAVORITES) return;
      const folder = D.getFolderById(app.state, id);
      if (folder) openFolderDialog(folder);
    });
    $$(".rp-filter-chip").forEach(button => on(button, "click", () => setActiveFilter(button.dataset.filter)));
    $$(".rp-view-toggle button").forEach(button => on(button, "click", () => setView(button.dataset.view)));
    on(app.els.searchInput, "input", D.debounce(event => {
      app.state.ui.query = event.target.value;
      queuePersist(false);
      render();
    }, 110));
    on(document, "keydown", event => {
      const active = document.activeElement;
      const typing = active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommand();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createPrompt();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (app.els.detailDrawer.getAttribute("aria-hidden") === "false") saveEditor();
        else syncState({ force: true });
        return;
      }
      if (!typing && event.key === "/") {
        event.preventDefault();
        app.els.searchInput.focus({ preventScroll: true });
        return;
      }
      if (event.key === "Escape") {
        if (isDialogOpen(app.els.commandDialog)) closeDialog(app.els.commandDialog);
        else if (isDialogOpen(app.els.appMenuDialog)) closeDialog(app.els.appMenuDialog);
        else if (isDialogOpen(app.els.importDialog)) closeDialog(app.els.importDialog);
        else if (isDialogOpen(app.els.folderDialog)) closeDialog(app.els.folderDialog);
        else if (!typing && app.els.detailDrawer.getAttribute("aria-hidden") === "false") closeEditor();
      }
    });
    on(window, "beforeinstallprompt", event => {
      event.preventDefault();
      app.deferredInstallPrompt = event;
      if (app.els.menuInstallButton) app.els.menuInstallButton.disabled = false;
    });
    on(window, "online", () => {
      setSyncState("syncing", "Online");
      syncState({ silent: true });
    });
    on(window, "offline", () => setSyncState("error", "Offline"));
    on(window, "resize", D.throttle(() => {
      app.pointerMode = matchMedia("(pointer: coarse)").matches ? "coarse" : "fine";
      if (app.els.editorBody) autoGrowTextarea(app.els.editorBody);
      render();
    }, 260));
    on(document, "visibilitychange", () => {
      if (document.visibilityState === "hidden" && app.state) {
        D.saveLocalState(app.state);
        D.saveBackupState(app.state);
      }
    });
  };

  const restoreDrawer = () => {
    if (!app.state.ui.drawerOpen || !app.state.ui.selectedPromptId) return;
    if (!D.getPromptById(app.state, app.state.ui.selectedPromptId)) return;
    openEditor(app.state.ui.selectedPromptId);
  };

  const init = async () => {
    bindElements();
    requireElements();
    createLiveRegion();
    bindEvents();
    setBootState("booting");
    await loadInitialState();
    render({ preserveEditor: false });
    restoreDrawer();
    setBootState("ready");
    app.initialised = true;
    if (!navigator.onLine) setSyncState("error", "Offline");
    if (app.state && !app.syncBusy) setTimeout(() => syncState({ silent: true }), 900);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init().catch(error => {
        setBootState("error");
        setSyncState("error", "Fehler");
        showToast("RadPrompt Startfehler", error.message || "Unbekannter Fehler.", "error", 0);
      });
    }, { once: true });
  } else {
    init().catch(error => {
      setBootState("error");
      setSyncState("error", "Fehler");
      showToast("RadPrompt Startfehler", error.message || "Unbekannter Fehler.", "error", 0);
    });
  }
})();