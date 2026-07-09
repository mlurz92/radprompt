const STORAGE_KEY = "radprompt-state-v1";
const PLACEHOLDER_RE = /\*\*\*([^*]+)\*\*\*/g;
const MODALITY_OPTIONS = ["CT", "MRT", "Röntgen", "CT&MRT"];
const PROF_CT_URL = "/data/prof-schaefer-ct.txt";
const PROF_MRT_URL = "/data/prof-schaefer-mrt.txt";

const stateRef = {
  data: null,
  seed: null,
  health: null,
  saveTimer: null,
  placeholderValues: {},
  activePromptId: null,
  docs: { ct: "", mrt: "" },
  drag: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "id") {
  if (crypto.randomUUID) return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debounceSave() {
  clearTimeout(stateRef.saveTimer);
  stateRef.saveTimer = setTimeout(() => saveState("auto"), 420);
}

function detectPlaceholders(body) {
  const found = [];
  String(body || "").replace(PLACEHOLDER_RE, (_, raw) => {
    const name = raw.trim();
    if (name && !found.includes(name)) found.push(name);
    return "";
  });
  return found;
}

function normalizeState(input) {
  const fallback = stateRef.seed || {
    schema: "radprompt-state",
    version: 1,
    settings: { activeFolderId: "f_befundung", density: "comfortable", theme: "aero-dark" },
    folders: [],
    prompts: []
  };
  const data = structuredClone(input || fallback);
  data.schema = "radprompt-state";
  data.version = Number(data.version || 1);
  data.settings = data.settings || {};
  data.settings.activeFolderId = data.settings.activeFolderId || data.folders?.[0]?.id || "";
  data.settings.density = data.settings.density || "comfortable";
  data.folders = Array.isArray(data.folders) ? data.folders : [];
  data.prompts = Array.isArray(data.prompts) ? data.prompts : [];

  data.folders = data.folders.map((folder, index) => ({
    id: folder.id || uid("f"),
    name: String(folder.name || `Ordner ${index + 1}`).trim(),
    order: Number.isFinite(Number(folder.order)) ? Number(folder.order) : index
  })).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "de"));

  if (!data.folders.length) {
    data.folders.push({ id: "f_befundung", name: "Bildbefundung", order: 0 });
  }
  const folderIds = new Set(data.folders.map(folder => folder.id));
  const firstFolderId = data.folders[0].id;

  data.prompts = data.prompts.map((prompt, index) => {
    const body = String(prompt.body || "");
    const title = String(prompt.title || `Prompt ${index + 1}`).trim();
    return {
      id: prompt.id || uid("p"),
      folderId: folderIds.has(prompt.folderId) ? prompt.folderId : firstFolderId,
      title,
      body,
      favorite: Boolean(prompt.favorite),
      includeSchaeferDocs: Boolean(prompt.includeSchaeferDocs),
      placeholders: detectPlaceholders(body),
      createdAt: prompt.createdAt || nowIso(),
      updatedAt: prompt.updatedAt || nowIso(),
      order: Number.isFinite(Number(prompt.order)) ? Number(prompt.order) : index
    };
  }).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "de"));

  if (!folderIds.has(data.settings.activeFolderId)) data.settings.activeFolderId = firstFolderId;
  data.updatedAt = data.updatedAt || nowIso();
  return data;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Accept": "application/json", ...(options.headers || {}) },
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(typeof payload === "string" ? payload : payload.message || response.statusText);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function loadText(url) {
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

async function loadSeed() {
  const seed = await fetchJson("/data/seed.json", { cache: "no-store" });
  stateRef.seed = normalizeState(seed);
  return stateRef.seed;
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function persistLocalState(data = stateRef.data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    toast("Lokale Sicherung fehlgeschlagen", "Speicherlimit des Browsers erreicht.");
  }
}

async function loadState() {
  const seed = await loadSeed();
  stateRef.docs.ct = await loadText(PROF_CT_URL);
  stateRef.docs.mrt = await loadText(PROF_MRT_URL);

  let active = null;
  try {
    const payload = await fetchJson("/api/state", { cache: "no-store" });
    if (payload?.ok && payload.state) active = normalizeState(payload.state);
    setSyncStatus("ok", "KV aktiv", "RADPROMPT_KV gelesen");
  } catch (error) {
    const local = loadLocalState();
    active = local || seed;
    setSyncStatus("local", "Lokaler Modus", error.status === 404 ? "KV leer · Seed aktiv" : "KV nicht erreichbar · localStorage aktiv");
  }

  stateRef.data = normalizeState(active);
  applyDensity();
  render();
  checkHealth(false);
  if (!loadLocalState()) persistLocalState();
}

async function saveState(reason = "manual") {
  if (!stateRef.data) return;
  stateRef.data.updatedAt = nowIso();
  persistLocalState();
  try {
    await fetchJson("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stateRef.data)
    });
    setSyncStatus("ok", "KV synchron", reason === "manual" ? "Manuell gespeichert" : "Änderungen gespeichert");
    if (reason === "manual") toast("Gespeichert", "RadPrompt-State in RADPROMPT_KV aktualisiert.");
  } catch (error) {
    setSyncStatus("local", "Nur lokal gespeichert", "KV-Speicherung nicht möglich");
    if (reason === "manual") toast("Lokal gespeichert", "KV-Binding prüfen: /api/health zeigt Details.");
  }
}

function setSyncStatus(status, title, subtitle) {
  const box = $("#syncStatus");
  box.dataset.status = status;
  box.innerHTML = `<span class="status-dot"></span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}</small></div>`;
}

function currentFolder() {
  const data = stateRef.data;
  return data.folders.find(folder => folder.id === data.settings.activeFolderId) || data.folders[0];
}

function promptsForView() {
  const data = stateRef.data;
  const term = $("#searchInput").value.trim().toLocaleLowerCase("de");
  const source = term ? data.prompts : data.prompts.filter(prompt => prompt.folderId === data.settings.activeFolderId);
  return source.filter(prompt => {
    if (!term) return true;
    const folder = data.folders.find(item => item.id === prompt.folderId);
    return [prompt.title, prompt.body, folder?.name].join(" ").toLocaleLowerCase("de").includes(term);
  }).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "de"));
}

function favorites() {
  return stateRef.data.prompts.filter(prompt => prompt.favorite).sort((a, b) => a.title.localeCompare(b.title, "de"));
}

function render() {
  if (!stateRef.data) return;
  renderFolders();
  renderFavorites();
  renderBoard();
  renderEditorFolderOptions();
}

function renderFolders() {
  const data = stateRef.data;
  const list = $("#folderList");
  list.innerHTML = "";
  data.folders.forEach(folder => {
    const count = data.prompts.filter(prompt => prompt.folderId === folder.id).length;
    const item = document.createElement("div");
    item.className = `folder-item${folder.id === data.settings.activeFolderId ? " active" : ""}`;
    item.draggable = true;
    item.dataset.folderId = folder.id;
    item.innerHTML = `
      <button class="folder-main" type="button" title="Ordner öffnen">
        <span aria-hidden="true">▦</span>
        <span class="folder-name">${escapeHtml(folder.name)}</span>
        <span class="folder-count">${count}</span>
      </button>
      <button class="icon-button folder-edit" type="button" title="Ordner bearbeiten" aria-label="Ordner bearbeiten">⋯</button>
    `;
    $(".folder-main", item).addEventListener("click", () => {
      data.settings.activeFolderId = folder.id;
      $("#searchInput").value = "";
      debounceSave();
      render();
    });
    $(".folder-edit", item).addEventListener("click", event => {
      event.stopPropagation();
      openFolderEditor(folder.id);
    });
    addFolderDragHandlers(item);
    list.append(item);
  });
}

function renderFavorites() {
  const strip = $("#favoriteStrip");
  const items = favorites();
  strip.innerHTML = "";
  if (!items.length) {
    strip.innerHTML = `<span class="badge">Keine Favoriten markiert</span>`;
    return;
  }
  items.forEach(prompt => {
    const button = document.createElement("button");
    button.className = "favorite-pill";
    button.type = "button";
    button.textContent = prompt.title;
    button.addEventListener("click", () => copyPrompt(prompt.id));
    strip.append(button);
  });
}

function renderBoard() {
  const data = stateRef.data;
  const folder = currentFolder();
  const term = $("#searchInput").value.trim();
  const prompts = promptsForView();
  $("#viewTitle").textContent = term ? "Suche" : folder.name;
  $("#boardTitle").textContent = term ? `Suchergebnisse für „${term}”` : folder.name;
  $("#boardMeta").textContent = `${prompts.length} Prompt${prompts.length === 1 ? "" : "s"} · ${data.prompts.filter(p => p.favorite).length} Favoriten · Stand ${formatDate(data.updatedAt)}`;
  const grid = $("#promptGrid");
  grid.innerHTML = "";
  prompts.forEach(prompt => grid.append(renderPromptCard(prompt, Boolean(term))));
  $("#emptyState").hidden = prompts.length > 0;
}

function renderPromptCard(prompt, searchMode = false) {
  const card = document.createElement("article");
  card.className = "prompt-card";
  card.dataset.promptId = prompt.id;
  card.draggable = !searchMode;
  const folder = stateRef.data.folders.find(item => item.id === prompt.folderId);
  const preview = prompt.body.replace(PLACEHOLDER_RE, (_, name) => `[${name.trim()}]`).slice(0, 260);
  const badges = [
    prompt.includeSchaeferDocs ? "Schäfer-Docs" : null,
    prompt.placeholders.length ? `${prompt.placeholders.length} Feld${prompt.placeholders.length === 1 ? "" : "er"}` : null,
    searchMode && folder ? folder.name : null
  ].filter(Boolean);

  card.innerHTML = `
    <div class="prompt-head">
      <div>
        <h4 class="prompt-title">${escapeHtml(prompt.title)}</h4>
        <div class="prompt-badges">${badges.map(label => `<span class="badge">${escapeHtml(label)}</span>`).join("")}</div>
      </div>
      <button class="icon-button star-button${prompt.favorite ? " active" : ""}" type="button" title="Favorit umschalten" aria-label="Favorit umschalten">★</button>
    </div>
    <div class="placeholder-stack"></div>
    <div class="prompt-preview">${escapeHtml(preview)}${prompt.body.length > 260 ? " …" : ""}</div>
    <div class="prompt-actions">
      <button class="primary-button copy-button" type="button">Kopieren</button>
      <button class="secondary-button expand-button" type="button">Erweitern</button>
      <button class="icon-button duplicate-button" type="button" title="Duplizieren" aria-label="Duplizieren">⧉</button>
    </div>
  `;

  const placeholders = $(".placeholder-stack", card);
  prompt.placeholders.forEach(name => placeholders.append(renderPlaceholderField(prompt.id, name)));
  $(".copy-button", card).addEventListener("click", () => copyPrompt(prompt.id));
  $(".expand-button", card).addEventListener("click", () => openPromptEditor(prompt.id));
  $(".duplicate-button", card).addEventListener("click", () => duplicatePrompt(prompt.id));
  $(".star-button", card).addEventListener("click", () => toggleFavorite(prompt.id));
  card.addEventListener("mousemove", event => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    card.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
  if (!searchMode) addPromptDragHandlers(card);
  return card;
}

function renderPlaceholderField(promptId, name) {
  const label = document.createElement("label");
  const values = stateRef.placeholderValues[promptId] || (stateRef.placeholderValues[promptId] = {});
  if (name === "Modalität") {
    label.innerHTML = `<span>${escapeHtml(name)}</span><select data-placeholder="${escapeHtml(name)}">${MODALITY_OPTIONS.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}</select>`;
    const select = $("select", label);
    select.value = values[name] || "CT";
    values[name] = select.value;
    select.addEventListener("input", () => { values[name] = select.value; });
  } else {
    label.innerHTML = `<span>${escapeHtml(name)}</span><input type="text" data-placeholder="${escapeHtml(name)}" autocomplete="off" placeholder="${escapeHtml(name)} ausfüllen">`;
    const input = $("input", label);
    input.value = values[name] || "";
    input.addEventListener("input", () => { values[name] = input.value; });
  }
  return label;
}

function buildPromptText(prompt) {
  const values = stateRef.placeholderValues[prompt.id] || {};
  let body = prompt.body.replace(PLACEHOLDER_RE, (_, raw) => {
    const name = raw.trim();
    const fallback = name === "Modalität" ? "CT" : `***${name}***`;
    return values[name] && String(values[name]).trim() ? String(values[name]).trim() : fallback;
  });
  if (prompt.includeSchaeferDocs) {
    const parts = [
      body,
      "\n\n---\n# Befundbeispiele Prof. Schäfer CT.txt\n",
      stateRef.docs.ct || "[Prof.-Schäfer-CT-Dokument konnte nicht geladen werden]",
      "\n\n---\n# Befundbeispiele Prof. Schäfer MRT.txt\n",
      stateRef.docs.mrt || "[Prof.-Schäfer-MRT-Dokument konnte nicht geladen werden]"
    ];
    body = parts.join("");
  }
  return body;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();
  if (!ok) throw new Error("Clipboard fallback failed");
}

async function copyPrompt(promptId) {
  const prompt = stateRef.data.prompts.find(item => item.id === promptId);
  if (!prompt) return;
  try {
    const text = buildPromptText(prompt);
    await copyText(text);
    toast("Kopiert", prompt.includeSchaeferDocs ? "Prompt inklusive CT- und MRT-Schäfer-Dokumenten in der Zwischenablage." : "Fertig ausgefüllter Prompt in der Zwischenablage.");
  } catch (error) {
    toast("Kopieren blockiert", "Browser benötigt HTTPS und Benutzerinteraktion. radprompt.pages.dev erfüllt dies nach Deployment.");
  }
}

function toggleFavorite(promptId) {
  const prompt = stateRef.data.prompts.find(item => item.id === promptId);
  if (!prompt) return;
  prompt.favorite = !prompt.favorite;
  prompt.updatedAt = nowIso();
  debounceSave();
  render();
}

function duplicatePrompt(promptId) {
  const source = stateRef.data.prompts.find(item => item.id === promptId);
  if (!source) return;
  const maxOrder = Math.max(0, ...stateRef.data.prompts.filter(item => item.folderId === source.folderId).map(item => Number(item.order || 0)));
  const clone = {
    ...structuredClone(source),
    id: uid("p"),
    title: `${source.title} · Kopie`,
    favorite: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    order: maxOrder + 1
  };
  stateRef.data.prompts.push(clone);
  debounceSave();
  render();
  toast("Dupliziert", clone.title);
}

function openPromptEditor(promptId = null) {
  const prompt = promptId ? stateRef.data.prompts.find(item => item.id === promptId) : null;
  stateRef.activePromptId = prompt?.id || null;
  $("#editorPromptId").value = prompt?.id || "";
  $("#editorTitleInput").value = prompt?.title || "";
  $("#editorFolderSelect").value = prompt?.folderId || stateRef.data.settings.activeFolderId;
  $("#editorBodyInput").value = prompt?.body || "";
  $("#editorFavoriteInput").checked = Boolean(prompt?.favorite);
  $("#editorSchaeferInput").checked = Boolean(prompt?.includeSchaeferDocs);
  $("#deletePromptBtn").hidden = !prompt;
  $("#duplicatePromptBtn").hidden = !prompt;
  $("#editorTitle").textContent = prompt ? "Prompt bearbeiten" : "Neuen Prompt anlegen";
  $("#editorMode").textContent = prompt ? "Prompt" : "Neu";
  renderDetectedPlaceholders();
  openModal("#editorModal");
  setTimeout(() => $("#editorTitleInput").focus(), 30);
}

function closePromptEditor() {
  stateRef.activePromptId = null;
  closeModal("#editorModal");
}

function renderEditorFolderOptions() {
  const select = $("#editorFolderSelect");
  if (!select || !stateRef.data) return;
  const selected = select.value;
  select.innerHTML = stateRef.data.folders.map(folder => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>`).join("");
  if (selected) select.value = selected;
}

function renderDetectedPlaceholders() {
  const body = $("#editorBodyInput").value;
  const placeholders = detectPlaceholders(body);
  const box = $("#detectedPlaceholders");
  box.innerHTML = placeholders.length
    ? placeholders.map(name => `<span class="badge">***${escapeHtml(name)}***${name === "Modalität" ? " · Dropdown" : ""}</span>`).join("")
    : `<span class="badge">Keine Platzhalter erkannt</span>`;
}

function submitEditor(event) {
  event.preventDefault();
  const id = $("#editorPromptId").value || uid("p");
  const existing = stateRef.data.prompts.find(item => item.id === id);
  const folderId = $("#editorFolderSelect").value || stateRef.data.settings.activeFolderId;
  const body = $("#editorBodyInput").value.trim();
  const next = {
    id,
    folderId,
    title: $("#editorTitleInput").value.trim(),
    body,
    favorite: $("#editorFavoriteInput").checked,
    includeSchaeferDocs: $("#editorSchaeferInput").checked,
    placeholders: detectPlaceholders(body),
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
    order: existing?.order ?? Math.max(0, ...stateRef.data.prompts.filter(item => item.folderId === folderId).map(item => Number(item.order || 0))) + 1
  };
  if (existing) Object.assign(existing, next);
  else stateRef.data.prompts.push(next);
  closePromptEditor();
  debounceSave();
  render();
  toast(existing ? "Aktualisiert" : "Angelegt", next.title);
}

function deletePrompt() {
  const id = $("#editorPromptId").value;
  if (!id) return;
  const prompt = stateRef.data.prompts.find(item => item.id === id);
  if (!prompt) return;
  if (!confirm(`Prompt „${prompt.title}” wirklich löschen?`)) return;
  stateRef.data.prompts = stateRef.data.prompts.filter(item => item.id !== id);
  closePromptEditor();
  debounceSave();
  render();
  toast("Gelöscht", prompt.title);
}

function openFolderEditor(folderId = null) {
  const folder = folderId ? stateRef.data.folders.find(item => item.id === folderId) : null;
  $("#folderIdInput").value = folder?.id || "";
  $("#folderNameInput").value = folder?.name || "";
  $("#deleteFolderBtn").hidden = !folder || stateRef.data.folders.length <= 1;
  $("#folderModalTitle").textContent = folder ? "Ordner bearbeiten" : "Neuen Ordner anlegen";
  openModal("#folderModal");
  setTimeout(() => $("#folderNameInput").focus(), 30);
}

function submitFolder(event) {
  event.preventDefault();
  const id = $("#folderIdInput").value || uid("f");
  const name = $("#folderNameInput").value.trim();
  const existing = stateRef.data.folders.find(item => item.id === id);
  if (existing) existing.name = name;
  else {
    stateRef.data.folders.push({ id, name, order: stateRef.data.folders.length });
    stateRef.data.settings.activeFolderId = id;
  }
  closeModal("#folderModal");
  debounceSave();
  render();
}

function deleteFolder() {
  const id = $("#folderIdInput").value;
  const folder = stateRef.data.folders.find(item => item.id === id);
  if (!folder || stateRef.data.folders.length <= 1) return;
  if (!confirm(`Ordner „${folder.name}” löschen? Enthaltene Prompts werden in den ersten Ordner verschoben.`)) return;
  const target = stateRef.data.folders.find(item => item.id !== id);
  stateRef.data.prompts.forEach(prompt => { if (prompt.folderId === id) prompt.folderId = target.id; });
  stateRef.data.folders = stateRef.data.folders.filter(item => item.id !== id);
  stateRef.data.settings.activeFolderId = target.id;
  closeModal("#folderModal");
  debounceSave();
  render();
}

function openModal(selector) {
  const modal = $(selector);
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(selector) {
  const modal = $(selector);
  modal.setAttribute("aria-hidden", "true");
}

function addPromptDragHandlers(card) {
  card.addEventListener("dragstart", event => {
    stateRef.drag = { type: "prompt", id: card.dataset.promptId };
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.dataset.promptId);
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    stateRef.drag = null;
    reorderPromptsFromDom();
  });
  card.addEventListener("dragover", event => {
    if (stateRef.drag?.type !== "prompt") return;
    event.preventDefault();
    const dragging = $(".prompt-card.dragging");
    if (!dragging || dragging === card) return;
    const rect = card.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2 || event.clientX > rect.left + rect.width / 2;
    card.parentElement.insertBefore(dragging, after ? card.nextSibling : card);
  });
}

function reorderPromptsFromDom() {
  const ids = $$("#promptGrid .prompt-card").map(card => card.dataset.promptId);
  if (!ids.length) return;
  const folderId = stateRef.data.settings.activeFolderId;
  ids.forEach((id, index) => {
    const prompt = stateRef.data.prompts.find(item => item.id === id && item.folderId === folderId);
    if (prompt) prompt.order = index;
  });
  debounceSave();
  render();
}

function addFolderDragHandlers(item) {
  item.addEventListener("dragstart", event => {
    stateRef.drag = { type: "folder", id: item.dataset.folderId };
    item.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.dataset.folderId);
  });
  item.addEventListener("dragend", () => {
    item.classList.remove("dragging");
    stateRef.drag = null;
    reorderFoldersFromDom();
  });
  item.addEventListener("dragover", event => {
    if (stateRef.drag?.type !== "folder") return;
    event.preventDefault();
    const dragging = $(".folder-item.dragging");
    if (!dragging || dragging === item) return;
    const rect = item.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2 || event.clientX > rect.left + rect.width / 2;
    item.parentElement.insertBefore(dragging, after ? item.nextSibling : item);
  });
}

function reorderFoldersFromDom() {
  const ids = $$("#folderList .folder-item").map(item => item.dataset.folderId);
  if (!ids.length) return;
  ids.forEach((id, index) => {
    const folder = stateRef.data.folders.find(item => item.id === id);
    if (folder) folder.order = index;
  });
  stateRef.data.folders.sort((a, b) => a.order - b.order);
  debounceSave();
  render();
}

function applyDensity() {
  document.body.dataset.density = stateRef.data?.settings?.density === "compact" ? "compact" : "comfortable";
  $("#densityBtn").setAttribute("aria-pressed", document.body.dataset.density === "compact" ? "true" : "false");
}

function toggleDensity() {
  stateRef.data.settings.density = stateRef.data.settings.density === "compact" ? "comfortable" : "compact";
  applyDensity();
  debounceSave();
}

async function resetToSeed() {
  if (!confirm("Startset erneut laden? Bestehende Änderungen werden lokal und im KV überschrieben.")) return;
  stateRef.data = normalizeState(stateRef.seed);
  persistLocalState();
  render();
  await saveState("manual");
}

function exportState() {
  const blob = new Blob([JSON.stringify(stateRef.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `radprompt-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function importState(file) {
  if (!file) return;
  try {
    const raw = await file.text();
    stateRef.data = normalizeState(JSON.parse(raw));
    persistLocalState();
    render();
    await saveState("manual");
    toast("Import abgeschlossen", file.name);
  } catch {
    toast("Import fehlgeschlagen", "JSON-Datei konnte nicht gelesen werden.");
  }
}

async function checkHealth(open = true) {
  if (open) openModal("#healthModal");
  const output = $("#healthOutput");
  output.textContent = "Wird geprüft …";
  try {
    const health = await fetchJson("/api/health", { cache: "no-store" });
    stateRef.health = health;
    output.textContent = JSON.stringify(health, null, 2);
    setSyncStatus(health.ok ? "ok" : "local", health.ok ? "KV aktiv" : "KV prüfen", health.message || "Health geprüft");
  } catch (error) {
    const payload = error.payload || { ok: false, message: error.message };
    stateRef.health = payload;
    output.textContent = JSON.stringify(payload, null, 2);
    setSyncStatus("error", "Health-Fehler", "API nicht erreichbar");
  }
}

async function copyHealth() {
  try {
    await copyText($("#healthOutput").textContent);
    toast("Diagnostik kopiert", "/api/health Payload in der Zwischenablage.");
  } catch {
    toast("Kopieren blockiert", "Diagnostik manuell aus dem Feld kopieren.");
  }
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "unbekannt";
  }
}

function toast(title, message = "") {
  const stack = $("#toastStack");
  const item = document.createElement("div");
  item.className = "toast";
  item.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<div>${escapeHtml(message)}</div>` : ""}`;
  stack.append(item);
  setTimeout(() => item.remove(), 3600);
}

function bindEvents() {
  $("#searchInput").addEventListener("input", renderBoard);
  $("#searchInput").addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.currentTarget.value = "";
      renderBoard();
    }
  });
  window.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("#searchInput").focus();
    }
    if (event.key === "Escape") {
      ["#editorModal", "#folderModal", "#healthModal"].forEach(closeModal);
    }
  });

  $("#newPromptBtn").addEventListener("click", () => openPromptEditor(null));
  $("#newFolderBtn").addEventListener("click", () => openFolderEditor(null));
  $("#saveNowBtn").addEventListener("click", () => saveState("manual"));
  $("#densityBtn").addEventListener("click", toggleDensity);
  $("#resetBtn").addEventListener("click", resetToSeed);
  $("#healthBtn").addEventListener("click", () => checkHealth(true));
  $("#exportBtn").addEventListener("click", exportState);
  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", event => importState(event.target.files?.[0]));

  $("#closeEditorBtn").addEventListener("click", closePromptEditor);
  $("#editorForm").addEventListener("submit", submitEditor);
  $("#editorBodyInput").addEventListener("input", renderDetectedPlaceholders);
  $("#deletePromptBtn").addEventListener("click", deletePrompt);
  $("#duplicatePromptBtn").addEventListener("click", () => duplicatePrompt($("#editorPromptId").value));

  $("#closeFolderBtn").addEventListener("click", () => closeModal("#folderModal"));
  $("#folderForm").addEventListener("submit", submitFolder);
  $("#deleteFolderBtn").addEventListener("click", deleteFolder);

  $("#closeHealthBtn").addEventListener("click", () => closeModal("#healthModal"));
  $("#copyHealthBtn").addEventListener("click", copyHealth);

  $$(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) backdrop.setAttribute("aria-hidden", "true");
    });
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {}));
  }
}

bindEvents();
loadState().catch(error => {
  setSyncStatus("error", "Start fehlgeschlagen", error.message || "Seed konnte nicht geladen werden");
  toast("Start fehlgeschlagen", "Bitte Repository-Dateien und /data/seed.json prüfen.");
});
