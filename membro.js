import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAs-G-HwvyrOlXY8ttlBCoCYdThM9RQHhE",
  authDomain: "avarepromocoes.firebaseapp.com",
  databaseURL: "https://avarepromocoes-default-rtdb.firebaseio.com",
  projectId: "avarepromocoes",
  storageBucket: "avarepromocoes.firebasestorage.app",
  messagingSenderId: "958063932842",
  appId: "1:958063932842:web:0bda33b541be8f681ea7d3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

let categoriesData = [];
let establishmentsData = [];
let currentFullscreenIndex = 0;
let currentFullscreenCards = [];
let currentCategory = null;
let deferredPrompt = null;
let scrollTimeout = null;

const ADMIN_UIDS = [
  "6zEZnxqhV3PhKkTCDzyH71zbRsM2",
  "VpJDVk8PWqQxmJxMHArbz6Oo9Bp1",
  "03pXFuSDiGZFG90DfxIuYispDwU2",
];

function getDigitsOnly(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

// Função para formatar telefone - SEMPRE com DDD de 3 dígitos
function formatPhoneForDisplay(phone) {
    if (!phone) return '';
    let digits = getDigitsOnly(phone);
    
    if (digits.startsWith('55') && digits.length > 10) {
        digits = digits.substring(2);
    }
    
    let ddd = '';
    let rest = '';
    
    if (digits.length === 10) {
        ddd = '0' + digits.substring(0, 2);
        rest = digits.substring(2);
    } else if (digits.length === 11) {
        if (digits.substring(0, 1) === '0') {
            ddd = digits.substring(0, 3);
            rest = digits.substring(3);
        } else {
            ddd = '0' + digits.substring(0, 2);
            rest = digits.substring(2);
        }
    } else if (digits.length === 12) {
        ddd = digits.substring(0, 3);
        rest = digits.substring(3);
    } else {
        return phone;
    }
    
    if (rest.length === 8) {
        return `(${ddd}) ${rest.substring(0,4)}-${rest.substring(4)}`;
    } else if (rest.length === 9) {
        return `(${ddd}) ${rest.substring(0,5)}-${rest.substring(5)}`;
    } else {
        return `(${ddd}) ${rest}`;
    }
}

// Elementos DOM
const navSidebar = document.getElementById('navSidebar');
const menuButton = document.getElementById('menuButton');
const mobileOverlay = document.getElementById('mobileOverlay');
const searchButton = document.getElementById('searchButton');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const categoriesGrid = document.getElementById('categoriesGrid');
const fullscreen = document.getElementById('categoryFullscreen');
const closeFullscreen = document.getElementById('closeFullscreen');
const fullscreenContent = document.getElementById('fullscreenContent');
const fullscreenSearchBtn = document.getElementById('fullscreenSearchBtn');
const dotsContainer = document.getElementById('dotsContainer');
const categorySearchInput = document.getElementById('categorySearchInput');
const prevEstablishmentDesktop = document.getElementById('prevEstablishmentDesktop');
const nextEstablishmentDesktop = document.getElementById('nextEstablishmentDesktop');
const searchSidebar = document.getElementById('searchSidebar');
const searchSidebarOverlay = document.getElementById('searchSidebarOverlay');
const closeSearchSidebar = document.getElementById('closeSearchSidebar');
const sidebarSearchInput = document.getElementById('sidebarSearchInput');
const sidebarClearSearchBtn = document.getElementById('sidebarClearSearchBtn');
const searchSidebarResults = document.getElementById('searchSidebarResults');
const establishmentSearchInput = document.getElementById('establishmentSearchInput');
const clearEstablishmentSearch = document.getElementById('clearEstablishmentSearch');

// Elementos do card de instalação
const installCard = document.getElementById('installCard');
const installCardBtn = document.getElementById('installCardBtn');
const installCardClose = document.getElementById('installCardClose');

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function optimizeImageUrl(url, width = 600) {
    if (!url || url.trim() === '') return '';
    if (url.includes('cloudinary.com')) return url.replace('/upload/', `/upload/w_${width},c_fill,q_auto,f_auto/`);
    return url;
}

function shuffleArray(array) {
    if (!array || array.length === 0) return [];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateDots() {
    if (!dotsContainer) return;
    const total = currentFullscreenCards.length;
    let dotsHtml = '';
    for (let i = 0; i < total; i++) {
        dotsHtml += `<div class="dot ${i === currentFullscreenIndex ? 'active' : ''}" data-index="${i}"></div>`;
    }
    dotsContainer.innerHTML = dotsHtml;
    
    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (!isNaN(index) && index !== currentFullscreenIndex) {
                currentFullscreenIndex = index;
                const container = document.querySelector('.est-cards-container');
                const targetCard = document.querySelector(`.est-card[data-index="${currentFullscreenIndex}"]`);
                if (container && targetCard) {
                    container.scrollTo({ left: targetCard.offsetLeft, behavior: 'smooth' });
                }
                updateDots();
            }
        });
    });
}

function setupHorizontalScroll() {
    const container = document.querySelector('.est-cards-container');
    if (!container) return;
    
    const handleScroll = () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const scrollLeft = container.scrollLeft;
            const cards = container.querySelectorAll('.est-card');
            if (cards.length === 0) return;
            
            let newIndex = 0;
            let minDistance = Infinity;
            
            cards.forEach((card, idx) => {
                const cardLeft = card.offsetLeft;
                const distance = Math.abs(scrollLeft - cardLeft);
                if (distance < minDistance) {
                    minDistance = distance;
                    newIndex = idx;
                }
            });
            
            if (newIndex !== currentFullscreenIndex) {
                currentFullscreenIndex = newIndex;
                updateDots();
            }
        }, 50);
    };
    
    container.addEventListener('scroll', handleScroll);
}

async function fetchAllData() {
    categoriesGrid.innerHTML = '<div class="loading"><div class="loading-ring"></div><span>Carregando categorias...</span></div>';
    
    try {
        const snapshot = await get(ref(db, 'categorias'));
        
        if (!snapshot.exists()) {
            categoriesGrid.innerHTML = '<div class="empty">Nenhuma categoria cadastrada ainda.<br><br>⚠️ Se você é administrador, acesse o painel admin para adicionar categorias e estabelecimentos.</div>';
            return;
        }
        
        const rawData = snapshot.val();
        categoriesData = [];
        establishmentsData = [];
        
        for (const [categoryId, categoryValue] of Object.entries(rawData)) {
            const establishmentList = [];
            if (categoryValue.estabelecimentos) {
                for (const [estId, estValue] of Object.entries(categoryValue.estabelecimentos)) {
                    const establishment = {
                        id: estId,
                        categoryId: categoryId,
                        categoryName: categoryValue.nome,
                        name: estValue.nome || '',
                        logoUrl: estValue.logoUrl || '',
                        address: estValue.endereco || '',
                        mapsUrl: estValue.enderecoUrl || '',
                        phone: estValue.telefone || '',
                        whatsapp: estValue.whatsapp || '',
                        instagram: estValue.instagram || '',
                        facebook: estValue.facebook || '',
                        website: estValue.site || '',
                        hasPromotion: estValue.temPromocao || false,
                        promotionText: estValue.promotionText || '',
                        promoPhotoIndex: estValue.promoPhotoIndex,
                        images: (estValue.imagens || []).filter(img => img && img.trim())
                    };
                    establishmentList.push(establishment);
                    establishmentsData.push(establishment);
                }
            }
            categoriesData.push({
                id: categoryId,
                name: categoryValue.nome || '',
                iconUrl: categoryValue.imageUrl || '',
                keywords: categoryValue.keywords || [],
                count: establishmentList.length,
                establishments: establishmentList
            });
        }
        
        categoriesData.sort((a, b) => a.name.localeCompare(b.name));
        renderCategoriesList('');
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        categoriesGrid.innerHTML = `<div class="empty">Erro ao carregar dados: ${error.message}<br><br>Verifique sua conexão com a internet.</div>`;
    }
}

function renderCategoriesList(filterText = '') {
    let filteredCategories = categoriesData;
    if (filterText) {
        const searchLower = filterText.toLowerCase();
        filteredCategories = categoriesData.filter(cat => 
            cat.name.toLowerCase().includes(searchLower) || 
            (cat.keywords && cat.keywords.some(kw => kw.toLowerCase().includes(searchLower)))
        );
    }
    
    if (filteredCategories.length === 0) {
        categoriesGrid.innerHTML = '<div class="empty">Nenhuma categoria encontrada</div>';
        return;
    }
    
    let html = '';
    for (const category of filteredCategories) {
        html += `
            <div class="category-card" data-id="${category.id}">
                <div class="category-icon">
                    ${category.iconUrl ? 
                        `<img src="${optimizeImageUrl(category.iconUrl, 120)}" loading="lazy" alt="${escapeHtml(category.name)}">` : 
                        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`
                    }
                </div>
                <div class="category-name">${escapeHtml(category.name)}</div>
                <div class="category-count">${category.count} estabelecimentos</div>
            </div>
        `;
    }
    categoriesGrid.innerHTML = html;
}

function openCategoryFullscreen(categoryId) {
    const category = categoriesData.find(cat => cat.id === categoryId);
    if (!category) return;
    if (!category.establishments || category.establishments.length === 0) {
        alert('Esta categoria não possui estabelecimentos cadastrados');
        return;
    }
    currentCategory = category;
    currentFullscreenCards = shuffleArray([...category.establishments]);
    currentFullscreenIndex = 0;
    fullscreen.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCurrentEstablishment();
    
    if (establishmentSearchInput) {
        establishmentSearchInput.value = '';
    }
}

function searchEstablishmentInCategory(searchText) {
    if (!searchText || searchText.trim() === '') {
        if (currentFullscreenCards.length > 0) {
            currentFullscreenIndex = 0;
            const container = document.querySelector('.est-cards-container');
            const targetCard = document.querySelector(`.est-card[data-index="0"]`);
            if (container && targetCard) {
                container.scrollTo({ left: targetCard.offsetLeft, behavior: 'smooth' });
            }
            updateDots();
        }
        return;
    }
    
    const searchLower = searchText.toLowerCase().trim();
    
    const foundIndex = currentFullscreenCards.findIndex(est => 
        est.name && est.name.toLowerCase().includes(searchLower)
    );
    
    if (foundIndex !== -1) {
        currentFullscreenIndex = foundIndex;
        const container = document.querySelector('.est-cards-container');
        const targetCard = document.querySelector(`.est-card[data-index="${currentFullscreenIndex}"]`);
        if (container && targetCard) {
            container.scrollTo({ left: targetCard.offsetLeft, behavior: 'smooth' });
        }
        updateDots();
    }
}

function renderCurrentEstablishment() {
    if (!currentFullscreenCards.length) return;
    
    let allCardsHtml = '';
    
    for (let idx = 0; idx < currentFullscreenCards.length; idx++) {
        const est = currentFullscreenCards[idx];
        const images = (est.images || []).filter(img => img && img.trim());
        const hasPromotion = est.hasPromotion && est.promotionText && est.promotionText.trim();
        const promoPhotoIndex = est.promoPhotoIndex !== undefined ? est.promoPhotoIndex : 0;
        
        let galleryHtml = '';
        if (images.length > 0) {
            const displayImageIndex = (hasPromotion && promoPhotoIndex < images.length) ? promoPhotoIndex : 0;
            galleryHtml = `
                <div class="est-image-container">
                    <img src="${optimizeImageUrl(images[displayImageIndex], 600)}" class="est-main-image" loading="lazy">
                    ${hasPromotion ? `<div class="promo-badge">🏷️ ${escapeHtml(est.promotionText)}</div>` : ''}
                </div>
            `;
        } else if (hasPromotion) {
            galleryHtml = `
                <div class="promo-banner-large">
                    <div class="promo-icon-large">🏷️</div>
                    <div class="promo-text-large">${escapeHtml(est.promotionText)}</div>
                </div>
            `;
        } else {
            galleryHtml = `
                <div class="no-image-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
            `;
        }
        
        let buttonsHtml = '';
        
        if (est.whatsapp) {
            const whatsappDigits = getDigitsOnly(est.whatsapp);
            buttonsHtml += `<button class="action-square whatsapp" data-whatsapp="${whatsappDigits}">
                <svg viewBox="0 0 24 24" fill="white"><path d="M12.032 2.002c-5.515 0-9.997 4.48-10.002 9.994a9.96 9.96 0 0 0 1.398 5.02l-1.434 5.23 5.357-1.407a9.99 9.99 0 0 0 4.775 1.192c5.52 0 10.002-4.48 10.002-9.998s-4.482-10.002-9.996-10.002zm5.46 14.413a6.93 6.93 0 0 1-2.18 1.074c-.52.168-1.2.3-1.78.15-.5-.13-1.04-.44-1.57-.86-1.41-1.12-2.74-2.68-3.14-3.33-.34-.55-.78-1.6-.9-2.24-.08-.48-.03-1.05.2-1.53.18-.37.48-.64.78-.85.2-.15.4-.13.6.02.3.22.66.86.83 1.16.17.31.26.56.08.89-.13.24-.34.48-.52.69-.16.18-.32.37-.48.55-.14.16-.3.34-.2.56.16.37.58.94 1.04 1.45.58.65 1.25 1.19 1.94 1.55.3.15.7.32 1.07.4.26.06.6.08.8-.07.24-.18.36-.46.54-.73.18-.26.4-.39.68-.46.28-.08.56-.04.8.1.68.36 1.42.87 1.77 1.26.16.18.27.44.16.7-.13.3-.43.69-.76 1-.27.25-.61.48-.96.62z"/></svg>
                <span>WhatsApp</span>
            </button>`;
        }
        
        if (est.phone) {
            const digitsOnly = getDigitsOnly(est.phone);
            const displayPhone = formatPhoneForDisplay(est.phone);
            buttonsHtml += `<button class="action-square phone" data-phone="${digitsOnly}">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>${escapeHtml(displayPhone)}</span>
            </button>`;
        }
        
        if (est.address) {
            buttonsHtml += `<button class="action-square maps" data-maps="${est.mapsUrl || 'https://maps.google.com/?q=' + encodeURIComponent(est.address)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <span>Rotas</span>
            </button>`;
        }
        
        if (est.instagram) {
            buttonsHtml += `<button class="action-square instagram" data-instagram="${est.instagram}">
                <svg viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                <span>Instagram</span>
            </button>`;
        }
        
        if (est.facebook) {
            buttonsHtml += `<button class="action-square facebook" data-facebook="${est.facebook}">
                <svg viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span>Facebook</span>
            </button>`;
        }
        
        if (est.website) {
            buttonsHtml += `<button class="action-square site" data-site="${est.website}">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span>Site</span>
            </button>`;
        }
        
        allCardsHtml += `
            <div class="est-card" data-index="${idx}" data-name="${escapeHtml(est.name)}">
                ${galleryHtml}
                <div class="est-info">
                    <h2 class="est-name">${escapeHtml(est.name)}</h2>
                    ${est.address ? `<div class="est-address" data-url="${est.mapsUrl || 'https://maps.google.com/?q=' + encodeURIComponent(est.address)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg><span>${escapeHtml(est.address)}</span></div>` : ''}
                    <div class="action-buttons">${buttonsHtml}</div>
                </div>
            </div>
        `;
    }
    
    fullscreenContent.innerHTML = `
        <div class="est-cards-container">
            ${allCardsHtml}
        </div>
    `;
    
    attachEstablishmentEvents();
    updateDots();
    
    setTimeout(() => {
        const container = document.querySelector('.est-cards-container');
        const currentCard = document.querySelector(`.est-card[data-index="${currentFullscreenIndex}"]`);
        if (container && currentCard) {
            container.scrollLeft = currentCard.offsetLeft;
        }
        setupHorizontalScroll();
    }, 100);
}

function attachEstablishmentEvents() {
    document.querySelectorAll('.action-square.whatsapp').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            let whatsapp = btn.dataset.whatsapp.replace(/\D/g, '');
            if (whatsapp.startsWith('550')) {
                whatsapp = whatsapp.substring(2);
            } else if (whatsapp.startsWith('55') && whatsapp.length > 12) {
                whatsapp = whatsapp.substring(2);
            }
            if (!whatsapp.startsWith('55') && whatsapp.length <= 11) {
                whatsapp = '55' + whatsapp;
            }
            window.open(`https://wa.me/${whatsapp}`, '_blank');
        };
    });
    
    document.querySelectorAll('.action-square.phone').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            let phone = btn.dataset.phone.replace(/\D/g, '');
            if (phone.startsWith('55')) {
                phone = phone.substring(2);
            }
            window.location.href = `tel:${phone}`;
        };
    });
    
    document.querySelectorAll('.action-square.maps').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            window.open(btn.dataset.maps, '_blank');
        };
    });
    
    document.querySelectorAll('.action-square.instagram').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            let insta = btn.dataset.instagram;
            if (!insta.startsWith('http')) insta = `https://instagram.com/${insta.replace('@', '')}`;
            window.open(insta, '_blank');
        };
    });
    
    document.querySelectorAll('.action-square.facebook').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            let fb = btn.dataset.facebook;
            if (!fb.startsWith('http')) fb = `https://facebook.com/${fb.replace('@', '')}`;
            window.open(fb, '_blank');
        };
    });
    
    document.querySelectorAll('.action-square.site').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            let site = btn.dataset.site;
            if (!site.startsWith('http')) site = 'https://' + site;
            window.open(site, '_blank');
        };
    });
    
    const addressRows = document.querySelectorAll('.est-address');
    addressRows.forEach(row => {
        if (row.dataset.url) {
            row.onclick = () => window.open(row.dataset.url, '_blank');
        }
    });
}

function navigatePrevious() {
    if (currentFullscreenIndex > 0) {
        currentFullscreenIndex--;
        const container = document.querySelector('.est-cards-container');
        const targetCard = document.querySelector(`.est-card[data-index="${currentFullscreenIndex}"]`);
        if (container && targetCard) {
            container.scrollTo({ left: targetCard.offsetLeft, behavior: 'smooth' });
        }
        updateDots();
    }
}

function navigateNext() {
    if (currentFullscreenCards && currentFullscreenIndex < currentFullscreenCards.length - 1) {
        currentFullscreenIndex++;
        const container = document.querySelector('.est-cards-container');
        const targetCard = document.querySelector(`.est-card[data-index="${currentFullscreenIndex}"]`);
        if (container && targetCard) {
            container.scrollTo({ left: targetCard.offsetLeft, behavior: 'smooth' });
        }
        updateDots();
    }
}

prevEstablishmentDesktop?.addEventListener('click', navigatePrevious);
nextEstablishmentDesktop?.addEventListener('click', navigateNext);

document.addEventListener('keydown', (e) => {
    if (!fullscreen.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePrevious();
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateNext();
    } else if (e.key === 'Escape') {
        closeFullscreenView();
    }
});

function closeFullscreenView() {
    fullscreen.classList.remove('active');
    document.body.style.overflow = '';
    currentFullscreenCards = [];
    currentFullscreenIndex = 0;
}

closeFullscreen?.addEventListener('click', closeFullscreenView);

function openSearchSidebar() {
    searchSidebar.classList.add('open');
    searchSidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => sidebarSearchInput.focus(), 100);
}

function closeSearchSidebarPanel() {
    searchSidebar.classList.remove('open');
    searchSidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
    sidebarSearchInput.value = '';
    searchSidebarResults.innerHTML = '<div class="search-sidebar-empty">Digite para buscar estabelecimentos</div>';
}

function searchEstablishments(query) {
    if (!query || query.trim() === '') return [];
    const searchLower = query.toLowerCase().trim();
    const results = [];
    for (const est of establishmentsData) {
        if (est.name && est.name.toLowerCase().includes(searchLower)) {
            results.push({
                id: est.id,
                name: est.name,
                categoryId: est.categoryId,
                categoryName: est.categoryName
            });
        }
    }
    return results.slice(0, 30);
}

function renderSidebarSearchResults(results) {
    if (!searchSidebarResults) return;
    if (results.length === 0) {
        searchSidebarResults.innerHTML = `<div class="search-sidebar-empty">Nenhum estabelecimento encontrado</div>`;
        return;
    }
    let html = '';
    for (const result of results) {
        html += `
            <div class="search-sidebar-result-item" data-id="${result.id}" data-category-id="${result.categoryId}">
                <div class="search-sidebar-result-name">${escapeHtml(result.name)}</div>
                <div class="search-sidebar-result-category">${escapeHtml(result.categoryName)}</div>
            </div>
        `;
    }
    searchSidebarResults.innerHTML = html;
    searchSidebarResults.querySelectorAll('.search-sidebar-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const estId = item.dataset.id;
            const categoryId = item.dataset.categoryId;
            closeSearchSidebarPanel();
            openEstablishmentInCategory(categoryId, estId);
            sidebarSearchInput.value = '';
        });
    });
}

function openEstablishmentInCategory(categoryId, establishmentId) {
    const category = categoriesData.find(c => c.id === categoryId);
    if (!category) return;
    openCategoryFullscreen(categoryId);
    setTimeout(() => {
        const index = currentFullscreenCards.findIndex(c => c.id === establishmentId);
        if (index !== -1) {
            currentFullscreenIndex = index;
            const container = document.querySelector('.est-cards-container');
            const targetCard = document.querySelector(`.est-card[data-index="${currentFullscreenIndex}"]`);
            if (container && targetCard) {
                container.scrollTo({ left: targetCard.offsetLeft, behavior: 'smooth' });
            }
            updateDots();
        }
    }, 200);
}

searchButton?.addEventListener('click', openSearchSidebar);
fullscreenSearchBtn?.addEventListener('click', openSearchSidebar);
closeSearchSidebar?.addEventListener('click', closeSearchSidebarPanel);
searchSidebarOverlay?.addEventListener('click', closeSearchSidebarPanel);

if (sidebarSearchInput) {
    sidebarSearchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        if (!value || value.trim() === '') {
            searchSidebarResults.innerHTML = '<div class="search-sidebar-empty">Digite para buscar estabelecimentos</div>';
            return;
        }
        const results = searchEstablishments(value);
        renderSidebarSearchResults(results);
    });
}

sidebarClearSearchBtn?.addEventListener('click', () => {
    sidebarSearchInput.value = '';
    searchSidebarResults.innerHTML = '<div class="search-sidebar-empty">Digite para buscar estabelecimentos</div>';
    sidebarSearchInput.focus();
});

if (establishmentSearchInput) {
    establishmentSearchInput.addEventListener('input', (e) => {
        searchEstablishmentInCategory(e.target.value);
    });
}

if (clearEstablishmentSearch) {
    clearEstablishmentSearch.addEventListener('click', () => {
        establishmentSearchInput.value = '';
        searchEstablishmentInCategory('');
        establishmentSearchInput.focus();
    });
}

menuButton?.addEventListener('click', () => {
    navSidebar.classList.toggle('open');
    mobileOverlay.classList.toggle('active');
});

mobileOverlay?.addEventListener('click', () => {
    navSidebar.classList.remove('open');
    mobileOverlay.classList.remove('active');
});

categoriesGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.category-card');
    if (card && card.dataset.id) {
        openCategoryFullscreen(card.dataset.id);
    }
});

function handleCategorySearch(value) {
    renderCategoriesList(value);
}

if (categorySearchInput) {
    categorySearchInput.addEventListener('input', (e) => handleCategorySearch(e.target.value));
}

googleLoginBtn?.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        if (ADMIN_UIDS.includes(user.uid)) {
            window.location.href = 'admin.html';
        } else {
            alert('Você não tem permissão de administrador.');
            await signOut(auth);
        }
    } catch (error) {
        console.error('Erro no login admin:', error);
        alert('Erro ao fazer login. Tente novamente.');
    }
});

// ==================== CARD DE INSTALAÇÃO ====================
// Verifica se o app está instalado
async function isAppInstalled() {
    // Verifica pelo display-mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    
    // Verifica pelo navigator.standalone (iOS)
    if (window.navigator.standalone === true) {
        return true;
    }
    
    // Verifica pelo getInstalledRelatedApps (suporte mais novo)
    if ('getInstalledRelatedApps' in window.navigator) {
        try {
            const relatedApps = await navigator.getInstalledRelatedApps();
            return relatedApps.some(app => app.platform === 'webapp');
        } catch (e) {
            console.log('Erro ao verificar apps instalados:', e);
        }
    }
    
    return false;
}

// Mostra o card de instalação (sempre que chamado, se não estiver instalado)
async function showInstallCard() {
    const installed = await isAppInstalled();
    
    // Só mostra o card se o app NÃO estiver instalado
    if (!installed && installCard) {
        installCard.classList.add('show');
    } else {
        // Se já estiver instalado, garante que o card fique escondido
        if (installCard) {
            installCard.classList.remove('show');
        }
    }
}

// Fecha o card de instalação (apenas esconde, sem salvar localStorage)
function closeInstallCard() {
    if (installCard) {
        installCard.classList.remove('show');
    }
}

// Função para instalar o app
function installApp() {
    if (deferredPrompt) {
        // Chrome/Edge/Samsung Internet
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Usuário aceitou a instalação');
            }
            deferredPrompt = null;
        });
    } else {
        // Fallback para dispositivos que não suportam beforeinstallprompt
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);
        
        if (isIOS) {
            if (confirm('Para instalar este app no seu iPhone:\n\n1. Toque no botão Compartilhar 📤\n2. Role e toque em "Adicionar à Tela de Início"\n3. Confirme "Adicionar"\n\nDeseja ver o tutorial agora?')) {
                window.open('https://support.apple.com/pt-br/HT211020', '_blank');
            }
        } else if (isAndroid) {
            alert('Para instalar:\n\n1. Toque no menu (⋮) no canto superior\n2. Selecione "Instalar aplicativo"\n3. Confirme a instalação');
        } else {
            alert('Para instalar este app no computador:\n\n• Chrome/Edge: Clique no ícone de instalação na barra de endereço\n• Firefox: Disponível via extensões');
        }
    }
}

// Eventos do card de instalação
if (installCardBtn) {
    installCardBtn.addEventListener('click', installApp);
}

if (installCardClose) {
    installCardClose.addEventListener('click', closeInstallCard);
}

// Inicializa o PWA e configura o beforeinstallprompt
function initPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('✅ beforeinstallprompt capturado');
        // Tenta mostrar o card quando o evento é disparado
        showInstallCard();
    });
    
    // Quando o app for instalado com sucesso
    window.addEventListener('appinstalled', () => {
        console.log('✅ App instalado com sucesso');
        deferredPrompt = null;
        // Fecha o card imediatamente
        if (installCard) {
            installCard.classList.remove('show');
        }
    });
    
    // Verifica a cada vez que a página ganha foco (voltar de outra aba, etc)
    window.addEventListener('pageshow', () => {
        showInstallCard();
    });
    
    // Verifica também quando o display-mode mudar (útil para iOS)
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
        if (e.matches) {
            // Modo standalone ativado - app instalado
            if (installCard) {
                installCard.classList.remove('show');
            }
        } else {
            // Saiu do modo standalone - pode mostrar o card novamente
            showInstallCard();
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    await fetchAllData();
    initPWA();
    // Mostra o card após carregar os dados
    showInstallCard();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registrado:', registration.scope);
        } catch (error) {
            console.error('❌ Service Worker falhou:', error);
        }
    });
}