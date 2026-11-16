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
    },
    btnToggleNetwork: {
        it: "🌐 Traffico Online: Mostra/nascondi i piloti di VATSIM / IVAO in volo nelle vicinanze",
        en: "🌐 Online Traffic: Show or hide nearby VATSIM / IVAO pilots on map"
    },
    btnToggleScratchpad: {
        it: "📝 Scratchpad EFB: Blocco note ATC (Squawk, QNH, FL), disegno a mano libera e frequenze rapide",
        en: "📝 EFB Scratchpad: ATC clearance pad (Squawk, QNH, FL), freehand draw canvas and common frequencies"
    },
    btnToggleMeasure: {
        it: "📏 Righello Tattico: Misura distanza (NM), prua (MAG/TRUE) e tempo ETE tra due punti (oppure usa il Clic Destro sulla mappa)",
        en: "📏 Measure Tool: Measure distance (NM), heading (MAG/TRUE) and ETE between two points (or Right-Click on map)"
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
    ensureWorldAirportsLayerUI();
    ensureWeatherOverlayUI();
    ensureNetworkOverlayUI();
    ensureScratchpadUI();
    ensureMeasureToolUI();
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

// --- 🔍 RICERCA RAPIDA AEROPORTO & CENTRATURA MAPPA ---
async function searchAndCenterAirport(query) {
    const q = (query || '').trim().toUpperCase();
    if (!q) return;

    let found = (typeof airportsData !== 'undefined' ? airportsData : []).find(a => a.icao === q || (a.name && a.name.toUpperCase().includes(q)));
    
    if (found && found.lat !== undefined && found.lon !== undefined) {
        if (typeof map !== 'undefined' && map) {
            map.setView([found.lat, found.lon], 13, { animate: true });
            if (typeof openQuickMetarPopup === 'function') {
                openQuickMetarPopup(found.icao, found.lat, found.lon, found.name, found.metar || '');
            }
        }
        return;
    }

    if (window.pywebview && window.pywebview.api) {
        try {
            if (q.length >= 3 && window.pywebview.api.resolve_icao) {
                const res = await window.pywebview.api.resolve_icao(q);
                if (res && res.success && res.lat !== undefined && res.lon !== undefined) {
                    if (typeof map !== 'undefined' && map) {
                        map.setView([res.lat, res.lon], 13, { animate: true });
                        if (typeof openQuickMetarPopup === 'function') {
                            openQuickMetarPopup(res.icao, res.lat, res.lon, res.name, res.metar || '');
                        }
                    }
                    return;
                }
            }
            if (window.pywebview.api.search_world_airports) {
                const searchRes = await window.pywebview.api.search_world_airports(q);
                if (searchRes && searchRes.success && Array.isArray(searchRes.results) && searchRes.results.length > 0) {
                    const apt = searchRes.results[0];
                    if (apt.lat !== undefined && apt.lon !== undefined && typeof map !== 'undefined' && map) {
                        map.setView([apt.lat, apt.lon], 13, { animate: true });
                        if (typeof openQuickMetarPopup === 'function') {
                            openQuickMetarPopup(apt.icao, apt.lat, apt.lon, apt.name, '');
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Errore ricerca aeroporto:", e);
        }
    }
}

// --- 🛫 MOTORE MAPPA INTERNA AEROPORTI LOCALE (TAXIWAYS, RUNWAYS & PARCHEGGI) ---
let groundMapEnabled = true;
let groundLayerGroup = null;
let lastRenderedGroundKey = null;

const CUSTOM_APT_LAYOUTS = {
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
    // Cerca tra gli aeroporti caricati in memoria nell'area circostante
    if (typeof airportsData !== 'undefined' && Array.isArray(airportsData)) {
        let closest = null;
        let minDist = 0.05; // ~3 miglia nautiche
        for (const apt of airportsData) {
            if (!apt.icao || apt.lat === undefined || apt.lon === undefined) continue;
            const dist = Math.hypot(lat - apt.lat, lon - apt.lon);
            if (dist < minDist) {
                minDist = dist;
                closest = { icao: apt.icao, name: apt.name || apt.icao, lat: apt.lat, lon: apt.lon, custom: null };
            }
        }
        if (closest) return closest;
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

    if (!nearApt) {
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

    if (nearApt.custom) {
        renderCustomAirportLayout(nearApt.custom);
    } else {
        // Genera automaticamente il layout interrogando il database SQLite in tempo reale
        if (window.pywebview && window.pywebview.api && window.pywebview.api.get_airport_ground_layout) {
            window.pywebview.api.get_airport_ground_layout(nearApt.icao).then(res => {
                if (res && res.success && res.layout) {
                    renderCustomAirportLayout(res.layout);
                } else {
                    if (groundLayerGroup) groundLayerGroup.clearLayers();
                }
            }).catch(() => {
                if (groundLayerGroup) groundLayerGroup.clearLayers();
            });
        }
    }
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

// --- 🌍 LAYER AEROPORTI MONDIALI DINAMICI (BOUNDING BOX + RITENZIONE IN VISTA) ---
let worldAirportsLayerGroup = null;
const _renderedWorldAirports = new Map(); // icao -> { marker, data }
let _worldAptFetchTimer = null;

function ensureWorldAirportsLayerUI() {
    if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;

    if (!worldAirportsLayerGroup) {
        worldAirportsLayerGroup = L.layerGroup().addTo(map);
    }

    if (!map._worldAirportsHooked) {
        map._worldAirportsHooked = true;
        map.on('moveend zoomend', () => {
            scheduleWorldAirportsUpdate();
        });
        setTimeout(scheduleWorldAirportsUpdate, 450);
    }
}

function scheduleWorldAirportsUpdate() {
    if (_worldAptFetchTimer) clearTimeout(_worldAptFetchTimer);
    _worldAptFetchTimer = setTimeout(() => {
        fetchAndRenderWorldAirportsInView();
    }, 180);
}

function shouldShowWorldAirportAtZoom(apt, zoom, fplSet) {
    if (!apt || !apt.icao) return false;
    if (fplSet.has(apt.icao) || CUSTOM_APT_LAYOUTS[apt.icao]) return true;

    // I codici locali OurAirports col trattino (es. AT-0084, FR-0123) compaiono solo a zoom molto alto (>= 11)
    if (apt.icao.includes('-') && zoom < 11) return false;

    if (apt.type === 'large_airport') return true;
    if (apt.type === 'medium_airport') return zoom >= 6.5;
    if (apt.type === 'small_airport') return zoom >= 9.5;
    return zoom >= 10.5;
}

async function fetchAndRenderWorldAirportsInView() {
    if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;
    if (!worldAirportsLayerGroup) {
        worldAirportsLayerGroup = L.layerGroup().addTo(map);
    }

    const paddedBounds = map.getBounds().pad(0.20);
    const zoom = map.getZoom();
    const fplSet = new Set((Array.isArray(flightPlan) ? flightPlan : []).map(w => w.ident || w.icao));

    // 1. Rimuove i marker usciti dall'inquadratura OPPURE troppo piccoli per il livello di zoom attuale
    for (const [icao, entry] of _renderedWorldAirports.entries()) {
        const inView = paddedBounds.contains([entry.data.lat, entry.data.lon]);
        const allowedByZoom = shouldShowWorldAirportAtZoom(entry.data, zoom, fplSet);
        if (!inView || !allowedByZoom) {
            worldAirportsLayerGroup.removeLayer(entry.marker);
            _renderedWorldAirports.delete(icao);
            continue;
        }
        const el = entry.marker.getElement();
        const pin = el ? el.querySelector('.world-apt-pin') : null;
        if (pin) {
            pin.classList.toggle('apt-dot-only', zoom < 8 && !fplSet.has(icao));
        }
    }

    // 2. Richiede al database SQLite gli aeroporti per la vista corrente
    //    (passa uno zoom calibrato per evitare che i micro-campi saturino il LIMIT SQL a zoom bassi)
    if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.get_airports_in_bounds) return;

    const queryZoom = zoom < 9.5 ? Math.min(zoom, 7.5) : zoom;

    try {
        const res = await window.pywebview.api.get_airports_in_bounds(
            paddedBounds.getSouth(),
            paddedBounds.getNorth(),
            paddedBounds.getWest(),
            paddedBounds.getEast(),
            queryZoom
        );

        if (!res || !res.success || !Array.isArray(res.airports)) return;

        const knownIcaos = new Set(airportsData.map(a => a.icao));

        res.airports.forEach(apt => {
            if (!apt.icao || apt.lat === undefined || apt.lon === undefined) return;

            if (!knownIcaos.has(apt.icao)) {
                knownIcaos.add(apt.icao);
                airportsData.push({
                    icao: apt.icao,
                    name: apt.name,
                    lat: apt.lat,
                    lon: apt.lon,
                    elev: apt.elev_ft || 0,
                    type: apt.type,
                    metar: ''
                });
            }

            if (!shouldShowWorldAirportAtZoom(apt, zoom, fplSet)) return;
            if (_renderedWorldAirports.has(apt.icao)) return;

            let sizeClass = 'apt-small';
            if (apt.type === 'large_airport') sizeClass = 'apt-large';
            else if (apt.type === 'medium_airport') sizeClass = 'apt-medium';

            const isRouteApt = fplSet.has(apt.icao);
            const dotOnlyClass = (zoom < 8 && !isRouteApt) ? 'apt-dot-only' : '';

            const marker = L.marker([apt.lat, apt.lon], {
                icon: L.divIcon({
                    className: '',
                    html: `
                        <div class="world-apt-pin ${sizeClass} ${dotOnlyClass}">
                            <span class="world-apt-dot"></span>
                            <span class="world-apt-lbl">${apt.icao}</span>
                        </div>
                    `,
                    iconSize: null
                }),
                zIndexOffset: isRouteApt ? 620 : (apt.type === 'large_airport' ? 520 : (apt.type === 'medium_airport' ? 480 : 440))
            }).addTo(worldAirportsLayerGroup);

            const elevStr = apt.elev_ft !== undefined && apt.elev_ft !== null ? ` (${apt.elev_ft} ft)` : '';
            marker.bindTooltip(`<b>✈️ ${apt.icao}</b> - ${apt.name || ''}${elevStr}`, {
                direction: 'top',
                offset: [0, -6],
                className: 'vnav-route-tooltip'
            });

            marker.on('click', () => {
                openQuickMetarPopup(apt.icao, apt.lat, apt.lon, apt.name, '');
            });

            _renderedWorldAirports.set(apt.icao, { marker, data: apt });
        });
    } catch (e) {
        console.error("Errore caricamento aeroporti in vista:", e);
    }
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

    const zoom = map.getZoom();

    // 1. Etichette Vettori Vento lungo la rotta (a zoom < 7 mostra solo Partenza, Metà rotta e Arrivo)
    if (fpl.length >= 2) {
        const midIdx = Math.floor(fpl.length / 2);
        const step = zoom < 7 ? Math.max(1, midIdx) : (fpl.length > 8 ? 2 : 1);
        for (let i = 0; i < fpl.length; i++) {
            const isEndpoint = (i === 0 || i === fpl.length - 1);
            const isMid = (i === midIdx);
            if (zoom < 7 && !isEndpoint && !isMid) continue;
            if (zoom >= 7 && !isEndpoint && (i % step !== 0)) continue;

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

    // 2. Pillole cliccabili METAR sugli aeroporti fuori rotta (visibili solo da zoom >= 8 per non affollare la mappa)
    if (zoom < 8) return;
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

    let extraHtml = '';
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_airport_details) {
        try {
            const wNum = parseMetarWindNumbers(metarRaw);
            const det = await window.pywebview.api.get_airport_details(icao, wNum ? wNum.dir : null, wNum ? wNum.spd : null);
            if (det && det.success) {
                if (det.airport && elevFt === null && det.airport.elev_ft !== undefined) {
                    elevFt = det.airport.elev_ft;
                }
                if (det.recommended_runway) {
                    const br = det.recommended_runway;
                    extraHtml += `<div style="margin-top:6px;background:rgba(46,160,67,0.15);border:1px solid rgba(46,160,67,0.5);border-radius:5px;padding:4px 6px;font-size:10px;color:#34d399;font-weight:700;">
                        🛬 Pista Consigliata: <b>RWY ${br.ident}</b> (HW ${br.headwind_kt}kt | XW ${br.crosswind_kt}kt)
                    </div>`;
                }
                if (Array.isArray(det.runways) && det.runways.length > 0) {
                    const rwyBadges = det.runways.slice(0, 4).map(r => {
                        const lenM = Math.round((r.length_ft || 0) * 0.3048);
                        return `<span class="wx-pill" style="font-size:9.5px;">🛣️ ${r.le_ident}/${r.he_ident} (${lenM}m ${r.surface || ''})</span>`;
                    }).join(' ');
                    extraHtml += `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;">${rwyBadges}</div>`;
                }
                if (Array.isArray(det.frequencies) && det.frequencies.length > 0) {
                    const freqBadges = det.frequencies.slice(0, 5).map(f => {
                        const fStr = Number(f.freq_mhz).toFixed(3);
                        return `<span class="wx-pill" style="cursor:pointer;border-color:rgba(0,210,255,0.4);color:#38bdf8;" onclick="sendFreqToScratchpad('${fStr}'); toggleScratchpad(true);" title="Clicca per inviare a Scratchpad NEXT FREQ">📻 ${f.type}: <b>${fStr}</b></span>`;
                    }).join(' ');
                    extraHtml += `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;">${freqBadges}</div>`;
                }
            }
        } catch (e) {}
    }

    const finalElevTxt = elevFt !== null ? ` | ELEV: ${elevFt} ft` : '';

    popup.setContent(`
        <div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(148,163,184,0.2);padding-bottom:5px;margin-bottom:6px;">
                <div>
                    <strong style="color:#00d2ff;font-size:12.5px;">✈️ ${icao}</strong>
                    <div style="color:#94a3b8;font-size:10px;">${aptName}${finalElevTxt}</div>
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
            ${extraHtml}
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

// --- 🌐 NETWORK TRAFFIC OVERLAY (OFF / ON / IVAO / VATSIM) ---
let networkOverlayMode = localStorage.getItem('aeroglass_net_overlay') || 'off'; // 'off' | 'on' | 'ivao' | 'vatsim'
let networkLayerGroup = null;
let networkPollInterval = null;

let atcCoverageSettings = {
    radiusScale: 100,   // % scala raggio (0% = nasconde i cerchi, 100% = standard, fino a 250%)
    opacityScale: 100,  // % scala opacità (10% - 200%)
    pilotRangeNm: 160,  // Raggio max aerei vicini in NM (20 - 300 NM)
    showTWR: true,
    showAPP: true,
    showCTR: true
};

try {
    const savedAtcCfg = localStorage.getItem('aeroglass_atc_cfg');
    if (savedAtcCfg) atcCoverageSettings = { ...atcCoverageSettings, ...JSON.parse(savedAtcCfg) };
} catch (e) {}

function saveAtcCoverageSettings() {
    try { localStorage.setItem('aeroglass_atc_cfg', JSON.stringify(atcCoverageSettings)); } catch (e) {}
}

function ensureNetworkOverlayUI() {
    if (typeof map !== 'undefined' && map && !networkLayerGroup && typeof L !== 'undefined') {
        networkLayerGroup = L.layerGroup().addTo(map);
    }

    if (!document.getElementById('btnToggleNetwork')) {
        const pillsGroup = document.querySelector('.top-pills-group');
        if (pillsGroup) {
            const btn = document.createElement('button');
            btn.id = 'btnToggleNetwork';
            btn.className = 'top-btn';
            btn.onclick = () => cycleNetworkOverlayMode();
            btn.oncontextmenu = (e) => {
                e.preventDefault();
                toggleAtcRadarPopover();
            };

            const cfgBtn = document.createElement('button');
            cfgBtn.id = 'btnAtcRadarCfg';
            cfgBtn.className = 'top-btn';
            cfgBtn.innerHTML = '🎚️';
            cfgBtn.title = 'Regola raggio e opacità cerchi ATC (TWR / APP / CTR)';
            cfgBtn.style.padding = '4px 7px';
            cfgBtn.onclick = (e) => {
                e.stopPropagation();
                toggleAtcRadarPopover();
            };

            const wxBtn = document.getElementById('btnToggleWeather') || document.getElementById('btnToggleNavaids');
            if (wxBtn && wxBtn.parentNode === pillsGroup) {
                pillsGroup.insertBefore(btn, wxBtn.nextSibling);
                pillsGroup.insertBefore(cfgBtn, btn.nextSibling);
            } else {
                pillsGroup.appendChild(btn);
                pillsGroup.appendChild(cfgBtn);
            }
            updateNetworkOverlayButtonUI();
        }
    }

    ensureAtcRadarPopoverDOM();
}

function ensureAtcRadarPopoverDOM() {
    if (document.getElementById('aeroAtcRadarPopover')) return;

    const pop = document.createElement('div');
    pop.id = 'aeroAtcRadarPopover';
    pop.className = 'glass-panel';
    pop.style.cssText = 'position:fixed;top:52px;left:50%;transform:translateX(-50%);width:290px;background:rgba(13,17,23,0.96);border:1px solid rgba(0,210,255,0.45);border-radius:10px;padding:12px;z-index:2500;display:none;flex-direction:column;gap:10px;box-shadow:0 10px 28px rgba(0,0,0,0.75);backdrop-filter:blur(14px);font-family:Consolas,monospace;color:#e2e8f0;';

    pop.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(148,163,184,0.2);padding-bottom:6px;">
            <span style="font-size:11.5px;font-weight:800;color:#00d2ff;">🎚️ RADAR ATC & TRAFFICO</span>
            <div style="display:flex;gap:5px;">
                <button id="btnAtcCfgReset" style="background:rgba(148,163,184,0.15);border:1px solid rgba(148,163,184,0.3);color:#cbd5e1;border-radius:4px;font-size:9.5px;padding:1px 6px;cursor:pointer;">↺ Reset</button>
                <button id="btnAtcCfgClose" style="background:none;border:none;color:#94a3b8;font-size:12px;cursor:pointer;">✕</button>
            </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:3px;">
            <div style="display:flex;justify-content:space-between;font-size:10.5px;">
                <span>⭕ Raggio Cerchi ATC</span>
                <b id="lblAtcRadiusVal" style="color:#00d2ff;">100%</b>
            </div>
            <input type="range" id="rngAtcRadius" min="0" max="250" step="5" value="${atcCoverageSettings.radiusScale}" style="width:100%;accent-color:#00d2ff;cursor:pointer;">
            <div id="lblAtcRadiusNmInfo" style="font-size:9px;color:#94a3b8;text-align:right;">TWR: 5 NM | APP: 18 NM | CTR: 35 NM</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:3px;">
            <div style="display:flex;justify-content:space-between;font-size:10.5px;">
                <span>🔆 Opacità Copertura ATC</span>
                <b id="lblAtcOpacityVal" style="color:#34d399;">100%</b>
            </div>
            <input type="range" id="rngAtcOpacity" min="0" max="200" step="5" value="${atcCoverageSettings.opacityScale}" style="width:100%;accent-color:#34d399;cursor:pointer;">
        </div>

        <div style="display:flex;flex-direction:column;gap:3px;">
            <div style="display:flex;justify-content:space-between;font-size:10.5px;">
                <span>✈️ Raggio Aerei Vicini</span>
                <b id="lblPilotRangeVal" style="color:#fbbf24;">160 NM</b>
            </div>
            <input type="range" id="rngPilotRange" min="20" max="300" step="10" value="${atcCoverageSettings.pilotRangeNm}" style="width:100%;accent-color:#fbbf24;cursor:pointer;">
        </div>

        <div style="display:flex;justify-content:space-between;gap:5px;padding-top:4px;border-top:1px solid rgba(148,163,184,0.15);">
            <button id="btnFilterTWR" style="flex:1;padding:4px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid #34d399;background:rgba(52,211,153,0.18);color:#34d399;">🗼 TWR</button>
            <button id="btnFilterAPP" style="flex:1;padding:4px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid #00d2ff;background:rgba(0,210,255,0.18);color:#00d2ff;">📡 APP</button>
            <button id="btnFilterCTR" style="flex:1;padding:4px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid #c084fc;background:rgba(192,132,252,0.18);color:#c084fc;">🕸️ CTR</button>
        </div>
    `;

    document.body.appendChild(pop);

    const syncUI = () => {
        const rScale = atcCoverageSettings.radiusScale;
        const oScale = atcCoverageSettings.opacityScale;
        const pRange = atcCoverageSettings.pilotRangeNm;

        document.getElementById('rngAtcRadius').value = rScale;
        document.getElementById('rngAtcOpacity').value = oScale;
        document.getElementById('rngPilotRange').value = pRange;

        document.getElementById('lblAtcRadiusVal').textContent = rScale === 0 ? 'OFF (Solo Badge)' : `${rScale}%`;
        document.getElementById('lblAtcOpacityVal').textContent = `${oScale}%`;
        document.getElementById('lblPilotRangeVal').textContent = `${pRange} NM`;

        const twrNm = (5 * rScale / 100).toFixed(1);
        const appNm = Math.round(18 * rScale / 100);
        const ctrNm = Math.round(35 * rScale / 100);
        document.getElementById('lblAtcRadiusNmInfo').textContent = `TWR: ${twrNm} NM | APP: ${appNm} NM | CTR: ${ctrNm} NM`;

        const styleRoleBtn = (id, active, col) => {
            const b = document.getElementById(id);
            if (!b) return;
            b.style.opacity = active ? '1' : '0.35';
            b.style.borderColor = active ? col : 'rgba(148,163,184,0.3)';
        };
        styleRoleBtn('btnFilterTWR', atcCoverageSettings.showTWR, '#34d399');
        styleRoleBtn('btnFilterAPP', atcCoverageSettings.showAPP, '#00d2ff');
        styleRoleBtn('btnFilterCTR', atcCoverageSettings.showCTR, '#c084fc');
    };

    document.getElementById('rngAtcRadius').addEventListener('input', (e) => {
        atcCoverageSettings.radiusScale = parseInt(e.target.value, 10) || 0;
        syncUI();
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    });

    document.getElementById('rngAtcOpacity').addEventListener('input', (e) => {
        atcCoverageSettings.opacityScale = parseInt(e.target.value, 10) || 0;
        syncUI();
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    });

    document.getElementById('rngPilotRange').addEventListener('input', (e) => {
        atcCoverageSettings.pilotRangeNm = parseInt(e.target.value, 10) || 160;
        syncUI();
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    });

    document.getElementById('btnFilterTWR').onclick = () => {
        atcCoverageSettings.showTWR = !atcCoverageSettings.showTWR;
        syncUI();
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    };
    document.getElementById('btnFilterAPP').onclick = () => {
        atcCoverageSettings.showAPP = !atcCoverageSettings.showAPP;
        syncUI();
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    };
    document.getElementById('btnFilterCTR').onclick = () => {
        atcCoverageSettings.showCTR = !atcCoverageSettings.showCTR;
        syncUI();
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    };

    document.getElementById('btnAtcCfgReset').onclick = () => {
        atcCoverageSettings = { radiusScale: 100, opacityScale: 100, pilotRangeNm: 160, showTWR: true, showAPP: true, showCTR: true };
        syncUI();
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    };

    document.getElementById('btnAtcCfgClose').onclick = () => {
        pop.style.display = 'none';
    };

    syncUI();
}

function toggleAtcRadarPopover() {
    ensureAtcRadarPopoverDOM();
    const pop = document.getElementById('aeroAtcRadarPopover');
    const btn = document.getElementById('btnAtcRadarCfg') || document.getElementById('btnToggleNetwork');
    if (!pop) return;

    if (pop.style.display === 'flex') {
        pop.style.display = 'none';
        return;
    }

    if (btn) {
        const rect = btn.getBoundingClientRect();
        const leftPos = Math.max(150, Math.min(window.innerWidth - 160, rect.left + rect.width / 2));
        pop.style.left = leftPos + 'px';
        pop.style.top = (rect.bottom + 8) + 'px';
    }
    pop.style.display = 'flex';
}

function updateNetworkOverlayButtonUI() {
    const btn = document.getElementById('btnToggleNetwork');
    if (!btn) return;
    
    btn.classList.remove('active');
    if (networkOverlayMode === 'off') {
        btn.innerHTML = '🌐 <span>Online: OFF</span>';
        btn.style.borderColor = 'rgba(148, 163, 184, 0.25)';
        btn.style.color = '#94a3b8';
    } else if (networkOverlayMode === 'on') {
        btn.classList.add('active');
        btn.innerHTML = '🌐 <span>Online: ON</span>';
        btn.style.borderColor = 'rgba(56, 189, 248, 0.55)';
        btn.style.color = '#38bdf8';
    } else if (networkOverlayMode === 'ivao') {
        btn.classList.add('active');
        btn.innerHTML = '🌐 <span>IVAO</span>';
        btn.style.borderColor = 'rgba(0, 210, 255, 0.75)';
        btn.style.color = '#00d2ff';
    } else if (networkOverlayMode === 'vatsim') {
        btn.classList.add('active');
        btn.innerHTML = '🌐 <span>VATSIM</span>';
        btn.style.borderColor = 'rgba(251, 191, 36, 0.75)';
        btn.style.color = '#fbbf24';
    }
}

function cycleNetworkOverlayMode() {
    const sequence = ['off', 'on', 'ivao', 'vatsim'];
    const nextIdx = (sequence.indexOf(networkOverlayMode) + 1) % sequence.length;
    networkOverlayMode = sequence[nextIdx];
    
    ensureNetworkOverlayUI();
    updateNetworkOverlayButtonUI();

    if (networkOverlayMode !== 'off') {
        fetchAndRenderNetworkTraffic();
        if (!networkPollInterval) {
            networkPollInterval = setInterval(fetchAndRenderNetworkTraffic, 60000);
        }
    } else {
        if (networkPollInterval) {
            clearInterval(networkPollInterval);
            networkPollInterval = null;
        }
        if (networkLayerGroup) networkLayerGroup.clearLayers();
    }

    try { localStorage.setItem('aeroglass_net_overlay', networkOverlayMode); } catch (e) {}
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try { window.pywebview.api.save_setting('net_overlay', networkOverlayMode); } catch (e) {}
    }
}

window._lastOnlineControllers = [];

function ensureNetAtcBadgeStyles() {
    if (document.getElementById('aeroNetAtcStyles')) return;
    const st = document.createElement('style');
    st.id = 'aeroNetAtcStyles';
    st.textContent = `
        /* Aeroporti mondiali: a zoom < 8 mostra solo il pallino radar, rivela ICAO al passaggio mouse */
        .world-apt-pin.apt-dot-only {
            background: transparent !important;
            border-color: transparent !important;
            box-shadow: none !important;
            padding: 2px !important;
        }
        .world-apt-pin.apt-dot-only .world-apt-lbl {
            display: none;
        }
        .world-apt-pin.apt-dot-only:hover {
            background: rgba(13, 17, 23, 0.94) !important;
            border: 1px solid rgba(0, 210, 255, 0.6) !important;
            padding: 1px 6px !important;
            z-index: 1800 !important;
        }
        .world-apt-pin.apt-dot-only:hover .world-apt-lbl {
            display: inline !important;
        }

        /* Badge ATC compatti a zoom basso: mostra icona + ICAO, espande callsign e frequenza al hover */
        .net-atc-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(13, 17, 23, 0.92);
            border: 1.5px solid #00d2ff;
            border-radius: 6px;
            padding: 1px 6px 1px 3px;
            font-family: Consolas, monospace;
            font-size: 10px;
            font-weight: 700;
            color: #e2e8f0;
            white-space: nowrap;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.65);
            cursor: pointer;
            transform: translate(-50%, -50%);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .net-atc-badge.atc-compact .net-atc-freq,
        .net-atc-badge.atc-compact .net-atc-role-txt {
            display: none;
        }
        .net-atc-badge:hover {
            transform: translate(-50%, -50%) scale(1.08);
            box-shadow: 0 0 14px rgba(0, 210, 255, 0.65);
            z-index: 2500 !important;
        }
        .net-atc-badge.atc-compact:hover .net-atc-freq,
        .net-atc-badge.atc-compact:hover .net-atc-role-txt {
            display: inline;
        }
        .net-atc-role {
            padding: 1px 4px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.3px;
        }
        .net-atc-cs { color: #ffffff; }
        .net-atc-freq {
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.14);
            padding: 0 4px;
            border-radius: 3px;
        }

        /* Barra superiore compatta su una sola riga */
        .top-pills-group .top-btn {
            padding: 3px 7px !important;
            font-size: 10.5px !important;
            white-space: nowrap !important;
        }
        #btnToggleTooltips span,
        #btnToggleUIMode span,
        #btnThemeMode span {
            display: none !important;
        }
        #btnThemeMode {
            min-width: 32px !important;
        }
    `;
    document.head.appendChild(st);
    setupErgonomicSidebarAndTopBar();
}

function setupErgonomicSidebarAndTopBar() {
    // 1. Rende la sezione "WAYPOINTS UTENTE (CUSTOM)" nella sidebar richiudibile a fisarmonica
    const wpNameInp = document.getElementById('customWpName');
    if (wpNameInp && !wpNameInp._accordionHooked) {
        wpNameInp._accordionHooked = true;
        const container = wpNameInp.closest('.sidebar-section') || wpNameInp.parentElement?.parentElement;
        if (container) {
            const titleEl = Array.from(container.parentElement.children).find(el =>
                el !== container && el.innerText && el.innerText.toUpperCase().includes('WAYPOINTS UTENTE')
            ) || container.querySelector('.section-title');

            if (titleEl) {
                titleEl.style.cssText += ';cursor:pointer;user-select:none;display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:rgba(30,41,59,0.55);border:1px solid rgba(148,163,184,0.2);border-radius:6px;margin-bottom:6px;';
                const origTxt = titleEl.innerText.replace(/[▸▾➕]/g, '').trim();
                let isOpen = false;
                const formNodes = Array.from(container.children).filter(c => c !== titleEl);

                const applyAcc = () => {
                    titleEl.innerHTML = `<span>➕ ${origTxt}</span> <span style="color:#00d2ff;font-size:11px;">${isOpen ? '▾' : '▸'}</span>`;
                    formNodes.forEach(n => { n.style.display = isOpen ? '' : 'none'; });
                };
                titleEl.onclick = () => { isOpen = !isOpen; applyAcc(); };
                applyAcc();
            }
        }
    }

    // 2. Accorcia l'etichetta IP EFB e Filtri nella barra superiore per evitare l'andata a capo
    const efbLbl = document.getElementById('lblEfbNet');
    if (efbLbl && efbLbl.innerText.includes(':')) {
        efbLbl.dataset.fullIp = efbLbl.innerText;
        efbLbl.innerText = 'EFB Wi-Fi';
    }
    const fltLbl = document.getElementById('lblFilters');
    if (fltLbl && fltLbl.innerText.length > 8) {
        fltLbl.innerText = 'Filtri';
    }
}

window._lastNetworkTrafficRes = null;

async function fetchAndRenderNetworkTraffic() {
    if (networkOverlayMode === 'off' || !window.pywebview || !window.pywebview.api) return;
    if (!networkLayerGroup || typeof map === 'undefined' || !map) return;

    ensureNetAtcBadgeStyles();

    if (!map._netZoomHooked) {
        map._netZoomHooked = true;
        map.on('zoomend moveend', () => {
            if (networkOverlayMode !== 'off' && window._lastNetworkTrafficRes) {
                redrawCachedNetworkTraffic();
            }
        });
    }

    try {
        const apiFn = window.pywebview.api.get_online_network_traffic_atc || window.pywebview.api.get_online_network_traffic;
        if (!apiFn) return;
        const res = await apiFn();
        if (!res || !res.success) return;

        window._lastNetworkTrafficRes = res;
        redrawCachedNetworkTraffic();
    } catch (err) {
        console.error("Errore caricamento traffico online:", err);
    }
}

function redrawCachedNetworkTraffic() {
    const res = window._lastNetworkTrafficRes;
    if (networkOverlayMode === 'off' || !res || !networkLayerGroup || typeof map === 'undefined' || !map) return;

    ensureNetAtcBadgeStyles();
    networkLayerGroup.clearLayers();

    const zoom = map.getZoom();
    const bounds = map.getBounds().pad(0.25);
    const refPos = (typeof lastAcftLatLng !== 'undefined' && lastAcftLatLng) ? lastAcftLatLng : map.getCenter();
    const fplIcaos = new Set((Array.isArray(flightPlan) ? flightPlan : []).map(w => w.ident || w.icao));

    const rMult = (atcCoverageSettings.radiusScale || 0) / 100;
    const oMult = (atcCoverageSettings.opacityScale || 0) / 100;
    const maxPilotNm = atcCoverageSettings.pilotRangeNm || 160;

    const BASE_ATC_CFG = {
        TWR: { color: '#34d399', icon: '🗼', radiusNm: 5,  strokeOpacity: 0.55, fillOpacity: 0.09, weight: 1.3, dash: null },
        APP: { color: '#00d2ff', icon: '📡', radiusNm: 18, strokeOpacity: 0.45, fillOpacity: 0.05, weight: 1.2, dash: null },
        CTR: { color: '#c084fc', icon: '🕸️', radiusNm: 35, strokeOpacity: 0.35, fillOpacity: 0.025, weight: 1.1, dash: '6, 6' }
    };

    // 1. TORRI E CENTRI RADAR ONLINE (TWR, APP, CTR) CON DECLUTTER AUTOMATICO PER ZOOM
    const activeAtcs = [];
    (res.controllers || []).forEach(c => {
        if (c.lat === undefined || c.lon === undefined) return;
        const isVatsim = (c.network === 'vatsim');
        if (networkOverlayMode === 'ivao' && isVatsim) return;
        if (networkOverlayMode === 'vatsim' && !isVatsim) return;

        if (c.role === 'TWR' && !atcCoverageSettings.showTWR) return;
        if (c.role === 'APP' && !atcCoverageSettings.showAPP) return;
        if (c.role === 'CTR' && !atcCoverageSettings.showCTR) return;

        const distNm = computeDistanceNm(refPos.lat, refPos.lng, c.lat, c.lon);
        activeAtcs.push({ ...c, distNm });

        if (!bounds.contains([c.lat, c.lon])) return;

        // A zoom panoramico (< 7), mostra le TWR solo se vicine (< 70 NM) o appartenenti al Piano di Volo
        const pfx = (c.callsign || '').split('_')[0];
        if (zoom < 7 && c.role === 'TWR' && distNm > 70 && !fplIcaos.has(pfx)) return;

        const cfg = BASE_ATC_CFG[c.role] || BASE_ATC_CFG.TWR;
        const roleColor = cfg.color;
        const roleIcon = cfg.icon;
        const radiusM = cfg.radiusNm * rMult * 1852;

        if (radiusM > 50 && oMult > 0) {
            L.circle([c.lat, c.lon], {
                radius: radiusM,
                color: roleColor,
                weight: cfg.weight,
                dashArray: cfg.dash,
                opacity: Math.min(1, cfg.strokeOpacity * oMult),
                fillColor: roleColor,
                fillOpacity: Math.min(0.85, cfg.fillOpacity * oMult),
                interactive: false
            }).addTo(networkLayerGroup);
        }

        const netTag = isVatsim ? 'VAT' : 'IVAO';
        const isCompact = zoom < 8.5;
        const shortCs = isCompact ? pfx : c.callsign;

        const atcMarker = L.marker([c.lat, c.lon], {
            icon: L.divIcon({
                className: '',
                html: `
                    <div class="net-atc-badge ${isCompact ? 'atc-compact' : ''}" style="border-color:${roleColor};">
                        <span class="net-atc-role" style="background:${roleColor};color:#090d13;">${roleIcon}<span class="net-atc-role-txt"> ${c.role}</span></span>
                        <span class="net-atc-cs">${shortCs}</span>
                        <span class="net-atc-freq">📻 ${c.freq}</span>
                    </div>
                `,
                iconSize: null
            }),
            zIndexOffset: 850
        }).addTo(networkLayerGroup);

        atcMarker.bindTooltip(
            `<b>[${netTag}] ${c.callsign}</b> (${c.name || ''})<br>` +
            `Frequenza: <b style="color:#00d2ff;">${c.freq} MHz</b> | Dist: ${distNm.toFixed(0)} NM<br>` +
            `<span style="font-size:9.5px;color:#34d399;">🖱️ Clicca per inviare frequenza a Note EFB</span>`,
            { direction: 'top', className: 'vnav-route-tooltip' }
        );

        atcMarker.on('click', () => {
            if (typeof sendFreqToScratchpad === 'function') {
                sendFreqToScratchpad(c.freq);
                toggleScratchpad(true);
            }
        });
    });

    window._lastOnlineControllers = activeAtcs.sort((a, b) => a.distNm - b.distNm);
    if (scratchpadOpen && typeof renderScratchpadFrequencies === 'function') {
        renderScratchpadFrequencies();
    }

    // 2. AEREI NELLE IMMEDIATE VICINANZE
    const nearbyPilots = [];
    (res.pilots || []).forEach(p => {
        if (p.lat === undefined || p.lon === undefined) return;
        const isVatsim = (p.network === 'vatsim');
        if (networkOverlayMode === 'ivao' && isVatsim) return;
        if (networkOverlayMode === 'vatsim' && !isVatsim) return;

        const distNm = computeDistanceNm(refPos.lat, refPos.lng, p.lat, p.lon);
        if (!bounds.contains([p.lat, p.lon]) || distNm > maxPilotNm) return;
        nearbyPilots.push({ ...p, distNm });
    });

    nearbyPilots.sort((a, b) => a.distNm - b.distNm);

    nearbyPilots.slice(0, 80).forEach(p => {
        const isVatsim = (p.network === 'vatsim');
        const planeColor = isVatsim ? '#fbbf24' : '#00d2ff';
        const netLabel = isVatsim ? 'VATSIM' : 'IVAO';
        const hdg = p.hdg || 0;

        const pilotIcon = L.divIcon({
            className: '',
            html: `<div class="net-pilot-marker" style="transform: rotate(${hdg}deg);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${planeColor}">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
            </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const m = L.marker([p.lat, p.lon], { icon: pilotIcon, zIndexOffset: 700 }).addTo(networkLayerGroup);
        m.bindTooltip(
            `<b>[${netLabel}] ${p.callsign}</b> (${p.distNm.toFixed(1)} NM)<br>Alt: ${p.alt} ft | GS: ${p.gs} kt | HDG: ${hdg}°`,
            { direction: 'top', className: 'vnav-route-tooltip' }
        );
    });
}

// --- 📝 SCRATCHPAD EFB (ATC CLEARANCE PAD, FREEHAND CANVAS & FREQUENZE) ---
let scratchpadOpen = false;
let scratchpadData = {
    xpdr: '',
    qnh: '',
    fl: '',
    hdg: '',
    spd: '',
    freq: '',
    notes: '',
    drawing: ''
};

try {
    const savedSp = localStorage.getItem('aeroglass_scratchpad');
    if (savedSp) scratchpadData = { ...scratchpadData, ...JSON.parse(savedSp) };
} catch (e) {}

let _spPenColor = '#00d2ff';
let _spEraser = false;

function ensureScratchpadUI() {
    if (!document.getElementById('btnToggleScratchpad')) {
        const pillsGroup = document.querySelector('.top-pills-group');
        if (pillsGroup) {
            const btn = document.createElement('button');
            btn.id = 'btnToggleScratchpad';
            btn.className = 'top-btn' + (scratchpadOpen ? ' active' : '');
            btn.innerHTML = '📝 <span>Note EFB</span>';
            btn.onclick = () => toggleScratchpad();

            const netBtn = document.getElementById('btnToggleNetwork') || document.getElementById('btnToggleWeather');
            if (netBtn && netBtn.parentNode === pillsGroup) {
                pillsGroup.insertBefore(btn, netBtn.nextSibling);
            } else {
                pillsGroup.appendChild(btn);
            }
        }
    }

    if (!document.getElementById('aeroScratchpadDrawer')) {
        const drawer = document.createElement('div');
        drawer.id = 'aeroScratchpadDrawer';
        drawer.className = 'aero-scratchpad-drawer glass-panel';
        drawer.innerHTML = `
            <div class="sp-header" id="spDragHeader">
                <div class="sp-title">📝 <span>EFB SCRATCHPAD & ATC</span></div>
                <div style="display:flex;gap:5px;">
                    <button class="sp-mini-btn" onclick="syncScratchpadFromSim()" title="Copia QNH e Quota dal Simulatore">🔄 SIM</button>
                    <button class="sp-mini-btn" onclick="toggleScratchpad()">✕</button>
                </div>
            </div>
            <div class="sp-tabs">
                <button class="sp-tab-btn active" data-tab="atc" onclick="switchScratchpadTab('atc')">📋 ATC PAD</button>
                <button class="sp-tab-btn" data-tab="draw" onclick="switchScratchpadTab('draw')">✏️ DISEGNO</button>
                <button class="sp-tab-btn" data-tab="freq" onclick="switchScratchpadTab('freq')">📻 FREQ</button>
            </div>
            <div class="sp-body" id="spTabAtc">
                <div class="sp-craft-grid">
                    <div class="sp-field">
                        <label for="spInpXpdr">SQUAWK</label>
                        <input type="text" id="spInpXpdr" maxlength="4" placeholder="7000" oninput="onScratchpadInputChange()">
                    </div>
                    <div class="sp-field">
                        <label for="spInpQnh">QNH (hPa)</label>
                        <input type="text" id="spInpQnh" maxlength="6" placeholder="1013" oninput="onScratchpadInputChange()">
                    </div>
                    <div class="sp-field">
                        <label for="spInpFl">ALT / FL</label>
                        <input type="text" id="spInpFl" maxlength="7" placeholder="FL120" oninput="onScratchpadInputChange()">
                    </div>
                    <div class="sp-field">
                        <label for="spInpHdg">HDG / VEC</label>
                        <input type="text" id="spInpHdg" maxlength="5" placeholder="270°" oninput="onScratchpadInputChange()">
                    </div>
                    <div class="sp-field">
                        <label for="spInpSpd">SPEED (KT)</label>
                        <input type="text" id="spInpSpd" maxlength="5" placeholder="250" oninput="onScratchpadInputChange()">
                    </div>
                    <div class="sp-field">
                        <label for="spInpFreq">NEXT FREQ</label>
                        <input type="text" id="spInpFreq" maxlength="7" placeholder="122.800" oninput="onScratchpadInputChange()">
                    </div>
                </div>
                <textarea class="sp-textarea" id="spInpNotes" placeholder="Appunti ATC, C.R.A.F.T. clearance, piste in uso, taxiway (es. Stand 114 via Twy A, H/S Rwy 04R)..." oninput="onScratchpadInputChange()"></textarea>
                <div class="sp-toolbar">
                    <button class="sp-mini-btn" onclick="insertScratchpadTemplate('VFR 7000')">VFR 7000</button>
                    <button class="sp-mini-btn" onclick="insertScratchpadTemplate('IFR 1000')">IFR 1000</button>
                    <button class="sp-mini-btn" onclick="insertScratchpadTemplate('STD 1013')">STD 1013</button>
                    <button class="sp-mini-btn" style="color:#f85149;" onclick="clearScratchpadAtc()">🗑️ Pulisci</button>
                </div>
            </div>
            <div class="sp-body" id="spTabDraw" style="display:none;">
                <div class="sp-canvas-wrap">
                    <canvas id="spDrawCanvas" width="318" height="195"></canvas>
                </div>
                <div class="sp-toolbar">
                    <div style="display:flex;gap:6px;align-items:center;">
                        <span class="sp-color-dot active" style="background:#00d2ff;" onclick="setScratchpadPen('#00d2ff', this)"></span>
                        <span class="sp-color-dot" style="background:#fbbf24;" onclick="setScratchpadPen('#fbbf24', this)"></span>
                        <span class="sp-color-dot" style="background:#2ea043;" onclick="setScratchpadPen('#2ea043', this)"></span>
                        <span class="sp-color-dot" style="background:#f85149;" onclick="setScratchpadPen('#f85149', this)"></span>
                    </div>
                    <div style="display:flex;gap:5px;">
                        <button class="sp-mini-btn" id="btnSpEraser" onclick="toggleScratchpadEraser()">🧽 Gomma</button>
                        <button class="sp-mini-btn" style="color:#f85149;" onclick="clearScratchpadCanvas()">🗑️ Pulisci</button>
                    </div>
                </div>
            </div>
            <div class="sp-body" id="spTabFreq" style="display:none;">
                <div class="sp-freq-list" id="spFreqListContainer"></div>
            </div>
        `;
        document.body.appendChild(drawer);

        populateScratchpadInputs();
        initScratchpadDraggable(drawer, document.getElementById('spDragHeader'));
        initScratchpadCanvas();
        renderScratchpadFrequencies();
    }

    // 1. Associa tutti i <label> privi di 'for' al relativo controllo
    document.querySelectorAll('label:not([for])').forEach((lbl, idx) => {
        const ctrl = lbl.querySelector('input, select, textarea') ||
                     (lbl.nextElementSibling && lbl.nextElementSibling.matches('input, select, textarea') ? lbl.nextElementSibling : null) ||
                     (lbl.parentElement ? lbl.parentElement.querySelector('input, select, textarea') : null);
        if (ctrl) {
            if (!ctrl.id) ctrl.id = `aero_auto_field_${idx}`;
            lbl.setAttribute('for', ctrl.id);
        }
    });

    // 2. Aggiunge aria-label a tutti gli <input>/<select>/<textarea> privi di <label> associato
    document.querySelectorAll('input, select, textarea').forEach((ctrl, idx) => {
        if (!ctrl.id) ctrl.id = `aero_ctrl_${idx}`;
        const hasLabel = document.querySelector(`label[for="${ctrl.id}"]`) || ctrl.closest('label');
        if (!hasLabel && !ctrl.getAttribute('aria-label')) {
            ctrl.setAttribute('aria-label', ctrl.getAttribute('placeholder') || ctrl.getAttribute('title') || ctrl.id);
        }
    });
}

function toggleScratchpad(forceState) {
    ensureScratchpadUI();
    scratchpadOpen = (typeof forceState === 'boolean') ? forceState : !scratchpadOpen;
    const drawer = document.getElementById('aeroScratchpadDrawer');
    const btn = document.getElementById('btnToggleScratchpad');
    if (drawer) drawer.classList.toggle('open', scratchpadOpen);
    if (btn) btn.classList.toggle('active', scratchpadOpen);
    if (scratchpadOpen) renderScratchpadFrequencies();
}

function switchScratchpadTab(tabName) {
    const drawer = document.getElementById('aeroScratchpadDrawer');
    if (!drawer) return;
    drawer.querySelectorAll('.sp-tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });
    document.getElementById('spTabAtc').style.display = (tabName === 'atc') ? 'flex' : 'none';
    document.getElementById('spTabDraw').style.display = (tabName === 'draw') ? 'flex' : 'none';
    document.getElementById('spTabFreq').style.display = (tabName === 'freq') ? 'flex' : 'none';
    if (tabName === 'freq') renderScratchpadFrequencies();
}

function populateScratchpadInputs() {
    const mapIds = {
        spInpXpdr: 'xpdr',
        spInpQnh: 'qnh',
        spInpFl: 'fl',
        spInpHdg: 'hdg',
        spInpSpd: 'spd',
        spInpFreq: 'freq',
        spInpNotes: 'notes'
    };
    for (const [id, key] of Object.entries(mapIds)) {
        const el = document.getElementById(id);
        if (el) el.value = scratchpadData[key] || '';
    }
}

function onScratchpadInputChange() {
    scratchpadData.xpdr = document.getElementById('spInpXpdr')?.value || '';
    scratchpadData.qnh = document.getElementById('spInpQnh')?.value || '';
    scratchpadData.fl = document.getElementById('spInpFl')?.value || '';
    scratchpadData.hdg = document.getElementById('spInpHdg')?.value || '';
    scratchpadData.spd = document.getElementById('spInpSpd')?.value || '';
    scratchpadData.freq = document.getElementById('spInpFreq')?.value || '';
    scratchpadData.notes = document.getElementById('spInpNotes')?.value || '';
    persistScratchpadData();
}

function persistScratchpadData() {
    const raw = JSON.stringify(scratchpadData);
    try { localStorage.setItem('aeroglass_scratchpad', raw); } catch (e) {}
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try { window.pywebview.api.save_setting('efb_scratchpad', raw); } catch (e) {}
    }
}

function insertScratchpadTemplate(preset) {
    if (preset === 'VFR 7000') document.getElementById('spInpXpdr').value = '7000';
    else if (preset === 'IFR 1000') document.getElementById('spInpXpdr').value = '1000';
    else if (preset === 'STD 1013') document.getElementById('spInpQnh').value = '1013';
    onScratchpadInputChange();
}

function syncScratchpadFromSim() {
    const tel = window.lastTelemetry || {};
    if (tel.qnh_mb) document.getElementById('spInpQnh').value = String(Math.round(Number(tel.qnh_mb)));
    if (tel.alt_ft) document.getElementById('spInpFl').value = `${Math.round(Number(tel.alt_ft) / 100) * 100}`;
    if (tel.hdg_deg) document.getElementById('spInpHdg').value = `${String(Math.round(Number(tel.hdg_deg))).padStart(3, '0')}°`;
    if (tel.gs_kt) document.getElementById('spInpSpd').value = String(Math.round(Number(tel.gs_kt)));
    onScratchpadInputChange();
}

function clearScratchpadAtc() {
    ['spInpXpdr', 'spInpQnh', 'spInpFl', 'spInpHdg', 'spInpSpd', 'spInpFreq', 'spInpNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    onScratchpadInputChange();
}

function setScratchpadPen(color, dotEl) {
    _spPenColor = color;
    _spEraser = false;
    const erBtn = document.getElementById('btnSpEraser');
    if (erBtn) erBtn.style.borderColor = 'rgba(148, 163, 184, 0.3)';
    document.querySelectorAll('.sp-color-dot').forEach(d => d.classList.remove('active'));
    if (dotEl) dotEl.classList.add('active');
}

function toggleScratchpadEraser() {
    _spEraser = !_spEraser;
    const erBtn = document.getElementById('btnSpEraser');
    if (erBtn) erBtn.style.borderColor = _spEraser ? '#00d2ff' : 'rgba(148, 163, 184, 0.3)';
}

function clearScratchpadCanvas() {
    const canvas = document.getElementById('spDrawCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    scratchpadData.drawing = '';
    persistScratchpadData();
}

function initScratchpadCanvas() {
    const canvas = document.getElementById('spDrawCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (scratchpadData.drawing) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = scratchpadData.drawing;
    }

    let drawing = false;
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDraw = (e) => {
        e.preventDefault();
        drawing = true;
        const p = getPos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    };

    const moveDraw = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const p = getPos(e);
        ctx.globalCompositeOperation = _spEraser ? 'destination-out' : 'source-over';
        ctx.strokeStyle = _spPenColor;
        ctx.lineWidth = _spEraser ? 16 : 2.4;
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    };

    const endDraw = () => {
        if (!drawing) return;
        drawing = false;
        ctx.globalCompositeOperation = 'source-over';
        try {
            scratchpadData.drawing = canvas.toDataURL('image/png');
            persistScratchpadData();
        } catch (e) {}
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', moveDraw, { passive: false });
    canvas.addEventListener('touchend', endDraw);
}

function initScratchpadDraggable(panel, handle) {
    if (!panel || !handle) return;
    let isDragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;

    const onStart = (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        const rect = panel.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        panel.style.right = 'auto';
        panel.style.left = `${origLeft}px`;
        panel.style.top = `${origTop}px`;
    };

    const onMove = (e) => {
        if (!isDragging) return;
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const nx = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, origLeft + (cx - startX)));
        const ny = Math.max(48, Math.min(window.innerHeight - 80, origTop + (cy - startY)));
        panel.style.left = `${nx}px`;
        panel.style.top = `${ny}px`;
    };

    const onEnd = () => { isDragging = false; };

    handle.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    handle.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
}

function renderScratchpadFrequencies() {
    const box = document.getElementById('spFreqListContainer');
    if (!box) return;

    const items = [];

    if (Array.isArray(window._lastOnlineControllers) && window._lastOnlineControllers.length > 0) {
        window._lastOnlineControllers.slice(0, 6).forEach(atc => {
            items.push({
                label: `🟢 [${atc.network.toUpperCase()}] ${atc.callsign}`,
                freq: String(atc.freq),
                note: `${atc.role} Online (${atc.distNm.toFixed(0)} NM) - ${atc.name || ''}`
            });
        });
    }

    items.push(
        { label: 'UNICOM (VATSIM / IVAO)', freq: '122.800', note: 'Traffico non controllato' },
        { label: 'GUARD / EMERGENZA', freq: '121.500', note: 'VHF Internazionale Emergenze' },
        { label: 'ITALIA VFR FIC / INFO', freq: '124.150', note: 'Padova / Roma Informazioni VFR' },
        { label: 'AVIOSUPERFICI / ULTRALEGGERI', freq: '130.000', note: 'Frequenza nazionale aviosuperfici IT' }
    );

    if (Array.isArray(vorsData) && vorsData.length > 0 && typeof map !== 'undefined' && map) {
        const c = map.getCenter();
        const nearVors = [...vorsData]
            .filter(v => v.freq && v.lat !== undefined)
            .sort((a, b) => Math.hypot(a.lat - c.lat, a.lon - c.lng) - Math.hypot(b.lat - c.lat, b.lon - c.lng))
            .slice(0, 3);
        nearVors.forEach(v => {
            items.push({ label: `VOR ${v.ident} (${v.name || ''})`, freq: String(v.freq), note: 'Radioassistenza vicina' });
        });
    }

    if (Array.isArray(ilsData) && ilsData.length > 0 && typeof map !== 'undefined' && map) {
        const c = map.getCenter();
        const nearIls = [...ilsData]
            .filter(i => i.freq && i.lat !== undefined)
            .sort((a, b) => Math.hypot(a.lat - c.lat, a.lon - c.lng) - Math.hypot(b.lat - c.lat, b.lon - c.lng))
            .slice(0, 2);
        nearIls.forEach(i => {
            items.push({ label: `ILS ${i.apt_icao || ''} RWY ${i.rwy || i.ident || ''}`, freq: String(i.freq), note: `CRS ${i.course || '---'}°` });
        });
    }

    box.innerHTML = items.map(it => `
        <div class="sp-freq-item">
            <div>
                <div style="font-size:10.5px;font-weight:700;color:#e2e8f0;">${it.label}</div>
                <div style="font-size:9px;color:#94a3b8;">${it.note}</div>
            </div>
            <span class="sp-freq-val" onclick="sendFreqToScratchpad('${it.freq}')" title="Clicca per copiare in NEXT FREQ">${it.freq}</span>
        </div>
    `).join('');
}

function sendFreqToScratchpad(freqVal) {
    const inp = document.getElementById('spInpFreq');
    if (inp) inp.value = freqVal;
    onScratchpadInputChange();
    switchScratchpadTab('atc');
}

// --- 📏 RIGHELLO DISTANZA / PRUA / ETE (MEASURE TOOL) ---
let measureToolActive = false;
let measureLayerGroup = null;
let measureStartLatLng = null;
let measureEndLatLng = null;
let measureLocked = false;
let _measureLine = null;
let _measureStartMarker = null;
let _measureEndMarker = null;
let _measureBadgeMarker = null;

function ensureMeasureToolUI() {
    if (typeof map !== 'undefined' && map && typeof L !== 'undefined') {
        if (!measureLayerGroup) {
            measureLayerGroup = L.layerGroup().addTo(map);
        }
        if (!map._measureToolHooked) {
            map._measureToolHooked = true;

            // Clic destro sulla mappa: 1° clic inizia, 2° clic blocca la misura, 3° clic cancella
            map.on('contextmenu', (e) => {
                if (e.originalEvent) e.originalEvent.preventDefault();
                handleMeasurePointInput(e.latlng);
            });

            // Clic sinistro/touch quando la modalità pulsante 📏 Righello è attiva
            map.on('click', (e) => {
                if (!measureToolActive) return;
                handleMeasurePointInput(e.latlng);
            });

            // Aggiornamento elastico della linea mentre si muove il mouse
            map.on('mousemove', (e) => {
                if (measureStartLatLng && !measureLocked) {
                    measureEndLatLng = e.latlng;
                    renderMeasureOverlay();
                }
            });

            window.addEventListener('keydown', (ev) => {
                if (ev.key === 'Escape' && (measureStartLatLng || measureToolActive)) {
                    clearMeasureTool(true);
                }
            });
        }
    }

    if (!document.getElementById('btnToggleMeasure')) {
        const pillsGroup = document.querySelector('.top-pills-group');
        if (pillsGroup) {
            const btn = document.createElement('button');
            btn.id = 'btnToggleMeasure';
            btn.className = 'top-btn';
            btn.onclick = () => toggleMeasureToolButton();

            const spBtn = document.getElementById('btnToggleScratchpad') || document.getElementById('btnToggleNetwork');
            if (spBtn && spBtn.parentNode === pillsGroup) {
                pillsGroup.insertBefore(btn, spBtn.nextSibling);
            } else {
                pillsGroup.appendChild(btn);
            }
            updateMeasureButtonUI();
        }
    }
}

function updateMeasureButtonUI() {
    const btn = document.getElementById('btnToggleMeasure');
    if (!btn) return;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const isActive = measureToolActive || measureStartLatLng !== null;
    btn.classList.toggle('active', isActive);
    btn.innerHTML = isEn ? '📏 <span>Measure</span>' : '📏 <span>Righello</span>';
    if (isActive) {
        btn.style.borderColor = 'rgba(251, 191, 36, 0.75)';
        btn.style.color = '#fbbf24';
    } else {
        btn.style.borderColor = '';
        btn.style.color = '';
    }
}

function toggleMeasureToolButton() {
    ensureMeasureToolUI();
    if (measureToolActive || measureStartLatLng !== null) {
        clearMeasureTool(true);
    } else {
        measureToolActive = true;
        const mapEl = document.getElementById('map');
        if (mapEl) mapEl.style.cursor = 'crosshair';
        updateMeasureButtonUI();
    }
}

function handleMeasurePointInput(latlng) {
    if (!latlng) return;
    if (!measureStartLatLng) {
        measureStartLatLng = latlng;
        measureEndLatLng = latlng;
        measureLocked = false;
        renderMeasureOverlay();
    } else if (!measureLocked) {
        measureEndLatLng = latlng;
        measureLocked = true;
        measureToolActive = false;
        const mapEl = document.getElementById('map');
        if (mapEl) mapEl.style.cursor = '';
        renderMeasureOverlay();
    } else {
        // Se già bloccato, un nuovo clic destro fa ripartire o pulisce
        clearMeasureTool(false);
        measureStartLatLng = latlng;
        measureEndLatLng = latlng;
        measureLocked = false;
        renderMeasureOverlay();
    }
    updateMeasureButtonUI();
}

function clearMeasureTool(deactivateButton = true) {
    measureStartLatLng = null;
    measureEndLatLng = null;
    measureLocked = false;
    if (deactivateButton) measureToolActive = false;
    _measureLine = null;
    _measureStartMarker = null;
    _measureEndMarker = null;
    _measureBadgeMarker = null;
    if (measureLayerGroup) measureLayerGroup.clearLayers();
    const mapEl = document.getElementById('map');
    if (mapEl) mapEl.style.cursor = '';
    updateMeasureButtonUI();
}

function computeDistanceNm(lat1, lon1, lat2, lon2) {
    const R_NM = 3440.065;
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R_NM * c;
}

function getEffectiveGroundSpeedKt() {
    const tel = window.lastTelemetry || {};
    const simGs = Number(tel.gs_kt || tel.groundspeed || 0);
    if (tel.connected && simGs >= 25) return Math.round(simGs);

    const domGs = document.getElementById('valGs');
    if (domGs) {
        const parsed = parseInt(domGs.innerText.replace(/[^\d]/g, ''), 10);
        if (!isNaN(parsed) && parsed >= 25) return parsed;
    }

    if (typeof fuelPerfConfig !== 'undefined' && fuelPerfConfig && Number(fuelPerfConfig.tas) > 30) {
        return Math.round(Number(fuelPerfConfig.tas));
    }
    return 120; // Velocità di riferimento a terra / demo
}

function getMagneticDeclinationDeg(lat, lon) {
    const tel = window.lastTelemetry || {};
    if (tel.mag_var !== undefined && tel.mag_var !== null && !isNaN(Number(tel.mag_var))) {
        return Number(tel.mag_var);
    }
    // Stima declinazione magnetica centro-europea/mediterranea (~3.5°E in Italia)
    return Math.max(-25, Math.min(25, 1.5 + (lon - 5.0) * 0.22));
}

function formatMeasureEte(distNm, gsKt) {
    if (!gsKt || gsKt <= 0 || distNm < 0.05) return '00m 00s';
    const totalHours = distNm / gsKt;
    const totalSec = Math.round(totalHours * 3600);
    if (totalSec < 60) return `${totalSec}s`;
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, '0')}m`;
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function renderMeasureOverlay() {
    if (!measureLayerGroup || !measureStartLatLng || !measureEndLatLng || typeof L === 'undefined') return;

    const p1 = [measureStartLatLng.lat, measureStartLatLng.lng];
    const p2 = [measureEndLatLng.lat, measureEndLatLng.lng];
    const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

    const distNm = computeDistanceNm(p1[0], p1[1], p2[0], p2[1]);
    const distKm = distNm * 1.852;
    const trueBrg = Math.round(computeBearingDeg(p1[0], p1[1], p2[0], p2[1])) || 360;
    const magVar = getMagneticDeclinationDeg(mid[0], mid[1]);
    let magBrg = Math.round((trueBrg - magVar + 360) % 360);
    if (magBrg === 0) magBrg = 360;

    const gsKt = getEffectiveGroundSpeedKt();
    const eteStr = formatMeasureEte(distNm, gsKt);

    const badgeHtml = `
        <div class="measure-info-badge" onclick="clearMeasureTool(true)" title="Clicca per cancellare il righello">
            <div class="m-row-main">
                <span>📏 ${distNm.toFixed(1)} NM</span>
                <span style="color:#00d2ff;">${String(magBrg).padStart(3, '0')}°M</span>
                <span style="color:#cbd5e1;font-size:10px;">(${String(trueBrg).padStart(3, '0')}°T)</span>
            </div>
            <div class="m-row-sub">
                ⏱️ ETE: <b style="color:#34d399;">${eteStr}</b> @ ${gsKt} kt | ${distKm.toFixed(1)} km <span style="color:#f85149;margin-left:4px;">[✕]</span>
            </div>
        </div>
    `;

    if (!_measureLine) {
        measureLayerGroup.clearLayers();
        _measureLine = L.polyline([p1, p2], {
            color: '#fbbf24',
            weight: 2.8,
            dashArray: '7, 6',
            opacity: 0.95
        }).addTo(measureLayerGroup);

        const dotIcon = L.divIcon({ className: 'measure-pin-dot', iconSize: [12, 12], iconAnchor: [6, 6] });
        _measureStartMarker = L.marker(p1, { icon: dotIcon, interactive: false }).addTo(measureLayerGroup);
        _measureEndMarker = L.marker(p2, { icon: dotIcon, interactive: false }).addTo(measureLayerGroup);

        _measureBadgeMarker = L.marker(mid, {
            icon: L.divIcon({ className: '', html: badgeHtml, iconSize: null }),
            zIndexOffset: 1200
        }).addTo(measureLayerGroup);
    } else {
        _measureLine.setLatLngs([p1, p2]);
        _measureStartMarker.setLatLng(p1);
        _measureEndMarker.setLatLng(p2);
        _measureBadgeMarker.setLatLng(mid);
        _measureBadgeMarker.setIcon(L.divIcon({ className: '', html: badgeHtml, iconSize: null }));
    }
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

            const netRes = await window.pywebview.api.get_setting('net_overlay');
            if (netRes && netRes.success && netRes.value !== null && netRes.value !== undefined) {
                networkOverlayMode = String(netRes.value);
                updateNetworkOverlayButtonUI();
            }

            const spRes = await window.pywebview.api.get_setting('efb_scratchpad');
            if (spRes && spRes.success && spRes.value) {
                try {
                    scratchpadData = { ...scratchpadData, ...JSON.parse(spRes.value) };
                    populateScratchpadInputs();
                } catch (e) {}
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
        ensureWorldAirportsLayerUI();
        fetchAndRenderWorldAirportsInView();
        ensureWeatherOverlayUI();
        if (weatherOverlayEnabled) renderWeatherOverlay();
        ensureNetworkOverlayUI();
        if (networkOverlayMode !== 'off') {
            fetchAndRenderNetworkTraffic();
            if (!networkPollInterval) {
                networkPollInterval = setInterval(fetchAndRenderNetworkTraffic, 60000);
            }
        }
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