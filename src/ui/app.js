// --- MODALITÀ TEMA VISIVO (☀️ GIORNO / 🌙 DARK / 🌑 NOTTE) & TOOLTIP SINTETICI ---
let currentThemeMode = localStorage.getItem('aeroglass_theme_mode') || 'dark';
let tooltipsEnabled = (localStorage.getItem('aeroglass_tooltips') !== 'false');
let currentUIMode = localStorage.getItem('aeroglass_ui_mode') || 'extended';

// (Nota: sidebarOpen, drawerOpen e initialized sono già dichiarati in state.js, non vanno ridefiniti qui)

window.currentLang = window.currentLang || 'it';
window.followState = window.followState !== undefined ? window.followState : 1;
window.showNavaids = window.showNavaids !== undefined ? window.showNavaids : true;
window.vorsData = window.vorsData || [];
window.ilsData = window.ilsData || [];
window.airportsData = window.airportsData || [];
window.EXTRA_AIRPORTS = window.EXTRA_AIRPORTS || [];
window.flightPlan = window.flightPlan || [];
window.currentAlternate = window.currentAlternate || null;

function ensureUIModeButton() {
    if (document.getElementById('btnToggleUIMode')) return;
    const pillsGroup = document.querySelector('.top-pills-group');
    if (!pillsGroup) return;

    const btn = document.createElement('button');
    btn.id = 'btnToggleUIMode';
    btn.className = 'top-btn';
    btn.onclick = toggleUIMode;
    btn.style.justifyContent = 'center';

    const themeBtn = document.getElementById('btnThemeMode');
    if (themeBtn && themeBtn.parentNode === pillsGroup) {
        pillsGroup.insertBefore(btn, themeBtn);
    } else {
        pillsGroup.appendChild(btn);
    }
    updateUIModeButtonUI();
}

function updateUIModeButtonUI() {
    const btn = document.getElementById('btnToggleUIMode');
    if (!btn) return;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

    if (currentUIMode === 'simple') {
        btn.innerHTML = isEn ? '🎛️ <span>Simple</span>' : '🎛️ <span>Semplice</span>';
        btn.style.borderColor = 'rgba(0, 210, 255, 0.65)';
        btn.style.color = '#00d2ff';
    } else {
        btn.innerHTML = isEn ? '🎛️ <span>Extended</span>' : '🎛️ <span>Estesa</span>';
        btn.style.borderColor = 'rgba(139, 148, 158, 0.35)';
        btn.style.color = '#8b949e';
    }
}

async function applyUIMode(mode, persist = true) {
    if (!['extended', 'simple'].includes(mode)) mode = 'extended';
    currentUIMode = mode;

    ensureUIModeButton();
    document.body.classList.toggle('mode-simple', mode === 'simple');
    updateUIModeButtonUI();

    if (persist) {
        if (mode === 'simple') {
            if (sidebarOpen) toggleSidebar();
            if (drawerOpen) toggleDrawer();
        } else {
            if (!sidebarOpen) toggleSidebar();
            if (!drawerOpen) toggleDrawer();
        }
    }

    try { localStorage.setItem('aeroglass_ui_mode', mode); } catch (e) {}

    if (persist && window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try { await window.pywebview.api.save_setting('ui_mode', mode); } catch (e) {}
    }
}

function toggleUIMode() {
    const nextMode = (currentUIMode === 'extended') ? 'simple' : 'extended';
    applyUIMode(nextMode, true);
}

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
    },
    btnToggleUIMode: {
        it: "🎛️ Vista Interfaccia: Passa tra Modalità Estesa (Completa) e Semplificata (Minimal)",
        en: "🎛️ UI Mode: Switch between Extended (Full) and Simplified (Minimal) view"
    },
    aeroCompassWidget: {
        it: "🧭 Rosa dei Venti: Indica il Nord geografico (Clicca per orientamento North Up 360°)",
        en: "🧭 Compass Rose: Points to True North (Click to reset North Up 360°)"
    },
    btnToggleGroundMap: {
        it: "🛫 Mappa Aeroporto (Taxiway & Parcheggi): Mostra/nascondi layout interno o zooma sull'aeroporto",
        en: "🛫 Airport Ground Map (Taxiways & Parking): Toggle internal layout or zoom to active airport"
    },
    btnToggleWeather: {
        it: "💨 Meteo & Venti: Mostra/nascondi vettori vento lungo la rotta e clicca sugli aeroporti per il METAR rapido",
        en: "💨 Weather & Winds: Toggle route wind vectors and click airports for quick METAR popup"
    }
};

function resolveSyntheticTooltip(el) {
    if (!el) return null;
    const lang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'it';

    if (el.id && SYNTHETIC_TOOLTIPS[el.id]) {
        return SYNTHETIC_TOOLTIPS[el.id][lang];
    }

    const onclickStr = (el.getAttribute('onclick') || '').toLowerCase();
    if (onclickStr.includes('opencreatefplmodal')) return lang === 'en' ? '➕ Create a new Flight Plan from scratch' : '➕ Crea un nuovo Piano di Volo (Partenza, Destinazione e Waypoint)';
    if (onclickStr.includes('loadpln') || onclickStr.includes('importpln')) return lang === 'en' ? '📂 Import an MSFS .pln flight plan file' : '📂 Importa un file Piano di Volo (.pln) dal disco';
    if (onclickStr.includes('exportpln')) return lang === 'en' ? '💾 Export active route as .pln in Downloads' : '💾 Esporta la rotta attiva in formato .pln nella cartella Download';
    if (onclickStr.includes('clearflightplan')) return lang === 'en' ? '🗑️ Clear the entire active Flight Plan' : '🗑️ Cancella interamente il Piano di Volo attivo';
    if (onclickStr.includes('fetchsimbrief') || onclickStr.includes('simbrief')) return lang === 'en' ? '✈️ Import latest OFP flight plan from SimBrief' : '✈️ Scarica l\'ultimo piano di volo OFP generato su SimBrief';
    if (onclickStr.includes('undo')) return lang === 'en' ? '↩️ Undo last route modification (Ctrl+Z)' : '↩️ Annulla l\'ultima modifica fatta sulla rotta (Ctrl+Z)';
    if (onclickStr.includes('filter')) return lang === 'en' ? '⚙️ Filter airports, SID/STAR procedures and map layers' : '⚙️ Filtra visibilità aeroporti, procedure SID/STAR e livelli mappa';
    if (onclickStr.includes('follow')) return SYNTHETIC_TOOLTIPS.btnFollowAcft[lang];
    if (onclickStr.includes('togglelanguage')) return lang === 'en' ? '🌐 Switch interface language (IT / EN)' : '🌐 Cambia lingua dell\'interfaccia (Italiano / Inglese)';
    if (onclickStr.includes('pick') || onclickStr.includes('mappa')) return lang === 'en' ? '📍 Click directly on the map to pick Waypoint coordinates' : '📍 Clicca sulla mappa per catturare automaticamente Latitudine e Longitudine';
    if (onclickStr.includes('adduserwaypoint') || onclickStr.includes('aggiungi')) return lang === 'en' ? '➕ Save custom Waypoint in SQLite database' : '➕ Salva il Waypoint utente nel database SQLite e aggiungilo in mappa';

    if (el.dataset && el.dataset.origTitle) return el.dataset.origTitle;
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
    btn.onclick = () => applyTooltipsMode(!tooltipsEnabled, true);
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
    if (!tooltipsEnabled && tipBox) tipBox.classList.remove('visible');

    document.querySelectorAll('[title]').forEach(el => {
        const t = el.getAttribute('title');
        if (t) el.dataset.origTitle = t;
        el.removeAttribute('title');
    });

    try { localStorage.setItem('aeroglass_tooltips', String(tooltipsEnabled)); } catch (e) {}

    if (persist && window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try { await window.pywebview.api.save_setting('show_tooltips', String(tooltipsEnabled)); } catch (e) {}
    }
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
        if (x + rect.width + pad > window.innerWidth) x = Math.max(8, window.innerWidth - rect.width - pad);
        if (y + rect.height + pad > window.innerHeight) y = Math.max(8, e.clientY - rect.height - 12);
        tipBox.style.left = `${x}px`;
        tipBox.style.top = `${y}px`;
    };

    document.addEventListener('mouseover', (e) => {
        if (!tooltipsEnabled || window._demoTourActive) {
            tipBox.classList.remove('visible');
            return;
        }
        const target = e.target.closest('button, select, input, #sidebarToggleTab, #drawerToggleTab, #aeroCompassWidget, .top-btn, .btn');
        const text = target ? resolveSyntheticTooltip(target) : null;
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
        if (activeEl && tooltipsEnabled && !window._demoTourActive) positionTooltip(e);
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
        tab.onclick = (e) => {
            e.stopPropagation();
            toggleDrawer();
        };
        tab.style.cssText = 'position:absolute;top:-24px;left:50%;transform:translateX(-50%);background:var(--glass-bg);border:1px solid var(--glass-border);border-bottom:none;border-radius:8px 8px 0 0;padding:3px 16px;font-size:10px;font-weight:700;color:var(--cyan);cursor:pointer;display:flex;align-items:center;gap:5px;box-shadow:0 -4px 12px rgba(0,0,0,0.4);';
        tab.innerHTML = `<span id="drawerArrow">${drawerOpen ? '▼' : '▲'}</span> <span>ALT</span>`;
        drawer.appendChild(tab);
    }
}

function ensureCompassRoseWidget() {
    if (!document.body) return;
    let widget = document.getElementById('aeroCompassWidget');
    if (widget) return;

    widget = document.createElement('div');
    widget.id = 'aeroCompassWidget';
    widget.className = 'compass-rose-widget glass-panel';
    widget.style.cssText = 'position:fixed;top:56px;right:18px;width:72px;height:72px;z-index:1500;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;background:rgba(18,23,31,0.92);border:1.5px solid rgba(0,210,255,0.45);box-shadow:0 8px 24px rgba(0,0,0,0.65);backdrop-filter:blur(12px);';

    widget.innerHTML = `
        <svg id="compassRoseDial" style="width:62px;height:62px;transform-origin:center center;transition:transform 0.15s linear;" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(139, 148, 158, 0.45)" stroke-width="1.5"/>
            <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(0, 210, 255, 0.25)" stroke-width="1" stroke-dasharray="2,4"/>
            <line x1="50" y1="4" x2="50" y2="13" stroke="#f85149" stroke-width="2.8"/>
            <line x1="96" y1="50" x2="87" y2="50" stroke="#8b949e" stroke-width="2"/>
            <line x1="50" y1="96" x2="50" y2="87" stroke="#8b949e" stroke-width="2"/>
            <line x1="4" y1="50" x2="13" y2="50" stroke="#8b949e" stroke-width="2"/>
            <line x1="82.5" y1="17.5" x2="77.5" y2="22.5" stroke="#8b949e" stroke-width="1.2"/>
            <line x1="82.5" y1="82.5" x2="77.5" y2="77.5" stroke="#8b949e" stroke-width="1.2"/>
            <line x1="17.5" y1="82.5" x2="22.5" y2="77.5" stroke="#8b949e" stroke-width="1.2"/>
            <line x1="17.5" y1="17.5" x2="22.5" y2="22.5" stroke="#8b949e" stroke-width="1.2"/>
            <polygon points="50,17 44,50 50,44 56,50" fill="#f85149"/>
            <polygon points="50,83 44,50 50,56 56,50" fill="rgba(139, 148, 158, 0.6)"/>
            <circle cx="50" cy="50" r="3.2" fill="#00d2ff"/>
            <text x="50" y="27" text-anchor="middle" fill="#f85149" font-family="Consolas, monospace" font-size="11.5" font-weight="900">N</text>
            <text x="76" y="53.5" text-anchor="middle" fill="#cbd5e1" font-family="Consolas, monospace" font-size="9.5" font-weight="700">E</text>
            <text x="50" y="79" text-anchor="middle" fill="#cbd5e1" font-family="Consolas, monospace" font-size="9.5" font-weight="700">S</text>
            <text x="24" y="53.5" text-anchor="middle" fill="#cbd5e1" font-family="Consolas, monospace" font-size="9.5" font-weight="700">W</text>
        </svg>
        <div id="compassHdgReadout" style="position:absolute;bottom:-18px;background:rgba(15,23,42,0.95);border:1px solid rgba(0,210,255,0.45);color:#00d2ff;font-family:Consolas,monospace;font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:4px;letter-spacing:0.5px;pointer-events:none;box-shadow:0 4px 10px rgba(0,0,0,0.5);">360°</div>
    `;

    document.body.appendChild(widget);

    const dial = document.getElementById('compassRoseDial');
    const readout = document.getElementById('compassHdgReadout');

    window.updateCompassRose = function(mapRotDeg) {
        if (!dial || !readout) return;
        dial.style.transform = `rotate(${mapRotDeg}deg)`;
        let hdg = Math.round((-mapRotDeg % 360 + 360) % 360);
        if (hdg === 0) hdg = 360;
        readout.textContent = `${String(hdg).padStart(3, '0')}°`;
    };

    const syncCompass = () => {
        const mapEl = document.getElementById('map');
        if (!mapEl) return;
        const style = mapEl.style.transform || '';
        const match = style.match(/rotate\(([-\d.]+)deg\)/);
        let deg = match ? parseFloat(match[1]) : 0;
        if (deg === 0 && typeof currentMapRotation !== 'undefined') {
            deg = currentMapRotation;
        }
        window.updateCompassRose(deg);
    };

    const mapEl = document.getElementById('map');
    if (mapEl) {
        const observer = new MutationObserver(syncCompass);
        observer.observe(mapEl, { attributes: true, attributeFilter: ['style'] });
    }
    syncCompass();

    widget.addEventListener('click', () => {
        if (typeof setFollowState === 'function') {
            setFollowState(1);
        }
        const m = document.getElementById('map');
        if (m) m.style.transform = 'rotate(0deg)';
        window.updateCompassRose(0);
    });
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

    ensureThemeToggleButton();
    ensureTooltipToggleButton();
    ensureUIModeButton();
    ensureDrawerToggleTab();
    ensureCompassRoseWidget();
    ensureGroundMapUI();
    ensureWeatherOverlayUI();
    applyUIMode(currentUIMode, false);
    initSyntheticTooltipsEngine();

    document.body.classList.remove('theme-dark', 'theme-night', 'theme-day');
    document.body.classList.add(`theme-${mode}`);
    updateThemeButtonUI();

    try { localStorage.setItem('aeroglass_theme_mode', mode); } catch (e) {}

    if (persist && window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try { await window.pywebview.api.save_setting('theme_mode', mode); } catch (e) {}
    }
}

function toggleThemeMode() {
    const order = ['dark', 'night', 'day'];
    const nextIdx = (order.indexOf(currentThemeMode) + 1) % order.length;
    applyThemeMode(order[nextIdx], true);
}

// --- 🛫 MOTORE MAPPA INTERNA AEROPORTI LOCALE (TAXIWAYS, RUNWAYS & PARCHEGGI) ---
let groundMapEnabled = true;
let groundLayerGroup = null;
let lastRenderedGroundKey = null;

const CUSTOM_APT_LAYOUTS = {
    LIPZ: {
        name: "Venezia Marco Polo (LIPZ)",
        lat: 45.5053, lon: 12.3519,
        runways: [
            { ref: "04R/22L", width: 45, surface: "asphalt", coords: [[45.4912, 12.3325], [45.5186, 12.3654]] },
            { ref: "04L/22R", width: 45, surface: "asphalt", coords: [[45.4954, 12.3278], [45.5228, 12.3607]] }
        ],
        taxiways: [
            { ref: "A", coords: [[45.5012, 12.3390], [45.5100, 12.3480]] },
            { ref: "B", coords: [[45.4980, 12.3350], [45.5050, 12.3430]] },
            { ref: "C", coords: [[45.5030, 12.3410], [45.5080, 12.3450]] },
            { ref: "M", coords: [[45.4940, 12.3300], [45.5150, 12.3600]] }
        ],
        aprons: [
            [[45.5035, 12.3410], [45.5035, 12.3460], [45.5085, 12.3460], [45.5085, 12.3410]]
        ],
        stands: [
            { ref: "114", lat: 45.5065, lon: 12.3438 },
            { ref: "115", lat: 45.5069, lon: 12.3442 },
            { ref: "116", lat: 45.5073, lon: 12.3446 },
            { ref: "117", lat: 45.5077, lon: 12.3450 },
            { ref: "118", lat: 45.5081, lon: 12.3454 },
            { ref: "501", lat: 45.5042, lon: 12.3421 },
            { ref: "502", lat: 45.5046, lon: 12.3425 },
            { ref: "503", lat: 45.5050, lon: 12.3429 }
        ]
    },
    LIKL: {
        name: "Aviosuperficie La Comina (Pordenone)",
        lat: 46.0019, lon: 12.6978,
        runways: [
            { ref: "36L/18R", width: 30, surface: "grass", coords: [[45.9968, 12.6969], [46.0070, 12.6969]] },
            { ref: "36R/18L", width: 30, surface: "grass", coords: [[45.9968, 12.6986], [46.0070, 12.6986]] }
        ],
        taxiways: [
            { ref: "TWY A", coords: [[45.9982, 12.6952], [45.9982, 12.6969], [45.9982, 12.6986]] },
            { ref: "TWY B", coords: [[46.0015, 12.6952], [46.0015, 12.6969], [46.0015, 12.6986]] },
            { ref: "TWY MAIN", coords: [[45.9975, 12.6952], [46.0035, 12.6952]] }
        ],
        aprons: [
            [[45.9980, 12.6940], [45.9980, 12.6953], [46.0012, 12.6953], [46.0012, 12.6940]]
        ],
        stands: [
            { ref: "P1", lat: 45.9986, lon: 12.6946 },
            { ref: "P2", lat: 45.9993, lon: 12.6946 },
            { ref: "P3", lat: 46.0000, lon: 12.6946 },
            { ref: "P4", lat: 46.0007, lon: 12.6946 }
        ]
    },
    LIPD: {
        name: "Aeroporto di Udine-Campoformido",
        lat: 46.0319, lon: 13.1869,
        runways: [
            { ref: "09/27", width: 35, surface: "grass", coords: [[46.0326, 13.1765], [46.0311, 13.1968]] }
        ],
        taxiways: [
            { ref: "A", coords: [[46.0303, 13.1818], [46.0322, 13.1818]] },
            { ref: "B", coords: [[46.0301, 13.1885], [46.0317, 13.1885]] }
        ],
        aprons: [
            [[46.0295, 13.1808], [46.0295, 13.1842], [46.0305, 13.1842], [46.0305, 13.1808]]
        ],
        stands: [
            { ref: "G1", lat: 46.0300, lon: 13.1815 },
            { ref: "G2", lat: 46.0300, lon: 13.1825 },
            { ref: "G3", lat: 46.0300, lon: 13.1835 }
        ]
    },
    LITY: {
        name: "Aviosuperficie di Agrigento",
        lat: 37.2464, lon: 13.6697,
        runways: [
            { ref: "12/30", width: 20, surface: "asphalt", coords: [[37.2485, 13.6655], [37.2443, 13.6739]] }
        ],
        taxiways: [
            { ref: "TWY A", coords: [[37.2466, 13.6693], [37.2458, 13.6685]] }
        ],
        aprons: [
            [[37.2453, 13.6678], [37.2453, 13.6690], [37.2461, 13.6690], [37.2461, 13.6678]]
        ],
        stands: [
            { ref: "P1", lat: 37.2457, lon: 13.6681 },
            { ref: "P2", lat: 37.2457, lon: 13.6686 },
            { ref: "P3", lat: 37.2455, lon: 13.6684 }
        ]
    }
};

function ensureGroundMapUI() {
    if (typeof map === 'undefined' || !map) return;

    if (!groundLayerGroup && typeof L !== 'undefined') {
        groundLayerGroup = L.layerGroup().addTo(map);
    }

    if (!document.getElementById('aptGroundBadge')) {
        const badge = document.createElement('div');
        badge.id = 'aptGroundBadge';
        badge.className = 'apt-ground-status-badge glass-panel';
        badge.innerHTML = '<span>🛫 GROUND MAP</span> <span id="aptGroundName" style="color:#00d2ff;">---</span>';
        document.body.appendChild(badge);
    }

    if (!document.getElementById('btnToggleGroundMap')) {
        const pillsGroup = document.querySelector('.top-pills-group');
        if (pillsGroup) {
            const btn = document.createElement('button');
            btn.id = 'btnToggleGroundMap';
            btn.className = 'top-btn active';
            btn.innerHTML = '🛫 <span>Taxi/Gate: ON</span>';
            btn.onclick = (e) => {
                if (e.shiftKey) {
                    groundMapEnabled = !groundMapEnabled;
                    btn.classList.toggle('active', groundMapEnabled);
                    btn.innerHTML = groundMapEnabled ? '🛫 <span>Taxi/Gate: ON</span>' : '🛫 <span>Taxi/Gate: OFF</span>';
                    if (!groundMapEnabled && groundLayerGroup) {
                        groundLayerGroup.clearLayers();
                        lastRenderedGroundKey = null;
                        const b = document.getElementById('aptGroundBadge');
                        if (b) b.style.display = 'none';
                    } else {
                        evaluateAirportGroundMap();
                    }
                    return;
                }
                zoomToClosestOrActiveAirport();
            };
            const navaidsBtn = document.getElementById('btnToggleNavaids');
            if (navaidsBtn && navaidsBtn.parentNode === pillsGroup) {
                pillsGroup.insertBefore(btn, navaidsBtn.nextSibling);
            } else {
                pillsGroup.appendChild(btn);
            }
        }
    }

    if (!map._groundMapHooked) {
        map._groundMapHooked = true;
        map.on('moveend zoomend', () => {
            evaluateAirportGroundMap();
        });
        setTimeout(evaluateAirportGroundMap, 600);
    }
}

function zoomToClosestOrActiveAirport() {
    if (typeof map === 'undefined' || !map) return;
    groundMapEnabled = true;
    const btn = document.getElementById('btnToggleGroundMap');
    if (btn) {
        btn.classList.add('active');
        btn.innerHTML = '🛫 <span>Taxi/Gate: ON</span>';
    }

    if (Array.isArray(flightPlan) && flightPlan.length > 0) {
        const dep = flightPlan[0];
        const arr = flightPlan[flightPlan.length - 1];
        const c = map.getCenter();
        const dDep = Math.hypot(c.lat - dep.lat, c.lng - dep.lon);
        const dArr = Math.hypot(c.lat - arr.lat, c.lng - arr.lon);
        const target = (dDep < 0.03 && arr) ? arr : dep;
        map.setView([target.lat, target.lon], 15, { animate: true });
        return;
    }

    if (map.getZoom() < 15) {
        map.setZoom(15);
    }
}

function findNearestAirportAtCenter(lat, lon) {
    for (const [icao, data] of Object.entries(CUSTOM_APT_LAYOUTS)) {
        if (Math.hypot(lat - data.lat, lon - data.lon) < 0.045) {
            return { icao, name: data.name, lat: data.lat, lon: data.lon, custom: data };
        }
    }
    return null;
}

function evaluateAirportGroundMap() {
    if (!groundMapEnabled || typeof map === 'undefined' || !map || !groundLayerGroup) return;

    const zoom = map.getZoom();
    const badge = document.getElementById('aptGroundBadge');
    const badgeName = document.getElementById('aptGroundName');

    if (zoom < 13.5) {
        if (lastRenderedGroundKey !== null) {
            groundLayerGroup.clearLayers();
            lastRenderedGroundKey = null;
        }
        if (badge) badge.style.display = 'none';
        return;
    }

    const center = map.getCenter();
    const nearApt = findNearestAirportAtCenter(center.lat, center.lng);

    if (!nearApt || !nearApt.custom) {
        if (lastRenderedGroundKey !== null) {
            groundLayerGroup.clearLayers();
            lastRenderedGroundKey = null;
        }
        if (badge) badge.style.display = 'none';
        return;
    }

    if (lastRenderedGroundKey === nearApt.icao) return;
    lastRenderedGroundKey = nearApt.icao;

    if (badge && badgeName) {
        badge.style.display = 'flex';
        badgeName.innerText = `${nearApt.icao} - ${nearApt.name || 'GROUND CHART'}`;
    }

    renderCustomAirportLayout(nearApt.custom);
}

function renderCustomAirportLayout(layout) {
    if (!groundLayerGroup || !layout) return;
    groundLayerGroup.clearLayers();

    (layout.aprons || []).forEach(poly => {
        L.polygon(poly, {
            color: '#475569',
            weight: 1,
            fillColor: '#1e293b',
            fillOpacity: 0.55,
            interactive: false
        }).addTo(groundLayerGroup);
    });

    (layout.taxiways || []).forEach(twy => {
        L.polyline(twy.coords, {
            color: '#f59e0b',
            weight: 4,
            opacity: 0.85
        }).addTo(groundLayerGroup);

        if (twy.ref && twy.coords.length >= 2) {
            const mid = twy.coords[Math.floor(twy.coords.length / 2)];
            L.marker(mid, {
                icon: L.divIcon({
                    className: 'apt-twy-label',
                    html: twy.ref,
                    iconSize: null
                }),
                interactive: false
            }).addTo(groundLayerGroup);
        }
    });

    (layout.runways || []).forEach(rwy => {
        const isGrass = rwy.surface === 'grass';
        L.polyline(rwy.coords, {
            color: isGrass ? '#15803d' : '#334155',
            weight: 14,
            opacity: 0.92,
            lineCap: 'butt'
        }).addTo(groundLayerGroup);

        L.polyline(rwy.coords, {
            color: isGrass ? '#86efac' : '#f8fafc',
            weight: 1.5,
            dashArray: '8, 8',
            opacity: 0.85
        }).addTo(groundLayerGroup);

        if (rwy.ref && rwy.coords.length >= 2) {
            const parts = rwy.ref.split('/');
            L.marker(rwy.coords[0], {
                icon: L.divIcon({ className: 'apt-rwy-thr-label', html: parts[0] || rwy.ref, iconSize: null }),
                interactive: false
            }).addTo(groundLayerGroup);
            if (parts[1]) {
                L.marker(rwy.coords[rwy.coords.length - 1], {
                    icon: L.divIcon({ className: 'apt-rwy-thr-label', html: parts[1], iconSize: null }),
                    interactive: false
                }).addTo(groundLayerGroup);
            }
        }
    });

    (layout.stands || []).forEach(st => {
        const m = L.marker([st.lat, st.lon], {
            icon: L.divIcon({
                className: 'apt-stand-marker',
                html: st.ref,
                iconSize: [24, 24]
            })
        }).addTo(groundLayerGroup);
        m.bindTooltip(`🅿️ Parcheggio / Stand <b>${st.ref}</b><br><span style="font-size:10px;color:#94a3b8;">Lat: ${st.lat.toFixed(5)} Lon: ${st.lon.toFixed(5)}</span>`, {
            direction: 'top',
            className: 'vnav-route-tooltip'
        });
    });
}

// --- 💨 WEATHER OVERLAY (VETTORI VENTO LUNGO LA ROTTA & METAR RAPIDI) ---
let weatherOverlayEnabled = (localStorage.getItem('aeroglass_wx_overlay') === 'true');
let weatherLayerGroup = null;

function ensureWeatherOverlayUI() {
    if (typeof map !== 'undefined' && map && !weatherLayerGroup && typeof L !== 'undefined') {
        weatherLayerGroup = L.layerGroup().addTo(map);
        map.on('moveend zoomend', () => {
            if (weatherOverlayEnabled) renderWeatherOverlay();
        });
    }

    if (!document.getElementById('btnToggleWeather')) {
        const pillsGroup = document.querySelector('.top-pills-group');
        if (pillsGroup) {
            const btn = document.createElement('button');
            btn.id = 'btnToggleWeather';
            btn.className = 'top-btn' + (weatherOverlayEnabled ? ' active' : '');
            btn.onclick = () => toggleWeatherOverlay();

            const gndBtn = document.getElementById('btnToggleGroundMap') || document.getElementById('btnToggleNavaids');
            if (gndBtn && gndBtn.parentNode === pillsGroup) {
                pillsGroup.insertBefore(btn, gndBtn.nextSibling);
            } else {
                pillsGroup.appendChild(btn);
            }
            updateWeatherOverlayButtonUI();
        }
    }
}

function updateWeatherOverlayButtonUI() {
    const btn = document.getElementById('btnToggleWeather');
    if (!btn) return;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    btn.classList.toggle('active', weatherOverlayEnabled);
    if (weatherOverlayEnabled) {
        btn.innerHTML = isEn ? '💨 <span>WX: ON</span>' : '💨 <span>Meteo: ON</span>';
    } else {
        btn.innerHTML = isEn ? '💨 <span>WX: OFF</span>' : '💨 <span>Meteo: OFF</span>';
    }
}

async function toggleWeatherOverlay(forceState) {
    weatherOverlayEnabled = (typeof forceState === 'boolean') ? forceState : !weatherOverlayEnabled;
    ensureWeatherOverlayUI();
    updateWeatherOverlayButtonUI();

    if (weatherOverlayEnabled) {
        renderWeatherOverlay();
    } else if (weatherLayerGroup) {
        weatherLayerGroup.clearLayers();
    }

    try { localStorage.setItem('aeroglass_wx_overlay', String(weatherOverlayEnabled)); } catch (e) {}
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try { await window.pywebview.api.save_setting('wx_overlay', String(weatherOverlayEnabled)); } catch (e) {}
    }
}

function computeBearingDeg(lat1, lon1, lat2, lon2) {
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;
    const dLon = (lon2 - lon1) * toRad;
    const y = Math.sin(dLon) * Math.cos(lat2 * toRad);
    const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
              Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos(dLon);
    return (Math.atan2(y, x) * toDeg + 360) % 360;
}

function parseMetarWindNumbers(metarStr) {
    if (!metarStr) return null;
    const m = metarStr.match(/\b(\d{3}|VRB)(\d{2,3})(?:G\d{2,3})?(KT|MPS)\b/);
    if (!m) return null;
    const dir = m[1] === 'VRB' ? 0 : parseInt(m[1], 10);
    let spd = parseInt(m[2], 10);
    if (m[3] === 'MPS') spd = Math.round(spd * 1.94384);
    return { dir, spd };
}

function getFlightCategoryFromMetar(metarStr) {
    if (!metarStr) return { cat: 'VFR', color: '#2ea043' };
    if (/\b(OVC|BKN|VV)00[0-4]\b/.test(metarStr) || /\b[01]\d{3}\b/.test(metarStr)) {
        return { cat: 'LIFR', color: '#e040fb' };
    }
    if (/\b(OVC|BKN|VV)00[5-9]\b/.test(metarStr) || /\b[234]\d{3}\b/.test(metarStr)) {
        return { cat: 'IFR', color: '#f85149' };
    }
    if (/\b(OVC|BKN)0[12]\d\b/.test(metarStr)) {
        return { cat: 'MVFR', color: '#00d2ff' };
    }
    return { cat: 'VFR', color: '#2ea043' };
}

function resolveWaypointWind(wp, idx, fpl) {
    if (wp.wind_dir !== undefined && wp.wind_spd !== undefined && (wp.wind_dir > 0 || wp.wind_spd > 0)) {
        return { dir: Number(wp.wind_dir), spd: Number(wp.wind_spd) };
    }
    const directWx = parseMetarWindNumbers(wp.metar);
    if (directWx) return directWx;

    const tel = window.lastTelemetry || {};
    if (tel.connected && tel.wind_dir !== null && tel.wind_dir !== undefined && tel.wind_spd !== null && tel.wind_spd !== undefined) {
        return { dir: Number(tel.wind_dir), spd: Number(tel.wind_spd) };
    }

    const depWx = fpl.length > 0 ? parseMetarWindNumbers(fpl[0].metar) : null;
    const arrWx = fpl.length > 1 ? parseMetarWindNumbers(fpl[fpl.length - 1].metar) : null;
    if (depWx && arrWx && fpl.length > 1) {
        const frac = idx / (fpl.length - 1);
        return {
            dir: Math.round((depWx.dir * (1 - frac) + arrWx.dir * frac) % 360),
            spd: Math.round(depWx.spd * (1 - frac) + arrWx.spd * frac)
        };
    }
    return depWx || arrWx || { dir: 270, spd: 12 };
}

function renderWeatherOverlay() {
    if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;
    if (!weatherLayerGroup) weatherLayerGroup = L.layerGroup().addTo(map);
    weatherLayerGroup.clearLayers();
    if (!weatherOverlayEnabled) return;

    const fpl = Array.isArray(flightPlan) ? flightPlan : [];
    const shownApts = new Set();

    // 1. Etichette Vettori Vento lungo la rotta (con indicazione Headwind / Tailwind)
    if (fpl.length >= 2) {
        const step = fpl.length > 8 ? 2 : 1;
        for (let i = 0; i < fpl.length; i++) {
            const isEndpoint = (i === 0 || i === fpl.length - 1);
            if (!isEndpoint && (i % step !== 0)) continue;

            const wp = fpl[i];
            if (wp.lat === undefined || wp.lon === undefined) continue;

            const wind = resolveWaypointWind(wp, i, fpl);
            const nextWp = i < fpl.length - 1 ? fpl[i + 1] : fpl[i];
            const prevWp = i > 0 ? fpl[i - 1] : fpl[0];
            const trackDeg = computeBearingDeg(prevWp.lat, prevWp.lon, nextWp.lat, nextWp.lon);

            // Componente lungo la rotta: > 0 vento contrario (Headwind), < 0 vento in coda (Tailwind)
            const relRad = ((wind.dir - trackDeg) * Math.PI) / 180;
            const headComp = Math.round(wind.spd * Math.cos(relRad));

            let compClass = '';
            let compLabel = '';
            if (headComp >= 5) {
                compClass = 'headwind';
                compLabel = `HW ${headComp}kt`;
            } else if (headComp <= -5) {
                compClass = 'tailwind';
                compLabel = `TW +${Math.abs(headComp)}kt`;
            } else {
                compLabel = `XW ${Math.abs(Math.round(wind.spd * Math.sin(relRad)))}kt`;
            }

            // Il vento proviene da wind.dir, quindi la freccia del flusso punta a (wind.dir + 180)
            const flowDeg = (wind.dir + 180) % 360;
            const dirStr = String(wind.dir).padStart(3, '0');

            const m = L.marker([wp.lat, wp.lon], {
                icon: L.divIcon({
                    className: '',
                    html: `
                        <div class="wx-wind-badge ${compClass}">
                            <span class="wx-wind-arrow" style="transform:rotate(${flowDeg}deg);">↑</span>
                            <span>${dirStr}°/${wind.spd}kt</span>
                            <span style="opacity:0.8;font-size:9px;">(${compLabel})</span>
                        </div>
                    `,
                    iconSize: null
                }),
                zIndexOffset: 650
            }).addTo(weatherLayerGroup);

            const ident = wp.ident || wp.icao || 'WPT';
            if (isEndpoint && ident.length === 4) {
                m.on('click', () => openQuickMetarPopup(ident, wp.lat, wp.lon, wp.name, wp.metar));
                shownApts.add(ident);
            }
        }
    }

    // 2. Pillole cliccabili METAR sugli aeroporti visibili nell'inquadratura mappa
    const bounds = map.getBounds();
    const allApts = Array.isArray(airportsData) ? airportsData : [];
    let aptCount = 0;

    for (const apt of allApts) {
        if (!apt.icao || shownApts.has(apt.icao)) continue;
        if (!bounds.contains([apt.lat, apt.lon])) continue;

        shownApts.add(apt.icao);
        const catInfo = getFlightCategoryFromMetar(apt.metar || '');
        const wxParsed = typeof parseMetarInfo === 'function' ? parseMetarInfo(apt.metar || '') : null;
        const windShort = wxParsed && wxParsed.wind !== '---' ? wxParsed.wind : 'METAR';

        const pillMarker = L.marker([apt.lat, apt.lon], {
            icon: L.divIcon({
                className: '',
                html: `
                    <div class="wx-apt-pill">
                        <span class="wx-cat-dot" style="background:${catInfo.color};box-shadow:0 0 6px ${catInfo.color};"></span>
                        <span>${apt.icao}</span>
                        <span style="color:#94a3b8;font-weight:600;">${windShort}</span>
                    </div>
                `,
                iconSize: null
            }),
            zIndexOffset: 600
        }).addTo(weatherLayerGroup);

        pillMarker.on('click', () => openQuickMetarPopup(apt.icao, apt.lat, apt.lon, apt.name, apt.metar));

        aptCount++;
        if (aptCount >= 30) break;
    }
}

async function openQuickMetarPopup(icao, lat, lon, fallbackName, cachedMetar) {
    if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;

    const popup = L.popup({
        className: 'wx-metar-glass-popup',
        closeButton: true,
        maxWidth: 290,
        offset: [0, -6]
    })
    .setLatLng([lat, lon])
    .setContent(`<div style="color:#38bdf8;font-weight:700;">⏳ ${icao} - Caricamento METAR live...</div>`)
    .openOn(map);

    let metarRaw = cachedMetar || '';
    let aptName = fallbackName || icao;
    let elevFt = null;

    if (window.pywebview && window.pywebview.api && window.pywebview.api.resolve_icao) {
        try {
            const res = await window.pywebview.api.resolve_icao(icao);
            if (res && res.success) {
                if (res.metar) metarRaw = res.metar;
                if (res.name) aptName = res.name;
                if (res.elev !== undefined) elevFt = res.elev;
                const localApt = Array.isArray(airportsData) ? airportsData.find(a => a.icao === icao) : null;
                if (localApt && res.metar) localApt.metar = res.metar;
            }
        } catch (e) {}
    }

    const catInfo = getFlightCategoryFromMetar(metarRaw);
    const parsed = (typeof parseMetarInfo === 'function' && metarRaw) ? parseMetarInfo(metarRaw) : null;

    const windTxt = parsed ? parsed.wind : '---';
    const tempTxt = parsed ? parsed.temp : '---';
    const qnhTxt = parsed ? parsed.qnh : '---';
    const elevTxt = elevFt !== null ? ` | ELEV: ${elevFt} ft` : '';

    popup.setContent(`
        <div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(148,163,184,0.2);padding-bottom:5px;margin-bottom:6px;">
                <div>
                    <strong style="color:#00d2ff;font-size:12.5px;">✈️ ${icao}</strong>
                    <div style="color:#94a3b8;font-size:10px;">${aptName}${elevTxt}</div>
                </div>
                <span style="background:${catInfo.color}22;border:1px solid ${catInfo.color};color:${catInfo.color};padding:1px 6px;border-radius:4px;font-size:10px;font-weight:800;">
                    ${catInfo.cat}
                </span>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:7px;flex-wrap:wrap;">
                <span class="wx-pill">💨 ${windTxt}</span>
                <span class="wx-pill">🌡️ ${tempTxt}</span>
                <span class="wx-pill">⏲️ ${qnhTxt}</span>
            </div>
            <div style="background:rgba(9,13,19,0.85);border:1px solid rgba(148,163,184,0.2);border-radius:5px;padding:6px;color:#e2e8f0;font-size:10.5px;word-break:break-word;">
                ${metarRaw || 'Nessun bollettino METAR attivo per questo scalo.'}
            </div>
        </div>
    `);
}

// --- ☁️ LAYER COPERTURA NUVOLOSA ALLA QUOTA AEREO & SELETTORE VNAV ---
let cloudAltMode = localStorage.getItem('aeroglass_cloud_mode') || 'off'; // 'off' | 'auto' | '5000' | '10000' | '20000' | '30000'
let cloudLayerGroup = null;
let lastRenderedCloudAlt = null;

function ensureVnavCloudControls() {
    const header = document.querySelector('#elevationDrawer .elevation-header') || document.querySelector('.elevation-header');
    if (!header || document.getElementById('vnavCloudSelector')) return;

    const spacer = header.querySelector('.elevation-header-spacer');
    const container = document.createElement('div');
    container.id = 'vnavCloudSelector';
    container.className = 'vnav-cloud-controls';
    // Impedisce che il click sui pulsanti di quota chiuda/apra per errore il cassetto VNAV
    container.addEventListener('click', (e) => e.stopPropagation());

    container.innerHTML = `
        <span class="vnav-cloud-lbl" id="vnavCloudLbl">☁️ CLOUDS:</span>
        <button class="vnav-fl-btn" data-mode="off" onclick="setCloudAltitudeMode('off')">OFF</button>
        <button class="vnav-fl-btn" data-mode="auto" id="btnCloudAuto" onclick="setCloudAltitudeMode('auto')">AUTO (ACFT)</button>
        <button class="vnav-fl-btn" data-mode="5000" onclick="setCloudAltitudeMode('5000')">FL050</button>
        <button class="vnav-fl-btn" data-mode="10000" onclick="setCloudAltitudeMode('10000')">FL100</button>
        <button class="vnav-fl-btn" data-mode="20000" onclick="setCloudAltitudeMode('20000')">FL200</button>
        <button class="vnav-fl-btn" data-mode="30000" onclick="setCloudAltitudeMode('30000')">FL300</button>
    `;

    if (spacer) {
        spacer.replaceWith(container);
    } else {
        header.appendChild(container);
    }

    if (typeof map !== 'undefined' && map && !cloudLayerGroup && typeof L !== 'undefined') {
        cloudLayerGroup = L.layerGroup().addTo(map);
        map.on('moveend zoomend', () => {
            if (cloudAltMode !== 'off') renderCloudCoverageLayer(true);
        });
    }

    updateVnavCloudButtonsUI();
    if (cloudAltMode !== 'off') setTimeout(() => renderCloudCoverageLayer(true), 400);
}

function getTargetCloudAltitudeFt() {
    if (cloudAltMode === 'off') return null;
    if (cloudAltMode === 'auto') {
        const tel = window.lastTelemetry || {};
        if (tel.alt_ft) {
            const parsed = parseInt(String(tel.alt_ft).replace(/[^\d-]/g, ''), 10);
            if (!isNaN(parsed)) return Math.max(0, parsed);
        }
        const domAlt = document.getElementById('valAlt');
        if (domAlt) {
            const parsed = parseInt(domAlt.innerText.replace(/[^\d-]/g, ''), 10);
            if (!isNaN(parsed)) return Math.max(0, parsed);
        }
        return 5000;
    }
    return parseInt(cloudAltMode, 10) || 5000;
}

function updateVnavCloudButtonsUI() {
    const box = document.getElementById('vnavCloudSelector');
    if (!box) return;
    const targetAlt = getTargetCloudAltitudeFt();
    const tel = window.lastTelemetry || {};

    box.querySelectorAll('.vnav-fl-btn').forEach(btn => {
        const m = btn.getAttribute('data-mode');
        btn.classList.toggle('active', m === cloudAltMode);
        if (m === 'auto') {
            const flStr = targetAlt !== null ? `${Math.round(targetAlt / 100) * 100}ft` : 'ACFT';
            if (cloudAltMode === 'auto' && tel.in_cloud) {
                btn.innerHTML = `☁️ IMC (${flStr})`;
                btn.classList.add('imc-alert');
            } else {
                btn.innerHTML = cloudAltMode === 'auto' ? `AUTO (${flStr})` : 'AUTO (ACFT)';
                btn.classList.remove('imc-alert');
            }
        }
    });

    updateVnavCloudLevelLine(targetAlt);
}

async function setCloudAltitudeMode(mode) {
    cloudAltMode = String(mode);
    try { localStorage.setItem('aeroglass_cloud_mode', cloudAltMode); } catch (e) {}
    updateVnavCloudButtonsUI();
    renderCloudCoverageLayer(true);

    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try { await window.pywebview.api.save_setting('cloud_alt_mode', cloudAltMode); } catch (e) {}
    }
}

function parseMetarCloudLayers(metarStr, stationElevFt = 0) {
    if (!metarStr) return [];
    const layers = [];
    const regex = /\b(FEW|SCT|BKN|OVC|VV)(\d{3})\b/g;
    let match;
    while ((match = regex.exec(metarStr)) !== null) {
        const amount = match[1];
        const baseAgl = parseInt(match[2], 10) * 100;
        const baseMsl = baseAgl + (Number(stationElevFt) || 0);
        let thickness = 2500;
        let opacity = 0.18;
        let color = '#94a3b8';

        if (amount === 'FEW') { thickness = 2000; opacity = 0.14; color = '#cbd5e1'; }
        else if (amount === 'SCT') { thickness = 3000; opacity = 0.24; color = '#94a3b8'; }
        else if (amount === 'BKN') { thickness = 4500; opacity = 0.36; color = '#64748b'; }
        else if (amount === 'OVC' || amount === 'VV') { thickness = 6000; opacity = 0.48; color = '#475569'; }

        layers.push({
            amount,
            baseFt: baseMsl,
            topFt: baseMsl + thickness,
            opacity,
            color
        });
    }

    // Stima cirri/strati in alta quota (FL180-FL340) se sono presenti sistemi frontali (BKN/OVC o QNH basso)
    if (/\b(BKN|OVC)\d{3}\b/.test(metarStr) || /\bQ(09\d\d|100\d|101[0-2])\b/.test(metarStr)) {
        layers.push({
            amount: 'SCT-HI',
            baseFt: 18000,
            topFt: 33000,
            opacity: 0.22,
            color: '#38bdf8'
        });
    }
    return layers;
}

function renderCloudCoverageLayer(force = false) {
    if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;
    if (!cloudLayerGroup) cloudLayerGroup = L.layerGroup().addTo(map);

    if (cloudAltMode === 'off') {
        cloudLayerGroup.clearLayers();
        lastRenderedCloudAlt = null;
        updateVnavCloudLevelLine(null);
        return;
    }

    const targetAlt = getTargetCloudAltitudeFt();
    if (!force && lastRenderedCloudAlt !== null && Math.abs(targetAlt - lastRenderedCloudAlt) < 350) {
        return;
    }
    lastRenderedCloudAlt = targetAlt;
    cloudLayerGroup.clearLayers();
    updateVnavCloudButtonsUI();

    const bandHalfWidth = 3500; // ±3.500 ft intorno alla quota selezionata o quota aereo
    const allSources = [];
    const seenIcao = new Set();

    if (Array.isArray(flightPlan)) {
        flightPlan.forEach(wp => {
            const id = wp.ident || wp.icao;
            if (wp.metar && id && !seenIcao.has(id)) {
                seenIcao.add(id);
                allSources.push({ icao: id, lat: wp.lat, lon: wp.lon, elev: wp.alt_ft || 0, metar: wp.metar });
            }
        });
    }

    if (Array.isArray(airportsData)) {
        airportsData.forEach(apt => {
            if (apt.metar && apt.icao && !seenIcao.has(apt.icao)) {
                seenIcao.add(apt.icao);
                allSources.push({ icao: apt.icao, lat: apt.lat, lon: apt.lon, elev: apt.elev || 0, metar: apt.metar });
            }
        });
    }

    const bounds = map.getBounds().pad(0.35);

    allSources.forEach(src => {
        if (!bounds.contains([src.lat, src.lon])) return;
        const layers = parseMetarCloudLayers(src.metar, src.elev);

        // Cerca lo strato nuvoloso attivo nella fascia di quota selezionata
        const matching = layers.filter(l => (targetAlt + bandHalfWidth) >= l.baseFt && (targetAlt - bandHalfWidth) <= l.topFt);
        if (matching.length === 0) return;

        // Prende lo strato più denso a quella quota
        const activeLayer = matching.reduce((prev, curr) => (curr.opacity > prev.opacity ? curr : prev), matching[0]);

        // Raggio cella nuvolosa (in metri) proporzionale alla densità
        const radiusMeters = activeLayer.opacity > 0.3 ? 34000 : 24000;

        L.circle([src.lat, src.lon], {
            radius: radiusMeters,
            color: activeLayer.color,
            weight: 1,
            opacity: activeLayer.opacity * 0.7,
            fillColor: activeLayer.color,
            fillOpacity: activeLayer.opacity,
            className: 'cloud-cell-svg',
            interactive: false
        }).addTo(cloudLayerGroup);

        const flBase = String(Math.round(activeLayer.baseFt / 100)).padStart(3, '0');
        const flTop = String(Math.round(activeLayer.topFt / 100)).padStart(3, '0');

        L.marker([src.lat, src.lon], {
            icon: L.divIcon({
                className: '',
                html: `<div class="cloud-cell-tag">☁️ ${src.icao} ${activeLayer.amount} FL${flBase}-FL${flTop}</div>`,
                iconSize: null
            }),
            interactive: false,
            zIndexOffset: 300
        }).addTo(cloudLayerGroup);
    });
}

function updateVnavCloudLevelLine(targetAltFt) {
    const svg = document.getElementById('vnavSvg');
    if (!svg) return;

    let line = document.getElementById('vnavCloudAltLine');
    let label = document.getElementById('vnavCloudAltLabel');

    if (targetAltFt === null || cloudAltMode === 'off') {
        if (line) line.style.display = 'none';
        if (label) label.style.display = 'none';
        return;
    }

    // Calcola il tetto massimo del grafico VNAV corrente (default almeno 12.000 ft)
    let maxAlt = 12000;
    if (Array.isArray(flightPlan) && flightPlan.length > 0) {
        const fplMax = Math.max(...flightPlan.map(w => Number(w.alt_ft) || 0));
        maxAlt = Math.max(10000, Math.ceil((fplMax * 1.15) / 1000) * 1000);
    }
    if (targetAltFt > maxAlt) maxAlt = Math.ceil((targetAltFt * 1.1) / 1000) * 1000;

    // Coordinate SVG standard di vnavSvg (viewBox 0 0 1000 100)
    const yRatio = 1 - Math.min(1, Math.max(0, targetAltFt / maxAlt));
    const yPos = Math.round(10 + yRatio * 75);

    if (!line) {
        line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.id = 'vnavCloudAltLine';
        line.setAttribute('x1', '0');
        line.setAttribute('x2', '1000');
        line.setAttribute('stroke', '#38bdf8');
        line.setAttribute('stroke-width', '1.3');
        line.setAttribute('stroke-dasharray', '5, 5');
        line.setAttribute('opacity', '0.75');
        svg.appendChild(line);
    }

    if (!label) {
        label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.id = 'vnavCloudAltLabel';
        label.setAttribute('x', '992');
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('fill', '#38bdf8');
        label.setAttribute('font-size', '9.5');
        label.setAttribute('font-family', 'Consolas, monospace');
        label.setAttribute('font-weight', 'bold');
        svg.appendChild(label);
    }

    line.setAttribute('y1', String(yPos));
    line.setAttribute('y2', String(yPos));
    line.style.display = 'block';

    label.setAttribute('y', String(Math.max(11, yPos - 3)));
    label.textContent = `☁️ CLOUD SCAN: ${targetAltFt.toLocaleString()} FT`;
    label.style.display = 'block';
}

// --- HOOKS DI COLLEGAMENTO UI (VNAV ToD, NAVLOG, TOUCH) ---
function installTodAndTouchHooks() {
    if (window._todHooksInstalled) return;
    window._todHooksInstalled = true;

    if (typeof ensureNavlogAndFuelUI === 'function') ensureNavlogAndFuelUI();
    ensureDrawerToggleTab();
    ensureVnavCloudControls();
    ensureCompassRoseWidget();
    ensureTooltipToggleButton();
    initSyntheticTooltipsEngine();
    if (typeof initDemoKeyboardShortcuts === 'function') initDemoKeyboardShortcuts();

    if (typeof window.updateFlightPlanUI === 'function') {
        const origUpdateFpl = window.updateFlightPlanUI;
        window.updateFlightPlanUI = function(...args) {
            const res = origUpdateFpl.apply(this, args);
            setTimeout(() => {
                if (typeof updateTopOfDescentOverlay === 'function') updateTopOfDescentOverlay();
                if (typeof recalculateFuelAndPerfUI === 'function') recalculateFuelAndPerfUI();
                if (weatherOverlayEnabled && typeof renderWeatherOverlay === 'function') renderWeatherOverlay();
                const nlModal = document.getElementById('navlogModal');
                if (nlModal && nlModal.style.display === 'flex' && typeof renderNavlogTable === 'function') {
                    renderNavlogTable();
                }
            }, 40);
            return res;
        };
    }

    if (typeof window.renderVnavChart === 'function') {
        const origRenderVnav = window.renderVnavChart;
        window.renderVnavChart = function(...args) {
            const res = origRenderVnav.apply(this, args);
            setTimeout(() => {
                if (typeof updateTopOfDescentOverlay === 'function') updateTopOfDescentOverlay();
                if (typeof updateVnavCloudLevelLine === 'function') updateVnavCloudLevelLine(getTargetCloudAltitudeFt());
            }, 40);
            return res;
        };
    }

    if (typeof initTouchRubberBanding === 'function') initTouchRubberBanding();
    if (typeof updateTopOfDescentOverlay === 'function') setTimeout(updateTopOfDescentOverlay, 150);
}

// --- GESTIONE SIDEBAR FPL, CASSETTO VNAV E LINGUA ---
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
    const sidebar = document.getElementById('sidebarPanel');
    if (!drawer) return;

    drawerOpen = !drawerOpen;
    drawer.classList.toggle('collapsed', !drawerOpen);

    if (drawerOpen) {
        drawer.style.setProperty('height', '108px', 'important');
        const canvasBox = drawer.querySelector('.elevation-canvas-container');
        if (canvasBox) canvasBox.style.display = '';
    } else {
        drawer.style.setProperty('height', '32px', 'important');
        const canvasBox = drawer.querySelector('.elevation-canvas-container');
        if (canvasBox) canvasBox.style.display = 'none';
    }

    if (arrow) arrow.innerText = drawerOpen ? '▼' : '▲';
    if (infoBar) infoBar.style.bottom = drawerOpen ? '134px' : '56px';
    if (sidebar) sidebar.style.bottom = drawerOpen ? '134px' : '56px';
}

function applyTranslations() {
    if (typeof translations === 'undefined') return;
    const t = translations[currentLang];
    if (!t) return;

    const langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.innerText = currentLang.toUpperCase();

    const omniSearch = document.getElementById('omniSearch');
    if (omniSearch) omniSearch.placeholder = t.searchPlaceholder || '';

    const fplTitle = document.getElementById('fplSectionTitle');
    if (fplTitle) fplTitle.innerText = (t.activeFpl || '').toUpperCase();

    const lblFilters = document.getElementById('lblFilters');
    if (lblFilters) lblFilters.innerText = t.btnFilters || '';

    const lblReduce = document.getElementById('lblReduceExpand');
    if (lblReduce) lblReduce.innerText = t.btnReduce || '';

    const btnNavaids = document.getElementById('btnToggleNavaids');
    if (btnNavaids) btnNavaids.innerText = (typeof showNavaids !== 'undefined' && showNavaids) ? (t.btnNavaids || '') : (t.btnNavaidsOff || '');

    if (typeof setFollowState === 'function' && typeof followState !== 'undefined') {
        setFollowState(followState);
    }
    updateThemeButtonUI();
    updateTooltipButtonUI();

    const vnavText = document.getElementById('vnavText');
    if (vnavText && (!window.flightPlan || window.flightPlan.length === 0)) {
        vnavText.innerText = (t.noFpl || '').toUpperCase();
    }
}

function toggleLanguage() {
    currentLang = (currentLang === 'it') ? 'en' : 'it';
    applyTranslations();
}

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
        sidebar.style.width = `${Math.max(260, Math.min(520, e.clientX - 16))}px`;
    });
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
        }
    });
}

function initDragAndDropPln() {
    const overlay = document.getElementById('dropZoneOverlay');
    if (!overlay) return;

    window.addEventListener('dragover', (e) => { e.preventDefault(); overlay.style.display = 'flex'; });
    overlay.addEventListener('dragleave', (e) => { e.preventDefault(); overlay.style.display = 'none'; });
    overlay.addEventListener('drop', (e) => {
        e.preventDefault();
        overlay.style.display = 'none';
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                if (ev.target?.result && typeof processAndRenderPlnXml === 'function') {
                    await processAndRenderPlnXml(ev.target.result);
                }
            };
            reader.readAsText(files[0]);
        }
    });
}

// --- INIZIALIZZAZIONE APPLICAZIONE E DATI PYWEBVIEW / EFB ---
let _telemetryBusy = false;
let _efbBadgeRetries = 0;

async function initAeroGlassApp() {
    installTodAndTouchHooks();
    applyThemeMode(currentThemeMode, false);
    applyTooltipsMode(tooltipsEnabled, false);

    if (!window.pywebview || !window.pywebview.api || typeof window.pywebview.api.get_initial_data !== 'function') return;
    if (initialized) return;
    initialized = true;

    if (typeof updateFlightInfoBar === 'function') updateFlightInfoBar(43.5, 12.0);
    if (typeof setFollowState === 'function') setFollowState(followState);
    if (typeof renderNavAids === 'function') renderNavAids(vorsData, ilsData);
    if (typeof updateMapScale === 'function') updateMapScale();

    try {
        if (window.pywebview.api.get_setting) {
            const themeRes = await window.pywebview.api.get_setting('theme_mode');
            if (themeRes && themeRes.success && themeRes.value) await applyThemeMode(themeRes.value, false);

            const tipRes = await window.pywebview.api.get_setting('show_tooltips');
            if (tipRes && tipRes.success && tipRes.value !== null && tipRes.value !== undefined) {
                await applyTooltipsMode(tipRes.value !== 'false', false);
            }

            const uiRes = await window.pywebview.api.get_setting('ui_mode');
            if (uiRes && uiRes.success && uiRes.value) {
                await applyUIMode(uiRes.value, false);
            }

            const fpRes = await window.pywebview.api.get_setting('fuel_perf_config');
            if (fpRes && fpRes.success && fpRes.value) {
                try { fuelPerfConfig = { ...fuelPerfConfig, ...JSON.parse(fpRes.value) }; } catch (e) {}
            }

            const wxRes = await window.pywebview.api.get_setting('wx_overlay');
            if (wxRes && wxRes.success && wxRes.value !== null && wxRes.value !== undefined) {
                weatherOverlayEnabled = (wxRes.value === 'true');
                updateWeatherOverlayButtonUI();
            }
        }

        const initData = await window.pywebview.api.get_initial_data();
        if (initData) {
            if (initData.fpl_ts) window._lastFplTs = initData.fpl_ts;
            if (initData.efb_info && typeof updateEfbTopBarBadge === 'function') updateEfbTopBarBadge(initData.efb_info);
            else if (typeof refreshEfbBadgeFromBackend === 'function') await refreshEfbBadgeFromBackend();

            if (initData.airports && initData.airports.length > 0) airportsData = [...initData.airports, ...EXTRA_AIRPORTS];
            if (initData.vors && initData.vors.length > 0) vorsData = initData.vors;
            if (initData.ils && initData.ils.length > 0) ilsData = initData.ils;

            if (initData.simbrief_id) {
                const sbInput = document.getElementById('simbriefIdInput');
                if (sbInput) sbInput.value = initData.simbrief_id;
                if (typeof setSimbriefCompactMode === 'function') setSimbriefCompactMode(true);
            }
            if (initData.flight_plan && Array.isArray(initData.flight_plan) && initData.flight_plan.length > 0) {
                flightPlan = initData.flight_plan;
                currentAlternate = initData.alternate || null;
                if (typeof updateFlightPlanUI === 'function') updateFlightPlanUI(currentAlternate, true);
            }
            if (typeof renderNavAids === 'function') renderNavAids(vorsData, ilsData);
        }
        if (typeof loadUserWaypoints === 'function') await loadUserWaypoints();
        ensureGroundMapUI();
        ensureWeatherOverlayUI();
        if (weatherOverlayEnabled) renderWeatherOverlay();
    } catch (e) {}

    if (typeof updateTopOfDescentOverlay === 'function') setTimeout(updateTopOfDescentOverlay, 250);

    if (!window._aeroLoopsStarted) {
        window._aeroLoopsStarted = true;

        // Semaforo _telemetryBusy: impedisce l'accumulo di chiamate IPC se MSFS 2024 è impegnato in un caricamento
        setInterval(async () => {
            if (!window._demoTourActive && typeof pollTelemetry === 'function' && !_telemetryBusy) {
                _telemetryBusy = true;
                try {
                    await pollTelemetry();
                } catch (e) {
                } finally {
                    _telemetryBusy = false;
                }
            }
            if (typeof updateTodHeaderStatus === 'function') updateTodHeaderStatus();
            if (cloudAltMode === 'auto' && typeof renderCloudCoverageLayer === 'function') {
                renderCloudCoverageLayer(false);
                updateVnavCloudButtonsUI();
            }
        }, 1000);

        const efbTimer = setInterval(() => {
            const lbl = document.getElementById('lblEfbNet');
            if (lbl && lbl.innerText.includes('...') && typeof refreshEfbBadgeFromBackend === 'function' && _efbBadgeRetries < 6) {
                _efbBadgeRetries++;
                refreshEfbBadgeFromBackend();
            } else {
                clearInterval(efbTimer);
            }
        }, 1500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initSidebarResizer();
    initDragAndDropPln();
    installTodAndTouchHooks();
    applyThemeMode(currentThemeMode, false);
    applyTooltipsMode(tooltipsEnabled, false);
    if (typeof updateFlightInfoBar === 'function') updateFlightInfoBar(43.5, 12.0);
    if (typeof setFollowState === 'function') setFollowState(followState);
    if (typeof renderNavAids === 'function') renderNavAids(vorsData, ilsData);
    ensureGroundMapUI();
    if (typeof updateMapScale === 'function') updateMapScale();

    window.addEventListener('click', (event) => {
        if (event.target.id === 'createFplModal' && typeof closeCreateFplModal === 'function') closeCreateFplModal();
        else if (event.target.id === 'flightHistoryModal' && typeof closeFlightHistoryModal === 'function') closeFlightHistoryModal();
        else if (event.target.id === 'efbNetworkModal' && typeof closeEfbNetworkModal === 'function') closeEfbNetworkModal();
        else if (event.target.id === 'navlogModal' && typeof closeNavlogModal === 'function') closeNavlogModal();
        else if (event.target.id === 'fuelPerfModal' && typeof closeFuelPerfModal === 'function') closeFuelPerfModal();
    });

    if (window.pywebview && window.pywebview.api) {
        initAeroGlassApp();
    }
});

window.addEventListener('pywebviewready', initAeroGlassApp);