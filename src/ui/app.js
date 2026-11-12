// --- MODALITÀ TEMA VISIVO (☀️ GIORNO / 🌙 DARK / 🌑 NOTTE) & TOOLTIP SINTETICI ---
let currentThemeMode = localStorage.getItem('aeroglass_theme_mode') || 'dark';
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
        const target = e.target.closest('button, select, input, #sidebarToggleTab, #drawerToggleTab, .top-btn, .btn');
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

    ensureThemeToggleButton();
    ensureTooltipToggleButton();
    ensureDrawerToggleTab();
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

// --- HOOKS DI COLLEGAMENTO UI (VNAV ToD, NAVLOG, TOUCH) ---
function installTodAndTouchHooks() {
    if (window._todHooksInstalled) return;
    window._todHooksInstalled = true;

    if (typeof ensureNavlogAndFuelUI === 'function') ensureNavlogAndFuelUI();
    ensureDrawerToggleTab();
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
            if (typeof updateTopOfDescentOverlay === 'function') {
                setTimeout(updateTopOfDescentOverlay, 40);
            }
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
    if (!drawer) return;

    drawerOpen = !drawerOpen;
    drawer.classList.toggle('collapsed', !drawerOpen);
    if (arrow) arrow.innerText = drawerOpen ? '▼' : '▲';
    if (infoBar) infoBar.style.bottom = drawerOpen ? '134px' : '36px';
}

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
                if (ev.target?.result) await processAndRenderPlnXml(ev.target.result);
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

    if (!window.pywebview || !window.pywebview.api || typeof window.pywebview.api.get_initial_data !== 'function') return;
    if (initialized) return;
    initialized = true;

    updateFlightInfoBar(43.5, 12.0);
    setFollowState(followState);
    renderNavAids(vorsData, ilsData);
    updateMapScale();

    try {
        if (window.pywebview.api.get_setting) {
            const themeRes = await window.pywebview.api.get_setting('theme_mode');
            if (themeRes && themeRes.success && themeRes.value) await applyThemeMode(themeRes.value, false);

            const tipRes = await window.pywebview.api.get_setting('show_tooltips');
            if (tipRes && tipRes.success && tipRes.value !== null && tipRes.value !== undefined) {
                await applyTooltipsMode(tipRes.value !== 'false', false);
            }

            const fpRes = await window.pywebview.api.get_setting('fuel_perf_config');
            if (fpRes && fpRes.success && fpRes.value) {
                try { fuelPerfConfig = { ...fuelPerfConfig, ...JSON.parse(fpRes.value) }; } catch (e) {}
            }
        }

        const initData = await window.pywebview.api.get_initial_data();
        if (initData) {
            if (initData.fpl_ts) window._lastFplTs = initData.fpl_ts;
            if (initData.efb_info) updateEfbTopBarBadge(initData.efb_info);
            else if (typeof refreshEfbBadgeFromBackend === 'function') await refreshEfbBadgeFromBackend();

            if (initData.airports && initData.airports.length > 0) airportsData = [...initData.airports, ...EXTRA_AIRPORTS];
            if (initData.vors && initData.vors.length > 0) vorsData = initData.vors;
            if (initData.ils && initData.ils.length > 0) ilsData = initData.ils;

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

    if (typeof updateTopOfDescentOverlay === 'function') setTimeout(updateTopOfDescentOverlay, 250);

    setInterval(() => {
        if (!window._demoTourActive) pollTelemetry();
        if (typeof updateTodHeaderStatus === 'function') updateTodHeaderStatus();
    }, 1000);

    setInterval(() => {
        const lbl = document.getElementById('lblEfbNet');
        if (lbl && lbl.innerText.includes('...') && typeof refreshEfbBadgeFromBackend === 'function') {
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

    window.addEventListener('click', (event) => {
        if (event.target.id === 'createFplModal') closeCreateFplModal();
        else if (event.target.id === 'flightHistoryModal') closeFlightHistoryModal();
        else if (event.target.id === 'efbNetworkModal') closeEfbNetworkModal();
        else if (event.target.id === 'navlogModal') closeNavlogModal();
        else if (event.target.id === 'fuelPerfModal') closeFuelPerfModal();
    });

    setTimeout(initAeroGlassApp, 300);
});

window.addEventListener('pywebviewready', initAeroGlassApp);