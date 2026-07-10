(() => {
  "use strict";

  const API_URL = "/api/state";
  const LOCAL_STATE_KEY = "radprompt.shared.v2";
  const PREF_KEY = "radprompt.preferences.v2";
  const DRAFT_KEY = "radprompt.field-drafts.v2";
  const LEGACY_LOCAL_KEY = "radprompt.local.v1";
  const CLIENT_KEY = "radprompt.client-id";
  const MIN_WRITE_INTERVAL = 1350;
  const seed = structuredClone(window.RADPROMPT_SEED || {});

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clone = value => structuredClone(value);
  const nowIso = () => new Date().toISOString();
  const timeValue = value => Number.isFinite(Date.parse(value || "")) ? Date.parse(value) : 0;
  const uid = prefix => `${prefix}-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const normalizeText = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de");

  const clientId = localStorage.getItem(CLIENT_KEY) || uid("client");
  localStorage.setItem(CLIENT_KEY, clientId);

  let state = normalizeState(loadJson(LOCAL_STATE_KEY) || seed);
  let preferences = {
    activeView: "all",
    currentFolderId: null,
    layout: "grid",
    effects: true,
    animations: true,
    widgetMode: false,
    ...loadJson(PREF_KEY)
  };
  let fieldDrafts = loadJson(DRAFT_KEY, sessionStorage) || {};
  let searchQuery = "";
  let syncTimer = 0;
  let syncInFlight = false;
  let syncQueued = false;
  let dirty = false;
  let lastWriteAt = 0;
  let activeMenu = null;
  let returnFocus = null;
  let commandItems = [];
  let commandIndex = 0;
  let installPrompt = null;
  let dragSession = null;
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("radprompt-state-v2") : null;

  function loadJson(key, storage = localStorage) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveJson(key, value, storage = localStorage) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function normalizeState(input) {
    const source = input && typeof input === "object" ? clone(input) : clone(seed);
    const timestamp = source.updatedAt || nowIso();
    source.schemaVersion = 2;
    source.revision = Number(source.revision) || 0;
    source.updatedAt = timestamp;
    source.folders = Array.isArray(source.folders) ? source.folders : [];
    source.prompts = Array.isArray(source.prompts) ? source.prompts : [];
    source.tombstones = source.tombstones && typeof source.tombstones === "object" ? source.tombstones : {};
    source.tombstones.folders = source.tombstones.folders && typeof source.tombstones.folders === "object" ? source.tombstones.folders : {};
    source.tombstones.prompts = source.tombstones.prompts && typeof source.tombstones.prompts === "object" ? source.tombstones.prompts : {};
    source.resources = source.resources && typeof source.resources === "object" ? source.resources : {};
    source.resources.schaeferCT ||= seed.resources?.schaeferCT || "";
    source.resources.schaeferMRT ||= seed.resources?.schaeferMRT || "";

    source.folders = source.folders.filter(item => item && item.id && item.name).map((folder, index) => ({
      id: String(folder.id),
      name: String(folder.name).trim() || "Unbenannter Ordner",
      parentId: folder.parentId && folder.parentId !== folder.id ? String(folder.parentId) : null,
      order: Number.isFinite(Number(folder.order)) ? Number(folder.order) : index,
      createdAt: folder.createdAt || timestamp,
      updatedAt: folder.updatedAt || timestamp
    }));
    source.prompts = source.prompts.filter(item => item && item.id).map((prompt, index) => ({
      id: String(prompt.id),
      title: String(prompt.title || "Unbenannter Prompt").trim() || "Unbenannter Prompt",
      content: String(prompt.content || ""),
      folderId: prompt.folderId ? String(prompt.folderId) : null,
      favorite: Boolean(prompt.favorite),
      includeSchaeferExamples: Boolean(prompt.includeSchaeferExamples),
      order: Number.isFinite(Number(prompt.order)) ? Number(prompt.order) : index,
      createdAt: prompt.createdAt || timestamp,
      updatedAt: prompt.updatedAt || timestamp
    }));

    const folderIds = new Set(source.folders.map(folder => folder.id));
    source.folders.forEach(folder => { if (folder.parentId && !folderIds.has(folder.parentId)) folder.parentId = null; });
    source.prompts.forEach(prompt => { if (prompt.folderId && !folderIds.has(prompt.folderId)) prompt.folderId = null; });
    breakFolderCycles(source.folders);
    return source;
  }

  function breakFolderCycles(folders) {
    const map = new Map(folders.map(folder => [folder.id, folder]));
    folders.forEach(folder => {
      const seen = new Set([folder.id]);
      let parent = folder.parentId;
      while (parent) {
        if (seen.has(parent)) {
          folder.parentId = null;
          return;
        }
        seen.add(parent);
        parent = map.get(parent)?.parentId || null;
      }
    });
  }

  function mergeTombstones(a = {}, b = {}) {
    const output = {...a};
    Object.entries(b).forEach(([id, stamp]) => {
      if (timeValue(stamp) > timeValue(output[id])) output[id] = stamp;
    });
    return output;
  }

  function mergeCollection(localItems, remoteItems, tombstones) {
    const merged = new Map();
    [...localItems, ...remoteItems].forEach(item => {
      const existing = merged.get(item.id);
      if (!existing || timeValue(item.updatedAt) >= timeValue(existing.updatedAt)) merged.set(item.id, clone(item));
    });
    return Array.from(merged.values()).filter(item => timeValue(tombstones[item.id]) < timeValue(item.updatedAt));
  }

  function mergeStates(localState, remoteState) {
    const local = normalizeState(localState);
    const remote = normalizeState(remoteState);
    const tombstones = {
      folders: mergeTombstones(local.tombstones.folders, remote.tombstones.folders),
      prompts: mergeTombstones(local.tombstones.prompts, remote.tombstones.prompts)
    };
    const merged = normalizeState({
      schemaVersion: 2,
      revision: Math.max(local.revision, remote.revision),
      updatedAt: timeValue(local.updatedAt) >= timeValue(remote.updatedAt) ? local.updatedAt : remote.updatedAt,
      folders: mergeCollection(local.folders, remote.folders, tombstones.folders),
      prompts: mergeCollection(local.prompts, remote.prompts, tombstones.prompts),
      tombstones,
      resources: {
        schaeferCT: (remote.resources.schaeferCT || "").length >= (local.resources.schaeferCT || "").length ? remote.resources.schaeferCT : local.resources.schaeferCT,
        schaeferMRT: (remote.resources.schaeferMRT || "").length >= (local.resources.schaeferMRT || "").length ? remote.resources.schaeferMRT : local.resources.schaeferMRT
      }
    });
    return merged;
  }

  function statesEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function persistLocal({broadcast = true} = {}) {
    saveJson(LOCAL_STATE_KEY, state);
    if (broadcast) channel?.postMessage({type: "state", source: clientId, state});
  }

  function savePreferences() {
    saveJson(PREF_KEY, preferences);
    applyPreferences();
  }

  function saveDrafts() {
    saveJson(DRAFT_KEY, fieldDrafts, sessionStorage);
  }

  function touchState() {
    state.updatedAt = nowIso();
    dirty = true;
    persistLocal();
    scheduleSync();
  }

  function touchItem(item) {
    item.updatedAt = nowIso();
    touchState();
  }

  function setSyncStatus(mode, headline, detail) {
    const element = $("#syncStatus");
    element.dataset.state = mode;
    $(".sync-copy strong", element).textContent = headline;
    $(".sync-copy small", element).textContent = detail;
  }

  function showBanner(message = "") {
    const banner = $("#syncBanner");
    banner.hidden = !message;
    banner.textContent = message;
  }

  async function loadRemote() {
    render();
    setSyncStatus("syncing", "Synchronisiere…", "Cloudflare KV");
    try {
      const response = await fetch(API_URL, {headers: {accept: "application/json"}, cache: "no-store"});
      if (response.status === 204) {
        dirty = true;
        scheduleSync(80);
        setSyncStatus("syncing", "Initialisiere…", "Startset wird gespeichert");
        return;
      }
      if (!response.ok) throw new Error(await response.text());
      const remote = normalizeState(await response.json());
      const merged = mergeStates(state, remote);
      const changedAgainstRemote = !statesEqual(merged, remote);
      state = merged;
      persistLocal({broadcast: false});
      render();
      if (changedAgainstRemote) {
        dirty = true;
        scheduleSync();
      } else {
        dirty = false;
        setSyncStatus("online", "Synchronisiert", "Cloudflare KV");
        showBanner("");
      }
    } catch (error) {
      setSyncStatus("offline", "Lokalmodus", navigator.onLine ? "KV nicht erreichbar" : "Offline");
      showBanner("Cloud-Synchronisierung derzeit nicht erreichbar. Änderungen bleiben lokal erhalten und werden automatisch nachgereicht.");
    }
  }

  function scheduleSync(delay = MIN_WRITE_INTERVAL) {
    dirty = true;
    clearTimeout(syncTimer);
    const earliest = Math.max(0, lastWriteAt + MIN_WRITE_INTERVAL - Date.now());
    syncTimer = window.setTimeout(syncNow, Math.max(delay, earliest));
    setSyncStatus(navigator.onLine ? "syncing" : "offline", navigator.onLine ? "Änderungen offen" : "Lokalmodus", navigator.onLine ? "Synchronisierung vorbereitet" : "Offline");
  }

  async function syncNow() {
    clearTimeout(syncTimer);
    if (!dirty) return;
    if (!navigator.onLine) {
      setSyncStatus("offline", "Lokalmodus", "Offline");
      return;
    }
    if (syncInFlight) {
      syncQueued = true;
      return;
    }
    const wait = lastWriteAt + MIN_WRITE_INTERVAL - Date.now();
    if (wait > 0) {
      scheduleSync(wait + 30);
      return;
    }

    syncInFlight = true;
    setSyncStatus("syncing", "Synchronisiere…", "Cloudflare KV");
    const outgoing = clone(state);
    try {
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: {"content-type": "application/json", accept: "application/json", "x-radprompt-client": clientId},
        body: JSON.stringify(outgoing)
      });
      lastWriteAt = Date.now();
      if (response.status === 429) {
        scheduleSync(1800);
        showBanner("Cloudflare KV begrenzt Schreibzugriffe auf denselben Schlüssel. Die Änderung wird automatisch erneut übertragen.");
        return;
      }
      if (!response.ok) throw new Error(await response.text());
      const saved = normalizeState(await response.json());
      state = mergeStates(state, saved);
      dirty = timeValue(state.updatedAt) > timeValue(saved.updatedAt);
      persistLocal({broadcast: false});
      render();
      if (dirty) {
        scheduleSync();
      } else {
        setSyncStatus("online", "Synchronisiert", `Revision ${state.revision}`);
        showBanner("");
      }
    } catch (error) {
      setSyncStatus("error", "Synchronisierung offen", navigator.onLine ? "Erneuter Versuch folgt" : "Offline");
      showBanner("Synchronisierung ausstehend. Der lokale Stand ist gesichert; ein erneuter Versuch erfolgt automatisch.");
      scheduleSync(3500);
    } finally {
      syncInFlight = false;
      if (syncQueued) {
        syncQueued = false;
        scheduleSync();
      }
    }
  }

  function applyPreferences() {
    document.body.classList.toggle("effects-off", !preferences.effects);
    document.body.classList.toggle("animations-off", !preferences.animations);
    document.body.classList.toggle("widget-mode", preferences.widgetMode);
  }

  function folderById(id) {
    return state.folders.find(folder => folder.id === id) || null;
  }

  function promptById(id) {
    return state.prompts.find(prompt => prompt.id === id) || null;
  }

  function childrenOf(parentId) {
    return state.folders.filter(folder => (folder.parentId || null) === (parentId || null)).sort(sortByOrder);
  }

  function promptsIn(folderId) {
    return state.prompts.filter(prompt => (prompt.folderId || null) === (folderId || null)).sort(sortByOrder);
  }

  function sortByOrder(a, b) {
    return (Number(a.order) || 0) - (Number(b.order) || 0) || a.title?.localeCompare(b.title, "de") || a.name?.localeCompare(b.name, "de") || 0;
  }

  function folderPath(id) {
    const path = [];
    const seen = new Set();
    let current = folderById(id);
    while (current && !seen.has(current.id)) {
      path.unshift(current);
      seen.add(current.id);
      current = folderById(current.parentId);
    }
    return path;
  }

  function descendantIds(folderId) {
    const result = new Set();
    const visit = id => childrenOf(id).forEach(child => { if (!result.has(child.id)) { result.add(child.id); visit(child.id); } });
    visit(folderId);
    return result;
  }

  function folderPromptCount(folderId, recursive = false) {
    if (!recursive) return state.prompts.filter(prompt => prompt.folderId === folderId).length;
    const ids = descendantIds(folderId);
    ids.add(folderId);
    return state.prompts.filter(prompt => ids.has(prompt.folderId)).length;
  }

  function folderDisplayName(id) {
    return folderById(id)?.name || "Ohne Ordner";
  }

  function extractPlaceholders(content) {
    const found = [];
    const seen = new Set();
    const pattern = /\*\*\*([^*\r\n]+?)\*\*\*/g;
    for (const match of String(content || "").matchAll(pattern)) {
      const name = match[1].trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        found.push(name);
      }
    }
    return found;
  }

  function draftFor(promptId, placeholder) {
    return fieldDrafts[promptId]?.[placeholder] || "";
  }

  function setDraft(promptId, placeholder, value) {
    fieldDrafts[promptId] ||= {};
    fieldDrafts[promptId][placeholder] = value;
    saveDrafts();
  }

  function inputKind(placeholder) {
    const normalized = normalizeText(placeholder);
    if (normalized === "modalitat") return "modality";
    if (/angaben|fragestellung|befund|beschreibung|anamnese|klinik|text|inhalt/.test(normalized)) return "textarea";
    return "input";
  }

  function fieldMarkup(promptId, placeholder, compact = false) {
    const value = draftFor(promptId, placeholder);
    const type = inputKind(placeholder);
    const safeName = escapeHtml(placeholder);
    const common = `class="${compact ? "mini-field" : type === "textarea" ? "form-textarea" : type === "modality" ? "form-select" : "form-input"}" data-placeholder="${safeName}" data-prompt-id="${escapeHtml(promptId)}" aria-label="${safeName}"`;
    if (type === "modality") {
      const options = ["CT", "MRT", "Röntgen", "CT&MRT"].map(option => `<option value="${option}" ${value === option ? "selected" : ""}>${option}</option>`).join("");
      return `<select ${common}><option value="" ${value ? "" : "selected"} disabled>Auswählen…</option>${options}</select>`;
    }
    if (type === "textarea") return `<textarea ${common} rows="${compact ? 2 : 4}" placeholder="${safeName}">${escapeHtml(value)}</textarea>`;
    return `<input ${common} value="${escapeHtml(value)}" placeholder="${safeName}">`;
  }

  function fillPrompt(prompt, values = {}) {
    let output = prompt.content;
    extractPlaceholders(prompt.content).forEach(name => {
      output = output.split(`***${name}***`).join(values[name] ?? "");
    });
    if (prompt.includeSchaeferExamples) {
      output += `\n\n\n===== # Befundbeispiele Prof. Schäfer CT.txt =====\n\n${state.resources.schaeferCT || ""}`;
      output += `\n\n\n===== # Befundbeispiele Prof. Schäfer MRT.txt =====\n\n${state.resources.schaeferMRT || ""}`;
    }
    return output;
  }

  function valuesFrom(root, promptId) {
    const values = {};
    $$(`[data-prompt-id="${CSS.escape(promptId)}"][data-placeholder]`, root).forEach(field => {
      values[field.dataset.placeholder] = field.value.trim();
    });
    return values;
  }

  function missingPlaceholders(prompt, values) {
    return extractPlaceholders(prompt.content).filter(name => !String(values[name] || "").trim());
  }

  async function writeClipboard(text) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    Object.assign(textarea.style, {position: "fixed", inset: "0", opacity: "0", pointerEvents: "none"});
    document.body.append(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    textarea.remove();
    if (!success) throw new Error("Clipboard unavailable");
  }

  async function copyPrompt(prompt, root) {
    const values = valuesFrom(root, prompt.id);
    const missing = missingPlaceholders(prompt, values);
    if (missing.length) {
      const first = root.querySelector(`[data-prompt-id="${CSS.escape(prompt.id)}"][data-placeholder="${CSS.escape(missing[0])}"]`);
      first?.focus();
      first?.setAttribute("aria-invalid", "true");
      toast("Eingaben ergänzen", `Fehlend: ${missing.join(", ")}`, "error");
      announce(`Bitte ausfüllen: ${missing.join(", ")}`);
      return false;
    }
    try {
      await writeClipboard(fillPrompt(prompt, values));
      toast("Prompt kopiert", prompt.includeSchaeferExamples ? "Inklusive CT- und MRT-Befundbeispielen" : prompt.title);
      announce(`${prompt.title} wurde in die Zwischenablage kopiert.`);
      return true;
    } catch {
      toast("Kopieren fehlgeschlagen", "Zwischenablage konnte nicht beschrieben werden.", "error");
      return false;
    }
  }

  function announce(message) {
    $("#liveRegion").textContent = "";
    requestAnimationFrame(() => { $("#liveRegion").textContent = message; });
  }

  function toast(title, detail = "", mode = "success") {
    const element = document.createElement("div");
    element.className = `toast ${mode === "error" ? "is-error" : ""}`;
    element.innerHTML = `<span class="toast-icon">${icon(mode === "error" ? "alert" : "check")}</span><span><strong>${escapeHtml(title)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</span>`;
    $("#toastRegion").append(element);
    window.setTimeout(() => element.remove(), 3200);
  }

  function currentViewTitle() {
    if (searchQuery) return "Suchergebnisse";
    if (preferences.activeView === "favorites") return "Favoriten";
    if (preferences.activeView === "folder" && preferences.currentFolderId) return folderDisplayName(preferences.currentFolderId);
    return "Alle Prompts";
  }

  function visiblePrompts() {
    let list;
    if (searchQuery) {
      const query = normalizeText(searchQuery);
      list = state.prompts.filter(prompt => normalizeText(`${prompt.title}\n${prompt.content}\n${folderDisplayName(prompt.folderId)}`).includes(query));
    } else if (preferences.activeView === "favorites") {
      list = state.prompts.filter(prompt => prompt.favorite);
    } else if (preferences.activeView === "folder") {
      list = promptsIn(preferences.currentFolderId);
    } else {
      list = [...state.prompts];
    }
    return list.sort(sortByOrder);
  }

  function visibleFolders() {
    if (searchQuery) {
      const query = normalizeText(searchQuery);
      return state.folders.filter(folder => normalizeText(`${folder.name} ${folderPath(folder.id).map(item => item.name).join(" ")}`).includes(query)).sort(sortByOrder);
    }
    if (preferences.activeView === "favorites") return [];
    if (preferences.activeView === "folder") return childrenOf(preferences.currentFolderId);
    return childrenOf(null);
  }

  function setView(view, folderId = null) {
    preferences.activeView = view;
    preferences.currentFolderId = view === "folder" ? folderId : null;
    savePreferences();
    searchQuery = "";
    $("#searchInput").value = "";
    closeActionMenu();
    render();
    $("#mainContent").focus({preventScroll: true});
  }

  function render() {
    repairActiveFolder();
    applyPreferences();
    renderNavigation();
    renderFavorites();
    renderHeader();
    renderFolders();
    renderPrompts();
  }

  function repairActiveFolder() {
    if (preferences.activeView === "folder" && !folderById(preferences.currentFolderId)) {
      preferences.activeView = "all";
      preferences.currentFolderId = null;
      savePreferences();
    }
  }

  function renderNavigation() {
    $("#allCount").textContent = state.prompts.length;
    $("#favoriteCount").textContent = state.prompts.filter(prompt => prompt.favorite).length;
    $$('[data-view-id="all"]').forEach(button => button.classList.toggle("is-active", preferences.activeView === "all"));
    $$('[data-view-id="favorites"]').forEach(button => button.classList.toggle("is-active", preferences.activeView === "favorites"));
    $("#folderTree").innerHTML = childrenOf(null).map(folder => treeMarkup(folder, 0)).join("");
    bindTreeEvents();

    const roots = childrenOf(null);
    $("#folderDock").innerHTML = [
      `<button class="dock-item ${preferences.activeView === "all" ? "is-active" : ""}" type="button" data-view-id="all">${icon("grid")}<span>Alle</span><small>${state.prompts.length}</small></button>`,
      `<button class="dock-item ${preferences.activeView === "favorites" ? "is-active" : ""}" type="button" data-view-id="favorites">${icon("star")}<span>Favoriten</span><small>${state.prompts.filter(prompt => prompt.favorite).length}</small></button>`,
      ...roots.map(folder => `<button class="dock-item ${preferences.activeView === "folder" && preferences.currentFolderId === folder.id ? "is-active" : ""}" type="button" data-folder-id="${folder.id}">${icon("folder")}<span>${escapeHtml(folder.name)}</span><small>${folderPromptCount(folder.id, true)}</small></button>`)
    ].join("");
    bindViewButtons($("#folderDock"));
  }

  function treeMarkup(folder, depth) {
    const children = childrenOf(folder.id);
    const active = preferences.activeView === "folder" && preferences.currentFolderId === folder.id;
    return `<div class="tree-branch" role="none">
      <div class="tree-row ${active ? "is-active" : ""}" role="treeitem" aria-selected="${active}" tabindex="${active ? "0" : "-1"}" data-folder-id="${folder.id}" data-drag-kind="folder" data-depth="${Math.min(depth, 3)}">
        ${icon("folder")}<span class="tree-label">${escapeHtml(folder.name)}</span><span class="tree-count">${folderPromptCount(folder.id, true)}</span>
      </div>
      ${children.length ? `<div class="tree-children" role="group">${children.map(child => treeMarkup(child, depth + 1)).join("")}</div>` : ""}
    </div>`;
  }

  function bindTreeEvents() {
    const rows = $$(".tree-row", $("#folderTree"));
    if (rows.length && !rows.some(row => row.tabIndex === 0)) rows[0].tabIndex = 0;
    rows.forEach((row, index) => {
      row.addEventListener("click", () => setView("folder", row.dataset.folderId));
      row.addEventListener("contextmenu", event => {
        event.preventDefault();
        openFolderMenu(row.dataset.folderId, row);
      });
      row.addEventListener("keydown", event => {
        let next = null;
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setView("folder", row.dataset.folderId); return; }
        if (event.key === "ArrowDown") next = rows[Math.min(rows.length - 1, index + 1)];
        if (event.key === "ArrowUp") next = rows[Math.max(0, index - 1)];
        if (event.key === "Home") next = rows[0];
        if (event.key === "End") next = rows[rows.length - 1];
        if (event.key === "ArrowRight") next = rows[index + 1]?.closest(".tree-children") ? rows[index + 1] : null;
        if (event.key === "ArrowLeft") {
          const parentBranch = row.closest(".tree-children")?.closest(".tree-branch");
          next = parentBranch?.querySelector(":scope > .tree-row") || null;
        }
        if (next) {
          event.preventDefault();
          rows.forEach(item => item.tabIndex = -1);
          next.tabIndex = 0;
          next.focus();
        }
      });
      bindNativeDropTarget(row, "folder", row.dataset.folderId);
    });
  }

  function bindViewButtons(root = document) {
    $$('[data-view-id="all"]', root).forEach(button => button.onclick = () => setView("all"));
    $$('[data-view-id="favorites"]', root).forEach(button => button.onclick = () => setView("favorites"));
    $$('[data-folder-id]', root).filter(button => button.classList.contains("dock-item")).forEach(button => button.onclick = () => setView("folder", button.dataset.folderId));
  }

  function renderFavorites() {
    const favorites = state.prompts.filter(prompt => prompt.favorite).sort(sortByOrder);
    const bar = $("#favoriteBar");
    bar.hidden = favorites.length === 0 || preferences.widgetMode;
    $("#favoriteItems").innerHTML = favorites.map(prompt => `<button class="favorite-pill" type="button" data-open-prompt="${prompt.id}">${icon("star")}<span>${escapeHtml(prompt.title)}</span></button>`).join("");
    $$('[data-open-prompt]', $("#favoriteItems")).forEach(button => button.onclick = () => openPrompt(button.dataset.openPrompt));
  }

  function renderHeader() {
    const prompts = visiblePrompts();
    const folders = visibleFolders();
    $("#viewTitle").textContent = currentViewTitle();
    const promptWord = prompts.length === 1 ? "Template" : "Templates";
    const folderText = folders.length ? ` · ${folders.length} ${folders.length === 1 ? "Ordner" : "Ordner"}` : "";
    $("#viewMeta").textContent = `${prompts.length} ${promptWord}${folderText}${searchQuery ? ` · Suche „${searchQuery}“` : ""}`;
    renderBreadcrumbs();
    $(".context-folder-action").style.display = preferences.activeView === "folder" && !searchQuery ? "grid" : "none";
    $$('[data-layout]').forEach(button => {
      const active = button.dataset.layout === preferences.layout;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderBreadcrumbs() {
    const root = $("#breadcrumbs");
    if (searchQuery || preferences.activeView !== "folder" || !preferences.currentFolderId) {
      root.innerHTML = "";
      return;
    }
    const path = folderPath(preferences.currentFolderId);
    const pieces = [`<button class="breadcrumb-btn" type="button" data-view-id="all">Alle Prompts</button>`];
    path.forEach((folder, index) => {
      pieces.push(`<span class="breadcrumb-sep">/</span><button class="breadcrumb-btn" type="button" data-folder-id="${folder.id}" ${index === path.length - 1 ? 'aria-current="page"' : ""}>${escapeHtml(folder.name)}</button>`);
    });
    root.innerHTML = pieces.join("");
    $("[data-view-id='all']", root).onclick = () => setView("all");
    $$('[data-folder-id]', root).forEach(button => button.onclick = () => setView("folder", button.dataset.folderId));
  }

  function renderFolders() {
    const folders = visibleFolders();
    const section = $("#subfolderSection");
    section.hidden = folders.length === 0;
    $("#subfolderCount").textContent = folders.length ? `${folders.length}` : "";
    const grid = $("#subfolderGrid");
    grid.innerHTML = "";
    folders.forEach(folder => {
      const tile = $("#folderTileTemplate").content.firstElementChild.cloneNode(true);
      tile.dataset.folderId = folder.id;
      $(".folder-tile-copy strong", tile).textContent = folder.name;
      $(".folder-tile-copy small", tile).textContent = `${folderPromptCount(folder.id, true)} ${folderPromptCount(folder.id, true) === 1 ? "Prompt" : "Prompts"} · ${childrenOf(folder.id).length} Unterordner`;
      $(".folder-tile-open", tile).setAttribute("aria-label", `Ordner ${folder.name} öffnen`);
      $(".folder-tile-open", tile).onclick = () => setView("folder", folder.id);
      $(".folder-tile-menu", tile).onclick = event => { event.stopPropagation(); openFolderMenu(folder.id, event.currentTarget); };
      const handle = $(".folder-tile-icon", tile);
      handle.classList.add("drag-handle");
      handle.setAttribute("title", "Ziehen zum Sortieren");
      bindPointerDrag(handle, tile, "folder", folder.id, folder.name);
      bindNativeDrag(tile, "folder", folder.id, folder.name, handle);
      bindNativeDropTarget(tile, "folder", folder.id);
      grid.append(tile);
    });
  }

  function renderPrompts() {
    const prompts = visiblePrompts();
    const grid = $("#promptGrid");
    grid.className = `prompt-grid ${preferences.layout === "compact" || preferences.widgetMode ? "is-compact" : ""}`;
    grid.innerHTML = "";
    prompts.forEach((prompt, index) => grid.append(createPromptCard(prompt, index)));
    $("#emptyState").hidden = prompts.length > 0 || visibleFolders().length > 0;
  }

  function createPromptCard(prompt, index) {
    const card = $("#promptCardTemplate").content.firstElementChild.cloneNode(true);
    card.dataset.promptId = prompt.id;
    card.style.animationDelay = `${Math.min(index * 35, 280)}ms`;
    $(".card-index", card).textContent = String(index + 1).padStart(2, "0");
    $(".card-folder", card).textContent = folderDisplayName(prompt.folderId);
    $(".card-title", card).textContent = prompt.title;
    const placeholders = extractPlaceholders(prompt.content);
    $(".card-badges", card).innerHTML = [
      placeholders.length ? `<span class="card-badge">${placeholders.length} ${placeholders.length === 1 ? "Feld" : "Felder"}</span>` : `<span class="card-badge">Direktkopie</span>`,
      prompt.includeSchaeferExamples ? `<span class="card-badge">+ Schäfer-Beispiele</span>` : ""
    ].join("");
    $(".card-fields", card).innerHTML = placeholders.map(name => `<div class="field-control"><label>${escapeHtml(name)}</label>${fieldMarkup(prompt.id, name, true)}</div>`).join("");

    const favorite = $(".favorite-btn", card);
    favorite.classList.toggle("is-active", prompt.favorite);
    favorite.setAttribute("aria-pressed", String(prompt.favorite));
    favorite.onclick = event => { event.stopPropagation(); toggleFavorite(prompt.id); };
    $(".card-menu-btn", card).onclick = event => { event.stopPropagation(); openPromptMenu(prompt.id, event.currentTarget); };
    $(".expand-btn", card).setAttribute("aria-label", `${prompt.title} öffnen`);
    $(".expand-btn", card).onclick = () => openPrompt(prompt.id, card);
    $(".copy-card-btn", card).setAttribute("aria-label", `${prompt.title} kopieren`);
    $(".copy-card-btn", card).onclick = () => copyPrompt(prompt, card);
    card.addEventListener("dblclick", event => { if (!event.target.closest("button,input,textarea,select")) openPrompt(prompt.id, card); });
    card.addEventListener("input", handleDraftInput);
    card.addEventListener("change", handleDraftInput);

    const handle = $(".drag-handle", card);
    bindPointerDrag(handle, card, "prompt", prompt.id, prompt.title);
    bindNativeDrag(card, "prompt", prompt.id, prompt.title, handle);
    bindNativeDropTarget(card, "prompt", prompt.id);
    return card;
  }

  function handleDraftInput(event) {
    const field = event.target.closest("[data-placeholder][data-prompt-id]");
    if (!field) return;
    field.removeAttribute("aria-invalid");
    setDraft(field.dataset.promptId, field.dataset.placeholder, field.value);
    const promptDialog = field.closest("#promptDialog");
    if (promptDialog) updatePromptPreview(field.dataset.promptId);
  }

  function toggleFavorite(promptId) {
    const prompt = promptById(promptId);
    if (!prompt) return;
    prompt.favorite = !prompt.favorite;
    touchItem(prompt);
    render();
    toast(prompt.favorite ? "Zu Favoriten hinzugefügt" : "Aus Favoriten entfernt", prompt.title);
  }

  function openPrompt(promptId, source = null) {
    const prompt = promptById(promptId);
    if (!prompt) return;
    returnFocus = source || document.activeElement;
    const placeholders = extractPlaceholders(prompt.content);
    $("#promptDialogTitle").textContent = prompt.title;
    $("#promptDialogBody").innerHTML = `
      <div class="prompt-meta-row">
        <span class="meta-chip">${escapeHtml(folderDisplayName(prompt.folderId))}</span>
        <span class="meta-chip">${placeholders.length} ${placeholders.length === 1 ? "Platzhalter" : "Platzhalter"}</span>
        ${prompt.includeSchaeferExamples ? `<span class="meta-chip is-special">CT- und MRT-Beispiele werden angefügt</span>` : ""}
      </div>
      <div class="prompt-workspace">
        <section class="placeholder-pane">
          <div class="pane-head"><h3>Eingaben</h3><span>${placeholders.length ? "Pflichtfelder" : "Keine Platzhalter"}</span></div>
          <div class="placeholder-form">${placeholders.length ? placeholders.map(name => `<div class="form-field"><label>${escapeHtml(name)}</label>${fieldMarkup(prompt.id, name, false)}</div>`).join("") : `<p class="view-meta">Dieses Template kann ohne weitere Eingaben kopiert werden.</p>`}</div>
        </section>
        <section class="prompt-text-pane">
          <div class="pane-head"><h3>Vorschau</h3><span id="promptCharacterCount"></span></div>
          <pre id="promptTextDisplay" class="prompt-text-display"></pre>
        </section>
      </div>`;
    $("#promptDialogFoot").innerHTML = `
      <button class="btn" type="button" data-role="edit">${icon("edit")}Bearbeiten</button>
      <div class="dialog-actions">
        <button class="btn" type="button" data-role="duplicate">${icon("duplicate")}Duplizieren</button>
        <button class="btn primary" type="button" data-role="copy">${icon("copy")}Ausgefüllten Prompt kopieren</button>
      </div>`;
    $("#promptDialogBody").addEventListener("input", handleDraftInput);
    $("#promptDialogBody").addEventListener("change", handleDraftInput);
    $("[data-role='edit']", $("#promptDialogFoot")).onclick = () => { closeDialog($("#promptDialog")); openPromptForm(prompt.id); };
    $("[data-role='duplicate']", $("#promptDialogFoot")).onclick = () => { closeDialog($("#promptDialog")); duplicatePrompt(prompt.id); };
    $("[data-role='copy']", $("#promptDialogFoot")).onclick = () => copyPrompt(prompt, $("#promptDialogBody"));
    updatePromptPreview(prompt.id);
    openDialog($("#promptDialog"));
  }

  function updatePromptPreview(promptId) {
    const prompt = promptById(promptId);
    const display = $("#promptTextDisplay");
    if (!prompt || !display) return;
    const values = valuesFrom($("#promptDialogBody"), promptId);
    const text = fillPrompt(prompt, values);
    display.textContent = text;
    $("#promptCharacterCount").textContent = `${text.length.toLocaleString("de-DE")} Zeichen`;
  }

  function openDialog(dialog) {
    closeActionMenu();
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => {
      const preferred = dialog.querySelector("input:not([type='hidden']),textarea,select,button");
      preferred?.focus({preventScroll: true});
    });
  }

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
  }

  function configureFormDialog({title, eyebrow = "Bearbeiten", body, foot, onSubmit}) {
    returnFocus = document.activeElement;
    $("#formDialogTitle").textContent = title;
    $("#formDialogEyebrow").textContent = eyebrow;
    $("#formDialogBody").innerHTML = body;
    $("#formDialogFoot").innerHTML = foot;
    const form = $("#formDialogForm");
    form.onsubmit = event => {
      event.preventDefault();
      onSubmit?.(new FormData(form), form);
    };
    openDialog($("#formDialog"));
  }

  function folderOptions(selectedId = null, excludedIds = new Set()) {
    const rows = [`<option value="" ${!selectedId ? "selected" : ""}>Ohne Ordner / oberste Ebene</option>`];
    const walk = (parentId, depth) => childrenOf(parentId).forEach(folder => {
      if (!excludedIds.has(folder.id)) {
        rows.push(`<option value="${folder.id}" ${selectedId === folder.id ? "selected" : ""}>${"— ".repeat(depth)}${escapeHtml(folder.name)}</option>`);
        walk(folder.id, depth + 1);
      }
    });
    walk(null, 0);
    return rows.join("");
  }

  function openPromptForm(promptId = null) {
    const existing = promptId ? promptById(promptId) : null;
    const prompt = existing ? clone(existing) : {
      id: uid("prompt"), title: "", content: "", folderId: preferences.activeView === "folder" ? preferences.currentFolderId : null,
      favorite: false, includeSchaeferExamples: false, order: state.prompts.length, createdAt: nowIso(), updatedAt: nowIso()
    };
    const placeholders = extractPlaceholders(prompt.content);
    configureFormDialog({
      title: existing ? "Prompt bearbeiten" : "Neuer Prompt",
      eyebrow: existing ? "Template aktualisieren" : "Template anlegen",
      body: `<div class="form-grid">
        <div class="form-field"><label for="promptTitle">Titel</label><input id="promptTitle" class="form-input" name="title" value="${escapeHtml(prompt.title)}" required maxlength="180" autocomplete="off"></div>
        <div class="form-field"><label for="promptFolder">Ordner</label><select id="promptFolder" class="form-select" name="folderId">${folderOptions(prompt.folderId)}</select></div>
        <div class="form-field full"><label for="promptContent">Prompttext · Platzhalter als ***NAME***</label><textarea id="promptContent" class="form-textarea prompt-editor" name="content" required spellcheck="false">${escapeHtml(prompt.content)}</textarea></div>
        <div class="form-field full"><label>Erkannte Platzhalter</label><div id="placeholderPreview" class="placeholder-preview">${placeholders.length ? placeholders.map(name => `<span class="placeholder-token">${escapeHtml(name)}</span>`).join("") : `<span class="view-meta">Noch keine Platzhalter erkannt.</span>`}</div></div>
        <label class="checkbox-row"><input type="checkbox" name="favorite" ${prompt.favorite ? "checked" : ""}><span><strong>Favorit</strong><small>In der Schnellzugriffsleiste anzeigen.</small></span></label>
        <label class="checkbox-row"><input type="checkbox" name="includeSchaeferExamples" ${prompt.includeSchaeferExamples ? "checked" : ""}><span><strong>Prof.-Schäfer-Beispiele anhängen</strong><small>Vollständige CT- und MRT-Dokumente beim Kopieren ergänzen.</small></span></label>
      </div>`,
      foot: `${existing ? `<button class="btn danger" type="button" data-role="delete">${icon("trash")}Löschen</button>` : `<span></span>`}<div class="dialog-actions"><button class="btn" type="button" data-dialog-close>Abbrechen</button><button class="btn primary" type="submit">${icon("check")}Speichern</button></div>`,
      onSubmit: (data, form) => {
        const title = String(data.get("title") || "").trim();
        const content = String(data.get("content") || "").trim();
        if (!title || !content) {
          toast("Pflichtfelder fehlen", "Titel und Prompttext müssen ausgefüllt sein.", "error");
          return;
        }
        prompt.title = title;
        prompt.content = content;
        prompt.folderId = String(data.get("folderId") || "") || null;
        prompt.favorite = data.get("favorite") === "on";
        prompt.includeSchaeferExamples = data.get("includeSchaeferExamples") === "on";
        prompt.updatedAt = nowIso();
        if (existing) Object.assign(existing, prompt);
        else state.prompts.push(prompt);
        closeDialog($("#formDialog"));
        touchState();
        render();
        toast(existing ? "Prompt aktualisiert" : "Prompt erstellt", prompt.title);
      }
    });
    const contentField = $("#promptContent");
    contentField.addEventListener("input", () => {
      const names = extractPlaceholders(contentField.value);
      $("#placeholderPreview").innerHTML = names.length ? names.map(name => `<span class="placeholder-token">${escapeHtml(name)}</span>`).join("") : `<span class="view-meta">Noch keine Platzhalter erkannt.</span>`;
    });
    if (existing) $("[data-role='delete']", $("#formDialogFoot")).onclick = () => confirmDeletePrompt(existing.id);
  }

  function duplicatePrompt(promptId) {
    const source = promptById(promptId);
    if (!source) return;
    const duplicate = clone(source);
    duplicate.id = uid("prompt");
    duplicate.title = `${source.title} – Kopie`;
    duplicate.favorite = false;
    duplicate.order = Math.max(-1, ...state.prompts.filter(item => item.folderId === source.folderId).map(item => Number(item.order) || 0)) + 1;
    duplicate.createdAt = duplicate.updatedAt = nowIso();
    state.prompts.push(duplicate);
    touchState();
    render();
    toast("Prompt dupliziert", duplicate.title);
    openPromptForm(duplicate.id);
  }

  function openFolderForm(folderId = null, forcedParentId = undefined) {
    const existing = folderId ? folderById(folderId) : null;
    const folder = existing ? clone(existing) : {
      id: uid("folder"), name: "", parentId: forcedParentId !== undefined ? forcedParentId : preferences.activeView === "folder" ? preferences.currentFolderId : null,
      order: state.folders.length, createdAt: nowIso(), updatedAt: nowIso()
    };
    const excluded = existing ? descendantIds(existing.id) : new Set();
    if (existing) excluded.add(existing.id);
    configureFormDialog({
      title: existing ? "Ordner bearbeiten" : "Neuer Ordner",
      eyebrow: existing ? "Ordner verwalten" : "Ordner anlegen",
      body: `<div class="form-grid">
        <div class="form-field full"><label for="folderName">Ordnername</label><input id="folderName" class="form-input" name="name" value="${escapeHtml(folder.name)}" required maxlength="100" autocomplete="off"></div>
        <div class="form-field full"><label for="folderParent">Übergeordneter Ordner</label><select id="folderParent" class="form-select" name="parentId">${folderOptions(folder.parentId, excluded)}</select></div>
      </div>`,
      foot: `${existing ? `<button class="btn danger" type="button" data-role="delete">${icon("trash")}Löschen</button>` : `<span></span>`}<div class="dialog-actions"><button class="btn" type="button" data-dialog-close>Abbrechen</button><button class="btn primary" type="submit">${icon("check")}Speichern</button></div>`,
      onSubmit: data => {
        const name = String(data.get("name") || "").trim();
        if (!name) return;
        folder.name = name;
        folder.parentId = String(data.get("parentId") || "") || null;
        folder.updatedAt = nowIso();
        if (existing) Object.assign(existing, folder);
        else state.folders.push(folder);
        closeDialog($("#formDialog"));
        touchState();
        setView("folder", folder.id);
        toast(existing ? "Ordner aktualisiert" : "Ordner erstellt", folder.name);
      }
    });
    if (existing) $("[data-role='delete']", $("#formDialogFoot")).onclick = () => confirmDeleteFolder(existing.id);
  }

  function confirmDeletePrompt(promptId) {
    const prompt = promptById(promptId);
    if (!prompt) return;
    configureFormDialog({
      title: "Prompt löschen?",
      eyebrow: "Unwiderrufliche Aktion",
      body: `<p class="view-meta">„${escapeHtml(prompt.title)}“ wird aus der synchronisierten Bibliothek entfernt. Ein lokales JSON-Backup kann zuvor über die Einstellungen erstellt werden.</p>`,
      foot: `<span></span><div class="dialog-actions"><button class="btn" type="button" data-dialog-close>Abbrechen</button><button class="btn danger" type="submit">${icon("trash")}Endgültig löschen</button></div>`,
      onSubmit: () => {
        const stamp = nowIso();
        state.tombstones.prompts[prompt.id] = stamp;
        state.prompts = state.prompts.filter(item => item.id !== prompt.id);
        delete fieldDrafts[prompt.id];
        saveDrafts();
        closeDialog($("#formDialog"));
        touchState();
        render();
        toast("Prompt gelöscht", prompt.title);
      }
    });
  }

  function confirmDeleteFolder(folderId) {
    const folder = folderById(folderId);
    if (!folder) return;
    const descendants = descendantIds(folderId);
    descendants.add(folderId);
    const affectedPrompts = state.prompts.filter(prompt => descendants.has(prompt.folderId));
    configureFormDialog({
      title: "Ordner löschen?",
      eyebrow: "Ordner und Inhalte",
      body: `<p class="view-meta">„${escapeHtml(folder.name)}“ einschließlich ${descendants.size - 1} Unterordnern und ${affectedPrompts.length} Prompts wird gelöscht.</p>`,
      foot: `<span></span><div class="dialog-actions"><button class="btn" type="button" data-dialog-close>Abbrechen</button><button class="btn danger" type="submit">${icon("trash")}Alles löschen</button></div>`,
      onSubmit: () => {
        const stamp = nowIso();
        descendants.forEach(id => { state.tombstones.folders[id] = stamp; });
        affectedPrompts.forEach(prompt => { state.tombstones.prompts[prompt.id] = stamp; delete fieldDrafts[prompt.id]; });
        state.folders = state.folders.filter(item => !descendants.has(item.id));
        state.prompts = state.prompts.filter(item => !descendants.has(item.folderId));
        saveDrafts();
        closeDialog($("#formDialog"));
        touchState();
        setView("all");
        toast("Ordner gelöscht", folder.name);
      }
    });
  }

  function openPromptMenu(promptId, anchor) {
    const prompt = promptById(promptId);
    if (!prompt) return;
    openActionMenu(anchor, [
      {label: "Öffnen", icon: "expand", action: () => openPrompt(prompt.id)},
      {label: "Bearbeiten", icon: "edit", action: () => openPromptForm(prompt.id)},
      {label: "Duplizieren", icon: "duplicate", action: () => duplicatePrompt(prompt.id)},
      {label: prompt.favorite ? "Favorit entfernen" : "Als Favorit markieren", icon: "star", action: () => toggleFavorite(prompt.id)},
      {separator: true},
      {label: "Löschen", icon: "trash", danger: true, action: () => confirmDeletePrompt(prompt.id)}
    ]);
  }

  function openFolderMenu(folderId, anchor) {
    const folder = folderById(folderId);
    if (!folder) return;
    openActionMenu(anchor, [
      {label: "Ordner öffnen", icon: "folder", action: () => setView("folder", folder.id)},
      {label: "Unterordner erstellen", icon: "folder-plus", action: () => openFolderForm(null, folder.id)},
      {label: "Umbenennen / verschieben", icon: "edit", action: () => openFolderForm(folder.id)},
      {separator: true},
      {label: "Ordner löschen", icon: "trash", danger: true, action: () => confirmDeleteFolder(folder.id)}
    ]);
  }

  function openActionMenu(anchor, items) {
    closeActionMenu();
    const menu = document.createElement("div");
    menu.className = "action-menu";
    menu.setAttribute("role", "menu");
    items.forEach(item => {
      if (item.separator) {
        const separator = document.createElement("div");
        separator.className = "menu-separator";
        menu.append(separator);
        return;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = `menu-item ${item.danger ? "is-danger" : ""}`;
      button.setAttribute("role", "menuitem");
      button.innerHTML = `${icon(item.icon)}<span>${escapeHtml(item.label)}</span>`;
      button.onclick = () => { closeActionMenu(); item.action(); };
      menu.append(button);
    });
    document.body.append(menu);
    activeMenu = menu;
    const rect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const left = Math.min(window.innerWidth - menuRect.width - 8, Math.max(8, rect.right - menuRect.width));
    const top = rect.bottom + menuRect.height + 8 <= window.innerHeight ? rect.bottom + 5 : Math.max(8, rect.top - menuRect.height - 5);
    Object.assign(menu.style, {left: `${left}px`, top: `${top}px`});
    $("button", menu)?.focus();
  }

  function closeActionMenu() {
    activeMenu?.remove();
    activeMenu = null;
  }

  function openSettings() {
    configureFormDialog({
      title: "Einstellungen",
      eyebrow: "Darstellung und Daten",
      body: `<div class="form-grid">
        <label class="checkbox-row"><input type="checkbox" name="effects" ${preferences.effects ? "checked" : ""}><span><strong>Glas- und Lichteffekte</strong><small>Aero-Glass, Hintergrundunschärfe und Lichtakzente.</small></span></label>
        <label class="checkbox-row"><input type="checkbox" name="animations" ${preferences.animations ? "checked" : ""}><span><strong>Animationen</strong><small>Flip-, Übergangs- und Mikroanimationen aktivieren.</small></span></label>
        <label class="checkbox-row"><input type="checkbox" name="widgetMode" ${preferences.widgetMode ? "checked" : ""}><span><strong>Widget-Modus</strong><small>Kompakte Darstellung für schmale Fenster neben dem Browser.</small></span></label>
        <div class="form-field"><label>Cloud-Synchronisierung</label><button class="btn" type="button" data-settings-action="sync">${icon("cloud")}Jetzt synchronisieren</button></div>
        <div class="form-field"><label>Datensicherung</label><button class="btn" type="button" data-settings-action="export">${icon("download")}JSON exportieren</button></div>
        <div class="form-field"><label>Datenübernahme</label><button class="btn" type="button" data-settings-action="import">${icon("upload")}JSON importieren</button><input id="importFile" type="file" accept="application/json" hidden></div>
        <div class="form-field"><label>Startzustand</label><button class="btn danger" type="button" data-settings-action="reset">${icon("reset")}Startset wiederherstellen</button></div>
        ${installPrompt ? `<div class="form-field full"><button class="btn" type="button" data-settings-action="install">${icon("download")}Als Windows-App installieren</button></div>` : ""}
      </div>`,
      foot: `<span class="view-meta">Schema v${state.schemaVersion} · Revision ${state.revision}</span><div class="dialog-actions"><button class="btn primary" type="submit">Fertig</button></div>`,
      onSubmit: data => {
        preferences.effects = data.get("effects") === "on";
        preferences.animations = data.get("animations") === "on";
        preferences.widgetMode = data.get("widgetMode") === "on";
        if (preferences.widgetMode) preferences.layout = "compact";
        savePreferences();
        closeDialog($("#formDialog"));
        render();
      }
    });
    $$('[data-settings-action]', $("#formDialogBody")).forEach(button => button.onclick = () => handleSettingsAction(button.dataset.settingsAction));
  }

  async function handleSettingsAction(action) {
    if (action === "sync") {
      dirty = true;
      await syncNow();
      toast("Synchronisierung ausgeführt", `Revision ${state.revision}`);
    }
    if (action === "export") exportState();
    if (action === "import") $("#importFile").click();
    if (action === "reset") confirmReset();
    if (action === "install" && installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
    }
    const file = $("#importFile");
    if (file && !file.dataset.bound) {
      file.dataset.bound = "true";
      file.onchange = importState;
    }
  }

  function exportState() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `radprompt-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup erstellt", anchor.download);
  }

  async function importState(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = normalizeState(JSON.parse(await file.text()));
      state = mergeStates(state, imported);
      closeDialog($("#formDialog"));
      touchState();
      render();
      toast("Import abgeschlossen", `${state.prompts.length} Prompts, ${state.folders.length} Ordner`);
    } catch {
      toast("Import fehlgeschlagen", "Die Datei enthält keinen gültigen RadPrompt-Stand.", "error");
    }
  }

  function confirmReset() {
    configureFormDialog({
      title: "Startset wiederherstellen?",
      eyebrow: "Alle eigenen Änderungen ersetzen",
      body: `<p class="view-meta">Der aktuelle synchronisierte Stand wird durch das mitgelieferte Startset ersetzt. Zuvor empfiehlt sich ein JSON-Export.</p>`,
      foot: `<button class="btn" type="button" data-role="backup">${icon("download")}Backup erstellen</button><div class="dialog-actions"><button class="btn" type="button" data-dialog-close>Abbrechen</button><button class="btn danger" type="submit">${icon("reset")}Zurücksetzen</button></div>`,
      onSubmit: () => {
        const stamp = nowIso();
        const restored = normalizeState(seed);
        const seedPromptIds = new Set(restored.prompts.map(item => item.id));
        const seedFolderIds = new Set(restored.folders.map(item => item.id));
        const tombstones = clone(state.tombstones);
        state.prompts.filter(item => !seedPromptIds.has(item.id)).forEach(item => { tombstones.prompts[item.id] = stamp; });
        state.folders.filter(item => !seedFolderIds.has(item.id)).forEach(item => { tombstones.folders[item.id] = stamp; });
        restored.prompts.forEach(item => { item.updatedAt = stamp; delete tombstones.prompts[item.id]; });
        restored.folders.forEach(item => { item.updatedAt = stamp; delete tombstones.folders[item.id]; });
        restored.revision = state.revision;
        restored.tombstones = tombstones;
        restored.updatedAt = stamp;
        state = restored;
        fieldDrafts = {};
        saveDrafts();
        closeDialog($("#formDialog"));
        touchState();
        setView("all");
        toast("Startset wiederhergestellt", `${state.prompts.length} Prompts`);
      }
    });
    $("[data-role='backup']", $("#formDialogFoot")).onclick = exportState;
  }

  function openSyncDetails() {
    configureFormDialog({
      title: "Synchronisierungsstatus",
      eyebrow: "Cloudflare Workers KV",
      body: `<div class="form-grid">
        <div class="form-field"><label>Verbindung</label><div class="checkbox-row"><span><strong>${navigator.onLine ? "Online" : "Offline"}</strong><small>${dirty ? "Lokale Änderungen warten auf Übertragung." : "Lokaler und serverseitiger Stand abgeglichen."}</small></span></div></div>
        <div class="form-field"><label>Revision</label><div class="checkbox-row"><span><strong>${state.revision}</strong><small>${escapeHtml(state.updatedAt)}</small></span></div></div>
        <div class="form-field full"><label>API-Endpunkt</label><input class="form-input" value="${location.origin}${API_URL}" readonly></div>
      </div>`,
      foot: `<span></span><div class="dialog-actions"><button class="btn" type="button" data-role="health">Health prüfen</button><button class="btn primary" type="submit">Schließen</button></div>`,
      onSubmit: () => closeDialog($("#formDialog"))
    });
    $("[data-role='health']", $("#formDialogFoot")).onclick = checkHealth;
  }

  async function checkHealth() {
    try {
      const response = await fetch("/api/health", {cache: "no-store"});
      const result = await response.json();
      toast(result.ok ? "KV-Binding funktionsfähig" : "KV-Binding unvollständig", result.ok ? `Revision ${result.revision || 0}` : result.error || "Health-Check fehlgeschlagen", result.ok ? "success" : "error");
    } catch {
      toast("Health-Check fehlgeschlagen", "API nicht erreichbar.", "error");
    }
  }

  function openCommand(mode = "all") {
    returnFocus = document.activeElement;
    $("#commandInput").value = "";
    $("#commandInput").placeholder = mode === "folders" ? "Ordner suchen…" : "Befehl oder Prompt suchen…";
    $("#commandDialog").dataset.mode = mode;
    commandIndex = 0;
    renderCommandResults();
    openDialog($("#commandDialog"));
    requestAnimationFrame(() => $("#commandInput").focus());
  }

  function commandSource(mode, query) {
    const normalized = normalizeText(query);
    const matches = text => !normalized || normalizeText(text).includes(normalized);
    const actions = mode === "folders" ? [] : [
      {type: "action", title: "Neuen Prompt erstellen", detail: "Template anlegen", icon: "plus", shortcut: "Ctrl N", run: () => openPromptForm()},
      {type: "action", title: "Neuen Ordner erstellen", detail: "Ordnerstruktur erweitern", icon: "folder-plus", run: () => openFolderForm()},
      {type: "action", title: "Einstellungen öffnen", detail: "Darstellung, Import und Export", icon: "settings", run: openSettings},
      {type: "action", title: "Jetzt synchronisieren", detail: "Lokalen Stand übertragen", icon: "cloud", run: () => { dirty = true; syncNow(); }}
    ].filter(item => matches(`${item.title} ${item.detail}`));
    const folders = state.folders.filter(folder => matches(`${folder.name} ${folderPath(folder.id).map(item => item.name).join(" ")}`)).map(folder => ({type: "folder", title: folder.name, detail: folderPath(folder.id).map(item => item.name).join(" / "), icon: "folder", run: () => setView("folder", folder.id)}));
    const prompts = mode === "folders" ? [] : state.prompts.filter(prompt => matches(`${prompt.title} ${prompt.content} ${folderDisplayName(prompt.folderId)}`)).slice(0, 30).map(prompt => ({type: "prompt", title: prompt.title, detail: folderDisplayName(prompt.folderId), icon: "copy", run: () => openPrompt(prompt.id)}));
    return [...actions, ...folders, ...prompts];
  }

  function renderCommandResults() {
    const mode = $("#commandDialog").dataset.mode || "all";
    commandItems = commandSource(mode, $("#commandInput").value);
    commandIndex = Math.min(commandIndex, Math.max(0, commandItems.length - 1));
    const root = $("#commandResults");
    if (!commandItems.length) {
      root.innerHTML = `<div class="empty-state"><h2>Keine Treffer</h2><p>Suchbegriff ändern.</p></div>`;
      return;
    }
    root.innerHTML = commandItems.map((item, index) => `<button class="command-item ${index === commandIndex ? "is-selected" : ""}" type="button" role="option" aria-selected="${index === commandIndex}" data-command-index="${index}"><span class="command-item-icon">${icon(item.icon)}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail || "")}</small></span>${item.shortcut ? `<kbd>${escapeHtml(item.shortcut)}</kbd>` : ""}</button>`).join("");
    $$('[data-command-index]', root).forEach(button => button.onclick = () => runCommand(Number(button.dataset.commandIndex)));
  }

  function runCommand(index) {
    const item = commandItems[index];
    if (!item) return;
    closeDialog($("#commandDialog"));
    item.run();
  }

  function bindNativeDrag(element, kind, id, label, handle) {
    element.draggable = true;
    let armed = false;
    handle?.addEventListener("pointerdown", () => { armed = true; }, {passive: true});
    handle?.addEventListener("pointerup", () => { window.setTimeout(() => { armed = false; }, 0); }, {passive: true});
    handle?.addEventListener("pointercancel", () => { armed = false; }, {passive: true});
    element.addEventListener("dragstart", event => {
      if (!armed && event.target !== handle) {
        event.preventDefault();
        return;
      }
      armed = false;
      dragSession = {kind, id, label, source: element};
      element.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify({kind, id}));
    });
    element.addEventListener("dragend", () => {
      element.classList.remove("is-dragging");
      clearDropTargets();
      dragSession = null;
    });
  }

  function bindNativeDropTarget(element, targetKind, targetId) {
    element.addEventListener("dragover", event => {
      if (!dragSession || dragSession.id === targetId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      clearDropTargets();
      element.classList.add("is-drop-target");
    });
    element.addEventListener("dragleave", event => { if (!element.contains(event.relatedTarget)) element.classList.remove("is-drop-target"); });
    element.addEventListener("drop", event => {
      event.preventDefault();
      element.classList.remove("is-drop-target");
      if (dragSession) applyDrop(dragSession.kind, dragSession.id, targetKind, targetId, element, event.clientX, event.clientY);
    });
  }

  function bindPointerDrag(handle, source, kind, id, label) {
    let timer = 0;
    let startX = 0;
    let startY = 0;
    let pointerId = null;
    let active = false;
    const cancel = () => {
      clearTimeout(timer);
      if (!active) return;
      active = false;
      source.classList.remove("is-dragging");
      document.body.classList.remove("is-pointer-dragging");
      $("#dragLayer").innerHTML = "";
      clearDropTargets();
      dragSession = null;
    };
    handle.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" || event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      timer = window.setTimeout(() => {
        active = true;
        dragSession = {kind, id, label, source};
        source.classList.add("is-dragging");
        document.body.classList.add("is-pointer-dragging");
        $("#dragLayer").innerHTML = `<div class="drag-ghost">${escapeHtml(label)}</div>`;
        moveGhost(event.clientX, event.clientY);
        navigator.vibrate?.(20);
      }, event.pointerType === "mouse" ? 60 : 180);
      handle.setPointerCapture?.(pointerId);
    });
    handle.addEventListener("pointermove", event => {
      if (event.pointerId !== pointerId) return;
      if (!active && Math.hypot(event.clientX - startX, event.clientY - startY) > 9) clearTimeout(timer);
      if (!active) return;
      event.preventDefault();
      moveGhost(event.clientX, event.clientY);
      clearDropTargets();
      const target = dropTargetAt(event.clientX, event.clientY, id);
      target?.element.classList.add("is-drop-target");
    });
    handle.addEventListener("pointerup", event => {
      clearTimeout(timer);
      if (active) {
        event.preventDefault();
        const target = dropTargetAt(event.clientX, event.clientY, id);
        if (target) applyDrop(kind, id, target.kind, target.id, target.element, event.clientX, event.clientY);
      }
      cancel();
    });
    handle.addEventListener("pointercancel", cancel);
  }

  function moveGhost(x, y) {
    const ghost = $(".drag-ghost", $("#dragLayer"));
    if (ghost) Object.assign(ghost.style, {left: `${x}px`, top: `${y}px`});
  }

  function dropTargetAt(x, y, sourceId) {
    const elements = document.elementsFromPoint(x, y);
    const element = elements.find(node => node instanceof HTMLElement && (node.matches(".prompt-card,.folder-tile,.tree-row") || node.closest?.(".prompt-card,.folder-tile,.tree-row")));
    const target = element?.matches?.(".prompt-card,.folder-tile,.tree-row") ? element : element?.closest?.(".prompt-card,.folder-tile,.tree-row");
    if (!target) return null;
    const id = target.dataset.promptId || target.dataset.folderId;
    if (!id || id === sourceId) return null;
    return {element: target, kind: target.dataset.promptId ? "prompt" : "folder", id};
  }

  function clearDropTargets() {
    $$(".is-drop-target").forEach(element => element.classList.remove("is-drop-target"));
  }

  function applyDrop(sourceKind, sourceId, targetKind, targetId, targetElement, x, y) {
    if (sourceKind === "prompt" && targetKind === "folder") {
      const prompt = promptById(sourceId);
      if (!prompt) return;
      prompt.folderId = targetId;
      prompt.order = Math.max(-1, ...promptsIn(targetId).filter(item => item.id !== sourceId).map(item => Number(item.order) || 0)) + 1;
      touchItem(prompt);
      render();
      toast("Prompt verschoben", `${prompt.title} → ${folderDisplayName(targetId)}`);
      return;
    }
    if (sourceKind === "prompt" && targetKind === "prompt") {
      reorderPrompts(sourceId, targetId, targetElement, x, y);
      return;
    }
    if (sourceKind === "folder" && targetKind === "folder") {
      reorderFolders(sourceId, targetId, targetElement, x, y);
    }
  }

  function reorderPrompts(sourceId, targetId, targetElement, x, y) {
    const source = promptById(sourceId);
    const target = promptById(targetId);
    if (!source || !target) return;
    source.folderId = target.folderId;
    const list = state.prompts.filter(prompt => prompt.folderId === target.folderId && prompt.id !== sourceId).sort(sortByOrder);
    let index = list.findIndex(prompt => prompt.id === targetId);
    const rect = targetElement.getBoundingClientRect();
    const after = preferences.layout === "compact" ? y > rect.top + rect.height / 2 : x > rect.left + rect.width / 2;
    if (after) index += 1;
    list.splice(Math.max(0, index), 0, source);
    const stamp = nowIso();
    list.forEach((prompt, order) => { prompt.order = order; prompt.updatedAt = stamp; });
    touchState();
    render();
    announce(`${source.title} wurde neu einsortiert.`);
  }

  function reorderFolders(sourceId, targetId, targetElement, x, y) {
    const source = folderById(sourceId);
    const target = folderById(targetId);
    if (!source || !target || descendantIds(source.id).has(target.id)) return;
    source.parentId = target.parentId;
    const list = state.folders.filter(folder => folder.parentId === target.parentId && folder.id !== sourceId).sort(sortByOrder);
    let index = list.findIndex(folder => folder.id === targetId);
    const rect = targetElement.getBoundingClientRect();
    const after = y > rect.top + rect.height / 2;
    if (after) index += 1;
    list.splice(Math.max(0, index), 0, source);
    const stamp = nowIso();
    list.forEach((folder, order) => { folder.order = order; folder.updatedAt = stamp; });
    touchState();
    render();
    announce(`${source.name} wurde neu einsortiert.`);
  }

  function bindGlobalEvents() {
    bindViewButtons();
    document.addEventListener("click", event => {
      if (activeMenu && !activeMenu.contains(event.target)) closeActionMenu();
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      if (action === "home") setView("all");
      if (action === "new-prompt") openPromptForm();
      if (action === "new-folder") openFolderForm();
      if (action === "settings") openSettings();
      if (action === "command") openCommand();
      if (action === "folders") openCommand("folders");
      if (action === "sync-details") openSyncDetails();
      if (action === "folder-menu" && preferences.currentFolderId) openFolderMenu(preferences.currentFolderId, event.target.closest("button"));
    });
    document.addEventListener("click", event => {
      const close = event.target.closest("[data-dialog-close]");
      if (close) closeDialog(close.closest("dialog"));
    });
    $$("dialog").forEach(dialog => {
      dialog.addEventListener("close", () => {
        closeActionMenu();
        requestAnimationFrame(() => returnFocus?.focus?.({preventScroll: true}));
      });
      dialog.addEventListener("click", event => {
        if (event.target === dialog) closeDialog(dialog);
      });
    });
    $("#searchInput").addEventListener("input", event => {
      searchQuery = event.target.value.trim();
      renderHeader();
      renderFolders();
      renderPrompts();
    });
    $$('[data-layout]').forEach(button => button.onclick = () => {
      preferences.layout = button.dataset.layout;
      preferences.widgetMode = false;
      savePreferences();
      render();
    });
    $("#commandInput").addEventListener("input", () => { commandIndex = 0; renderCommandResults(); });
    $("#commandInput").addEventListener("keydown", event => {
      if (event.key === "ArrowDown") { event.preventDefault(); commandIndex = Math.min(commandItems.length - 1, commandIndex + 1); renderCommandResults(); }
      if (event.key === "ArrowUp") { event.preventDefault(); commandIndex = Math.max(0, commandIndex - 1); renderCommandResults(); }
      if (event.key === "Enter") { event.preventDefault(); runCommand(commandIndex); }
    });
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") { event.preventDefault(); openCommand(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "n") { event.preventDefault(); openPromptForm(); }
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.matches("input,textarea,select")) { event.preventDefault(); $("#searchInput").focus(); }
      if (event.key === "Escape") closeActionMenu();
    });
    window.addEventListener("online", () => { dirty = true; scheduleSync(100); });
    window.addEventListener("offline", () => setSyncStatus("offline", "Lokalmodus", "Offline"));
    window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt = event; });
    window.addEventListener("storage", event => {
      if (event.key === LOCAL_STATE_KEY && event.newValue) {
        try {
          const incoming = normalizeState(JSON.parse(event.newValue));
          const merged = mergeStates(state, incoming);
          if (!statesEqual(merged, state)) { state = merged; render(); }
        } catch { /* ignore malformed cross-tab data */ }
      }
    });
    channel?.addEventListener("message", event => {
      if (event.data?.type !== "state" || event.data.source === clientId) return;
      const merged = mergeStates(state, event.data.state);
      if (!statesEqual(merged, state)) {
        state = merged;
        persistLocal({broadcast: false});
        render();
      }
    });
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    try { await navigator.serviceWorker.register("/sw.js", {scope: "/"}); } catch { /* app remains fully functional */ }
  }

  function initializeLocalState() {
    const stored = loadJson(LOCAL_STATE_KEY) || loadJson(LEGACY_LOCAL_KEY);
    if (!stored) {
      state = normalizeState(seed);
      persistLocal({broadcast: false});
      dirty = true;
      return;
    }
    state = normalizeState(stored);
    persistLocal({broadcast: false});
    if (!state.resources.schaeferCT || !state.resources.schaeferMRT) {
      state.resources = clone(seed.resources);
      dirty = true;
    }
  }


  function applyLaunchParameters() {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get("view") === "favorites") {
        preferences.activeView = "favorites";
        preferences.currentFolderId = null;
      }
      const folderId = params.get("folder");
      if (folderId && folderById(folderId)) {
        preferences.activeView = "folder";
        preferences.currentFolderId = folderId;
      }
      if (params.get("action") === "new-prompt") window.setTimeout(() => openPromptForm(), 250);
      if (params.toString() && history.replaceState) history.replaceState({}, "", location.pathname || "/");
    } catch { /* launch parameters are optional */ }
  }

  initializeLocalState();
  applyLaunchParameters();
  applyPreferences();
  bindGlobalEvents();
  render();
  loadRemote();
  registerServiceWorker();
})();
