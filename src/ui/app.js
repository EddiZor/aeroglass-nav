// --- PONTE EFB DI RETE (POLYFILL AUTOMATICO PER BROWSER / TABLET WI-FI) ---
if (!window.pywebview && window.location.protocol.startsWith('http')) {
    const efbApiProxy = new Proxy({}, {
        get: function(target, prop) {
            if (prop === 'then' || typeof prop === 'symbol') return undefined;
            return async function(...args) {
                const response = await fetch(`/api/${prop}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ args: args })
                });
                if (!response.ok) throw new Error(`EFB HTTP Error ${response.status}`);
                const data = await response.json();
                return data.result;
            };
        }
    });
    window.pywebview = { api: efbApiProxy, isNetworkEfb: true };
}

// --- SUPPORTO WEBAPP FULLSCREEN PER TABLET ANDROID / iOS ---
function injectMobileWebAppMeta() {
    if (document.getElementById('aeroPwaMeta')) return;
    const metas = [
        { id: 'aeroPwaMeta', name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'theme-color', content: '#090d16' }
    ];
    metas.forEach(m => {
        const el = document.createElement('meta');
        if (m.id) el.id = m.id;
        el.name = m.name;
        el.content = m.content;
        document.head.appendChild(el);
    });
}

// --- MODALITÀ NOTTURNA DEDICATA & SWITCH RAPIDO (☀️ GIORNO / 🌙 DARK / 🌑 NOTTE) ---
let currentThemeMode = localStorage.getItem('aeroglass_theme_mode') || 'dark';

function injectThemeModeStyles() {
    if (document.getElementById('aeroglassThemeStyles')) return;
    const style = document.createElement('style');
    style.id = 'aeroglassThemeStyles';
    style.textContent = `
        /* Protezione larghezza cassetto VNAV e linguetta ALT */
        #elevationDrawer {
            max-width: calc(100vw - 32px) !important;
            box-sizing: border-box !important;
        }
        #vnavText {
            display: block;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        #drawerToggleTab {
            z-index: 1200 !important;
            display: flex !important;
            align-items: center;
            justify-content: center;
        }

        /* Tooltip sintetico Dark Glass */
        #aeroFloatingTooltip {
            position: fixed;
            z-index: 99999;
            pointer-events: none;
            background: rgba(9, 14, 26, 0.96);
            border: 1px solid rgba(56, 189, 248, 0.55);
            color: #f8fafc;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            line-height: 1.35;
            max-width: 260px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            opacity: 0;
            transform: translateY(4px);
            transition: opacity 0.12s ease, transform 0.12s ease;
        }
        #aeroFloatingTooltip.visible {
            opacity: 1;
            transform: translateY(0);
        }

        /* 🌑 MODALITÀ NOTTE PROFONDA (ANTI-ABBAGLIAMENTO COCKPIT / STANZA BUIA) */
        body.theme-night {
            --bg-dark: #02050b;
            --glass-bg: rgba(4, 8, 16, 0.94);
            --glass-border: rgba(56, 189, 248, 0.16);
            --text-main: #cbd5e1;
            --text-muted: #64748b;
        }
        body.theme-night .glass-panel,
        body.theme-night #sidebarPanel,
        body.theme-night #elevationDrawer,
        body.theme-night .top-btn,
        body.theme-night .telemetry-bar,
        body.theme-night #bottomInfoBar {
            background: rgba(4, 8, 16, 0.94) !important;
            border-color: rgba(56, 189, 248, 0.16) !important;
            color: #cbd5e1 !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.85) !important;
        }
        body.theme-night .fpl-card,
        body.theme-night .glass-input {
            background: rgba(9, 14, 26, 0.92) !important;
            color: #cbd5e1 !important;
            border-color: rgba(71, 85, 105, 0.3) !important;
        }
        body.theme-night .leaflet-tile-pane {
            filter: brightness(0.60) contrast(1.12) saturate(0.82) !important;
            transition: filter 0.25s ease;
        }
        body.theme-night .leaflet-marker-pane,
        body.theme-night .leaflet-overlay-pane {
            filter: brightness(0.90);
        }

        /* ☀️ MODALITÀ GIORNO (DAY MODE AD ALTO CONTRASTO STILE NAVIGRAPH DAY) */
        body.theme-day {
            --bg-dark: #e2e8f0;
            --glass-bg: rgba(248, 250, 252, 0.94);
            --glass-border: rgba(15, 23, 42, 0.18);
            --text-main: #0f172a;
            --text-muted: #475569;
        }
        body.theme-day .glass-panel,
        body.theme-day #sidebarPanel,
        body.theme-day #elevationDrawer,
        body.theme-day .top-btn,
        body.theme-day .telemetry-bar,
        body.theme-day #bottomInfoBar,
        body.theme-day #sidebarToggleTab,
        body.theme-day #drawerToggleTab {
            background: rgba(248, 250, 252, 0.94) !important;
            border-color: rgba(15, 23, 42, 0.18) !important;
            color: #0f172a !important;
            box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12) !important;
        }
        body.theme-day .sidebar-section-title,
        body.theme-day .telemetry-label,
        body.theme-day #vnavText {
            color: #334155 !important;
        }
        body.theme-day .telemetry-val {
            color: #0284c7 !important;
        }
        body.theme-day .fpl-card {
            background: rgba(255, 255, 255, 0.96) !important;
            border-color: rgba(15, 23, 42, 0.15) !important;
            color: #0f172a !important;
        }
        body.theme-day .glass-input,
        body.theme-day select.top-btn {
            background: #ffffff !important;
            color: #0f172a !important;
            border-color: rgba(15, 23, 42, 0.22) !important;
        }
        body.theme-day .leaflet-tile-pane {
            filter: brightness(1.04) contrast(1.02) !important;
            transition: filter 0.25s ease;
        }

        /* Stili Tabella NavLog & Fuel Calculator */
        .navlog-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
        }
        .navlog-table th {
            position: sticky;
            top: 0;
            background: rgba(15, 23, 42, 0.96);
            color: #94a3b8;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 7px 6px;
            border-bottom: 1px solid rgba(56, 189, 248, 0.3);
            text-align: left;
            z-index: 2;
        }
        .navlog-table td {
            padding: 6px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.12);
            font-family: Consolas, monospace;
        }
        .navlog-table tr.navlog-row:hover {
            background: rgba(56, 189, 248, 0.12);
            cursor: pointer;
        }
        .navlog-table tr.active-leg-row {
            background: rgba(52, 211, 153, 0.16) !important;
            border-left: 3px solid #34d399;
        }
        .fuel-grid-box {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }
        .fuel-stat-card {
            background: rgba(9, 13, 22, 0.65);
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 8px;
            padding: 7px 9px;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        /* --- STILI MODALITÀ DIMOSTRATIVA INTERATTIVA (TOUR FUMETTI LIRF -> EGLL) --- */
        @keyframes aeroDemoPulse {
            0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.85), 0 0 25px rgba(56, 189, 248, 0.65); }
            70% { box-shadow: 0 0 0 12px rgba(56, 189, 248, 0), 0 0 35px rgba(251, 191, 36, 0.75); }
            100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0), 0 0 25px rgba(56, 189, 248, 0.65); }
        }
        #aeroDemoSpotlight {
            position: fixed;
            z-index: 99990;
            pointer-events: none;
            border: 2.5px solid #38bdf8;
            border-radius: 12px;
            background: rgba(56, 189, 248, 0.06);
            animation: aeroDemoPulse 1.8s infinite;
            transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
            display: none;
        }
        #aeroDemoBubble {
            position: fixed;
            z-index: 99995;
            width: 350px;
            max-width: calc(100vw - 24px);
            background: linear-gradient(160deg, rgba(11, 18, 34, 0.98) 0%, rgba(18, 28, 48, 0.98) 100%);
            border: 1.5px solid #38bdf8;
            border-radius: 14px;
            padding: 14px 16px;
            color: #f8fafc;
            box-shadow: 0 14px 40px rgba(0, 0, 0, 0.85), 0 0 24px rgba(56, 189, 248, 0.25);
            backdrop-filter: blur(14px);
            transition: top 0.35s cubic-bezier(0.22, 1, 0.36, 1), left 0.35s cubic-bezier(0.22, 1, 0.36, 1);
            display: none;
            font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .aero-demo-arrow {
            position: absolute;
            width: 14px;
            height: 14px;
            background: rgba(14, 22, 40, 0.98);
            transform: rotate(45deg);
            pointer-events: none;
        }
        .aero-demo-btn {
            background: rgba(30, 41, 59, 0.85);
            border: 1px solid rgba(148, 163, 184, 0.3);
            color: #f8fafc;
            border-radius: 7px;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .aero-demo-btn:hover {
            border-color: #38bdf8;
            background: rgba(56, 189, 248, 0.18);
        }
        .aero-demo-btn.primary {
            background: rgba(56, 189, 248, 0.22);
            border-color: #38bdf8;
            color: #38bdf8;
        }
        .aero-demo-btn.amber {
            background: rgba(251, 191, 36, 0.18);
            border-color: rgba(251, 191, 36, 0.55);
            color: #fbbf24;
        }
    `;
    document.head.appendChild(style);
}

// --- SISTEMA TOOLTIP DESCRITTIVI SINTETICI (ATTIVABILI / DISATTIVABILI) ---
let tooltipsEnabled = (localStorage.getItem('aeroglass_tooltips') !== 'false');

const SYNTHETIC_TOOLTIPS = {
    btnEfbNet: {
        it: "📱 EFB Wi-Fi: Mostra QR Code e indirizzo IP per aprire l'app sul tablet",
        en: "📱 Wi-Fi EFB: Show QR Code and local IP to connect your tablet"
    },
    btnLogbook: {
        it: "📒 Logbook: Storico dei voli registrati automaticamente all'atterraggio",
        en: "📒 Logbook: Flight history and fuel log saved in SQLite"
    },
    btnNavlogTop: {
        it: "📋 NavLog: Tabella di marcia con prue, distanze, tempi ETE/ETA e consumi",
        en: "📋 NavLog: Detailed route table with headings, ETE/ETA and fuel burn"
    },
    btnFuelPerfTop: {
        it: "⛽ Fuel & Perf: Calcola Block Fuel, riserve e prestazioni per il tuo aereo",
        en: "⛽ Fuel & Perf: Calculate Block Fuel, reserves and aircraft performance"
    },
    btnToggleNavaids: {
        it: "📡 VOR/ILS: Mostra o nascondi radioassistenze e coni di avvicinamento sulla mappa",
        en: "📡 VOR/ILS: Show or hide VOR stations and ILS approach cones on map"
    },
    btnFollowAcft: {
        it: "🧭 Segui Aereo: Cicla tra Mappa Libera, Segui (Nord Alto) e Track Up (prua in alto)",
        en: "🧭 Follow Aircraft: Cycle Free Map, North Up and Track Up modes"
    },
    btnThemeMode: {
        it: "🌙 Tema Visivo: Passa tra Dark Cockpit, Notte Anti-Abbagliamento e Giorno",
        en: "🌙 Theme Mode: Switch between Dark Cockpit, Night Dimmer and Day Mode"
    },
    btnToggleTooltips: {
        it: "💬 Tooltip: Attiva o disattiva i suggerimenti rapidi sui pulsanti (Premi F1 per Tour Demo)",
        en: "💬 Tooltips: Enable or disable quick hover descriptions (Press F1 for Demo Tour)"
    },
    mapStyleSelect: {
        it: "🗺️ Cartografia: Cambia lo sfondo mappa (IFR Dark, VFR Topo, Satellite, High IFR)",
        en: "🗺️ Map Style: Change base map layer (IFR Dark, VFR Topo, Satellite, High IFR)"
    },
    omniSearch: {
        it: "🔍 Ricerca Rapida: Digita un codice ICAO (es. LIPD, LITY), un VOR o il nome aeroporto",
        en: "🔍 Quick Search: Type an ICAO code, VOR or airport name to center on map"
    },
    sidebarToggleTab: {
        it: "◀/▶ Pannello FPL: Apri o chiudi la barra laterale del Piano di Volo",
        en: "◀/▶ FPL Sidebar: Expand or collapse the Flight Plan side panel"
    },
    drawerToggleTab: {
        it: "▼/▲ Profilo VNAV: Apri o chiudi il grafico altimetrico e Top of Descent",
        en: "▼/▲ VNAV Profile: Expand or collapse vertical terrain & ToD chart"
    }
};

function resolveSyntheticTooltip(el) {
    if (!el) return null;
    const lang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'it';

    if (el.id && SYNTHETIC_TOOLTIPS[el.id]) {
        return SYNTHETIC_TOOLTIPS[el.id][lang];
    }

    const onclickStr = (el.getAttribute('onclick') || '').toLowerCase();
    if (onclickStr.includes('opencreatefplmodal')) {
        return lang === 'en' ? '➕ Create a new Flight Plan from scratch' : '➕ Crea un nuovo Piano di Volo (Partenza, Destinazione e Waypoint)';
    }
    if (onclickStr.includes('loadpln') || onclickStr.includes('importpln')) {
        return lang === 'en' ? '📂 Import an MSFS .pln flight plan file' : '📂 Importa un file Piano di Volo (.pln) dal disco';
    }
    if (onclickStr.includes('exportpln')) {
        return lang === 'en' ? '💾 Export active route as .pln in Downloads' : '💾 Esporta la rotta attiva in formato .pln nella cartella Download';
    }
    if (onclickStr.includes('clearflightplan')) {
        return lang === 'en' ? '🗑️ Clear the entire active Flight Plan' : '🗑️ Cancella interamente il Piano di Volo attivo';
    }
    if (onclickStr.includes('fetchsimbrief') || onclickStr.includes('simbrief')) {
        return lang === 'en' ? '✈️ Import latest OFP flight plan from SimBrief' : '✈️ Scarica l\'ultimo piano di volo OFP generato su SimBrief';
    }
    if (onclickStr.includes('undo')) {
        return lang === 'en' ? '↩️ Undo last route modification (Ctrl+Z)' : '↩️ Annulla l\'ultima modifica fatta sulla rotta (Ctrl+Z)';
    }
    if (onclickStr.includes('filter')) {
        return lang === 'en' ? '⚙️ Filter airports, SID/STAR procedures and map layers' : '⚙️ Filtra visibilità aeroporti, procedure SID/STAR e livelli mappa';
    }
    if (onclickStr.includes('follow')) {
        return SYNTHETIC_TOOLTIPS.btnFollowAcft[lang];
    }
    if (onclickStr.includes('togglelanguage')) {
        return lang === 'en' ? '🌐 Switch interface language (IT / EN)' : '🌐 Cambia lingua dell\'interfaccia (Italiano / Inglese)';
    }
    if (onclickStr.includes('pick') || onclickStr.includes('mappa')) {
        return lang === 'en' ? '📍 Click directly on the map to pick Waypoint coordinates' : '📍 Clicca sulla mappa per catturare automaticamente Latitudine e Longitudine';
    }
    if (onclickStr.includes('adduserwaypoint') || onclickStr.includes('aggiungi')) {
        return lang === 'en' ? '➕ Save custom Waypoint in SQLite database' : '➕ Salva il Waypoint utente nel database SQLite e aggiungilo in mappa';
    }

    if (el.dataset && el.dataset.origTitle) {
        return el.dataset.origTitle;
    }
    if (el.getAttribute('title')) {
        el.dataset.origTitle = el.getAttribute('title');
        el.removeAttribute('title');
        return el.dataset.origTitle;
    }
    return null;
}

function ensureTooltipToggleButton() {
    if (document.getElementById('btnToggleTooltips')) return;
    const pillsGroup = document.querySelector('.top-pills-group');
    if (!pillsGroup) return;

    const btn = document.createElement('button');
    btn.id = 'btnToggleTooltips';
    btn.className = 'top-btn';
    btn.onclick = toggleTooltipsMode;
    btn.style.justifyContent = 'center';

    const themeBtn = document.getElementById('btnThemeMode');
    if (themeBtn && themeBtn.parentNode === pillsGroup) {
        pillsGroup.insertBefore(btn, themeBtn);
    } else {
        pillsGroup.appendChild(btn);
    }
    updateTooltipButtonUI();
}

function updateTooltipButtonUI() {
    const btn = document.getElementById('btnToggleTooltips');
    if (!btn) return;
    if (tooltipsEnabled) {
        btn.innerHTML = '💬 <span>Info: ON</span>';
        btn.style.borderColor = 'rgba(52, 211, 153, 0.45)';
        btn.style.color = '#34d399';
    } else {
        btn.innerHTML = '💬 <span>Info: OFF</span>';
        btn.style.borderColor = 'rgba(148, 163, 184, 0.25)';
        btn.style.color = '#94a3b8';
    }
}

async function applyTooltipsMode(enabled, persist = true) {
    tooltipsEnabled = Boolean(enabled);
    ensureTooltipToggleButton();
    updateTooltipButtonUI();

    const tipBox = document.getElementById('aeroFloatingTooltip');
    if (!tooltipsEnabled && tipBox) {
        tipBox.classList.remove('visible');
    }

    document.querySelectorAll('[title]').forEach(el => {
        const t = el.getAttribute('title');
        if (t) el.dataset.origTitle = t;
        el.removeAttribute('title');
    });

    try {
        localStorage.setItem('aeroglass_tooltips', String(tooltipsEnabled));
    } catch (e) {}

    if (persist && window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try {
            await window.pywebview.api.save_setting('show_tooltips', String(tooltipsEnabled));
        } catch (e) {}
    }
}

function toggleTooltipsMode() {
    applyTooltipsMode(!tooltipsEnabled, true);
}

function initSyntheticTooltipsEngine() {
    if (window._aeroTooltipsInitialized) return;
    window._aeroTooltipsInitialized = true;

    let tipBox = document.getElementById('aeroFloatingTooltip');
    if (!tipBox) {
        tipBox = document.createElement('div');
        tipBox.id = 'aeroFloatingTooltip';
        document.body.appendChild(tipBox);
    }

    let activeEl = null;

    const positionTooltip = (e) => {
        if (!tipBox.classList.contains('visible')) return;
        const pad = 14;
        const rect = tipBox.getBoundingClientRect();
        let x = e.clientX + 12;
        let y = e.clientY + 18;

        if (x + rect.width + pad > window.innerWidth) {
            x = Math.max(8, window.innerWidth - rect.width - pad);
        }
        if (y + rect.height + pad > window.innerHeight) {
            y = Math.max(8, e.clientY - rect.height - 12);
        }
        tipBox.style.left = `${x}px`;
        tipBox.style.top = `${y}px`;
    };

    document.addEventListener('mouseover', (e) => {
        if (!tooltipsEnabled || window._demoTourActive) {
            tipBox.classList.remove('visible');
            return;
        }
        const target = e.target.closest('button, select, input, #sidebarToggleTab, #drawerToggleTab, .top-btn, .btn');
        if (!target) {
            activeEl = null;
            tipBox.classList.remove('visible');
            return;
        }
        const text = resolveSyntheticTooltip(target);
        if (!text) {
            activeEl = null;
            tipBox.classList.remove('visible');
            return;
        }
        activeEl = target;
        tipBox.innerText = text;
        tipBox.classList.add('visible');
        positionTooltip(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (activeEl && tooltipsEnabled && !window._demoTourActive) {
            positionTooltip(e);
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (activeEl && !activeEl.contains(e.relatedTarget)) {
            activeEl = null;
            tipBox.classList.remove('visible');
        }
    });

    document.addEventListener('mousedown', () => tipBox.classList.remove('visible'));
    document.addEventListener('touchstart', () => tipBox.classList.remove('visible'), { passive: true });
}

function ensureDrawerToggleTab() {
    const drawer = document.getElementById('elevationDrawer');
    if (!drawer) return;
    let tab = document.getElementById('drawerToggleTab');
    if (!tab) {
        tab = document.createElement('div');
        tab.id = 'drawerToggleTab';
        tab.onclick = toggleDrawer;
        tab.style.cssText = 'position:absolute;top:-24px;left:50%;transform:translateX(-50%);background:var(--glass-bg);border:1px solid var(--glass-border);border-bottom:none;border-radius:8px 8px 0 0;padding:3px 16px;font-size:10px;font-weight:700;color:var(--cyan);cursor:pointer;display:flex;align-items:center;gap:5px;box-shadow:0 -4px 12px rgba(0,0,0,0.4);';
        tab.innerHTML = `<span id="drawerArrow">${drawerOpen ? '▼' : '▲'}</span> <span>ALT</span>`;
        drawer.appendChild(tab);
    }
}

function ensureThemeToggleButton() {
    if (document.getElementById('btnThemeMode')) return;
    const pillsGroup = document.querySelector('.top-pills-group');
    if (!pillsGroup) return;

    const btn = document.createElement('button');
    btn.id = 'btnThemeMode';
    btn.className = 'top-btn';
    btn.onclick = toggleThemeMode;
    btn.style.minWidth = '88px';
    btn.style.justifyContent = 'center';

    const mapSelect = document.getElementById('mapStyleSelect');
    if (mapSelect && mapSelect.parentNode === pillsGroup) {
        pillsGroup.insertBefore(btn, mapSelect);
    } else {
        pillsGroup.appendChild(btn);
    }
    updateThemeButtonUI();
}

function updateThemeButtonUI() {
    const btn = document.getElementById('btnThemeMode');
    if (!btn) return;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

    if (currentThemeMode === 'night') {
        btn.innerHTML = isEn ? '🌑 <span>Night</span>' : '🌑 <span>Notte</span>';
        btn.style.borderColor = 'rgba(251, 191, 36, 0.55)';
        btn.style.color = '#fbbf24';
    } else if (currentThemeMode === 'day') {
        btn.innerHTML = isEn ? '☀️ <span>Day</span>' : '☀️ <span>Giorno</span>';
        btn.style.borderColor = 'rgba(2, 132, 199, 0.55)';
        btn.style.color = '#0284c7';
    } else {
        btn.innerHTML = '🌙 <span>Dark</span>';
        btn.style.borderColor = 'rgba(56, 189, 248, 0.45)';
        btn.style.color = '#38bdf8';
    }
}

async function applyThemeMode(mode, persist = true) {
    if (!['dark', 'night', 'day'].includes(mode)) mode = 'dark';
    currentThemeMode = mode;

    injectMobileWebAppMeta();
    injectThemeModeStyles();
    ensureThemeToggleButton();
    ensureTooltipToggleButton();
    ensureDrawerToggleTab();
    initSyntheticTooltipsEngine();

    document.body.classList.remove('theme-dark', 'theme-night', 'theme-day');
    document.body.classList.add(`theme-${mode}`);
    updateThemeButtonUI();

    try {
        localStorage.setItem('aeroglass_theme_mode', mode);
    } catch (e) {}

    if (persist && window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try {
            await window.pywebview.api.save_setting('theme_mode', mode);
        } catch (e) {}
    }
}

function toggleThemeMode() {
    const order = ['dark', 'night', 'day'];
    const nextIdx = (order.indexOf(currentThemeMode) + 1) % order.length;
    applyThemeMode(order[nextIdx], true);
}

// --- GESTIONE MODALITÀ EFB DI RETE (QR CODE & SYNC PC <-> TABLET) ---
function updateEfbTopBarBadge(efbInfo) {
    if (!efbInfo || !efbInfo.ip || !efbInfo.port) return;
    window._cachedEfbInfo = efbInfo;
    const lbl = document.getElementById('lblEfbNet');
    if (lbl) {
        lbl.innerText = `EFB: ${efbInfo.ip}:${efbInfo.port}`;
    }
}

async function refreshEfbBadgeFromBackend() {
    if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.get_efb_info) return;
    try {
        const res = await window.pywebview.api.get_efb_info();
        if (res && res.success) {
            updateEfbTopBarBadge(res);
        }
    } catch (e) {}
}

async function openEfbNetworkModal() {
    const modal = document.getElementById('efbNetworkModal');
    if (!modal) return;

    let info = window._cachedEfbInfo;
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_efb_info) {
        try {
            const res = await window.pywebview.api.get_efb_info();
            if (res && res.success) {
                info = res;
                updateEfbTopBarBadge(info);
            }
        } catch (e) {}
    }

    if (info && info.url) {
        const urlEl = document.getElementById('efbFullUrlText');
        const portEl = document.getElementById('efbPortInput');
        const qrImg = document.getElementById('efbQrImage');

        if (urlEl) urlEl.innerText = info.url;
        if (portEl) portEl.value = info.port;
        if (qrImg) {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(info.url)}`;
        }
    }

    if (!document.getElementById('efbChromeHintBox')) {
        const contentBox = modal.querySelector('.modal-content');
        if (contentBox) {
            const hint = document.createElement('div');
            hint.id = 'efbChromeHintBox';
            hint.style.cssText = 'font-size:10px;color:#cbd5e1;text-align:left;background:rgba(56,189,248,0.08);border-left:3px solid #38bdf8;padding:6px 8px;border-radius:4px;margin-top:4px;';
            hint.innerHTML = '🔓 <strong>Primo accesso su Chrome Tablet:</strong> se appare l\'avviso di connessione HTTP locale, tocca <strong>"Continua sul sito"</strong> (oppure usa <em>Menu ⋮ &gt; Aggiungi a schermata Home</em> per aprirlo a tutto schermo).';
            contentBox.appendChild(hint);
        }
    }

    modal.style.display = 'flex';
}

function closeEfbNetworkModal() {
    const modal = document.getElementById('efbNetworkModal');
    if (modal) modal.style.display = 'none';
}

async function copyEfbUrlToClipboard() {
    const urlText = document.getElementById('efbFullUrlText')?.innerText || '';
    const btn = document.getElementById('btnCopyEfbUrl');
    if (!urlText) return;
    try {
        await navigator.clipboard.writeText(urlText);
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✅ Copiato!';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        }
    } catch (e) {}
}

async function savePreferredEfbPort() {
    const portEl = document.getElementById('efbPortInput');
    const newPort = parseInt(portEl?.value || '8339', 10);
    if (isNaN(newPort) || newPort < 1024 || newPort > 65535 || newPort === 8080) {
        alert("Inserisci una porta valida tra 1024 e 65535 (diversa da 8080).");
        return;
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.set_efb_port) {
        const res = await window.pywebview.api.set_efb_port(newPort);
        if (res && res.success) {
            alert(`Porta EFB ${newPort} salvata in SQLite. Sarà attiva dal prossimo riavvio dell'applicazione.`);
        } else if (res && res.error) {
            alert(res.error);
        }
    }
}

async function syncRemoteFlightPlanState() {
    if (!window.pywebview || !window.pywebview.api || (typeof rubberBandState !== 'undefined' && rubberBandState) || window._touchRbActive || window._demoTourActive) return;
    try {
        const [initData, wpRes] = await Promise.all([
            window.pywebview.api.get_initial_data(),
            window.pywebview.api.get_user_waypoints()
        ]);
        if (wpRes && wpRes.success && Array.isArray(wpRes.waypoints)) {
            userWaypoints = wpRes.waypoints;
        }
        if (initData && Array.isArray(initData.flight_plan)) {
            flightPlan = initData.flight_plan;
            currentAlternate = initData.alternate || null;
            window._skipRemoteSave = true;
            updateFlightPlanUI(currentAlternate, false);
            window._skipRemoteSave = false;
        }
    } catch (e) {
        window._skipRemoteSave = false;
    }
}

// --- FUNZIONI GEOMETRICHE DI ROTTA (DISTANZA & RILEVAMENTO) ---
function calcGreatCircleNm(lat1, lon1, lat2, lon2) {
    const R = 3440.065;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearingDeg(lat1, lon1, lat2, lon2) {
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dLam = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLam) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
    const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    return Math.round(brng);
}

function formatMinutesToHhMm(totalMinutes) {
    if (!isFinite(totalMinutes) || totalMinutes <= 0) return "00:00";
    const rounded = Math.round(totalMinutes);
    const hh = Math.floor(rounded / 60);
    const mm = rounded % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// --- PUNTO 7: CALCOLATORE CARBURANTE & PERFORMANCE + PUNTO 6: TABELLA NAVLOG ---
const AIRCRAFT_PERF_PRESETS = {
    pioneer400: {
        name: "Alpi Pioneer 400",
        cruiseKt: 130,
        burnGph: 5.5,
        capGal: 26.4,
        taxiGal: 0.6,
        kgPerGal: 2.72,
        climbFpm: 1000
    },
    mb339: {
        name: "Aermacchi MB-339A/PAN",
        cruiseKt: 360,
        burnGph: 235.0,
        capGal: 479.0,
        taxiGal: 18.0,
        kgPerGal: 3.03,
        climbFpm: 5500
    },
    c172: {
        name: "Cessna 172S Skyhawk",
        cruiseKt: 115,
        burnGph: 8.6,
        capGal: 56.0,
        taxiGal: 1.1,
        kgPerGal: 2.72,
        climbFpm: 700
    },
    da62: {
        name: "Diamond DA62",
        cruiseKt: 175,
        burnGph: 14.8,
        capGal: 86.0,
        taxiGal: 1.5,
        kgPerGal: 3.03,
        climbFpm: 1200
    },
    a320: {
        name: "Airbus A320neo",
        cruiseKt: 450,
        burnGph: 820.0,
        capGal: 6260.0,
        taxiGal: 65.0,
        kgPerGal: 3.03,
        climbFpm: 2200
    },
    a350: {
        name: "iniBuilds Airbus A350-900",
        cruiseKt: 485,
        burnGph: 1900.0,
        capGal: 37000.0,
        taxiGal: 140.0,
        kgPerGal: 3.03,
        climbFpm: 2400
    },
    custom: {
        name: "⚙️ Personalizzato (Custom)",
        cruiseKt: 150,
        burnGph: 12.0,
        capGal: 60.0,
        taxiGal: 1.5,
        kgPerGal: 2.80,
        climbFpm: 1000
    }
};

let fuelPerfConfig = {
    preset: "pioneer400",
    cruiseKt: 130,
    burnGph: 5.5,
    capGal: 26.4,
    taxiGal: 0.6,
    kgPerGal: 2.72,
    windKt: 0,
    reserveMin: 45,
    contingencyPct: 5,
    fobGal: 26.4
};

try {
    const savedFp = localStorage.getItem('aeroglass_fuel_perf');
    if (savedFp) {
        fuelPerfConfig = { ...fuelPerfConfig, ...JSON.parse(savedFp) };
    }
} catch (e) {}

function ensureNavlogAndFuelUI() {
    const pillsGroup = document.querySelector('.top-pills-group');
    if (pillsGroup && !document.getElementById('btnNavlogTop')) {
        const logbookBtn = document.getElementById('btnLogbook');

        const navlogBtn = document.createElement('button');
        navlogBtn.id = 'btnNavlogTop';
        navlogBtn.className = 'top-btn';
        navlogBtn.onclick = openNavlogModal;
        navlogBtn.style.borderColor = 'rgba(52, 211, 153, 0.45)';
        navlogBtn.innerHTML = '📋 <span id="lblNavlogBtn">NavLog</span>';

        const fuelBtn = document.createElement('button');
        fuelBtn.id = 'btnFuelPerfTop';
        fuelBtn.className = 'top-btn';
        fuelBtn.onclick = openFuelPerfModal;
        fuelBtn.style.borderColor = 'rgba(251, 191, 36, 0.45)';
        fuelBtn.innerHTML = '⛽ <span id="lblFuelBtn">Fuel & Perf</span>';

        if (logbookBtn && logbookBtn.parentNode === pillsGroup) {
            pillsGroup.insertBefore(navlogBtn, logbookBtn.nextSibling);
            pillsGroup.insertBefore(fuelBtn, navlogBtn.nextSibling);
        } else {
            pillsGroup.appendChild(navlogBtn);
            pillsGroup.appendChild(fuelBtn);
        }
    }

    if (!document.getElementById('navlogModal')) {
        const navModal = document.createElement('div');
        navModal.id = 'navlogModal';
        navModal.className = 'custom-modal';
        navModal.style.display = 'none';
        navModal.innerHTML = `
            <div class="modal-content glass-panel" style="width: 780px; max-width: 95vw;">
                <div class="modal-header">
                    <span style="font-weight: 700; color: var(--emerald);">📋 NAVIGATION LOG (TABELLA DI MARCIA & STIME VOLO)</span>
                    <span style="cursor: pointer; color: var(--text-muted); font-size: 16px;" onclick="closeNavlogModal()">✕</span>
                </div>

                <div id="navlogSummaryBar" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; background: rgba(9,13,22,0.65); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(56,189,248,0.2); text-align: center;">
                    <div><div style="font-size:9.5px;color:var(--text-muted);">TRATTA</div><div id="nlSumRoute" style="font-size:13px;font-weight:700;color:var(--cyan);">--- ➔ ---</div></div>
                    <div><div style="font-size:9.5px;color:var(--text-muted);">DISTANZA TOT</div><div id="nlSumDist" style="font-size:13px;font-weight:700;color:#f8fafc;">0.0 NM</div></div>
                    <div><div style="font-size:9.5px;color:var(--text-muted);">GS EFFETTIVA</div><div id="nlSumGs" style="font-size:13px;font-weight:700;color:var(--amber);">130 kt</div></div>
                    <div><div style="font-size:9.5px;color:var(--text-muted);">TEMPO TOT (ETE)</div><div id="nlSumEte" style="font-size:13px;font-weight:700;color:var(--emerald);">00:00</div></div>
                    <div><div style="font-size:9.5px;color:var(--text-muted);">TRIP FUEL STIMATO</div><div id="nlSumFuel" style="font-size:13px;font-weight:700;color:#f43f5e;">0.0 Gal</div></div>
                </div>

                <div class="fpl-list" style="max-height: 340px; min-height: 180px; overflow-y: auto; border: 1px solid rgba(148,163,184,0.16); border-radius: 8px;">
                    <table class="navlog-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>IDENT</th>
                                <th>VIA / PROC</th>
                                <th>ALT (ft)</th>
                                <th>HDG</th>
                                <th>LEG (NM)</th>
                                <th>REM (NM)</th>
                                <th>ETE</th>
                                <th>ETA (UTC)</th>
                                <th>FUEL (Gal / kg)</th>
                                <th>EFOB (Gal)</th>
                            </tr>
                        </thead>
                        <tbody id="navlogTableBody"></tbody>
                    </table>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 4px;">
                    <span style="font-size: 11px; color: var(--text-muted);">💡 Clicca su una riga per centrare il Waypoint sulla mappa.</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-amber" style="flex:0 0 auto; padding: 6px 12px;" onclick="closeNavlogModal(); openFuelPerfModal();">⛽ Parametri Velivolo</button>
                        <button id="btnCopyNavlog" class="btn btn-cyan" style="flex:0 0 auto; padding: 6px 12px;" onclick="copyNavlogText()">📋 Copia Testo</button>
                        <button class="btn btn-emerald" style="flex:0 0 auto; padding: 6px 12px;" onclick="exportNavlogCsv()">💾 Esporta CSV</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(navModal);
    }

    if (!document.getElementById('fuelPerfModal')) {
        const fpModal = document.createElement('div');
        fpModal.id = 'fuelPerfModal';
        fpModal.className = 'custom-modal';
        fpModal.style.display = 'none';
        fpModal.innerHTML = `
            <div class="modal-content glass-panel" style="width: 540px; max-width: 95vw;">
                <div class="modal-header">
                    <span style="font-weight: 700; color: var(--amber);">⛽ CALCOLATORE CARBURANTE & PERFORMANCE</span>
                    <span style="cursor: pointer; color: var(--text-muted); font-size: 16px;" onclick="closeFuelPerfModal()">✕</span>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    <select id="fpPresetSelect" class="glass-input" style="flex: 1; font-weight: 600;" onchange="onFuelPresetChange(this.value)">
                        <option value="pioneer400">🛩️ Alpi Pioneer 400 (130 kt • 5.5 GPH)</option>
                        <option value="mb339">✈️ Aermacchi MB-339A/PAN (360 kt • 235 GPH / ~710 kg/h)</option>
                        <option value="c172">🛩️ Cessna 172S Skyhawk (115 kt • 8.6 GPH)</option>
                        <option value="da62">🛩️ Diamond DA62 Twin (175 kt • 14.8 GPH)</option>
                        <option value="a320">🛫 Airbus A320neo (450 kt • 820 GPH / ~2.5 t/h)</option>
                        <option value="a350">🛫 iniBuilds Airbus A350-900 (485 kt • 1900 GPH)</option>
                        <option value="custom">⚙️ Personalizzato (Custom)</option>
                    </select>
                    <button class="btn btn-cyan" style="flex: 0 0 auto; padding: 6px 10px;" onclick="syncFuelPerfFromSim()">
                        🔄 Auto da MSFS
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: rgba(30,41,59,0.45); padding: 9px; border-radius: 8px; border: 1px solid rgba(148,163,184,0.16);">
                    <div>
                        <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">TAS / Crociera (kt)</label>
                        <input type="number" id="fpCruiseKt" class="glass-input" style="width:100%;" min="40" max="900" oninput="onFuelInputModified()">
                    </div>
                    <div>
                        <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Consumo (Gal/h)</label>
                        <input type="number" id="fpBurnGph" class="glass-input" style="width:100%;" step="0.5" min="1" max="8000" oninput="onFuelInputModified()">
                    </div>
                    <div>
                        <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Vento (+Coda / -Front kt)</label>
                        <input type="number" id="fpWindKt" class="glass-input" style="width:100%;" step="5" min="-150" max="150" oninput="onFuelInputModified()">
                    </div>
                    <div>
                        <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Riserva Finale (min)</label>
                        <input type="number" id="fpReserveMin" class="glass-input" style="width:100%;" step="5" min="15" max="120" oninput="onFuelInputModified()">
                    </div>
                    <div>
                        <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Contingency (%)</label>
                        <input type="number" id="fpContPct" class="glass-input" style="width:100%;" step="1" min="0" max="30" oninput="onFuelInputModified()">
                    </div>
                    <div>
                        <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Carburante a Bordo (Gal)</label>
                        <input type="number" id="fpFobGal" class="glass-input" style="width:100%;border-color:rgba(56,189,248,0.45);" step="1" min="0" max="60000" oninput="onFuelInputModified()">
                    </div>
                </div>

                <div id="fpStatusBanner" style="padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-align: center; border: 1px solid rgba(52,211,153,0.45); background: rgba(6,78,59,0.35); color: var(--emerald);">
                    🟢 CARBURANTE OK
                </div>

                <div class="fuel-grid-box">
                    <div class="fuel-stat-card">
                        <span style="font-size:9.5px;color:var(--text-muted);">TAXI + SALITA</span>
                        <span id="fpOutTaxi" style="font-size:13px;font-weight:700;color:#f8fafc;">0.0 Gal</span>
                        <span id="fpOutTaxiSub" style="font-size:10px;color:var(--text-muted);">0 kg • 0 L</span>
                    </div>
                    <div class="fuel-stat-card">
                        <span style="font-size:9.5px;color:var(--text-muted);">TRIP FUEL (ROTTA)</span>
                        <span id="fpOutTrip" style="font-size:13px;font-weight:700;color:var(--cyan);">0.0 Gal</span>
                        <span id="fpOutTripSub" style="font-size:10px;color:var(--text-muted);">0 kg • 0 L</span>
                    </div>
                    <div class="fuel-stat-card">
                        <span style="font-size:9.5px;color:var(--text-muted);">CONTINGENCY + RISERVA</span>
                        <span id="fpOutRes" style="font-size:13px;font-weight:700;color:var(--amber);">0.0 Gal</span>
                        <span id="fpOutResSub" style="font-size:10px;color:var(--text-muted);">0 kg • 0 L</span>
                    </div>
                    <div class="fuel-stat-card" style="border-color:rgba(52,211,153,0.4);background:rgba(6,78,59,0.22);">
                        <span style="font-size:9.5px;color:var(--emerald);font-weight:700;">BLOCK FUEL RICHIESTO</span>
                        <span id="fpOutBlock" style="font-size:14px;font-weight:800;color:var(--emerald);">0.0 Gal</span>
                        <span id="fpOutBlockSub" style="font-size:10.5px;color:#cbd5e1;font-weight:600;">0 kg • 0 L</span>
                    </div>
                    <div class="fuel-stat-card">
                        <span style="font-size:9.5px;color:var(--text-muted);">STIMA ALL'ATTERRAGGIO (EFOB)</span>
                        <span id="fpOutEfob" style="font-size:13px;font-weight:700;color:#38bdf8;">0.0 Gal</span>
                        <span id="fpOutEfobSub" style="font-size:10px;color:var(--text-muted);">0 kg • 0 L</span>
                    </div>
                    <div class="fuel-stat-card">
                        <span style="font-size:9.5px;color:var(--text-muted);">AUTONOMIA MAX (FOB)</span>
                        <span id="fpOutEndurance" style="font-size:13px;font-weight:700;color:#f8fafc;">00:00</span>
                        <span id="fpOutRangeSub" style="font-size:10px;color:var(--text-muted);">Range: 0 NM</span>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span id="fpRouteDistInfo" style="font-size: 11px; color: var(--text-muted);">Distanza Piano di Volo: 0.0 NM</span>
                    <button class="btn btn-emerald" style="flex: 0 0 auto; padding: 6px 14px;" onclick="closeFuelPerfModal(); openNavlogModal();">📋 Vedi Tabella NavLog</button>
                </div>
            </div>
        `;
        document.body.appendChild(fpModal);
    }
}

function saveFuelPerfSettings() {
    try {
        localStorage.setItem('aeroglass_fuel_perf', JSON.stringify(fuelPerfConfig));
    } catch (e) {}
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        window.pywebview.api.save_setting('fuel_perf_config', JSON.stringify(fuelPerfConfig)).catch(() => {});
    }
}

function computeRouteAndFuelSummary() {
    const presetObj = AIRCRAFT_PERF_PRESETS[fuelPerfConfig.preset] || AIRCRAFT_PERF_PRESETS.pioneer400;
    const tasKt = Math.max(35, Number(fuelPerfConfig.cruiseKt) || presetObj.cruiseKt);
    const windKt = Number(fuelPerfConfig.windKt) || 0;
    const effectiveGsKt = Math.max(30, tasKt + windKt);
    const burnGph = Math.max(0.5, Number(fuelPerfConfig.burnGph) || presetObj.burnGph);
    const kgPerGal = Number(fuelPerfConfig.kgPerGal) || presetObj.kgPerGal || 2.8;
    const taxiGal = Number(fuelPerfConfig.taxiGal) ?? presetObj.taxiGal ?? 1.0;
    const reserveMin = Math.max(0, Number(fuelPerfConfig.reserveMin) ?? 45);
    const contPct = Math.max(0, Number(fuelPerfConfig.contingencyPct) ?? 5);
    const fobGal = Math.max(0, Number(fuelPerfConfig.fobGal) || 0);
    const capGal = Number(fuelPerfConfig.capGal) || presetObj.capGal || 100;

    const legs = [];
    let totalDistNm = 0;

    if (typeof flightPlan !== 'undefined' && Array.isArray(flightPlan) && flightPlan.length >= 2) {
        for (let i = 0; i < flightPlan.length; i++) {
            const wp = flightPlan[i];
            let legDist = 0;
            let brng = 0;
            if (i > 0) {
                const prev = flightPlan[i - 1];
                legDist = calcGreatCircleNm(Number(prev.lat), Number(prev.lon), Number(wp.lat), Number(wp.lon));
                brng = calcBearingDeg(Number(prev.lat), Number(prev.lon), Number(wp.lat), Number(wp.lon));
                totalDistNm += legDist;
            }
            legs.push({
                index: i,
                ident: wp.ident || `WP${i}`,
                name: wp.name || '',
                proc: wp.proc_name || wp.proc_type || (i === 0 ? 'DEP' : (i === flightPlan.length - 1 ? 'ARR' : 'DCT')),
                alt_ft: Number(wp.alt_ft) || 0,
                lat: Number(wp.lat),
                lon: Number(wp.lon),
                legNm: legDist,
                cumNm: totalDistNm,
                hdg: brng
            });
        }
    }

    const nowUtcMs = Date.now();
    let cumMinutes = 0;
    let cumFuelGal = taxiGal;

    for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        leg.remNm = Math.max(0, totalDistNm - leg.cumNm);
        if (i === 0) {
            leg.eteMin = 0;
            leg.legFuelGal = taxiGal;
        } else {
            leg.eteMin = (leg.legNm / effectiveGsKt) * 60.0;
            leg.legFuelGal = (leg.eteMin / 60.0) * burnGph;
            cumMinutes += leg.eteMin;
            cumFuelGal += leg.legFuelGal;
        }
        leg.cumMin = cumMinutes;
        leg.legFuelKg = leg.legFuelGal * kgPerGal;
        leg.efobGal = Math.max(0, fobGal - cumFuelGal);
        const etaDate = new Date(nowUtcMs + cumMinutes * 60000);
        leg.etaUtc = `${String(etaDate.getUTCHours()).padStart(2, '0')}:${String(etaDate.getUTCMinutes()).padStart(2, '0')}Z`;
    }

    const maxAlt = legs.length > 0 ? Math.max(...legs.map(l => l.alt_ft)) : 0;
    const climbBonusGal = (maxAlt / 10000.0) * (burnGph * 0.06);
    const taxiAndClimbGal = taxiGal + climbBonusGal;

    const tripFuelGal = (totalDistNm / effectiveGsKt) * burnGph;
    const contingencyGal = tripFuelGal * (contPct / 100.0);
    const reserveGal = (reserveMin / 60.0) * burnGph;
    const blockFuelGal = taxiAndClimbGal + tripFuelGal + contingencyGal + reserveGal;
    const efobLandingGal = fobGal - (taxiAndClimbGal + tripFuelGal);
    const enduranceHours = Math.max(0, (fobGal - taxiGal)) / burnGph;
    const maxRangeNm = enduranceHours * effectiveGsKt;

    return {
        legs,
        totalDistNm,
        effectiveGsKt,
        burnGph,
        kgPerGal,
        fobGal,
        capGal,
        totalEteMin: cumMinutes,
        taxiAndClimbGal,
        tripFuelGal,
        resAndContGal: contingencyGal + reserveGal,
        reserveGal,
        blockFuelGal,
        efobLandingGal,
        enduranceMin: enduranceHours * 60.0,
        maxRangeNm
    };
}

function populateFuelModalInputs() {
    const sel = document.getElementById('fpPresetSelect');
    if (sel) sel.value = fuelPerfConfig.preset || 'pioneer400';

    const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v;
    };
    setVal('fpCruiseKt', fuelPerfConfig.cruiseKt);
    setVal('fpBurnGph', fuelPerfConfig.burnGph);
    setVal('fpWindKt', fuelPerfConfig.windKt);
    setVal('fpReserveMin', fuelPerfConfig.reserveMin);
    setVal('fpContPct', fuelPerfConfig.contingencyPct);
    setVal('fpFobGal', Number(fuelPerfConfig.fobGal || 0).toFixed(1));
}

function onFuelPresetChange(presetKey) {
    const p = AIRCRAFT_PERF_PRESETS[presetKey] || AIRCRAFT_PERF_PRESETS.pioneer400;
    fuelPerfConfig.preset = presetKey;
    fuelPerfConfig.cruiseKt = p.cruiseKt;
    fuelPerfConfig.burnGph = p.burnGph;
    fuelPerfConfig.capGal = p.capGal;
    fuelPerfConfig.taxiGal = p.taxiGal;
    fuelPerfConfig.kgPerGal = p.kgPerGal;
    fuelPerfConfig.fobGal = p.capGal;
    populateFuelModalInputs();
    recalculateFuelAndPerfUI();
    if (!window._demoTourActive) saveFuelPerfSettings();
}

function onFuelInputModified() {
    fuelPerfConfig.cruiseKt = parseFloat(document.getElementById('fpCruiseKt')?.value) || 120;
    fuelPerfConfig.burnGph = parseFloat(document.getElementById('fpBurnGph')?.value) || 8.0;
    fuelPerfConfig.windKt = parseFloat(document.getElementById('fpWindKt')?.value) || 0;
    fuelPerfConfig.reserveMin = parseFloat(document.getElementById('fpReserveMin')?.value) || 45;
    fuelPerfConfig.contingencyPct = parseFloat(document.getElementById('fpContPct')?.value) || 5;
    fuelPerfConfig.fobGal = parseFloat(document.getElementById('fpFobGal')?.value) || 0;
    recalculateFuelAndPerfUI();
    if (!window._demoTourActive) saveFuelPerfSettings();
}

async function syncFuelPerfFromSim() {
    let acftName = (document.getElementById('valAcft')?.innerText || '').toUpperCase();
    let liveFuelGal = null;

    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_telemetry) {
        try {
            const data = await window.pywebview.api.get_telemetry();
            if (data) {
                if (data.aircraft) acftName = String(data.aircraft).toUpperCase();
                if (data.fuel_gal !== undefined && data.fuel_gal !== null) {
                    liveFuelGal = Number(data.fuel_gal);
                }
            }
        } catch (e) {}
    }

    if (acftName.includes('339')) {
        onFuelPresetChange('mb339');
    } else if (acftName.includes('PIONEER') || acftName.includes('SAVANNAH') || acftName.includes('ULM')) {
        onFuelPresetChange('pioneer400');
    } else if (acftName.includes('172') || acftName.includes('CESSNA')) {
        onFuelPresetChange('c172');
    } else if (acftName.includes('DA62') || acftName.includes('DIAMOND')) {
        onFuelPresetChange('da62');
    } else if (acftName.includes('350')) {
        onFuelPresetChange('a350');
    } else if (acftName.includes('320') || acftName.includes('321') || acftName.includes('737')) {
        onFuelPresetChange('a320');
    }

    if (liveFuelGal !== null && liveFuelGal > 0) {
        fuelPerfConfig.fobGal = Number(liveFuelGal.toFixed(1));
        populateFuelModalInputs();
        recalculateFuelAndPerfUI();
        saveFuelPerfSettings();
    }
}

function recalculateFuelAndPerfUI() {
    const sum = computeRouteAndFuelSummary();
    const fmt = (gal) => {
        const kg = Math.round(gal * sum.kgPerGal);
        const lit = Math.round(gal * 3.78541);
        return { main: `${gal.toFixed(1)} Gal`, sub: `${kg.toLocaleString()} kg • ${lit.toLocaleString()} L` };
    };

    const setCard = (idMain, idSub, galVal) => {
        const f = fmt(galVal);
        const mEl = document.getElementById(idMain);
        const sEl = document.getElementById(idSub);
        if (mEl) mEl.innerText = f.main;
        if (sEl) sEl.innerText = f.sub;
    };

    setCard('fpOutTaxi', 'fpOutTaxiSub', sum.taxiAndClimbGal);
    setCard('fpOutTrip', 'fpOutTripSub', sum.tripFuelGal);
    setCard('fpOutRes', 'fpOutResSub', sum.resAndContGal);
    setCard('fpOutBlock', 'fpOutBlockSub', sum.blockFuelGal);
    setCard('fpOutEfob', 'fpOutEfobSub', Math.max(0, sum.efobLandingGal));

    const endEl = document.getElementById('fpOutEndurance');
    const rngEl = document.getElementById('fpOutRangeSub');
    if (endEl) endEl.innerText = formatMinutesToHhMm(sum.enduranceMin);
    if (rngEl) rngEl.innerText = `Range: ${sum.maxRangeNm.toFixed(0)} NM (@ ${sum.effectiveGsKt} kt)`;

    const distInfo = document.getElementById('fpRouteDistInfo');
    if (distInfo) {
        distInfo.innerText = `Rotta attiva: ${sum.totalDistNm.toFixed(1)} NM • ETE: ${formatMinutesToHhMm(sum.totalEteMin)}`;
    }

    const banner = document.getElementById('fpStatusBanner');
    if (banner) {
        if (sum.totalDistNm < 1) {
            banner.style.background = 'rgba(30,41,59,0.6)';
            banner.style.borderColor = 'rgba(148,163,184,0.3)';
            banner.style.color = '#cbd5e1';
            banner.innerText = 'ℹ️ Carica o crea un Piano di Volo per calcolare il Trip Fuel';
        } else if (sum.fobGal >= sum.blockFuelGal) {
            const extraGal = sum.fobGal - sum.blockFuelGal;
            banner.style.background = 'rgba(6,78,59,0.4)';
            banner.style.borderColor = 'rgba(52,211,153,0.55)';
            banner.style.color = '#34d399';
            banner.innerText = `🟢 CARBURANTE OK: Margine extra di +${extraGal.toFixed(1)} Gal (+${Math.round(extraGal * sum.kgPerGal)} kg) oltre la riserva`;
        } else if (sum.fobGal >= (sum.taxiAndClimbGal + sum.tripFuelGal + sum.reserveGal * 0.5)) {
            const deficit = sum.blockFuelGal - sum.fobGal;
            banner.style.background = 'rgba(120,53,15,0.45)';
            banner.style.borderColor = 'rgba(251,191,36,0.65)';
            banner.style.color = '#fbbf24';
            banner.innerText = `🟡 ATTENZIONE: Riserva parzialmente intaccata (-${deficit.toFixed(1)} Gal rispetto al Block Fuel)`;
        } else {
            const missing = sum.blockFuelGal - sum.fobGal;
            banner.style.background = 'rgba(127,29,29,0.5)';
            banner.style.borderColor = 'rgba(244,63,94,0.65)';
            banner.style.color = '#f43f5e';
            banner.innerText = `🔴 CARBURANTE INSUFFICIENTE: Mancano ${missing.toFixed(1)} Gal (${Math.round(missing * sum.kgPerGal)} kg) per il Block Fuel!`;
        }
    }
}

function openFuelPerfModal() {
    ensureNavlogAndFuelUI();
    populateFuelModalInputs();
    recalculateFuelAndPerfUI();
    const modal = document.getElementById('fuelPerfModal');
    if (modal) modal.style.display = 'flex';
}

function closeFuelPerfModal() {
    const modal = document.getElementById('fuelPerfModal');
    if (modal) modal.style.display = 'none';
}

function renderNavlogTable() {
    ensureNavlogAndFuelUI();
    const sum = computeRouteAndFuelSummary();
    const tbody = document.getElementById('navlogTableBody');
    if (!tbody) return;

    const depIdent = sum.legs.length > 0 ? sum.legs[0].ident : '---';
    const destIdent = sum.legs.length > 1 ? sum.legs[sum.legs.length - 1].ident : '---';

    const setTxt = (id, t) => {
        const el = document.getElementById(id);
        if (el) el.innerText = t;
    };
    setTxt('nlSumRoute', `${depIdent} ➔ ${destIdent}`);
    setTxt('nlSumDist', `${sum.totalDistNm.toFixed(1)} NM`);
    setTxt('nlSumGs', `${sum.effectiveGsKt} kt`);
    setTxt('nlSumEte', formatMinutesToHhMm(sum.totalEteMin));
    setTxt('nlSumFuel', `${sum.tripFuelGal.toFixed(1)} Gal (${Math.round(sum.tripFuelGal * sum.kgPerGal)} kg)`);

    if (sum.legs.length < 2) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--text-muted);">Nessun Piano di Volo attivo. Importa da SimBrief, carica un file .pln o clicca su ➕ Crea.</td></tr>`;
        return;
    }

    let activeLegIdx = -1;
    const simDot = document.getElementById('simDot');
    if ((simDot && simDot.classList.contains('live')) || window._demoTourActive) {
        if (typeof lastAcftLatLng !== 'undefined' && lastAcftLatLng && typeof calculateRouteProgress === 'function') {
            const prog = calculateRouteProgress(lastAcftLatLng.lat, lastAcftLatLng.lng);
            if (prog && prog.legIndex !== undefined) {
                activeLegIdx = prog.legIndex + 1;
            }
        }
    }

    tbody.innerHTML = sum.legs.map((leg, idx) => {
        const isActive = (idx === activeLegIdx);
        const procBadgeColor = leg.proc.includes('SID') ? '#34d399'
            : (leg.proc.includes('STAR') ? '#fbbf24'
            : (leg.proc.includes('APPR') ? '#38bdf8' : '#c084fc'));

        return `
            <tr class="navlog-row ${isActive ? 'active-leg-row' : ''}" onclick="focusNavlogWaypoint(${leg.lat}, ${leg.lon})">
                <td style="color:var(--text-muted);">${idx + 1}</td>
                <td style="font-weight:700;color:${idx === 0 ? '#34d399' : (idx === sum.legs.length - 1 ? '#38bdf8' : '#f8fafc')};">
                    ${isActive ? '✈️ ' : ''}${leg.ident}
                </td>
                <td><span style="color:${procBadgeColor};font-weight:700;font-size:10.5px;">${leg.proc}</span></td>
                <td style="color:#38bdf8;font-weight:600;">${leg.alt_ft.toLocaleString()}</td>
                <td>${idx === 0 ? '---' : `${String(leg.hdg).padStart(3, '0')}°`}</td>
                <td style="font-weight:600;">${idx === 0 ? '0.0' : leg.legNm.toFixed(1)}</td>
                <td style="color:var(--text-muted);">${leg.remNm.toFixed(1)}</td>
                <td style="color:var(--emerald);">${idx === 0 ? '---' : formatMinutesToHhMm(leg.eteMin)}</td>
                <td>${leg.etaUtc}</td>
                <td>${leg.legFuelGal.toFixed(1)} <span style="color:var(--text-muted);font-size:10px;">(${Math.round(leg.legFuelKg)}kg)</span></td>
                <td style="font-weight:700;color:${leg.efobGal > sum.reserveGal ? '#34d399' : '#f43f5e'};">${leg.efobGal.toFixed(1)}</td>
            </tr>
        `;
    }).join('');
}

function focusNavlogWaypoint(lat, lon) {
    if (typeof map !== 'undefined' && map) {
        closeNavlogModal();
        if (typeof setFollowState === 'function') setFollowState(0);
        map.flyTo([lat, lon], Math.max(map.getZoom(), 10), { duration: 0.8 });
    }
}

function openNavlogModal() {
    ensureNavlogAndFuelUI();
    renderNavlogTable();
    const modal = document.getElementById('navlogModal');
    if (modal) modal.style.display = 'flex';
}

function closeNavlogModal() {
    const modal = document.getElementById('navlogModal');
    if (modal) modal.style.display = 'none';
}

async function copyNavlogText() {
    const sum = computeRouteAndFuelSummary();
    if (sum.legs.length < 2) return;
    const lines = [
        `AEROGLASS NAV - NAVIGATION LOG (${sum.legs[0].ident} -> ${sum.legs[sum.legs.length - 1].ident})`,
        `DIST: ${sum.totalDistNm.toFixed(1)} NM | GS: ${sum.effectiveGsKt} kt | ETE: ${formatMinutesToHhMm(sum.totalEteMin)} | BLOCK FUEL: ${sum.blockFuelGal.toFixed(1)} Gal (${Math.round(sum.blockFuelGal * sum.kgPerGal)} kg)`,
        `------------------------------------------------------------------------------------------`,
        `#   IDENT   VIA       ALT(ft)  HDG   LEG(NM)  REM(NM)  ETE    ETA(UTC)  FUEL(Gal)  EFOB(Gal)`
    ];
    sum.legs.forEach((l, i) => {
        lines.push(
            `${String(i + 1).padEnd(3)} ${l.ident.padEnd(7)} ${String(l.proc).slice(0, 8).padEnd(9)} ${String(l.alt_ft).padStart(7)}  ${i === 0 ? '---' : String(l.hdg).padStart(3, '0') + '°'}  ${l.legNm.toFixed(1).padStart(7)}  ${l.remNm.toFixed(1).padStart(7)}  ${formatMinutesToHhMm(l.eteMin).padEnd(6)} ${l.etaUtc.padEnd(9)} ${l.legFuelGal.toFixed(1).padStart(9)}  ${l.efobGal.toFixed(1).padStart(8)}`
        );
    });
    try {
        await navigator.clipboard.writeText(lines.join('\n'));
        const btn = document.getElementById('btnCopyNavlog');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✅ Copiato!';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        }
    } catch (e) {}
}

function exportNavlogCsv() {
    const sum = computeRouteAndFuelSummary();
    if (sum.legs.length < 2) return;
    const rows = [
        ['SEQ', 'IDENT', 'VIA_PROC', 'ALT_FT', 'HDG_DEG', 'LEG_NM', 'REM_NM', 'ETE', 'ETA_UTC', 'LEG_FUEL_GAL', 'LEG_FUEL_KG', 'EFOB_GAL']
    ];
    sum.legs.forEach((l, i) => {
        rows.push([
            i + 1,
            l.ident,
            `"${l.proc}"`,
            l.alt_ft,
            i === 0 ? 0 : l.hdg,
            l.legNm.toFixed(1),
            l.remNm.toFixed(1),
            formatMinutesToHhMm(l.eteMin),
            l.etaUtc,
            l.legFuelGal.toFixed(1),
            Math.round(l.legFuelKg),
            l.efobGal.toFixed(1)
        ]);
    });
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NavLog_${sum.legs[0].ident}_${sum.legs[sum.legs.length - 1].ident}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- CALCOLO E VISUALIZZAZIONE TOP OF DESCENT (ToD 3°) SU MAPPA E VNAV ---
function computeTopOfDescentData() {
    if (typeof flightPlan === 'undefined' || !Array.isArray(flightPlan) || flightPlan.length < 2) {
        return null;
    }

    const cumDist = [0];
    for (let i = 0; i < flightPlan.length - 1; i++) {
        const d = calcGreatCircleNm(
            Number(flightPlan[i].lat), Number(flightPlan[i].lon),
            Number(flightPlan[i + 1].lat), Number(flightPlan[i + 1].lon)
        );
        cumDist.push(cumDist[i] + d);
    }

    const totalDistNm = cumDist[cumDist.length - 1];
    if (totalDistNm < 3) return null;

    const altitudes = flightPlan.map(wp => Number(wp.alt_ft) || 0);
    const maxAlt = Math.max(...altitudes);
    const destWp = flightPlan[flightPlan.length - 1];
    const destElev = Number(destWp.alt_ft) || 0;
    const altToLose = Math.max(0, maxAlt - destElev);

    if (altToLose < 500) return null;

    let descentDistNm = (altToLose / 1000.0) * 3.0;
    descentDistNm = Math.min(descentDistNm, totalDistNm * 0.65);
    descentDistNm = Math.max(descentDistNm, 2.0);

    const todDistFromStart = Math.max(totalDistNm * 0.12, totalDistNm - descentDistNm);
    const todFraction = todDistFromStart / totalDistNm;

    let legIdx = 0;
    for (let i = 0; i < cumDist.length - 1; i++) {
        if (todDistFromStart >= cumDist[i] && todDistFromStart <= cumDist[i + 1]) {
            legIdx = i;
            break;
        }
    }

    const legLen = Math.max(0.001, cumDist[legIdx + 1] - cumDist[legIdx]);
    const segFrac = Math.max(0, Math.min(1, (todDistFromStart - cumDist[legIdx]) / legLen));
    const p1 = flightPlan[legIdx];
    const p2 = flightPlan[legIdx + 1];

    const todLat = Number(p1.lat) + segFrac * (Number(p2.lat) - Number(p1.lat));
    const todLon = Number(p1.lon) + segFrac * (Number(p2.lon) - Number(p1.lon));

    const gsText = document.getElementById('valGs')?.innerText || '';
    const parsedGs = parseInt(gsText.replace(/[^0-9]/g, ''), 10);
    const defaultGs = Number(fuelPerfConfig.cruiseKt) || (maxAlt > 18000 ? 420 : (maxAlt > 9000 ? 220 : 125));
    const activeGsKt = (!isNaN(parsedGs) && parsedGs > 35) ? parsedGs : defaultGs;
    const vs3DegFpm = -Math.round((activeGsKt * 5.2) / 50) * 50;

    return {
        lat: todLat,
        lon: todLon,
        fraction: todFraction,
        totalDistNm: totalDistNm,
        todDistFromStart: todDistFromStart,
        descentDistNm: totalDistNm - todDistFromStart,
        maxAlt: maxAlt,
        destElev: destElev,
        destIdent: destWp.ident || 'DEST',
        altToLose: altToLose,
        activeGsKt: activeGsKt,
        vs3DegFpm: vs3DegFpm
    };
}

function updateTopOfDescentOverlay() {
    ensureDrawerToggleTab();
    if (typeof map === 'undefined' || !map) return;

    if (window._todMapMarker) {
        try { map.removeLayer(window._todMapMarker); } catch (e) {}
        window._todMapMarker = null;
    }

    const existingSvgGroup = document.getElementById('todVnavGroup');
    if (existingSvgGroup) existingSvgGroup.remove();

    const existingHtmlBadge = document.getElementById('todVnavHtmlBadge');
    if (existingHtmlBadge) existingHtmlBadge.remove();

    const tod = computeTopOfDescentData();
    if (!tod) return;

    const todIcon = L.divIcon({
        className: '',
        html: `
            <div style="display:inline-flex;align-items:center;gap:3px;transform:translate(-50%,-50%);cursor:pointer;white-space:nowrap;">
                <div style="width:8px;height:8px;border-radius:50%;background:#fbbf24;border:1.5px solid #0f172a;box-shadow:0 0 6px #fbbf24;"></div>
                <span style="background:rgba(15,23,42,0.92);border:1px solid rgba(251,191,36,0.75);color:#fbbf24;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;line-height:1.2;box-shadow:0 2px 6px rgba(0,0,0,0.5);">
                    ToD -${tod.descentDistNm.toFixed(0)}NM
                </span>
            </div>
        `,
        iconSize: [80, 16],
        iconAnchor: [0, 0]
    });

    const popupHtml = `
        <div style="font-family:'Segoe UI',sans-serif;min-width:195px;color:#f8fafc;">
            <div style="font-weight:700;color:#fbbf24;border-bottom:1px solid rgba(251,191,36,0.3);padding-bottom:4px;margin-bottom:6px;">
                📉 TOP OF DESCENT (Sentiero 3°)
            </div>
            <div style="font-size:11.5px;line-height:1.55;">
                <div>Quota Crociera: <strong style="color:#38bdf8;">${tod.maxAlt.toLocaleString()} ft</strong></div>
                <div>Destinazione (${tod.destIdent}): <strong>${tod.destElev.toLocaleString()} ft</strong></div>
                <div>Quota da perdere: <strong>${tod.altToLose.toLocaleString()} ft</strong></div>
                <div>Inizio discesa: <strong style="color:#fbbf24;">${tod.descentDistNm.toFixed(1)} NM prima di ${tod.destIdent}</strong></div>
                <div>VS 3° (@ ${tod.activeGsKt} kt): <strong style="color:#34d399;">${tod.vs3DegFpm} fpm</strong></div>
            </div>
        </div>
    `;

    window._todMapMarker = L.marker([tod.lat, tod.lon], {
        icon: todIcon,
        zIndexOffset: 750
    }).addTo(map).bindPopup(popupHtml);

    const acftLine = document.getElementById('acftVnavLine');
    const svg = acftLine ? acftLine.ownerSVGElement : document.querySelector('#elevationDrawer svg');
    if (svg) {
        const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width
            ? svg.viewBox.baseVal
            : { width: 1000, height: 60 };
        const xPos = (tod.fraction * vb.width).toFixed(1);
        const h = vb.height || 60;

        const ns = "http://www.w3.org/2000/svg";
        const g = document.createElementNS(ns, "g");
        g.setAttribute("id", "todVnavGroup");

        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", xPos);
        line.setAttribute("x2", xPos);
        line.setAttribute("y1", "2");
        line.setAttribute("y2", String(h));
        line.setAttribute("stroke", "#fbbf24");
        line.setAttribute("stroke-width", "1.3");
        line.setAttribute("stroke-dasharray", "3,3");
        g.appendChild(line);
        svg.appendChild(g);

        const svgParent = svg.parentElement;
        if (svgParent) {
            if (getComputedStyle(svgParent).position === 'static') {
                svgParent.style.position = 'relative';
            }
            const pct = Math.min(95, Math.max(5, tod.fraction * 100));
            const badge = document.createElement('div');
            badge.id = 'todVnavHtmlBadge';
            badge.style.cssText = `position:absolute;left:${pct.toFixed(2)}%;top:2px;transform:translateX(-50%);background:rgba(15,23,42,0.92);border:1px solid rgba(251,191,36,0.75);color:#fbbf24;font-size:9px;font-weight:700;padding:0px 5px;border-radius:3px;line-height:14px;pointer-events:none;white-space:nowrap;z-index:10;box-shadow:0 1px 4px rgba(0,0,0,0.6);`;
            badge.innerText = `ToD -${tod.descentDistNm.toFixed(0)}NM`;
            svgParent.appendChild(badge);
        }
    }

    updateTodHeaderStatus(tod);
}

function updateTodHeaderStatus(todInput) {
    const vnavText = document.getElementById('vnavText');
    if (!vnavText) return;

    const cleanBase = vnavText.innerText.replace(/\s*\|\s*📉[\s\S]*$/, '').trim();

    const tod = todInput || computeTopOfDescentData();
    if (!tod) {
        if (vnavText.innerText !== cleanBase) vnavText.innerText = cleanBase;
        return;
    }

    let statusSuffix = ` | 📉 ToD: ${tod.descentDistNm.toFixed(1)} NM prima di ${tod.destIdent} (VS ${tod.vs3DegFpm} fpm @ ${tod.activeGsKt}kt)`;

    if (typeof lastAcftLatLng !== 'undefined' && lastAcftLatLng && typeof calculateRouteProgress === 'function') {
        const simDot = document.getElementById('simDot');
        const isLive = (simDot && simDot.classList.contains('live')) || window._demoTourActive;
        if (isLive) {
            const prog = calculateRouteProgress(lastAcftLatLng.lat, lastAcftLatLng.lng);
            if (prog) {
                const acftDistNm = prog.fraction * tod.totalDistNm;
                const distToTod = tod.todDistFromStart - acftDistNm;
                const distToDest = Math.max(0.1, tod.totalDistNm - acftDistNm);

                if (distToTod > 0.5) {
                    statusSuffix = ` | 📉 ToD tra ${distToTod.toFixed(1)} NM (VS 3°: ${tod.vs3DegFpm} fpm)`;
                } else {
                    const altTxt = document.getElementById('valAlt')?.innerText || '';
                    const curAlt = parseInt(altTxt.replace(/[^0-9]/g, ''), 10) || tod.maxAlt;
                    const remAlt = Math.max(0, curAlt - tod.destElev);
                    const reqVs = -Math.round(((remAlt / distToDest) * (tod.activeGsKt / 60.0)) / 50) * 50;
                    statusSuffix = ` | 📉 DISCESA -> ${tod.destIdent} (${distToDest.toFixed(1)} NM) • VS Richiesto: ${reqVs} fpm`;
                }
            }
        }
    }

    const nextText = cleanBase + statusSuffix;
    if (vnavText.innerText !== nextText) {
        vnavText.innerText = nextText;
    }
}

// --- MODALITÀ DIMOSTRATIVA INTERATTIVA (TOUR GUIDATO FUMETTI LIRF -> EGLL) ---
const DEMO_LIRF_EGLL_FPL = [
    {
        ident: "LIRF",
        name: "Roma Fiumicino Leonardo da Vinci",
        lat: 41.8003,
        lon: 12.2389,
        alt_ft: 15,
        type: "DEP",
        rwy: "34L",
        proc_type: "SID",
        proc_name: "RWY 34L",
        metar: "LIRF 121350Z 25010KT 9999 FEW035 19/11 Q1018"
    },
    {
        ident: "GILIO",
        name: "Giglio Island (SID GILIO6A)",
        lat: 42.3694,
        lon: 11.4556,
        alt_ft: 14000,
        type: "WPT",
        proc_type: "SID",
        proc_name: "GILIO6A"
    },
    {
        ident: "ELB",
        name: "Elba VOR/DME",
        lat: 42.7306,
        lon: 10.3956,
        alt_ft: 24000,
        type: "VOR",
        proc_type: "SID",
        proc_name: "GILIO6A"
    },
    {
        ident: "GEN",
        name: "Genova Sestri VOR",
        lat: 44.4144,
        lon: 8.8475,
        alt_ft: 34000,
        type: "VOR",
        proc_type: "ENR",
        proc_name: "UM858"
    },
    {
        ident: "TOR",
        name: "Torino Caselle VOR",
        lat: 45.2008,
        lon: 7.6496,
        alt_ft: 36000,
        type: "VOR",
        proc_type: "ENR",
        proc_name: "UM729"
    },
    {
        ident: "MOLUS",
        name: "Monte Bianco / Geneva FIR",
        lat: 46.1433,
        lon: 6.7725,
        alt_ft: 36000,
        type: "WPT",
        proc_type: "ENR",
        proc_name: "UN853"
    },
    {
        ident: "DIJ",
        name: "Dijon Longvic VOR",
        lat: 47.2708,
        lon: 5.0972,
        alt_ft: 36000,
        type: "VOR",
        proc_type: "ENR",
        proc_name: "UM729"
    },
    {
        ident: "RESMI",
        name: "Paris South Sector",
        lat: 48.5686,
        lon: 2.8919,
        alt_ft: 32000,
        type: "WPT",
        proc_type: "ENR",
        proc_name: "UN857"
    },
    {
        ident: "ABB",
        name: "Abbeville VOR",
        lat: 50.1350,
        lon: 1.8547,
        alt_ft: 24000,
        type: "VOR",
        proc_type: "STAR",
        proc_name: "BIG4B"
    },
    {
        ident: "ALESO",
        name: "English Channel Entry (STAR BIG4B)",
        lat: 50.9756,
        lon: 1.3539,
        alt_ft: 16000,
        type: "WPT",
        proc_type: "STAR",
        proc_name: "BIG4B"
    },
    {
        ident: "BIG",
        name: "Biggin Hill VOR (IAF)",
        lat: 51.3308,
        lon: 0.0347,
        alt_ft: 7000,
        type: "VOR",
        proc_type: "STAR",
        proc_name: "BIG4B"
    },
    {
        ident: "EGLL",
        name: "London Heathrow",
        lat: 51.4700,
        lon: -0.4543,
        alt_ft: 83,
        type: "DEST",
        rwy: "27L",
        proc_type: "APPR",
        proc_name: "APPR RWY 27L",
        metar: "EGLL 121350Z 26014KT 9999 SCT028 BKN045 13/08 Q1014"
    }
];

const DEMO_LIRF_EGLL_ALT = {
    ident: "EGKK",
    name: "London Gatwick (Alternate)",
    lat: 51.1481,
    lon: -0.1903
};

let demoState = {
    stepIndex: 0,
    autoPlay: true,
    timerId: null,
    backupFpl: null,
    backupAlt: null,
    backupFuelCfg: null
};

function closeAllModalsForDemo() {
    closeNavlogModal();
    closeFuelPerfModal();
    closeEfbNetworkModal();
    if (typeof closeCreateFplModal === 'function') closeCreateFplModal();
    if (typeof closeFlightHistoryModal === 'function') closeFlightHistoryModal();
}

function simulateDemoAircraftInFlight(lat, lon, hdg) {
    if (typeof map === 'undefined' || !map) return;
    const acftPos = L.latLng(lat, lon);
    lastAcftLatLng = acftPos;
    lastAcftHdgTrue = hdg;

    document.getElementById('simStatus').innerText = "DEMO LIVE";
    document.getElementById('simDot').className = 'status-dot live';
    document.getElementById('valAlt').innerText = "36,000 ft";
    document.getElementById('valGs').innerText = "455 kt";
    document.getElementById('valHdg').innerText = `${hdg}°`;
    document.getElementById('valAcft').innerText = "Airbus A320neo";

    if (typeof getAircraftSvgIcon === 'function') {
        const svgContent = getAircraftSvgIcon("Airbus A320neo");
        const dynamicIcon = L.divIcon({
            className: '',
            html: `<div id="acftSvg" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;transform-origin:center center;filter:drop-shadow(0 0 10px #38bdf8) drop-shadow(0 0 20px #38bdf8);transform:rotate(${hdg}deg);">${svgContent}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
        if (!aircraftMarker) {
            aircraftMarker = L.marker(acftPos, { icon: dynamicIcon, zIndexOffset: 1000 }).addTo(map);
        } else {
            aircraftMarker.setLatLng(acftPos);
            aircraftMarker.setIcon(dynamicIcon);
        }
    }

    const acftLine = document.getElementById('acftVnavLine');
    if (acftLine && typeof calculateRouteProgress === 'function') {
        const res = calculateRouteProgress(lat, lon);
        if (res) {
            const xPos = res.fraction * 1000;
            acftLine.setAttribute('x1', xPos);
            acftLine.setAttribute('x2', xPos);
            acftLine.style.display = 'block';
            if (typeof updateActiveWaypointHighlight === 'function') {
                updateActiveWaypointHighlight(lat, lon, hdg);
            }
        }
    }
    updateTodHeaderStatus();
}

const DEMO_TOUR_STEPS = [
    {
        title: "🎬 Benvenuto nel Tour Dimostrativo (LIRF ➔ EGLL)",
        desc: "Abbiamo caricato un piano di volo IFR completo da <strong>Roma Fiumicino (LIRF)</strong> a <strong>London Heathrow (EGLL)</strong> con un <em>Airbus A320neo</em> simulato in crociera a <strong>FL360</strong> sulle Alpi.",
        targetSelector: ".telemetry-bar",
        placement: "bottom",
        action: () => {
            closeAllModalsForDemo();
            if (!sidebarOpen) toggleSidebar();
            if (!drawerOpen) toggleDrawer();
            simulateDemoAircraftInFlight(45.68, 7.21, 322);
            if (typeof map !== 'undefined' && map) {
                map.flyToBounds([[41.8, 12.2], [51.5, -0.45]], { padding: [70, 70], duration: 1.0 });
            }
        }
    },
    {
        title: "📋 Piano di Volo Attivo, METAR & Procedure",
        desc: "Nel pannello laterale visualizzi tutte le tratte con codifica colore automatica: <span style='color:#34d399;font-weight:700;'>SID (Verde)</span>, <span style='color:#c084fc;font-weight:700;'>Crociere (Magenta)</span>, <span style='color:#fbbf24;font-weight:700;'>STAR (Ambra)</span> e <span style='color:#38bdf8;font-weight:700;'>Approcci ILS (Ciano)</span>, più i bollettini METAR decodificati.",
        targetSelector: "#fplContainer",
        placement: "right",
        action: () => {
            closeAllModalsForDemo();
            if (!sidebarOpen) toggleSidebar();
        }
    },
    {
        title: "✈️ Importazione SimBrief & File .PLN (Drag & Drop)",
        desc: "Con un clic scarichi l'ultimo OFP generato su <strong>SimBrief</strong> (salvando l'ID in SQLite), oppure puoi importare/esportare file <code>.pln</code> di MSFS 2024 anche trascinandoli direttamente sulla finestra.",
        targetSelector: "#sidebarPanel",
        placement: "right",
        action: () => {
            closeAllModalsForDemo();
        }
    },
    {
        title: "📐 Cono ILS & Rubber Banding Elastico",
        desc: "Sulla pista <strong>27L di Heathrow (EGLL)</strong> vedi il cono di avvicinamento strumentale <strong>ILS</strong>. Trascinando qualsiasi tratto della rotta col mouse (o col dito sul tablet) modifichi il piano con aggancio magnetico <em>Snap</em> e <strong>Undo (Ctrl+Z)</strong>.",
        targetSelector: "#map",
        placement: "center",
        action: () => {
            closeAllModalsForDemo();
            if (typeof map !== 'undefined' && map) {
                map.flyTo([51.38, 0.15], 9, { duration: 1.1 });
            }
        }
    },
    {
        title: "⛰️ Profilo Altimetrico VNAV & Top of Descent (ToD)",
        desc: "Il grafico inferiore mostra l'orografia reale delle <strong>Alpi</strong> sotto la rotta, la linea magenta dell'aereo in volo e calcola automaticamente il <strong>📉 Top of Descent (ToD a 3°)</strong> con il rateo verticale richiesto (fpm).",
        targetSelector: "#elevationDrawer",
        placement: "top",
        action: () => {
            closeAllModalsForDemo();
            if (!drawerOpen) toggleDrawer();
            if (typeof map !== 'undefined' && map) {
                map.flyTo([46.0, 6.9], 7, { duration: 1.0 });
            }
        }
    },
    {
        title: "📋 Tabella Operativa NavLog (ETE, ETA & Consumi)",
        desc: "Aprendo il <strong>NavLog</strong> ottieni il registro completo di navigazione per ogni Waypoint: prua, distanza parziale e residua, tempi stimati (ETE / ETA UTC), consumo di tratta e carburante residuo a bordo (EFOB), esportabile in CSV.",
        targetSelector: "#navlogModal .modal-content",
        placement: "top",
        action: () => {
            closeAllModalsForDemo();
            openNavlogModal();
        }
    },
    {
        title: "⛽ Calcolatore Carburante & Performance Velivolo",
        desc: "Il modulo <strong>Fuel & Perf</strong> (qui impostato su <em>Airbus A320neo</em> con 3.200 Gal a bordo) calcola Taxi, Trip Fuel per le 790 NM di rotta, Contingency, Riserva di 45 min e verifica con un semaforo la copertura del <strong>Block Fuel</strong>.",
        targetSelector: "#fuelPerfModal .modal-content",
        placement: "top",
        action: () => {
            closeAllModalsForDemo();
            onFuelPresetChange('a320');
            fuelPerfConfig.fobGal = 3200;
            openFuelPerfModal();
            populateFuelModalInputs();
            recalculateFuelAndPerfUI();
        }
    },
    {
        title: "📱 Modalità EFB di Rete Wi-Fi (Sincronizzazione Tablet)",
        desc: "Inquadrando questo <strong>QR Code</strong> col tablet apri AeroGlass Nav via Wi-Fi sulla porta dedicata <code>8339</code>: qualsiasi modifica alla rotta fatta sul PC o col tocco sul tablet si sincronizza istantaneamente su entrambi gli schermi.",
        targetSelector: "#efbNetworkModal .modal-content",
        placement: "right",
        action: () => {
            closeAllModalsForDemo();
            openEfbNetworkModal();
        }
    },
    {
        title: "📒 Logbook Automatico & Temi Giorno / Dark / Notte",
        desc: "Nella barra superiore trovi il <strong>Logbook SQLite</strong> (che registra da solo ogni volo all'atterraggio), il selettore <strong>Mappa Track-Up</strong>, i temi <strong>☀️ Giorno / 🌙 Dark / 🌑 Notte Anti-Abbagliamento</strong> e lo switch <strong>💬 Info Tooltip</strong>.",
        targetSelector: ".top-pills-group",
        placement: "bottom",
        action: () => {
            closeAllModalsForDemo();
            if (typeof map !== 'undefined' && map) {
                map.flyToBounds([[41.8, 12.2], [51.5, -0.45]], { padding: [70, 70], duration: 1.0 });
            }
        }
    }
];

function ensureDemoTourElements() {
    if (!document.getElementById('aeroDemoSpotlight')) {
        const spot = document.createElement('div');
        spot.id = 'aeroDemoSpotlight';
        document.body.appendChild(spot);
    }
    if (!document.getElementById('aeroDemoBubble')) {
        const bub = document.createElement('div');
        bub.id = 'aeroDemoBubble';
        document.body.appendChild(bub);
    }
}

function positionDemoCallout(targetSelector, placement) {
    const spot = document.getElementById('aeroDemoSpotlight');
    const bub = document.getElementById('aeroDemoBubble');
    if (!spot || !bub) return;

    const target = targetSelector ? document.querySelector(targetSelector) : null;
    if (!target || placement === 'center') {
        spot.style.display = 'none';
        bub.style.display = 'block';
        bub.style.left = `${Math.max(12, (window.innerWidth - bub.offsetWidth) / 2)}px`;
        bub.style.top = `${Math.max(65, (window.innerHeight - bub.offsetHeight) / 2)}px`;
        return;
    }

    const rect = target.getBoundingClientRect();
    const pad = 6;
    spot.style.display = 'block';
    spot.style.left = `${Math.max(2, rect.left - pad)}px`;
    spot.style.top = `${Math.max(2, rect.top - pad)}px`;
    spot.style.width = `${Math.min(window.innerWidth - 4, rect.width + pad * 2)}px`;
    spot.style.height = `${Math.min(window.innerHeight - 4, rect.height + pad * 2)}px`;

    bub.style.display = 'block';
    const bw = bub.offsetWidth || 350;
    const bh = bub.offsetHeight || 200;
    const margin = 16;

    let top = rect.bottom + margin;
    let left = rect.left + (rect.width / 2) - (bw / 2);

    if (placement === 'right') {
        left = rect.right + margin;
        top = rect.top + Math.min(80, rect.height / 4);
    } else if (placement === 'left') {
        left = rect.left - bw - margin;
        top = rect.top + (rect.height / 2) - (bh / 2);
    } else if (placement === 'top') {
        top = rect.top - bh - margin;
        left = rect.left + (rect.width / 2) - (bw / 2);
        if (top < 55) top = Math.min(window.innerHeight - bh - 16, rect.bottom + margin);
    } else if (placement === 'bottom') {
        top = rect.bottom + margin;
        left = rect.left + (rect.width / 2) - (bw / 2);
    }

    left = Math.max(14, Math.min(window.innerWidth - bw - 14, left));
    top = Math.max(54, Math.min(window.innerHeight - bh - 14, top));

    bub.style.left = `${left}px`;
    bub.style.top = `${top}px`;
}

function renderDemoStep(index) {
    ensureDemoTourElements();
    if (index < 0) index = 0;
    if (index >= DEMO_TOUR_STEPS.length) {
        stopInteractiveDemoTour(false);
        return;
    }

    demoState.stepIndex = index;
    const step = DEMO_TOUR_STEPS[index];

    if (typeof step.action === 'function') {
        step.action();
    }

    const bub = document.getElementById('aeroDemoBubble');
    if (bub) {
        const total = DEMO_TOUR_STEPS.length;
        const pct = Math.round(((index + 1) / total) * 100);
        bub.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="background:rgba(56,189,248,0.18);border:1px solid rgba(56,189,248,0.5);color:#38bdf8;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;letter-spacing:0.4px;">
                    🎬 DEMO LIRF ➔ EGLL • ${index + 1}/${total}
                </span>
                <span style="font-size:10px;color:#94a3b8;">Tasto <strong>F1</strong> / <strong>Esc</strong></span>
            </div>

            <div style="font-size:13.5px;font-weight:700;color:#fbbf24;margin-bottom:6px;line-height:1.3;">
                ${step.title}
            </div>

            <div style="font-size:12px;color:#e2e8f0;line-height:1.5;margin-bottom:10px;">
                ${step.desc}
            </div>

            <!-- Barra progresso Step -->
            <div style="width:100%;height:4px;background:rgba(148,163,184,0.2);border-radius:999px;overflow:hidden;margin-bottom:10px;">
                <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#38bdf8,#34d399);transition:width 0.3s ease;"></div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <div style="display:flex;gap:5px;">
                    <button class="aero-demo-btn" onclick="prevDemoTourStep()" ${index === 0 ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>◀ Indietro</button>
                    <button class="aero-demo-btn amber" onclick="toggleDemoAutoPlay()">
                        ${demoState.autoPlay ? '⏸️ Pausa' : '▶️ Auto'}
                    </button>
                    <button class="aero-demo-btn primary" onclick="nextDemoTourStep()">
                        ${index === total - 1 ? '✅ Fine' : 'Avanti ▶'}
                    </button>
                </div>
                <div style="display:flex;gap:5px;">
                    <button class="aero-demo-btn" style="border-color:rgba(52,211,153,0.45);color:#34d399;" onclick="stopInteractiveDemoTour(true)" title="Termina il tour ma mantieni il piano di volo LIRF - EGLL">📌 Tieni Rotta</button>
                    <button class="aero-demo-btn" style="border-color:rgba(244,63,94,0.45);color:#f43f5e;" onclick="stopInteractiveDemoTour(false)" title="Chiudi Demo e ripristina il piano di volo precedente">✕ Esci</button>
                </div>
            </div>
        `;
    }

    setTimeout(() => {
        positionDemoCallout(step.targetSelector, step.placement);
    }, 120);

    scheduleNextDemoAutoStep();
}

function scheduleNextDemoAutoStep() {
    if (demoState.timerId) {
        clearTimeout(demoState.timerId);
        demoState.timerId = null;
    }
    if (window._demoTourActive && demoState.autoPlay) {
        demoState.timerId = setTimeout(() => {
            if (!window._demoTourActive || !demoState.autoPlay) return;
            if (demoState.stepIndex < DEMO_TOUR_STEPS.length - 1) {
                renderDemoStep(demoState.stepIndex + 1);
            } else {
                stopInteractiveDemoTour(false);
            }
        }, 6500);
    }
}

function nextDemoTourStep() {
    if (!window._demoTourActive) return;
    renderDemoStep(demoState.stepIndex + 1);
}

function prevDemoTourStep() {
    if (!window._demoTourActive) return;
    renderDemoStep(Math.max(0, demoState.stepIndex - 1));
}

function toggleDemoAutoPlay() {
    demoState.autoPlay = !demoState.autoPlay;
    renderDemoStep(demoState.stepIndex);
}

function startInteractiveDemoTour() {
    if (window._demoTourActive) {
        stopInteractiveDemoTour(false);
        return;
    }

    window._demoTourActive = true;
    demoState.autoPlay = true;

    // Salva il piano di volo e i parametri correnti dell'utente per ripristinarli a fine demo
    demoState.backupFpl = JSON.parse(JSON.stringify(typeof flightPlan !== 'undefined' ? flightPlan : []));
    demoState.backupAlt = JSON.parse(JSON.stringify(typeof currentAlternate !== 'undefined' ? currentAlternate : null));
    demoState.backupFuelCfg = JSON.parse(JSON.stringify(fuelPerfConfig));

    // Carica il piano di volo fittizio LIRF -> EGLL senza sovrascrivere il DB SQLite dell'utente
    flightPlan = JSON.parse(JSON.stringify(DEMO_LIRF_EGLL_FPL));
    currentAlternate = JSON.parse(JSON.stringify(DEMO_LIRF_EGLL_ALT));

    window._skipRemoteSave = true;
    if (typeof updateFlightPlanUI === 'function') {
        updateFlightPlanUI(currentAlternate, true);
    }
    window._skipRemoteSave = false;

    renderDemoStep(0);
}

function stopInteractiveDemoTour(keepDemoRoute = false) {
    window._demoTourActive = false;
    if (demoState.timerId) {
        clearTimeout(demoState.timerId);
        demoState.timerId = null;
    }

    const spot = document.getElementById('aeroDemoSpotlight');
    const bub = document.getElementById('aeroDemoBubble');
    if (spot) spot.style.display = 'none';
    if (bub) bub.style.display = 'none';

    closeAllModalsForDemo();

    // Rimuove l'aereo simulato se MSFS non è connesso
    if (aircraftMarker) {
        try { map.removeLayer(aircraftMarker); } catch (e) {}
        aircraftMarker = null;
        lastRenderedAcftKey = null;
    }
    const acftLine = document.getElementById('acftVnavLine');
    if (acftLine) acftLine.style.display = 'none';

    if (demoState.backupFuelCfg) {
        fuelPerfConfig = demoState.backupFuelCfg;
    }

    if (!keepDemoRoute && demoState.backupFpl) {
        flightPlan = demoState.backupFpl;
        currentAlternate = demoState.backupAlt;
        window._skipRemoteSave = true;
        if (typeof updateFlightPlanUI === 'function') {
            updateFlightPlanUI(currentAlternate, true);
        }
        window._skipRemoteSave = false;
    } else if (keepDemoRoute) {
        if (typeof updateFlightPlanUI === 'function') {
            updateFlightPlanUI(currentAlternate, true);
        }
    }
}

function initDemoKeyboardShortcuts() {
    if (window._demoKeysInstalled) return;
    window._demoKeysInstalled = true;

    window.addEventListener('keydown', (e) => {
        // F1 oppure Alt+D oppure Ctrl+D avvia/ferma la Modalità Dimostrativa LIRF - EGLL
        if (e.key === 'F1' || ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'd')) {
            e.preventDefault();
            startInteractiveDemoTour();
            return;
        }

        if (!window._demoTourActive) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            stopInteractiveDemoTour(false);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextDemoTourStep();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevDemoTourStep();
        } else if (e.key === ' ') {
            e.preventDefault();
            toggleDemoAutoPlay();
        }
    });

    window.addEventListener('resize', () => {
        if (window._demoTourActive) {
            const step = DEMO_TOUR_STEPS[demoState.stepIndex];
            if (step) positionDemoCallout(step.targetSelector, step.placement);
        }
    });
}

// --- TOUCH RUBBER BANDING PER TABLET E SCHERMI TOUCH ---
function initTouchRubberBanding() {
    if (typeof map === 'undefined' || !map) return;
    const mapContainer = map.getContainer();
    if (!mapContainer || mapContainer._touchRbInitialized) return;
    mapContainer._touchRbInitialized = true;

    let touchState = null;
    let previewLine = null;
    let previewBadge = null;

    function findTouchSnapCandidate(containerPt) {
        let best = null;
        let minPx = 28;

        const checkList = (arr, typeLabel) => {
            if (!Array.isArray(arr)) return;
            for (const item of arr) {
                if (item.lat === undefined || item.lon === undefined) continue;
                const pt = map.latLngToContainerPoint([Number(item.lat), Number(item.lon)]);
                const dist = containerPt.distanceTo(pt);
                if (dist < minPx) {
                    minPx = dist;
                    best = {
                        ident: item.icao || item.ident || 'WPT',
                        name: item.name || typeLabel,
                        lat: Number(item.lat),
                        lon: Number(item.lon),
                        elev: Number(item.elev || item.alt_ft || 0),
                        type: typeLabel
                    };
                }
            }
        };

        if (typeof airportsData !== 'undefined') checkList(airportsData, 'APT');
        if (typeof vorsData !== 'undefined') checkList(vorsData, 'VOR');
        if (typeof userWaypoints !== 'undefined') checkList(userWaypoints, 'USER');
        return best;
    }

    function clearTouchPreview() {
        if (previewLine) {
            try { map.removeLayer(previewLine); } catch (e) {}
            previewLine = null;
        }
        if (previewBadge) {
            try { map.removeLayer(previewBadge); } catch (e) {}
            previewBadge = null;
        }
        window._touchRbActive = false;
        try { map.dragging.enable(); } catch (e) {}
    }

    mapContainer.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) {
            if (touchState) {
                clearTouchPreview();
                touchState = null;
            }
            return;
        }
        if (typeof flightPlan === 'undefined' || !Array.isArray(flightPlan) || flightPlan.length < 2) return;
        if (typeof pickingMapCoords !== 'undefined' && pickingMapCoords) return;

        const touch = e.touches[0];
        const pt = map.mouseEventToContainerPoint(touch);

        for (let i = 1; i < flightPlan.length - 1; i++) {
            const wpPt = map.latLngToContainerPoint([Number(flightPlan[i].lat), Number(flightPlan[i].lon)]);
            if (pt.distanceTo(wpPt) <= 26) {
                touchState = {
                    mode: 'move',
                    wpIndex: i,
                    startPt: pt,
                    hasDragged: false,
                    currentLatLng: L.latLng(Number(flightPlan[i].lat), Number(flightPlan[i].lon)),
                    snapTarget: null
                };
                window._touchRbActive = true;
                map.dragging.disable();
                return;
            }
        }

        for (let i = 0; i < flightPlan.length - 1; i++) {
            const p1 = map.latLngToContainerPoint([Number(flightPlan[i].lat), Number(flightPlan[i].lon)]);
            const p2 = map.latLngToContainerPoint([Number(flightPlan[i + 1].lat), Number(flightPlan[i + 1].lon)]);

            if (i === 0 && pt.distanceTo(p1) < 22) continue;
            if (i === flightPlan.length - 2 && pt.distanceTo(p2) < 22) continue;

            const segDist = L.LineUtil.pointToSegmentDistance(pt, p1, p2);
            if (segDist <= 22) {
                touchState = {
                    mode: 'insert',
                    legIndex: i,
                    startPt: pt,
                    hasDragged: false,
                    currentLatLng: map.containerPointToLatLng(pt),
                    snapTarget: null
                };
                window._touchRbActive = true;
                map.dragging.disable();
                return;
            }
        }
    }, { passive: true });

    mapContainer.addEventListener('touchmove', (e) => {
        if (!touchState) return;
        if (!e.touches || e.touches.length !== 1) {
            clearTouchPreview();
            touchState = null;
            return;
        }

        const touch = e.touches[0];
        const pt = map.mouseEventToContainerPoint(touch);
        if (!touchState.hasDragged && pt.distanceTo(touchState.startPt) < 8) {
            return;
        }
        touchState.hasDragged = true;
        if (e.cancelable) e.preventDefault();

        const snap = findTouchSnapCandidate(pt);
        touchState.snapTarget = snap;
        const targetLatLng = snap ? L.latLng(snap.lat, snap.lon) : map.containerPointToLatLng(pt);
        touchState.currentLatLng = targetLatLng;

        const prevWp = touchState.mode === 'move'
            ? flightPlan[touchState.wpIndex - 1]
            : flightPlan[touchState.legIndex];
        const nextWp = touchState.mode === 'move'
            ? flightPlan[touchState.wpIndex + 1]
            : flightPlan[touchState.legIndex + 1];

        const polyCoords = [
            [Number(prevWp.lat), Number(prevWp.lon)],
            [targetLatLng.lat, targetLatLng.lng],
            [Number(nextWp.lat), Number(nextWp.lon)]
        ];

        const lineColor = snap ? '#34d399' : '#38bdf8';
        if (!previewLine) {
            previewLine = L.polyline(polyCoords, {
                color: lineColor,
                weight: 4,
                dashArray: '8, 6',
                opacity: 0.95
            }).addTo(map);
        } else {
            previewLine.setLatLngs(polyCoords);
            previewLine.setStyle({ color: lineColor });
        }

        const badgeHtml = snap
            ? `<div style="background:rgba(6,78,59,0.95);border:1.5px solid #34d399;color:#34d399;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;transform:translate(-50%,-145%);box-shadow:0 3px 12px rgba(0,0,0,0.6);">🧲 SNAP: ${snap.ident}</div>`
            : `<div style="background:rgba(15,23,42,0.92);border:1.5px solid #38bdf8;color:#38bdf8;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;transform:translate(-50%,-145%);box-shadow:0 3px 12px rgba(0,0,0,0.6);">📍 ${targetLatLng.lat.toFixed(3)}, ${targetLatLng.lng.toFixed(3)}</div>`;

        const badgeIcon = L.divIcon({ className: '', html: badgeHtml, iconSize: [120, 24], iconAnchor: [0, 0] });
        if (!previewBadge) {
            previewBadge = L.marker(targetLatLng, { icon: badgeIcon, interactive: false, zIndexOffset: 2000 }).addTo(map);
        } else {
            previewBadge.setLatLng(targetLatLng);
            previewBadge.setIcon(badgeIcon);
        }
    }, { passive: false });

    const finishTouchRubberBand = () => {
        if (!touchState) return;
        const state = touchState;
        touchState = null;
        clearTouchPreview();

        if (!state.hasDragged || !state.currentLatLng) return;

        if (typeof pushFlightPlanUndoState === 'function') {
            pushFlightPlanUndoState();
        } else if (typeof fplUndoStack !== 'undefined' && Array.isArray(fplUndoStack)) {
            fplUndoStack.push(JSON.parse(JSON.stringify(flightPlan)));
            if (fplUndoStack.length > 30) fplUndoStack.shift();
            if (typeof updateUndoButtonUI === 'function') updateUndoButtonUI();
        }

        const lat = Number(state.currentLatLng.lat.toFixed(5));
        const lon = Number(state.currentLatLng.lng.toFixed(5));
        const snap = state.snapTarget;

        if (state.mode === 'move') {
            const wp = flightPlan[state.wpIndex];
            if (snap) {
                wp.ident = snap.ident;
                wp.name = snap.name;
                wp.lat = snap.lat;
                wp.lon = snap.lon;
                wp.type = snap.type;
            } else {
                wp.lat = lat;
                wp.lon = lon;
                if (typeof userWaypoints !== 'undefined' && Array.isArray(userWaypoints)) {
                    const uwp = userWaypoints.find(u => u.ident === wp.ident);
                    if (uwp) {
                        uwp.lat = lat;
                        uwp.lon = lon;
                        if (typeof persistUserWaypoints === 'function') persistUserWaypoints();
                    }
                }
            }
        } else if (state.mode === 'insert') {
            const prevWp = flightPlan[state.legIndex];
            const nextWp = flightPlan[state.legIndex + 1];
            const interpAlt = Math.max(
                1000,
                Math.round(((Number(prevWp.alt_ft || 5000) + Number(nextWp.alt_ft || 5000)) / 2) / 100) * 100
            );

            let newWp = null;
            if (snap) {
                newWp = {
                    ident: snap.ident,
                    name: snap.name,
                    lat: snap.lat,
                    lon: snap.lon,
                    alt_ft: interpAlt,
                    type: snap.type,
                    proc_type: 'ENR',
                    proc_name: 'DCT'
                };
            } else {
                let idx = 1;
                const usedIds = new Set([
                    ...flightPlan.map(w => w.ident),
                    ...((typeof userWaypoints !== 'undefined' && Array.isArray(userWaypoints)) ? userWaypoints.map(w => w.ident) : [])
                ]);
                while (usedIds.has(`WP${idx}`)) idx++;
                const newIdent = `WP${idx}`;

                newWp = {
                    ident: newIdent,
                    name: 'User Waypoint (Touch)',
                    lat: lat,
                    lon: lon,
                    alt_ft: interpAlt,
                    type: 'USER',
                    proc_type: 'ENR',
                    proc_name: 'DCT'
                };

                if (typeof userWaypoints !== 'undefined' && Array.isArray(userWaypoints)) {
                    userWaypoints.push({
                        ident: newIdent,
                        name: 'User Waypoint (Touch)',
                        lat: lat,
                        lon: lon,
                        alt_ft: interpAlt,
                        type: 'USER'
                    });
                    if (typeof persistUserWaypoints === 'function') persistUserWaypoints();
                }
            }

            flightPlan.splice(state.legIndex + 1, 0, newWp);
        }

        if (typeof updateFlightPlanUI === 'function') {
            updateFlightPlanUI(typeof currentAlternate !== 'undefined' ? currentAlternate : null, false);
        }
        setTimeout(updateTopOfDescentOverlay, 30);
    };

    mapContainer.addEventListener('touchend', finishTouchRubberBand);
    mapContainer.addEventListener('touchcancel', () => {
        touchState = null;
        clearTouchPreview();
    });
}

function installTodAndTouchHooks() {
    if (window._todHooksInstalled) return;
    window._todHooksInstalled = true;

    ensureNavlogAndFuelUI();
    ensureDrawerToggleTab();
    ensureTooltipToggleButton();
    initSyntheticTooltipsEngine();
    initDemoKeyboardShortcuts();

    if (typeof window.updateFlightPlanUI === 'function') {
        const origUpdateFpl = window.updateFlightPlanUI;
        window.updateFlightPlanUI = function(...args) {
            const res = origUpdateFpl.apply(this, args);
            setTimeout(() => {
                updateTopOfDescentOverlay();
                recalculateFuelAndPerfUI();
                const nlModal = document.getElementById('navlogModal');
                if (nlModal && nlModal.style.display === 'flex') renderNavlogTable();
            }, 40);
            return res;
        };
    }

    if (typeof window.renderVnavChart === 'function') {
        const origRenderVnav = window.renderVnavChart;
        window.renderVnavChart = function(...args) {
            const res = origRenderVnav.apply(this, args);
            setTimeout(updateTopOfDescentOverlay, 40);
            return res;
        };
    }

    initTouchRubberBanding();
    setTimeout(updateTopOfDescentOverlay, 150);
}

// --- GESTIONE SIDEBAR FPL E CASSETTO VNAV ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarPanel');
    const arrow = document.getElementById('sidebarArrow');
    const label = document.getElementById('sidebarLabel');
    if (!sidebar) return;

    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('collapsed', !sidebarOpen);

    if (arrow) arrow.innerText = sidebarOpen ? '◀' : '▶';
    if (label) label.style.display = sidebarOpen ? 'none' : 'block';
}

function toggleDrawer() {
    const drawer = document.getElementById('elevationDrawer');
    const arrow = document.getElementById('drawerArrow');
    const infoBar = document.getElementById('bottomInfoBar');
    if (!drawer) return;

    drawerOpen = !drawerOpen;
    drawer.classList.toggle('collapsed', !drawerOpen);

    if (arrow) arrow.innerText = drawerOpen ? '▼' : '▲';
    if (infoBar) {
        infoBar.style.bottom = drawerOpen ? '134px' : '36px';
    }
}

// --- CAMBIO LINGUA IT / EN ---
function applyTranslations() {
    const t = translations[currentLang];
    if (!t) return;

    const langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.innerText = currentLang.toUpperCase();

    const omniSearch = document.getElementById('omniSearch');
    if (omniSearch) omniSearch.placeholder = t.searchPlaceholder;

    const fplTitle = document.getElementById('fplSectionTitle');
    if (fplTitle) fplTitle.innerText = t.activeFpl.toUpperCase();

    const lblFilters = document.getElementById('lblFilters');
    if (lblFilters) lblFilters.innerText = t.btnFilters;

    const lblReduce = document.getElementById('lblReduceExpand');
    if (lblReduce) lblReduce.innerText = t.btnReduce;

    const btnNavaids = document.getElementById('btnToggleNavaids');
    if (btnNavaids) btnNavaids.innerText = showNavaids ? t.btnNavaids : t.btnNavaidsOff;

    setFollowState(followState);
    updateThemeButtonUI();
    updateTooltipButtonUI();

    const vnavText = document.getElementById('vnavText');
    if (vnavText && (!flightPlan || flightPlan.length === 0)) {
        vnavText.innerText = t.noFpl.toUpperCase();
    }
}

function toggleLanguage() {
    currentLang = (currentLang === 'it') ? 'en' : 'it';
    applyTranslations();
}

// --- RIDIMENSIONAMENTO LARGHEZZA SIDEBAR ---
function initSidebarResizer() {
    const sidebar = document.getElementById('sidebarPanel');
    const resizer = document.getElementById('sidebarResizer');
    if (!sidebar || !resizer) return;

    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        if (!sidebarOpen) return;
        isResizing = true;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = Math.max(260, Math.min(520, e.clientX - 16));
        sidebar.style.width = `${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
        }
    });
}

// --- DRAG & DROP FILE .PLN SULLA FINESTRA ---
function initDragAndDropPln() {
    const overlay = document.getElementById('dropZoneOverlay');
    if (!overlay) return;

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        overlay.style.display = 'flex';
    });

    overlay.addEventListener('dragleave', (e) => {
        e.preventDefault();
        overlay.style.display = 'none';
    });

    overlay.addEventListener('drop', (e) => {
        e.preventDefault();
        overlay.style.display = 'none';
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                if (ev.target?.result) {
                    await processAndRenderPlnXml(ev.target.result);
                }
            };
            reader.readAsText(files[0]);
        }
    });
}

// --- INIZIALIZZAZIONE APPLICAZIONE E DATI PYWEBVIEW / EFB ---
async function initAeroGlassApp() {
    installTodAndTouchHooks();
    applyThemeMode(currentThemeMode, false);
    applyTooltipsMode(tooltipsEnabled, false);

    if (!window.pywebview || !window.pywebview.api || typeof window.pywebview.api.get_initial_data !== 'function') {
        return;
    }
    if (initialized) return;
    initialized = true;

    updateFlightInfoBar(43.5, 12.0);
    setFollowState(followState);
    renderNavAids(vorsData, ilsData);
    updateMapScale();

    try {
        if (window.pywebview.api.get_setting) {
            const themeRes = await window.pywebview.api.get_setting('theme_mode');
            if (themeRes && themeRes.success && themeRes.value) {
                await applyThemeMode(themeRes.value, false);
            }
            const tipRes = await window.pywebview.api.get_setting('show_tooltips');
            if (tipRes && tipRes.success && tipRes.value !== null && tipRes.value !== undefined) {
                await applyTooltipsMode(tipRes.value !== 'false', false);
            }
            const fpRes = await window.pywebview.api.get_setting('fuel_perf_config');
            if (fpRes && fpRes.success && fpRes.value) {
                try {
                    fuelPerfConfig = { ...fuelPerfConfig, ...JSON.parse(fpRes.value) };
                } catch (e) {}
            }
        }

        const initData = await window.pywebview.api.get_initial_data();
        if (initData) {
            if (initData.fpl_ts) {
                window._lastFplTs = initData.fpl_ts;
            }
            if (initData.efb_info) {
                updateEfbTopBarBadge(initData.efb_info);
            } else {
                await refreshEfbBadgeFromBackend();
            }
            if (initData.airports && initData.airports.length > 0) {
                airportsData = [...initData.airports, ...EXTRA_AIRPORTS];
            }
            if (initData.vors && initData.vors.length > 0) {
                vorsData = initData.vors;
            }
            if (initData.ils && initData.ils.length > 0) {
                ilsData = initData.ils;
            }
            if (initData.simbrief_id) {
                const sbInput = document.getElementById('simbriefIdInput');
                if (sbInput) sbInput.value = initData.simbrief_id;
                setSimbriefCompactMode(true);
            }
            if (initData.flight_plan && Array.isArray(initData.flight_plan) && initData.flight_plan.length > 0) {
                flightPlan = initData.flight_plan;
                currentAlternate = initData.alternate || null;
                updateFlightPlanUI(currentAlternate, true);
            }
            renderNavAids(vorsData, ilsData);
        }
        await loadUserWaypoints();
    } catch (e) {}

    setTimeout(updateTopOfDescentOverlay, 250);

    setInterval(() => {
        if (!window._demoTourActive) {
            pollTelemetry();
        }
        updateTodHeaderStatus();
    }, 1000);

    setInterval(() => {
        const lbl = document.getElementById('lblEfbNet');
        if (lbl && lbl.innerText.includes('...')) {
            refreshEfbBadgeFromBackend();
        }
    }, 1500);
}

document.addEventListener('DOMContentLoaded', () => {
    initSidebarResizer();
    initDragAndDropPln();
    installTodAndTouchHooks();
    applyThemeMode(currentThemeMode, false);
    applyTooltipsMode(tooltipsEnabled, false);
    updateFlightInfoBar(43.5, 12.0);
    setFollowState(followState);
    renderNavAids(vorsData, ilsData);
    updateMapScale();

    if (typeof map !== 'undefined' && map) {
        map.on('mousemove', (e) => {
            const coordsEl = document.getElementById('infoCoords');
            if (coordsEl) {
                coordsEl.innerText = `LAT: ${e.latlng.lat.toFixed(5)} LON: ${e.latlng.lng.toFixed(5)}`;
            }
        });
    }

    window.addEventListener('click', (event) => {
        const createModal = document.getElementById('createFplModal');
        if (createModal && event.target === createModal) closeCreateFplModal();

        const histModal = document.getElementById('flightHistoryModal');
        if (histModal && event.target === histModal) closeFlightHistoryModal();

        const efbModal = document.getElementById('efbNetworkModal');
        if (efbModal && event.target === efbModal) closeEfbNetworkModal();

        const nlModal = document.getElementById('navlogModal');
        if (nlModal && event.target === nlModal) closeNavlogModal();

        const fpModal = document.getElementById('fuelPerfModal');
        if (fpModal && event.target === fpModal) closeFuelPerfModal();
    });

    setTimeout(initAeroGlassApp, 300);
});

window.addEventListener('pywebviewready', initAeroGlassApp);