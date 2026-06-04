import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, get, set, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAs-G-HwvyrOlXY8ttlBCoCYdThM9RQHhE",
  authDomain: "avarepromocoes.firebaseapp.com",
  databaseURL: "https://avarepromocoes-default-rtdb.firebaseio.com",
  projectId: "avarepromocoes",
  storageBucket: "avarepromocoes.firebasestorage.app",
  messagingSenderId: "958063932842",
  appId: "1:958063932842:web:0bda33b541be8f681ea7d3"
};

const CLOUD_NAME = "dsbgxm8fz";
const UPLOAD_PRESET = "meu_upload";
const ADMIN_UIDS = [
 "6zEZnxqhV3PhKkTCDzyH71zbRsM2",
 "VpJDVk8PWqQxmJxMHArbz6Oo9Bp1",
 "03pXFuSDiGZFG90DfxIuYispDwU2",
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let categoriesData = [];
let currentCategoryId = null;
let currentDelete = null;
let photoCount = 0;
let currentEstablishmentData = null;
const MAX_PHOTOS = 3;
const MAX_KEYWORDS = 6;

const sidebarNavBtns = document.querySelectorAll('.sidebar .nav-item[data-page]');
const pages = document.querySelectorAll('.page');
const mobileToggle = document.getElementById('mobileMenuToggle');
const mobileSidebar = document.getElementById('mobileSidebar');
const closeSidebar = document.getElementById('closeSidebar');
const overlay = document.getElementById('overlay');
const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn[data-page]');
const logoutBtn = document.getElementById('logoutBtn');
const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
const rightPanel = document.getElementById('rightPanel');
const panelClose = document.getElementById('panelClose');
const panelTitle = document.getElementById('panelTitle');
const panelBody = document.getElementById('panelBody');
const panelAddBtn = document.getElementById('panelAddBtn');
const searchInput = document.getElementById('searchCategories');
const newCategoryBtn = document.getElementById('newCategoryBtn');
const categoryModal = document.getElementById('categoryModal');
const establishmentFormModal = document.getElementById('establishmentFormModal');
const confirmModal = document.getElementById('confirmModal');
const addToCategoriesModal = document.getElementById('addToCategoriesModal');
const categoryForm = document.getElementById('categoryForm');
const establishmentForm = document.getElementById('establishmentForm');

let currentKeywords = [];

// Função para obter apenas dígitos
function getDigitsOnly(value) {
    if (!value) return '';
    return value.replace(/\D/g, '');
}

// ==================== MÁSCARA PARA TELEFONE (3 dígitos no DDD) ====================
// Formato: (014) 99999-9999 ou (014) 9999-9999
function formatPhoneLive(input) {
    let value = input.value;
    let digits = getDigitsOnly(value);
    
    // Limitar a no máximo 12 dígitos (3 DDD + 9 números)
    if (digits.length > 12) {
        digits = digits.slice(0, 12);
    }
    
    let formatted = '';
    
    if (digits.length === 0) {
        formatted = '';
    } else if (digits.length <= 3) {
        formatted = `(${digits}`;
    } else if (digits.length <= 7) {
        const ddd = digits.slice(0, 3);
        const firstPart = digits.slice(3);
        formatted = `(${ddd}) ${firstPart}`;
    } else {
        const ddd = digits.slice(0, 3);
        const rest = digits.slice(3);
        
        if (rest.length <= 4) {
            formatted = `(${ddd}) ${rest}`;
        } else {
            if (rest.length === 9 || (rest.length > 9 && (digits.length - 3) >= 9)) {
                const firstFive = rest.slice(0, 5);
                const lastFour = rest.slice(5, 9);
                formatted = `(${ddd}) ${firstFive}-${lastFour}`;
                if (rest.length > 9) formatted += rest.slice(9);
            } else if (rest.length === 8 || (rest.length > 8 && (digits.length - 3) >= 8)) {
                const firstFour = rest.slice(0, 4);
                const lastFour = rest.slice(4, 8);
                formatted = `(${ddd}) ${firstFour}-${lastFour}`;
                if (rest.length > 8) formatted += rest.slice(8);
            } else {
                formatted = `(${ddd}) ${rest}`;
            }
        }
    }
    
    input.value = formatted;
}

// ==================== MÁSCARA PARA WHATSAPP (2 dígitos no DDD + 9 números) ====================
// Formato: (14) 99999-9999
function formatWhatsAppLive(input) {
    let value = input.value;
    let digits = getDigitsOnly(value);
    
    // Limitar a no máximo 11 dígitos (2 DDD + 9 números)
    if (digits.length > 11) {
        digits = digits.slice(0, 11);
    }
    
    let formatted = '';
    
    if (digits.length === 0) {
        formatted = '';
    } else if (digits.length <= 2) {
        formatted = `(${digits}`;
    } else if (digits.length <= 7) {
        const ddd = digits.slice(0, 2);
        const firstPart = digits.slice(2);
        formatted = `(${ddd}) ${firstPart}`;
    } else {
        const ddd = digits.slice(0, 2);
        const rest = digits.slice(2);
        
        // WhatsApp sempre tem 9 dígitos depois do DDD
        if (rest.length <= 5) {
            formatted = `(${ddd}) ${rest}`;
        } else {
            const firstFive = rest.slice(0, 5);
            const lastFour = rest.slice(5, 9);
            formatted = `(${ddd}) ${firstFive}-${lastFour}`;
            if (rest.length > 9) formatted += rest.slice(9);
        }
    }
    
    input.value = formatted;
}

// Função que retorna o valor exato digitado (apenas dígitos brutos)
function getRawPhoneValue(formattedValue) {
    if (!formattedValue) return '';
    return formattedValue.replace(/\D/g, '');
}

// Função para aplicar as máscaras nos campos
function setupPhoneMasks() {
    // Telefone: máscara com DDD de 3 dígitos
    const phoneField = document.getElementById('estPhone');
    if (phoneField) {
        const newPhoneField = phoneField.cloneNode(true);
        phoneField.parentNode.replaceChild(newPhoneField, phoneField);
        
        newPhoneField.addEventListener('input', function(e) {
            const cursorPos = this.selectionStart;
            const oldLength = this.value.length;
            formatPhoneLive(this);
            const newLength = this.value.length;
            const diff = newLength - oldLength;
            if (cursorPos + diff >= 0) {
                this.setSelectionRange(cursorPos + diff, cursorPos + diff);
            }
        });
        
        newPhoneField.addEventListener('keydown', function(e) {
            const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
            if (allowedKeys.includes(e.key)) return;
            if (!/^[\d]$/.test(e.key) && e.key !== '(' && e.key !== ')' && e.key !== ' ' && e.key !== '-') {
                e.preventDefault();
            }
        });
    }
    
    // WhatsApp: máscara com DDD de 2 dígitos
    const whatsField = document.getElementById('estWhatsapp');
    if (whatsField) {
        const newWhatsField = whatsField.cloneNode(true);
        whatsField.parentNode.replaceChild(newWhatsField, whatsField);
        
        newWhatsField.addEventListener('input', function(e) {
            const cursorPos = this.selectionStart;
            const oldLength = this.value.length;
            formatWhatsAppLive(this);
            const newLength = this.value.length;
            const diff = newLength - oldLength;
            if (cursorPos + diff >= 0) {
                this.setSelectionRange(cursorPos + diff, cursorPos + diff);
            }
        });
        
        newWhatsField.addEventListener('keydown', function(e) {
            const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
            if (allowedKeys.includes(e.key)) return;
            if (!/^[\d]$/.test(e.key) && e.key !== '(' && e.key !== ')' && e.key !== ' ' && e.key !== '-') {
                e.preventDefault();
            }
        });
    }
}

function renderKeywordTags() {
    const container = document.getElementById('keywordsTags');
    if (!container) return;
    container.innerHTML = currentKeywords.map((kw, idx) => `
        <span class="keyword-tag">
            ${escapeHtml(kw)}
            <button type="button" data-keyword="${escapeHtml(kw)}" data-index="${idx}" class="remove-keyword">×</button>
        </span>
    `).join('');
    container.querySelectorAll('.remove-keyword').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            if (!isNaN(idx)) {
                currentKeywords.splice(idx, 1);
                renderKeywordTags();
            }
        });
    });
}

function setupKeywordsInput() {
    const input = document.getElementById('keywordsInput');
    if (!input) return;
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            let value = input.value.trim();
            if (value.endsWith(',')) value = value.slice(0, -1).trim();
            if (value && currentKeywords.length < MAX_KEYWORDS) {
                if (!currentKeywords.includes(value)) {
                    currentKeywords.push(value);
                    renderKeywordTags();
                }
                input.value = '';
            } else if (currentKeywords.length >= MAX_KEYWORDS) {
                showToast(`Máximo de ${MAX_KEYWORDS} palavras-chave`, 'info');
            }
        }
    });
    input.addEventListener('blur', () => {
        let value = input.value.trim();
        if (value && currentKeywords.length < MAX_KEYWORDS) {
            if (!currentKeywords.includes(value)) {
                currentKeywords.push(value);
                renderKeywordTags();
            }
            input.value = '';
        }
    });
}

function resetKeywords() {
    currentKeywords = [];
    renderKeywordTags();
    const input = document.getElementById('keywordsInput');
    if (input) input.value = '';
}

function setKeywords(keywordsArray) {
    currentKeywords = keywordsArray ? [...keywordsArray] : [];
    renderKeywordTags();
}

function getKeywords() {
    return currentKeywords;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toastContainer');
    const icons = {
        success: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        info: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-icon">${icons[type] || icons.info}</div><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('exit');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
}

function animateCounter(el, target, duration = 600) {
    const start = 0;
    const startTs = performance.now();
    const update = (ts) => {
        const elapsed = ts - startTs;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * eased);
        if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

async function uploadToCloudinary(file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Upload error:', error);
        return null;
    }
}

function setupIconSearch() {
    const searchInput = document.getElementById('iconSearchInput');
    const searchBtn = document.getElementById('searchGoogleImagesBtn');
    if (!searchBtn) return;
    const performSearch = () => {
        let query = searchInput?.value.trim();
        if (!query) query = document.getElementById('catName')?.value.trim() || 'icone';
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' ícone png')}&tbm=isch`;
        window.open(searchUrl, '_blank');
        showToast('Selecione uma imagem e copie a URL', 'info');
    };
    searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
}

function openDrawer() {
    mobileSidebar.classList.add('open');
    overlay.classList.add('active');
    mobileToggle.setAttribute('aria-expanded', 'true');
}

function closeDrawer() {
    mobileSidebar.classList.remove('open');
    overlay.classList.remove('active');
    mobileToggle.setAttribute('aria-expanded', 'false');
}

mobileToggle.addEventListener('click', openDrawer);
closeSidebar.addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);

function navigateTo(page) {
    sidebarNavBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
    });
    mobileNavBtns.forEach(btn => btn.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`${page}Page`);
    if (targetPage) targetPage.classList.add('active');
    const activeDesktop = Array.from(sidebarNavBtns).find(btn => btn.dataset.page === page);
    const activeMobile = Array.from(mobileNavBtns).find(btn => btn.dataset.page === page);
    if (activeDesktop) { activeDesktop.classList.add('active'); activeDesktop.setAttribute('aria-current', 'page'); }
    if (activeMobile) activeMobile.classList.add('active');
    if (page === 'categories') renderCategories();
    if (page === 'dashboard') loadDashboard();
    closeDrawer();
}

sidebarNavBtns.forEach(btn => {
    if (btn.dataset.page) btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});
mobileNavBtns.forEach(btn => {
    if (btn.dataset.page) btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

async function loadDashboard() {
    try {
        const snapshot = await get(ref(db, 'categorias'));
        let categoriesCount = 0;
        let totalEst = 0;
        let recent = [];
        const uniqueEstablishments = new Map();
        
        if (snapshot.exists()) {
            const cats = snapshot.val();
            categoriesCount = Object.keys(cats).length;
            for (const [catId, catData] of Object.entries(cats)) {
                const estRef = ref(db, `categorias/${catId}/estabelecimentos`);
                const estSnap = await get(estRef);
                if (estSnap.exists()) {
                    const ests = estSnap.val();
                    for (const [estId, estData] of Object.entries(ests)) {
                        if (!uniqueEstablishments.has(estId)) {
                            uniqueEstablishments.set(estId, estData);
                            recent.push({
                                id: estId,
                                nome: estData.nome,
                                categoria: catData.nome,
                                date: estData.createdAt || estData.addedAt || Date.now()
                            });
                        }
                    }
                }
            }
            totalEst = uniqueEstablishments.size;
        }
        
        const catEl = document.getElementById('statCategories');
        const estEl = document.getElementById('statEstablishments');
        catEl.innerHTML = '0';
        estEl.innerHTML = '0';
        animateCounter(catEl, categoriesCount);
        animateCounter(estEl, totalEst);
        
        recent.sort((a, b) => (b.date || 0) - (a.date || 0));
        const recentContainer = document.getElementById('recentList');
        if (recent.length === 0) {
            recentContainer.innerHTML = `<div class="empty-state" style="padding: var(--sp-8) var(--sp-6)"><div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div><span>Nenhum estabelecimento cadastrado</span></div>`;
        } else {
            recentContainer.innerHTML = recent.slice(0, 5).map((item, i) => `<div class="recent-item" style="animation-delay:${i * 0.04}s"><strong>${item.nome}</strong><span>${item.categoria}</span></div>`).join('');
        }
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

async function loadCategories() {
    const snapshot = await get(ref(db, 'categorias'));
    if (!snapshot.exists()) return [];
    
    const cats = snapshot.val();
    const result = [];
    for (const [id, cat] of Object.entries(cats)) {
        const estCount = cat.estabelecimentos ? Object.keys(cat.estabelecimentos).length : 0;
        result.push({
            id,
            nome: cat.nome,
            imageUrl: cat.imageUrl || '',
            keywords: cat.keywords || [],
            estabelecimentosCount: estCount,
            createdAt: cat.createdAt,
            updatedAt: cat.updatedAt
        });
    }
    result.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    return result;
}

async function renderCategories() {
    const container = document.getElementById('categoriesGrid');
    container.innerHTML = `<div class="loading-rows">${[...Array(4)].map(() => `<div class="loading-row"><div class="skeleton skeleton-thumb"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-badge"></div></div>`).join('')}</div>`;
    
    categoriesData = await loadCategories();
    
    const filter = searchInput?.value.toLowerCase() || '';
    let filtered = categoriesData;
    if (filter) {
        filtered = categoriesData.filter(c => c.nome.toLowerCase().includes(filter) || (c.keywords && c.keywords.some(kw => kw.toLowerCase().includes(filter))));
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"><path d="M4 6h16M4 12h16M4 18h7"/></svg></div><span>Nenhuma categoria encontrada</span></div>`;
        return;
    }
    
    container.innerHTML = filtered.map((cat, i) => `
        <div class="category-row" role="listitem" style="animation-delay:${i * 0.03}s">
            <div class="category-thumb">${cat.imageUrl ? `<img src="${cat.imageUrl}" alt="${cat.nome}" loading="lazy">` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".35"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`}</div>
            <span class="category-name">${cat.nome}</span>
            <span class="category-count">${cat.estabelecimentosCount} estab.</span>
            <button class="view-est-btn" data-id="${cat.id}" data-name="${cat.nome}" aria-label="Ver estabelecimentos de ${cat.nome}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg><span>Ver</span></button>
            <div class="category-row-actions">
                <button class="row-action-btn edit-cat" data-id="${cat.id}" title="Editar categoria"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"/><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/></svg></button>
                <button class="row-action-btn danger delete-cat" data-id="${cat.id}" title="Excluir categoria"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
        </div>
    `).join('');
    
    container.querySelectorAll('.edit-cat').forEach(btn => btn.addEventListener('click', () => editCategory(btn.dataset.id)));
    container.querySelectorAll('.delete-cat').forEach(btn => btn.addEventListener('click', () => deleteCategory(btn.dataset.id)));
    container.querySelectorAll('.view-est-btn').forEach(btn => btn.addEventListener('click', () => openRightPanel(btn.dataset.id, btn.dataset.name)));
}

searchInput?.addEventListener('input', () => renderCategories());

function openRightPanel(categoryId, categoryName) {
    currentCategoryId = categoryId;
    panelTitle.textContent = categoryName;
    renderPanelList(categoryId);
    rightPanel.classList.add('open');
}

function closeRightPanel() {
    rightPanel.classList.remove('open');
}

panelClose.addEventListener('click', closeRightPanel);

let pendingEstablishmentForCategories = null;

async function showAddToCategoriesModal(establishmentId, establishmentName, currentCategoryId) {
    pendingEstablishmentForCategories = { id: establishmentId, name: establishmentName, currentCategoryId };
    const checklistDiv = document.getElementById('categoryChecklist');
    const allCategories = await loadCategories();
    const existingCategories = [];
    for (const cat of allCategories) {
        const estRef = ref(db, `categorias/${cat.id}/estabelecimentos/${establishmentId}`);
        const snap = await get(estRef);
        if (snap.exists()) existingCategories.push(cat.id);
    }
    checklistDiv.innerHTML = allCategories.filter(cat => cat.id !== currentCategoryId).map(cat => `<label class="checkbox-label" style="padding:8px;border-radius:var(--r-md);background:var(--surface-3);"><input type="checkbox" class="checkbox-input" value="${cat.id}" ${existingCategories.includes(cat.id) ? 'checked' : ''}><span class="checkbox-custom"></span><span class="checkbox-text">${escapeHtml(cat.nome)}</span></label>`).join('');
    openModal('addToCategoriesModal');
}

document.getElementById('confirmAddToCategoriesBtn')?.addEventListener('click', async () => {
    if (!pendingEstablishmentForCategories) return;
    const checkboxes = document.querySelectorAll('#categoryChecklist input[type="checkbox"]');
    const selectedCategories = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    const { id: establishmentId, currentCategoryId: originalCatId } = pendingEstablishmentForCategories;
    const originalRef = ref(db, `categorias/${originalCatId}/estabelecimentos/${establishmentId}`);
    const originalSnap = await get(originalRef);
    if (!originalSnap.exists()) {
        showToast('Erro: estabelecimento não encontrado', 'error');
        closeModal('addToCategoriesModal');
        pendingEstablishmentForCategories = null;
        return;
    }
    const establishmentData = originalSnap.val();
    for (const catId of selectedCategories) {
        const targetRef = ref(db, `categorias/${catId}/estabelecimentos/${establishmentId}`);
        const targetSnap = await get(targetRef);
        if (!targetSnap.exists()) {
            await set(targetRef, { ...establishmentData, addedAt: Date.now() });
        }
    }
    const allCategories = await loadCategories();
    for (const cat of allCategories) {
        if (cat.id !== originalCatId && !selectedCategories.includes(cat.id)) {
            const targetRef = ref(db, `categorias/${cat.id}/estabelecimentos/${establishmentId}`);
            const targetSnap = await get(targetRef);
            if (targetSnap.exists()) await remove(targetRef);
        }
    }
    showToast(`Estabelecimento adicionado/removido das categorias selecionadas`, 'success');
    closeModal('addToCategoriesModal');
    pendingEstablishmentForCategories = null;
    if (currentCategoryId) await renderPanelList(currentCategoryId);
    await renderCategories();
    await loadDashboard();
});

async function renderPanelList(categoryId) {
    panelBody.innerHTML = `<div class="panel-list">${[...Array(3)].map(() => `<div class="panel-item" style="pointer-events:none"><div class="skeleton" style="height:12px;flex:1;border-radius:4px;max-width:160px"></div><div class="skeleton" style="height:26px;width:52px;border-radius:4px"></div></div>`).join('')}</div>`;
    try {
        const estRef = ref(db, `categorias/${categoryId}/estabelecimentos`);
        const snapshot = await get(estRef);
        if (!snapshot.exists()) {
            panelBody.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div><span>Nenhum estabelecimento</span></div>`;
            return;
        }
        const ests = snapshot.val();
        panelBody.innerHTML = `<div class="panel-list">${Object.entries(ests).map(([id, est]) => `<div class="panel-item" data-id="${id}"><span class="panel-item-name">${est.nome}</span><div class="panel-item-actions"><button class="edit" data-id="${id}" title="Editar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"/><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/></svg></button><button class="add-to-categories" data-id="${id}" title="Adicionar a outras categorias"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg></button><button class="delete" data-id="${id}" title="Excluir"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></div>`).join('')}</div>`;
        panelBody.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', () => editEstablishment(currentCategoryId, btn.dataset.id)));
        panelBody.querySelectorAll('.add-to-categories').forEach(btn => {
            const estId = btn.dataset.id;
            const estName = btn.closest('.panel-item')?.querySelector('.panel-item-name')?.textContent || '';
            btn.addEventListener('click', () => showAddToCategoriesModal(estId, estName, currentCategoryId));
        });
        panelBody.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', () => deleteEstablishment(currentCategoryId, btn.dataset.id)));
    } catch (error) {
        console.error('Error loading establishments:', error);
        panelBody.innerHTML = `<div class="empty-state"><span>Erro ao carregar</span></div>`;
    }
}

newCategoryBtn?.addEventListener('click', () => {
    document.getElementById('categoryModalTitle').textContent = 'Nova categoria';
    document.getElementById('catId').value = '';
    categoryForm.reset();
    resetKeywords();
    resetUploadZone('catUploadZone', 'catUploadPlaceholder', 'catPreview', 'catIconFile');
    const btns = categoryModal.querySelectorAll('.toggle-opt');
    btns.forEach(btn => {
        if (btn.dataset.type === 'url') btn.classList.add('active');
        else btn.classList.remove('active');
    });
    document.getElementById('catUrlBox').style.display = 'block';
    document.getElementById('catFileBox').style.display = 'none';
    document.getElementById('catSearchBox').style.display = 'none';
    openModal('categoryModal');
});

async function editCategory(id) {
    const cat = categoriesData.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('catId').value = id;
    document.getElementById('catName').value = cat.nome;
    document.getElementById('catIconUrl').value = cat.imageUrl || '';
    document.getElementById('categoryModalTitle').textContent = 'Editar categoria';
    setKeywords(cat.keywords || []);
    resetUploadZone('catUploadZone', 'catUploadPlaceholder', 'catPreview', 'catIconFile');
    openModal('categoryModal');
}

function deleteCategory(id) {
    currentDelete = { type: 'category', id };
    document.getElementById('confirmMsg').textContent = 'Excluir esta categoria e todos os seus estabelecimentos?';
    openModal('confirmModal');
}

categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('catId').value;
    const nome = document.getElementById('catName').value.trim();
    let imageUrl = '';
    const keywords = getKeywords();
    const activeToggle = document.querySelector('#categoryModal .toggle-opt.active')?.dataset.type;
    if (!nome) { showToast('Digite o nome da categoria', 'error'); return; }
    try {
        if (activeToggle === 'url' || activeToggle === 'search') {
            imageUrl = document.getElementById('catIconUrl').value.trim() || '';
        } else if (activeToggle === 'file') {
            const file = document.getElementById('catIconFile').files[0];
            if (file) imageUrl = await uploadToCloudinary(file);
        }
        if (id) {
            const existingRef = ref(db, `categorias/${id}`);
            const existingSnap = await get(existingRef);
            const existingData = existingSnap.val() || {};
            await set(ref(db, `categorias/${id}`), {
                nome: nome,
                imageUrl: imageUrl,
                keywords: keywords,
                estabelecimentos: existingData.estabelecimentos || null,
                createdAt: existingData.createdAt || Date.now(),
                updatedAt: Date.now()
            });
        } else {
            const newRef = push(ref(db, 'categorias'));
            await set(newRef, { nome, imageUrl, keywords: keywords, estabelecimentos: {}, createdAt: Date.now(), updatedAt: Date.now() });
        }
        closeModal('categoryModal');
        categoryForm.reset();
        resetKeywords();
        document.getElementById('catId').value = '';
        showToast(id ? 'Categoria atualizada' : 'Categoria criada', 'success');
        await renderCategories();
        await loadDashboard();
    } catch (error) {
        console.error('Erro ao salvar categoria:', error);
        showToast('Erro ao salvar categoria: ' + error.message, 'error');
    }
});

function updateCategorySelect() {
    const select = document.getElementById('estCategorySelect');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione uma categoria...</option>' + categoriesData.map(cat => `<option value="${cat.id}">${escapeHtml(cat.nome)}</option>`).join('');
}

function addPhotoField(url = '') {
    if (photoCount >= MAX_PHOTOS) return;
    const container = document.getElementById('photosContainer');
    const div = document.createElement('div');
    div.className = 'photo-card';
    div.innerHTML = `
        <div class="photo-header"><span class="photo-label">Foto ${photoCount + 1}</span><button type="button" class="remove-photo" aria-label="Remover foto"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div class="photo-options"><button type="button" class="photo-opt active" data-type="url">URL</button><button type="button" class="photo-opt" data-type="gallery">Galeria</button></div>
        <div class="photo-url-input"><input type="text" class="photo-url" placeholder="https://exemplo.com/foto.jpg" value="${escapeHtml(url)}"></div>
        <div class="photo-gallery-input" style="display:none"><div class="photo-gallery-zone"><input type="file" accept="image/*"><div class="photo-gallery-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Arraste ou clique</span></div></div><div class="photo-preview" style="display:none"></div></div>
    `;
    const urlDiv = div.querySelector('.photo-url-input');
    const galleryDiv = div.querySelector('.photo-gallery-input');
    const galleryZone = div.querySelector('.photo-gallery-zone');
    const options = div.querySelectorAll('.photo-opt');
    const fileInput = div.querySelector('input[type="file"]');
    const preview = div.querySelector('.photo-preview');
    const galleryHolder = div.querySelector('.photo-gallery-placeholder');
    const removeBtn = div.querySelector('.remove-photo');
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            options.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            if (opt.dataset.type === 'url') {
                urlDiv.style.display = 'block';
                galleryDiv.style.display = 'none';
            } else {
                urlDiv.style.display = 'none';
                galleryDiv.style.display = 'block';
            }
        });
    });
    galleryZone.addEventListener('dragover', (e) => { e.preventDefault(); galleryZone.classList.add('drag-over'); });
    galleryZone.addEventListener('dragleave', () => galleryZone.classList.remove('drag-over'));
    galleryZone.addEventListener('drop', (e) => {
        e.preventDefault();
        galleryZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handlePhotoFile(file, div, preview, galleryHolder, galleryZone);
    });
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handlePhotoFile(file, div, preview, galleryHolder, galleryZone);
    });
    removeBtn.addEventListener('click', () => {
        div.remove();
        photoCount--;
        updateAddPhotoButton();
        document.querySelectorAll('#photosContainer .photo-label').forEach((label, i) => { label.textContent = `Foto ${i + 1}`; });
        updatePromoPhotoSelect();
    });
    container.appendChild(div);
    photoCount++;
    updateAddPhotoButton();
    updatePromoPhotoSelect();
}

function handlePhotoFile(file, card, previewEl, placeholderEl, zoneEl) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        previewEl.innerHTML = `<img src="${ev.target.result}" alt="Preview"><button type="button" class="photo-remove-preview" aria-label="Remover imagem"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
        previewEl.style.display = 'block';
        zoneEl.style.display = 'none';
        previewEl.querySelector('.photo-remove-preview').addEventListener('click', () => {
            previewEl.style.display = 'none';
            zoneEl.style.display = 'block';
            previewEl.innerHTML = '';
            card._pendingFile = null;
            const fi = card.querySelector('input[type="file"]');
            if (fi) fi.value = '';
        });
    };
    reader.readAsDataURL(file);
    card._pendingFile = file;
}

function updateAddPhotoButton() {
    const addBtn = document.getElementById('addPhotoBtn');
    const limitMsg = document.getElementById('photoLimitMsg');
    if (photoCount >= MAX_PHOTOS) {
        addBtn.style.display = 'none';
        limitMsg.textContent = 'Máximo de 3 fotos atingido';
    } else {
        addBtn.style.display = 'flex';
        limitMsg.textContent = '';
    }
}

document.getElementById('addPhotoBtn').addEventListener('click', () => addPhotoField());

function updatePromoPhotoSelect() {
    const photos = document.querySelectorAll('#photosContainer .photo-card');
    const select = document.getElementById('estPromoPhoto');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Nenhuma</option>';
    photos.forEach((_, idx) => {
        const selected = (currentValue !== '' && parseInt(currentValue) === idx) ? 'selected' : '';
        select.innerHTML += `<option value="${idx}" ${selected}>Foto ${idx + 1}</option>`;
    });
}

panelAddBtn.addEventListener('click', () => {
    document.getElementById('estFormTitle').textContent = 'Novo estabelecimento';
    document.getElementById('estId').value = '';
    document.getElementById('estOriginalId').value = '';
    establishmentForm.reset();
    document.getElementById('promoField').style.display = 'none';
    document.getElementById('photosContainer').innerHTML = '';
    photoCount = 0;
    addPhotoField();
    updateAddPhotoButton();
    updateCategorySelect();
    document.getElementById('estCategorySelect').value = '';
    
    // Limpa os campos
    const estPhone = document.getElementById('estPhone');
    const estWhatsapp = document.getElementById('estWhatsapp');
    if (estPhone) estPhone.value = '';
    if (estWhatsapp) estWhatsapp.value = '';
    
    openModal('establishmentFormModal');
});

async function editEstablishment(catId, id) {
    const estRef = ref(db, `categorias/${catId}/estabelecimentos/${id}`);
    const snapshot = await get(estRef);
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    currentEstablishmentData = data;
    document.getElementById('estId').value = id;
    document.getElementById('estOriginalId').value = id;
    document.getElementById('estName').value = data.nome || '';
    document.getElementById('estAddress').value = data.endereco || '';
    document.getElementById('estMaps').value = data.enderecoUrl || '';
    
    // Telefone (com máscara de 3 dígitos DDD)
    const phoneField = document.getElementById('estPhone');
    if (phoneField && data.telefone) {
        phoneField.value = data.telefone;
        if (!phoneField.value.includes('(') && getDigitsOnly(phoneField.value).length > 0) {
            formatPhoneLive(phoneField);
        }
    } else if (phoneField) {
        phoneField.value = '';
    }
    
    // WhatsApp (com máscara de 2 dígitos DDD + 9 números)
    const whatsField = document.getElementById('estWhatsapp');
    if (whatsField && data.whatsapp) {
        whatsField.value = data.whatsapp;
        if (!whatsField.value.includes('(') && getDigitsOnly(whatsField.value).length > 0) {
            formatWhatsAppLive(whatsField);
        }
    } else if (whatsField) {
        whatsField.value = '';
    }
    
    document.getElementById('estInstagram').value = data.instagram || '';
    document.getElementById('estFacebook').value = data.facebook || '';
    document.getElementById('estSite').value = data.site || '';
    document.getElementById('estHasPromo').checked = data.temPromocao || false;
    document.getElementById('estPromoText').value = data.promotionText || '';
    document.getElementById('photosContainer').innerHTML = '';
    photoCount = 0;
    const imagens = data.imagens || [];
    if (imagens.length) imagens.forEach(img => addPhotoField(img));
    else addPhotoField();
    updateAddPhotoButton();
    const promoSelect = document.getElementById('estPromoPhoto');
    promoSelect.innerHTML = '<option value="">Nenhuma</option>';
    imagens.forEach((_, idx) => {
        const selectedAttr = (data.promoPhotoIndex === idx) ? 'selected' : '';
        promoSelect.innerHTML += `<option value="${idx}" ${selectedAttr}>Foto ${idx + 1}</option>`;
    });
    document.getElementById('promoField').style.display = data.temPromocao ? 'block' : 'none';
    const categorySelect = document.getElementById('estCategorySelect');
    updateCategorySelect();
    categorySelect.value = catId;
    const chk = document.getElementById('estHasPromo');
    chk.dispatchEvent(new Event('change'));
    document.getElementById('estFormTitle').textContent = 'Editar estabelecimento';
    openModal('establishmentFormModal');
}

async function deleteEstablishment(catId, id) {
    currentDelete = { type: 'establishment', catId, id };
    document.getElementById('confirmMsg').textContent = 'Excluir este estabelecimento de todas as categorias?';
    openModal('confirmModal');
}

establishmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('estSubmitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';
    submitBtn.disabled = true;
    const restore = () => {
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        submitBtn.disabled = false;
    };
    const id = document.getElementById('estId').value;
    const nome = document.getElementById('estName').value.trim();
    const endereco = document.getElementById('estAddress').value.trim();
    const enderecoUrl = document.getElementById('estMaps').value.trim();
    
    // Telefone: salva APENAS os dígitos brutos
    const telefoneFormatted = document.getElementById('estPhone').value;
    const telefone = getRawPhoneValue(telefoneFormatted);
    
    // WhatsApp: salva APENAS os dígitos brutos
    const whatsappFormatted = document.getElementById('estWhatsapp').value;
    const whatsapp = getRawPhoneValue(whatsappFormatted);
    
    const instagram = document.getElementById('estInstagram').value.trim();
    const facebook = document.getElementById('estFacebook').value.trim();
    const site = document.getElementById('estSite').value.trim();
    const temPromocao = document.getElementById('estHasPromo').checked;
    const promotionText = document.getElementById('estPromoText').value.trim();
    const promoPhotoSelect = document.getElementById('estPromoPhoto');
    let promoPhotoIndex = null;
    if (temPromocao && promoPhotoSelect.value !== '') promoPhotoIndex = parseInt(promoPhotoSelect.value);
    const selectedCategory = document.getElementById('estCategorySelect').value;
    if (!selectedCategory) { showToast('Selecione uma categoria', 'error'); restore(); return; }
    const photoCards = document.querySelectorAll('#photosContainer .photo-card');
    const imagens = [];
    for (const card of photoCards) {
        const urlInput = card.querySelector('.photo-url');
        const url = urlInput?.value?.trim() || '';
        const pendingFile = card._pendingFile;
        if (url) imagens.push(url);
        else if (pendingFile) {
            const uploadedUrl = await uploadToCloudinary(pendingFile);
            if (uploadedUrl) imagens.push(uploadedUrl);
            else { showToast('Erro ao fazer upload de uma imagem', 'error'); restore(); return; }
        }
    }
    if (!nome) { showToast('Digite o nome do estabelecimento', 'error'); restore(); return; }
    if (!endereco) { showToast('Digite o endereço', 'error'); restore(); return; }
    try {
        const establishmentData = {
            nome, endereco, enderecoUrl: enderecoUrl || `https://maps.google.com/?q=${encodeURIComponent(endereco)}`,
            telefone, whatsapp, instagram, facebook, site,
            temPromocao, promotionText: temPromocao ? promotionText : '', promoPhotoIndex,
            imagens: imagens.slice(0, 3), updatedAt: Date.now()
        };
        if (!id) {
            establishmentData.createdAt = Date.now();
            establishmentData.addedAt = Date.now();
        }
        if (id) {
            const allCategories = await loadCategories();
            for (const cat of allCategories) {
                const estRef = ref(db, `categorias/${cat.id}/estabelecimentos/${id}`);
                const snap = await get(estRef);
                if (snap.exists()) await remove(estRef);
            }
        }
        if (!id) {
            const newRef = push(ref(db, `categorias/${selectedCategory}/estabelecimentos`));
            await set(newRef, establishmentData);
        } else {
            const estRef = ref(db, `categorias/${selectedCategory}/estabelecimentos/${id}`);
            await set(estRef, establishmentData);
        }
        closeModal('establishmentFormModal');
        showToast(id ? 'Estabelecimento atualizado' : 'Estabelecimento criado', 'success');
        if (currentCategoryId) await renderPanelList(currentCategoryId);
        await renderCategories();
        await loadDashboard();
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showToast('Erro ao salvar: ' + error.message, 'error');
    }
    restore();
});

document.getElementById('estHasPromo').addEventListener('change', (e) => {
    document.getElementById('promoField').style.display = e.target.checked ? 'block' : 'none';
    if (e.target.checked) updatePromoPhotoSelect();
});

const photosContainerEl = document.getElementById('photosContainer');
const observer = new MutationObserver(() => updatePromoPhotoSelect());
observer.observe(photosContainerEl, { childList: true, subtree: true });

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!currentDelete) return;
    try {
        if (currentDelete.type === 'category') {
            await remove(ref(db, `categorias/${currentDelete.id}`));
            closeRightPanel();
            await renderCategories();
            await loadDashboard();
            showToast('Categoria excluída', 'success');
        } else if (currentDelete.type === 'establishment') {
            const allCategories = await loadCategories();
            for (const cat of allCategories) {
                const estRef = ref(db, `categorias/${cat.id}/estabelecimentos/${currentDelete.id}`);
                const snap = await get(estRef);
                if (snap.exists()) await remove(estRef);
            }
            if (currentDelete.catId) await renderPanelList(currentDelete.catId);
            await renderCategories();
            await loadDashboard();
            showToast('Estabelecimento excluído de todas as categorias', 'success');
        }
    } catch (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    }
    closeModal('confirmModal');
    currentDelete = null;
});

function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', () => { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); });
});
document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => { const target = btn.dataset.modal; if (target) closeModal(target); });
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); });

function resetUploadZone(zoneId, placeholderId, previewId, fileInputId) {
    const zone = document.getElementById(zoneId);
    const placeholder = document.getElementById(placeholderId);
    const preview = document.getElementById(previewId);
    const fileInput = document.getElementById(fileInputId);
    if (!zone) return;
    if (placeholder) placeholder.style.display = 'flex';
    if (preview) { preview.style.display = 'none'; }
    if (fileInput) fileInput.value = '';
}

function setupUploadZone(zoneId, placeholderId, previewId, previewImgId, removeId, fileInputId) {
    const zone = document.getElementById(zoneId);
    const placeholder = document.getElementById(placeholderId);
    const preview = document.getElementById(previewId);
    const previewImg = document.getElementById(previewImgId);
    const removeBtn = document.getElementById(removeId);
    const fileInput = document.getElementById(fileInputId);
    if (!zone || !fileInput) return;
    function showPreview(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (previewImg) previewImg.src = ev.target.result;
            if (preview) { preview.style.display = 'block'; }
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
    fileInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) showPreview(file); });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', (e) => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const dt = new DataTransfer(); dt.items.add(file);
            fileInput.files = dt.files;
            showPreview(file);
        }
    });
    removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (preview) { preview.style.display = 'none'; }
        if (placeholder) placeholder.style.display = 'flex';
        if (previewImg) previewImg.src = '';
        fileInput.value = '';
    });
}

function setupImageToggle(modalId, urlBoxId, fileBoxId, searchBoxId = null) {
    const container = document.getElementById(modalId);
    if (!container) return;
    const btns = container.querySelectorAll('.toggle-opt');
    const urlBox = document.getElementById(urlBoxId);
    const fileBox = document.getElementById(fileBoxId);
    const searchBox = searchBoxId ? document.getElementById(searchBoxId) : null;
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (btn.dataset.type === 'url') {
                if (urlBox) urlBox.style.display = 'block';
                if (fileBox) fileBox.style.display = 'none';
                if (searchBox) searchBox.style.display = 'none';
            } else if (btn.dataset.type === 'file') {
                if (urlBox) urlBox.style.display = 'none';
                if (fileBox) fileBox.style.display = 'block';
                if (searchBox) searchBox.style.display = 'none';
            } else if (btn.dataset.type === 'search') {
                if (urlBox) urlBox.style.display = 'block';
                if (fileBox) fileBox.style.display = 'none';
                if (searchBox) searchBox.style.display = 'block';
            }
        });
    });
}

setupUploadZone('catUploadZone', 'catUploadPlaceholder', 'catPreview', 'catPreviewImg', 'catRemoveFile', 'catIconFile');
setupImageToggle('categoryModal', 'catUrlBox', 'catFileBox', 'catSearchBox');
setupKeywordsInput();
setupIconSearch();
// Configurar máscaras para telefone e WhatsApp
setupPhoneMasks();

const handleLogout = async () => { await signOut(auth); window.location.href = 'index.html'; };
logoutBtn?.addEventListener('click', handleLogout);
mobileLogoutBtn?.addEventListener('click', handleLogout);

onAuthStateChanged(auth, async (user) => {
    if (!user || !ADMIN_UIDS.includes(user.uid)) {
        window.location.href = 'index.html';
        return;
    }
    const name = user.displayName || 'Administrador';
    document.getElementById('adminName').textContent = name;
    document.getElementById('adminEmail').textContent = user.email;
    document.getElementById('sidebarAvatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('mobileUserName').textContent = name;
    document.getElementById('mobileUserEmail').textContent = user.email;
    document.getElementById('mobileAvatar').textContent = name.charAt(0).toUpperCase();
    await loadDashboard();
    await renderCategories();
    updateCategorySelect();
});