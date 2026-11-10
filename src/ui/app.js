// --- LINGUE E TRADUZIONI ---
let currentLang = 'it';
const translations = {
    it: {
        btnFollowFree: "Mappa Libera",
        btnFollowNorth: "Segui (North Up)",
        btnFollowTrack: "Segui (Track Up)",
        btnNavaids: "VOR/ILS: ON",
        btnNavaidsOff: "VOR/ILS: OFF",
        noFpl: "NESSUN PIANO DI VOLO ATTIVO"
    },
    en: {
        btnFollowFree: "Free Map",
        btnFollowNorth: "Follow (North Up)",
        btnFollowTrack: "Follow (Track Up)",
        btnNavaids: "VOR/ILS: ON",
        btnNavaidsOff: "VOR/ILS: OFF",
        noFpl: "NO ACTIVE FLIGHT PLAN"
    }
};

// --- INIZIALIZZAZIONE UI E OROLOGIO ---
function updateClock() {
    const now = new Date();
    const dateEl = document.getElementById('infoDate');
    const utcEl = document.getElementById('infoUtc');
    const sysEl = document.getElementById('infoSys');

    if (dateEl) {
        const day = String(now.getUTCDate()).padStart(2, '0');
        const month = now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
        const year = now.getUTCFullYear();
        dateEl.textContent = `${day} ${month} ${year}`;
    }
    if (utcEl) {
        const h = String(now.getUTCHours()).padStart(2, '0');
        const m = String(now.getUTCMinutes()).padStart(2, '0');
        const s = String(now.getUTCSeconds()).padStart(2, '0');
        utcEl.textContent = `UTC: ${h}:${m}:${s}`;
    }
    if (sysEl) {
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        sysEl.textContent = `SYS: ${h}:${m}:${s}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Avvia l'orologio della barra inferiore
    setInterval(updateClock, 1000);
    updateClock();

    window.onclick = function(event) {
        const createModal = document.getElementById('createFplModal');
        if (createModal && event.target === createModal) {
            closeCreateFplModal();
        }
    };

    const vnavContainer = document.getElementById('vnavContainer');
    const infoBar = document.getElementById('bottomInfoBar');
    if (vnavContainer && infoBar) {
        const isClosed = vnavContainer.classList.contains('collapsed');
        infoBar.style.bottom = isClosed ? '36px' : '134px';
    }
});

// --- GESTIONE PANNELLI E CASSETTI UI ---
function toggleFpl() {
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
}

function toggleVnav() {
    const vnavContainer = document.getElementById('vnavContainer');
    if (!vnavContainer) return;
    
    vnavContainer.classList.toggle('collapsed');
    
    const infoBar = document.getElementById('bottomInfoBar');
    if (infoBar) {
        const isClosed = vnavContainer.classList.contains('collapsed');
        infoBar.style.bottom = isClosed ? '36px' : '134px';
    }
}

function switchLanguage(lang) {
    currentLang = lang;
    const t = translations[currentLang];
    
    const btnFollow = document.getElementById('btnFollowAcft');
    if (btnFollow && typeof followState !== 'undefined') {
        if (followState === 0) btnFollow.innerText = t.btnFollowFree;
        else if (followState === 1) btnFollow.innerText = t.btnFollowNorth;
        else if (followState === 2) btnFollow.innerText = t.btnFollowTrack;
    }
    
    const btnNavaids = document.getElementById('btnToggleNavaids');
    if (btnNavaids && typeof showNavaids !== 'undefined') {
        btnNavaids.innerText = showNavaids ? t.btnNavaids : t.btnNavaidsOff;
    }

    const vnavText = document.getElementById('vnavText');
    if (vnavText && (typeof flightPlan === 'undefined' || flightPlan.length === 0)) {
        vnavText.textContent = t.noFpl;
    }
}

// --- CONTROLLI FINESTRA NATIVI (PYWEBVIEW) ---
function closeApp() {
    if (window.pywebview && window.pywebview.api) window.pywebview.api.close_app();
}
function minimizeApp() {
    if (window.pywebview && window.pywebview.api) window.pywebview.api.minimize_app();
}
function toggleMaximizeApp() {
    if (window.pywebview && window.pywebview.api) window.pywebview.api.toggle_maximize_app();
}