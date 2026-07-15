'use strict';

const App = {
    state: {
        currentPath: ['root'],
        data: null,
        favorites: [],
        isSorting: false,
        contextItemId: null,
        isPinned: false,
        pipWindow: null
    },
    elements: {},
    sortableInstance: null
};

App.init = function() {
    this.elements = {
        appHost: document.getElementById('app-host'),
        preloader: document.getElementById('preloader'),
        appTitle: document.getElementById('app-title'),
        backBtn: document.getElementById('back-btn'),
        breadcrumb: document.getElementById('breadcrumb'),
        cardsContainer: document.getElementById('cards-container'),
        addPromptBtn: document.getElementById('add-prompt-btn'),
        addFolderBtn: document.getElementById('add-folder-btn'),
        sortBtn: document.getElementById('sort-btn'),
        pinWindowBtn: document.getElementById('pin-window-btn'),
        favoritesContainer: document.getElementById('favorites-container'),
        modalOverlay: document.getElementById('modal-overlay'),
        modalContent: document.getElementById('modal-content'),
        contextMenu: document.getElementById('context-menu'),
        toastContainer: document.getElementById('toast-container')
    };

    this.bindEvents();
    this.loadData().then(() => {
        this.render();
        setTimeout(() => {
            this.elements.preloader.classList.add('loaded');
        }, 300);
    });
};

App.bindEvents = function() {
    this.elements.backBtn.addEventListener('click', () => this.navigateBack());
    this.elements.cardsContainer.addEventListener('click', (e) => {
        if (e.target === this.elements.cardsContainer || e.target.classList.contains('empty-state')) {
            this.navigateBack();
        }
    });
    this.elements.addPromptBtn.addEventListener('click', () => this.openModal('prompt'));
    this.elements.addFolderBtn.addEventListener('click', () => this.openModal('folder'));
    this.elements.sortBtn.addEventListener('click', () => this.toggleSortMode());
    this.elements.pinWindowBtn.addEventListener('click', () => this.togglePinnedWindow());
    document.addEventListener('click', () => this.closeContextMenu());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            this.closeContextMenu();
            this.closeModal();
            this.unflipCards();
        }
    });
    this.elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.elements.modalOverlay) this.closeModal();
    });
};

App.loadData = async function() {
    try {
        const response = await fetch('/api/kv');
        if (response.ok) {
            const result = await response.json();
            if (result && result.data) {
                this.state.data = result.data;
                this.state.favorites = result.favorites || [];
                return;
            }
        }
        throw new Error('KV fetch failed');
    } catch (error) {
        const localData = localStorage.getItem('radprompt_data');
        const localFavs = localStorage.getItem('radprompt_favorites');
        if (localData) {
            this.state.data = JSON.parse(localData);
            this.state.favorites = localFavs ? JSON.parse(localFavs) : [];
        } else {
            this.state.data = initialData;
            this.state.favorites = [];
            this.saveData();
        }
    }
};

App.saveData = async function() {
    localStorage.setItem('radprompt_data', JSON.stringify(this.state.data));
    localStorage.setItem('radprompt_favorites', JSON.stringify(this.state.favorites));
    try {
        await fetch('/api/kv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: this.state.data, favorites: this.state.favorites })
        });
    } catch (error) {
        console.warn('KV sync failed, saved locally only.');
    }
};

App.getCurrentNode = function() {
    let node = this.state.data;
    for (let i = 1; i < this.state.currentPath.length; i++) {
        const id = this.state.currentPath[i];
        node = node.children.find(child => child.id === id);
        if (!node) return this.state.data;
    }
    return node;
};

App.render = function() {
    const node = this.getCurrentNode();
    this.elements.cardsContainer.innerHTML = '';

    this.renderLocationTitle(node);
    this.renderBreadcrumb();
    this.elements.backBtn.classList.toggle('hidden', this.state.currentPath.length === 1);

    if (!node.children || node.children.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `<div>Ordner ist leer.</div><div style="font-size: 0.8rem; opacity: 0.7;">Klicke auf einen freien Bereich, um zurückzugehen.</div>`;
        this.elements.cardsContainer.appendChild(emptyState);
        this.initSortable();
        return;
    }

    node.children.forEach(item => {
        const card = this.createCard(item);
        this.elements.cardsContainer.appendChild(card);
    });

    this.initSortable();
    this.renderFavorites();

    this.animateCardsIn();
};

App.animateCardsIn = function() {
    if (window.gsap) {
        gsap.fromTo('.card',
            { opacity: 0, y: 20, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.03, ease: 'power2.out' }
        );
    }
};

App.animateContextMenuIn = function() {
    if (window.gsap) {
        gsap.fromTo(this.elements.contextMenu,
            { opacity: 0, scale: 0.96, y: -4 },
            { opacity: 1, scale: 1, y: 0, duration: 0.16, ease: 'power2.out' }
        );
    }
};

App.renderLocationTitle = function(node = this.getCurrentNode()) {
    const title = node && node.id === 'root' ? 'Home' : node.title;
    this.elements.appTitle.textContent = title;
    document.title = `${title} · RadPrompt`;
};

App.renderBreadcrumb = function() {
    this.elements.breadcrumb.innerHTML = '';
    this.state.currentPath.forEach((id, index) => {
        if (index > 0) {
            const sep = document.createElement('span');
            sep.textContent = '/';
            sep.className = 'breadcrumb-sep';
            this.elements.breadcrumb.appendChild(sep);
        }
        const span = document.createElement('span');
        span.className = 'breadcrumb-item';
        span.textContent = id === 'root' ? 'Home' : this.findNodeById(id).title;
        span.addEventListener('click', () => {
            this.state.currentPath = this.state.currentPath.slice(0, index + 1);
            this.render();
        });
        this.elements.breadcrumb.appendChild(span);
    });
};

App.findNodeById = function(id, node = this.state.data) {
    if (node.id === id) return node;
    if (!node.children) return null;
    for (let child of node.children) {
        const found = this.findNodeById(id, child);
        if (found) return found;
    }
    return null;
};

App.createCard = function(item) {
    const card = document.createElement('div');
    card.className = `card${this.state.isSorting ? ' sorting' : ''}`;
    card.dataset.id = item.id;
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.openContextMenu(e, item, card);
    });
    card.draggable = this.state.isSorting;

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const front = document.createElement('div');
    front.className = 'card-face card-front';

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = item.title;
    front.appendChild(title);

    if (item.type === 'prompt') {
        const placeholders = this.getPlaceholders(item.text);
        if (placeholders.length > 0) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'card-input-group';
            placeholders.forEach(ph => {
                if (ph === 'Modalität') {
                    const select = document.createElement('select');
                    select.className = 'card-select';
                    select.dataset.placeholder = ph;
                    ['CT', 'MRT', 'Röntgen', 'CT&MRT'].forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt;
                        option.textContent = opt;
                        select.appendChild(option);
                    });
                    inputGroup.appendChild(select);
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'card-input';
                    input.dataset.placeholder = ph;
                    input.placeholder = ph.replace(/_/g, ' ');
                    inputGroup.appendChild(input);
                }
            });
            front.appendChild(inputGroup);
        }

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-icon-sm copy-btn';
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        copyBtn.title = 'Prompt kopieren';
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyPrompt(item, card);
        });
        front.appendChild(copyBtn);
    } else if (item.type === 'folder') {
        const folderIcon = document.createElement('div');
        folderIcon.className = 'folder-icon';
        folderIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
        front.appendChild(folderIcon);
    }

    const expandBtn = document.createElement('button');
    expandBtn.className = 'expand-btn';
    expandBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
    expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.add('flipped');
    });
    front.appendChild(expandBtn);

    const favBtn = document.createElement('button');
    favBtn.className = 'btn-icon-sm fav-btn';
    if (this.state.favorites.includes(item.id)) favBtn.classList.add('active');
    favBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${this.state.favorites.includes(item.id) ? 'var(--accent)' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(item.id, favBtn);
    });
    front.appendChild(favBtn);

    const back = document.createElement('div');
    back.className = 'card-face card-back';

    const backTitle = document.createElement('div');
    backTitle.className = 'card-title';
    backTitle.textContent = item.title;
    back.appendChild(backTitle);

    if (item.type === 'prompt') {
        const text = document.createElement('div');
        text.className = 'card-text';
        text.textContent = item.text;
        back.appendChild(text);
    } else {
        const backText = document.createElement('div');
        backText.className = 'card-text';
        backText.textContent = `Ordner enthält ${item.children.length} Element(e).`;
        back.appendChild(backText);
    }

    const backActions = document.createElement('div');
    backActions.className = 'card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon-sm';
    editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openModal(item.type, item);
    });
    backActions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon-sm danger';
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteItem(item.id);
    });
    backActions.appendChild(deleteBtn);

    const closeBackBtn = document.createElement('button');
    closeBackBtn.className = 'btn-icon-sm';
    closeBackBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>`;
    closeBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.remove('flipped');
    });
    backActions.appendChild(closeBackBtn);

    back.appendChild(backActions);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    if (item.type === 'folder' && !this.state.isSorting) {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
            this.state.currentPath.push(item.id);
            this.render();
        });
    }

    return card;
};

App.getPlaceholders = function(text) {
    const matches = text.match(/\*\*\*(.*?)\*\*\*/g);
    if (!matches) return [];
    const unique = [...new Set(matches.map(m => m.replace(/\*\*\*/g, '')))];
    return unique;
};

App.copyPrompt = async function(item, cardEl) {
    let text = item.text;
    const inputs = cardEl.querySelectorAll('.card-input, .card-select');
    inputs.forEach(input => {
        const ph = `***${input.dataset.placeholder}***`;
        const regex = new RegExp(ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        text = text.replace(regex, input.value || input.dataset.placeholder);
    });

    try {
        if (item.isSchaefer) {
            const combinedText = `${text}\n\n${schaeferCTText}\n\n${schaeferMRTText}`;
            await navigator.clipboard.writeText(combinedText);
            this.showToast('Prompt + Schäfer Beispiele kopiert!', 'success');
        } else {
            await navigator.clipboard.writeText(text);
            this.showToast('Prompt erfolgreich kopiert!', 'success');
        }
    } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = item.isSchaefer ? `${text}\n\n${schaeferCTText}\n\n${schaeferMRTText}` : text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            this.showToast('Prompt erfolgreich kopiert!', 'success');
        } catch (execErr) {
            this.showToast('Kopieren fehlgeschlagen.', 'error');
        }
        document.body.removeChild(textArea);
    }
};

App.toggleFavorite = function(id, btnEl) {
    const index = this.state.favorites.indexOf(id);
    const svg = btnEl.querySelector('svg');
    if (index > -1) {
        this.state.favorites.splice(index, 1);
        btnEl.classList.remove('active');
        svg.setAttribute('fill', 'none');
    } else {
        this.state.favorites.push(id);
        btnEl.classList.add('active');
        svg.setAttribute('fill', 'var(--accent)');
    }
    this.renderFavorites();
    this.saveData();
};

App.renderFavorites = function() {
    this.elements.favoritesContainer.innerHTML = '';
    if (this.state.favorites.length === 0) {
        this.elements.favoritesContainer.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem;">Keine Favoriten markiert</span>`;
        return;
    }
    this.state.favorites.forEach(id => {
        const item = this.findNodeById(id);
        if (item) {
            const fav = document.createElement('div');
            fav.className = 'fav-item';
            fav.textContent = item.title;
            fav.addEventListener('click', () => {
                if (item.type === 'prompt') {
                    const cardEl = this.createCard(item);
                    this.copyPrompt(item, cardEl);
                } else {
                    this.navigateIntoFolder(id);
                }
            });
            this.elements.favoritesContainer.appendChild(fav);
        }
    });
};

App.navigateIntoFolder = function(id) {
    const findPath = (node, target, currentPath) => {
        if (node.id === target) return [...currentPath, node.id];
        if (!node.children) return null;
        for (let child of node.children) {
            const res = findPath(child, target, [...currentPath, node.id]);
            if (res) return res;
        }
        return null;
    };
    const fullPath = findPath(this.state.data, id, []);
    if (fullPath) {
        this.state.currentPath = fullPath;
        this.render();
    }
};

App.navigateBack = function() {
    if (this.state.currentPath.length > 1) {
        this.state.currentPath.pop();
        this.render();
    }
};

App.toggleSortMode = function() {
    this.state.isSorting = !this.state.isSorting;
    this.elements.sortBtn.classList.toggle('active', this.state.isSorting);
    document.querySelectorAll('.card').forEach(c => {
        c.draggable = this.state.isSorting;
        c.classList.toggle('sorting', this.state.isSorting);
    });
    this.showToast(this.state.isSorting ? 'Sortiermodus aktiviert' : 'Sortiermodus deaktiviert', 'success');
};

App.initSortable = function() {
    if (!window.Sortable) {
        return;
    }
    if (this.sortableInstance) {
        this.sortableInstance.destroy();
    }
    this.sortableInstance = new Sortable(this.elements.cardsContainer, {
        animation: 200,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        disabled: !this.state.isSorting,
        filter: '.btn-icon-sm, .expand-btn, .card-input, .card-select, .card-text',
        preventOnFilter: false,
        onEnd: (evt) => {
            if (evt.oldIndex === evt.newIndex) return;
            const node = this.getCurrentNode();
            const movedItem = node.children.splice(evt.oldIndex, 1)[0];
            node.children.splice(evt.newIndex, 0, movedItem);
            this.saveData();
        }
    });
};


App.unflipCards = function(root = document) {
    root.querySelectorAll('.card.flipped').forEach(card => card.classList.remove('flipped'));
};

App.togglePinnedWindow = async function() {
    if (this.state.isPinned) {
        this.closePinnedWindow();
        return;
    }

    if (!('documentPictureInPicture' in window)) {
        this.showToast('Immer-im-Vordergrund wird von diesem Browser nicht unterstützt.', 'error');
        return;
    }

    try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({ width: 520, height: 760 });
        this.state.pipWindow = pipWindow;
        this.state.isPinned = true;
        this.elements.pinWindowBtn.classList.add('active');
        this.copyStylesToPinnedWindow(pipWindow);
        pipWindow.document.body.className = 'pip-body';
        pipWindow.document.body.appendChild(this.elements.appHost);
        pipWindow.document.addEventListener('click', () => this.closeContextMenu());
        pipWindow.document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeContextMenu();
                this.closeModal();
                this.unflipCards(pipWindow.document);
            }
        });
        pipWindow.addEventListener('pagehide', () => this.restoreFromPinnedWindow(), { once: true });
        this.showToast('RadPrompt bleibt jetzt im Vordergrund.', 'success');
    } catch (error) {
        this.state.isPinned = false;
        this.state.pipWindow = null;
        this.elements.pinWindowBtn.classList.remove('active');
        this.showToast('Vordergrundmodus konnte nicht gestartet werden.', 'error');
    }
};

App.copyStylesToPinnedWindow = function(pipWindow) {
    [...document.querySelectorAll('link[rel="stylesheet"], style')].forEach(node => {
        pipWindow.document.head.appendChild(node.cloneNode(true));
    });
    const meta = pipWindow.document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0';
    pipWindow.document.head.appendChild(meta);
    pipWindow.document.title = 'RadPrompt · Vordergrund';
};

App.closePinnedWindow = function() {
    const pipWindow = this.state.pipWindow;
    this.restoreFromPinnedWindow();
    if (pipWindow && !pipWindow.closed) {
        pipWindow.close();
    }
};

App.restoreFromPinnedWindow = function() {
    const anchor = document.querySelector('script[src="data.js"]') || document.body.firstChild;
    if (!document.body.contains(this.elements.appHost)) {
        document.body.insertBefore(this.elements.appHost, anchor);
    }
    this.state.isPinned = false;
    this.state.pipWindow = null;
    this.elements.pinWindowBtn.classList.remove('active');
};

App.openContextMenu = function(event, item, cardEl) {
    this.state.contextItemId = item.id;
    const favoriteLabel = this.state.favorites.includes(item.id) ? 'Favorit entfernen' : 'Als Favorit markieren';
    const folderAction = item.type === 'folder' ? '<button data-action="open">Ordner öffnen</button>' : '';
    const copyAction = item.type === 'prompt' ? '<button data-action="copy">Prompt kopieren</button>' : '';
    this.elements.contextMenu.innerHTML = `
        ${copyAction}
        ${folderAction}
        <button data-action="favorite">${favoriteLabel}</button>
        <button data-action="expand">Details anzeigen</button>
        <div class="menu-separator"></div>
        <button data-action="edit">Bearbeiten</button>
        <button data-action="delete" class="danger">Löschen</button>
    `;
    this.elements.contextMenu.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleContextAction(button.dataset.action, item, cardEl);
        });
    });
    this.elements.contextMenu.classList.remove('hidden');
    const rect = this.elements.contextMenu.getBoundingClientRect();
    const left = Math.min(event.clientX, window.innerWidth - rect.width - 12);
    const top = Math.min(event.clientY, window.innerHeight - rect.height - 12);
    this.elements.contextMenu.style.left = `${Math.max(12, left)}px`;
    this.elements.contextMenu.style.top = `${Math.max(12, top)}px`;
    this.animateContextMenuIn();
};

App.handleContextAction = function(action, item, cardEl) {
    this.closeContextMenu();
    if (action === 'copy') this.copyPrompt(item, cardEl);
    if (action === 'open') this.navigateIntoFolder(item.id);
    if (action === 'favorite') this.toggleFavorite(item.id, cardEl.querySelector('.fav-btn'));
    if (action === 'expand') cardEl.classList.add('flipped');
    if (action === 'edit') this.openModal(item.type, item);
    if (action === 'delete') this.deleteItem(item.id);
};

App.closeContextMenu = function() {
    if (!this.elements.contextMenu) return;
    this.elements.contextMenu.classList.add('hidden');
    this.state.contextItemId = null;
};

App.openModal = function(type, item = null) {
    const isEdit = !!item;
    this.elements.modalContent.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">${isEdit ? 'Bearbeiten' : 'Hinzufügen'} ${type === 'prompt' ? 'Prompt' : 'Ordner'}</h2>
            <button class="icon-btn" id="modal-close-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label class="form-label">Titel</label>
                <input type="text" id="modal-title-input" class="form-input" value="${isEdit ? item.title.replace(/"/g, '&quot;') : ''}">
            </div>
            ${type === 'prompt' ? `
            <div class="form-group">
                <label class="form-label">Prompt-Text (Platzhalter: ***Name***)</label>
                <textarea id="modal-text-input" class="form-textarea">${isEdit ? item.text : ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Prof. Schäfer Prompt (Kopiert zusätzlich CT/MRT Texte)</label>
                <select id="modal-schaefer-input" class="form-select">
                    <option value="false" ${!isEdit || !item.isSchaefer ? 'selected' : ''}>Nein</option>
                    <option value="true" ${isEdit && item.isSchaefer ? 'selected' : ''}>Ja</option>
                </select>
            </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" id="modal-cancel-btn">Abbrechen</button>
            <button class="btn-primary" id="modal-save-btn">Speichern</button>
        </div>
    `;

    this.elements.modalOverlay.classList.remove('hidden');
    this.elements.modalOverlay.classList.add('flex');

    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel-btn').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-save-btn').addEventListener('click', () => {
        const title = document.getElementById('modal-title-input').value.trim();
        if (!title) {
            this.showToast('Titel darf nicht leer sein.', 'error');
            return;
        }
        if (type === 'prompt') {
            const text = document.getElementById('modal-text-input').value;
            const isSchaefer = document.getElementById('modal-schaefer-input').value === 'true';
            if (isEdit) {
                item.title = title;
                item.text = text;
                item.isSchaefer = isSchaefer;
            } else {
                this.getCurrentNode().children.push({
                    id: 'prompt-' + Date.now(),
                    type: 'prompt',
                    title,
                    text,
                    isSchaefer
                });
            }
        } else {
            if (isEdit) {
                item.title = title;
            } else {
                this.getCurrentNode().children.push({
                    id: 'folder-' + Date.now(),
                    type: 'folder',
                    title,
                    children: []
                });
            }
        }
        this.saveData();
        this.closeModal();
        this.render();
    });
};

App.closeModal = function() {
    this.elements.modalOverlay.classList.add('hidden');
    this.elements.modalOverlay.classList.remove('flex');
};

App.deleteItem = function(id) {
    const node = this.getCurrentNode();
    const index = node.children.findIndex(c => c.id === id);
    if (index > -1) {
        const itemName = node.children[index].title;
        node.children.splice(index, 1);
        this.state.favorites = this.state.favorites.filter(f => f !== id);
        this.saveData();
        this.render();
        this.showToast(`"${itemName}" gelöscht`, 'success');
    }
};

App.showToast = function(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
};

document.addEventListener('DOMContentLoaded', () => App.init());
