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

function ensureFlyHudStrip() {
    if (document.getElementById('flyHudStrip')) return;
    const strip = document.createElement('div');
    strip.id = 'flyHudStrip';
    strip.className = 'fly-hud-strip glass-panel';
    strip.innerHTML = `
        <div class="fly-hud-block">
            <span class="fly-hud-lbl">NXT</span>
            <span id="hudNextWpt" class="fly-hud-val magenta">---</span>
        </div>
        <span class="fly-hud-sep">|</span>
        <div class="fly-hud-block">
            <span class="fly-hud-lbl">DST</span>
            <span id="hudNextDist" class="fly-hud-val cyan">--.- NM</span>
        </div>
        <span class="fly-hud-sep">|</span>
        <div class="fly-hud-block">
            <span class="fly-hud-lbl">ETE</span>
            <span id="hudNextEte" class="fly-hud-val emerald">--:--</span>
        </div>
        <span class="fly-hud-sep">|</span>
        <div class="fly-hud-block">
            <span class="fly-hud-lbl">WND</span>
            <span id="hudWindArrow" class="fly-hud-wind-arrow">↓</span>
            <span id="hudWindVal" class="fly-hud-val amber">---°/--kt</span>
        </div>
    `;
    document.body.appendChild(strip);
}

function computeGreatCircleNm(lat1, lon1, lat2, lon2) {
    const R = 3440.065;
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateFlyHudStrip() {
    ensureFlyHudStrip();
    const elWpt = document.getElementById('hudNextWpt');
    const elDist = document.getElementById('hudNextDist');
    const elEte = document.getElementById('hudNextEte');
    const elWnd = document.getElementById('hudWindVal');
    const elArr = document.getElementById('hudWindArrow');
    if (!elWpt || !elDist || !elEte || !elWnd) return;

    // 1. Estrazione coordinate aereo, Ground Speed, Heading e Vento da telemetria
    const tel = window.lastTelemetry || window.currentTelemetry || window.telemetryData || {};
    const acLat = tel.lat ?? tel.latitude ?? window.acftLat ?? (typeof lastAcftLat !== 'undefined' ? lastAcftLat : null);
    const acLon = tel.lon ?? tel.lng ?? tel.longitude ?? window.acftLon ?? (typeof lastAcftLon !== 'undefined' ? lastAcftLon : null);

    let gs = parseFloat(tel.gs ?? tel.ground_speed ?? tel.groundSpeed ?? window.currentGs ?? NaN);
    if (isNaN(gs)) {
        const gsDom = document.getElementById('valGs');
        if (gsDom) gs = parseFloat(gsDom.innerText);
    }

    let hdg = parseFloat(tel.hdg ?? tel.heading ?? window.currentHdg ?? 0);
    if (isNaN(hdg)) {
        const hdgDom = document.getElementById('valHdg');
        if (hdgDom) hdg = parseFloat(hdgDom.innerText) || 0;
    }

    // 2. Calcolo Prossimo Waypoint, Distanza (NM) ed ETE
    const fpl = (typeof flightPlan !== 'undefined' && Array.isArray(flightPlan)) ? flightPlan : [];
    if (fpl.length === 0) {
        elWpt.innerText = 'NO FPL';
        elDist.innerText = '--.- NM';
        elEte.innerText = '--:--';
    } else {
        let idx = (typeof activeWaypointIndex !== 'undefined' && activeWaypointIndex >= 0 && activeWaypointIndex < fpl.length)
            ? activeWaypointIndex
            : (fpl.length > 1 ? 1 : 0);

        // Se esiste una card evidenziata come active-wpt nella sidebar, sincronizza con quella
        const activeCard = document.querySelector('.wpt-card.active-wpt .wpt-icao');
        if (activeCard) {
            const foundIdx = fpl.findIndex(w => (w.icao || w.id || w.ident) === activeCard.innerText.trim());
            if (foundIdx !== -1) idx = foundIdx;
        } else if (acLat !== null && acLon !== null && fpl.length > 1) {
            // Trova il waypoint successivo più vicino davanti all'aereo
            let minD = Infinity;
            for (let i = 1; i < fpl.length; i++) {
                const d = computeGreatCircleNm(acLat, acLon, fpl[i].lat, fpl[i].lon);
                if (d < minD) { minD = d; idx = i; }
            }
        }

        const wp = fpl[idx] || fpl[fpl.length - 1];
        elWpt.innerText = wp.icao || wp.id || wp.ident || wp.name || 'WPT';

        let distNm = null;
        if (acLat !== null && acLon !== null && wp.lat !== undefined && wp.lon !== undefined) {
            distNm = computeGreatCircleNm(acLat, acLon, wp.lat, wp.lon);
        } else if (wp.dist !== undefined) {
            distNm = parseFloat(wp.dist);
        }

        if (distNm !== null && !isNaN(distNm)) {
            elDist.innerText = `${distNm.toFixed(1)} NM`;
            const effGs = (!isNaN(gs) && gs > 25) ? gs : 140;
            const totalMin = Math.round((distNm / effGs) * 60);
            const hh = Math.floor(totalMin / 60);
            const mm = totalMin % 60;
            elEte.innerText = hh > 0
                ? `${hh}h${String(mm).padStart(2, '0')}m`
                : `${String(mm).padStart(2, '0')} min`;
        } else {
            elDist.innerText = '--.- NM';
            elEte.innerText = '--:--';
        }
    }

    // 3. Lettura Vento corrente (Direzione, Intensità e Freccia Relativa)
    let wDir = tel.wind_dir ?? tel.windDir ?? tel.ambient_wind_direction ?? window.windDir ?? null;
    let wSpd = tel.wind_spd ?? tel.windSpd ?? tel.wind_vel ?? tel.ambient_wind_velocity ?? window.windSpd ?? null;

    if (wDir === null || wSpd === null) {
        const wxPills = document.querySelectorAll('.wx-pill');
        for (const pill of wxPills) {
            const m = pill.innerText.match(/(\d{3})°?\s*\/\s*(\d+)\s*kt/i);
            if (m) {
                wDir = parseInt(m[1], 10);
                wSpd = parseInt(m[2], 10);
                break;
            }
        }
    }

    if (wDir !== null && wSpd !== null && !isNaN(wDir) && !isNaN(wSpd)) {
        const dRound = Math.round((Number(wDir) % 360 + 360) % 360);
        const sRound = Math.round(Number(wSpd));
        elWnd.innerText = `${String(dRound).padStart(3, '0')}°/${String(sRound).padStart(2, '0')}kt`;
        if (elArr) {
            const relRot = (dRound + 180 - (hdg || 0)) % 360;
            elArr.style.transform = `rotate(${relRot}deg)`;
        }
    } else {
        elWnd.innerText = '---°/--kt';
    }
}

function updateUIModeButtonUI() {
    const btn = document.getElementById('btnToggleUIMode');
    if (!btn) return;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

    if (currentUIMode === 'simple') {
        btn.innerHTML = isEn ? '✈️ <span>FLY Mode</span>' : '✈️ <span>FLY (Semplice)</span>';
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
    ensureFlyHudStrip();
    document.body.classList.toggle('mode-simple', mode === 'simple');
    updateUIModeButtonUI();
    updateFlyHudStrip();

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
    btnOnlineTraffic: {
        it: "🌐 Traffico Online: Cicla tra OFF, rete VATSIM e rete IVAO in tempo reale sulla mappa",
        en: "🌐 Online Traffic: Cycle between OFF, live VATSIM and live IVAO network aircraft"
    },
    btnSettingsModal: {
        it: "⚙️ Impostazioni: Configura SimBrief ID, raggio traffico VATSIM/IVAO, tema e preferenze",
        en: "⚙️ Settings: Configure SimBrief ID, online traffic radius, theme and preferences"
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
    setInterval(syncCompass, 250);
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
    ensureOnlineTrafficAndSettingsUI();
    ensureDrawerToggleTab();
    ensureCompassRoseWidget();
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

// --- 🌐 TRAFFICO ONLINE LIVE (VATSIM / IVAO) & ⚙️ MODALE IMPOSTAZIONI ---
let onlineNetworkMode = localStorage.getItem('aeroglass_online_net') || 'off'; // 'off' | 'vatsim' | 'ivao'
let onlineTrafficRadiusNm = parseInt(localStorage.getItem('aeroglass_traffic_radius') || '180', 10);
let onlineTrafficLayer = null;
let onlineTrafficTimer = null;
let onlineTrafficFetching = false;

function ensureOnlineTrafficAndSettingsUI() {
    const pillsGroup = document.querySelector('.top-pills-group');
    if (!pillsGroup) return;

    // 1. Pulsante Toggle VATSIM / IVAO
    if (!document.getElementById('btnOnlineTraffic')) {
        const netBtn = document.createElement('button');
        netBtn.id = 'btnOnlineTraffic';
        netBtn.className = 'top-btn';
        netBtn.onclick = cycleOnlineNetworkMode;
        netBtn.style.justifyContent = 'center';

        const navaidsBtn = document.getElementById('btnToggleNavaids');
        if (navaidsBtn && navaidsBtn.parentNode === pillsGroup) {
            pillsGroup.insertBefore(netBtn, navaidsBtn.nextSibling);
        } else {
            pillsGroup.appendChild(netBtn);
        }
    }

    // 2. Pulsante Icona Impostazioni (⚙️)
    if (!document.getElementById('btnSettingsModal')) {
        const setBtn = document.createElement('button');
        setBtn.id = 'btnSettingsModal';
        setBtn.className = 'top-btn';
        setBtn.onclick = openSettingsModal;
        setBtn.style.justifyContent = 'center';
        setBtn.style.padding = '5px 10px';
        setBtn.innerHTML = '⚙️';
        pillsGroup.appendChild(setBtn);
    }

    ensureSettingsModalDOM();
    updateOnlineTrafficButtonUI();

    if (typeof map !== 'undefined' && map && !onlineTrafficLayer && typeof L !== 'undefined') {
        onlineTrafficLayer = L.layerGroup().addTo(map);
        map.on('moveend', () => {
            if (onlineNetworkMode !== 'off' && window._lastOnlinePilotsCache) {
                renderOnlineTrafficMarkers(window._lastOnlinePilotsCache, onlineNetworkMode);
            }
        });
    }
}

function updateOnlineTrafficButtonUI() {
    const btn = document.getElementById('btnOnlineTraffic');
    if (!btn) return;
    if (onlineNetworkMode === 'vatsim') {
        btn.innerHTML = '🌐 <span>VATSIM</span>';
        btn.style.borderColor = 'rgba(16, 185, 129, 0.65)';
        btn.style.color = '#34d399';
    } else if (onlineNetworkMode === 'ivao') {
        btn.innerHTML = '🌐 <span>IVAO</span>';
        btn.style.borderColor = 'rgba(56, 189, 248, 0.65)';
        btn.style.color = '#38bdf8';
    } else {
        btn.innerHTML = '🌐 <span>NET: OFF</span>';
        btn.style.borderColor = 'rgba(139, 148, 158, 0.3)';
        btn.style.color = '#8b949e';
    }
}

async function applyOnlineNetworkMode(mode, persist = true) {
    if (!['off', 'vatsim', 'ivao'].includes(mode)) mode = 'off';
    onlineNetworkMode = mode;
    ensureOnlineTrafficAndSettingsUI();
    updateOnlineTrafficButtonUI();

    const sel = document.getElementById('settingsNetSelect');
    if (sel) sel.value = onlineNetworkMode;

    if (onlineTrafficTimer) {
        clearInterval(onlineTrafficTimer);
        onlineTrafficTimer = null;
    }

    if (onlineNetworkMode === 'off') {
        if (onlineTrafficLayer) onlineTrafficLayer.clearLayers();
        window._lastOnlinePilotsCache = null;
    } else {
        await fetchAndRenderOnlineTraffic();
        onlineTrafficTimer = setInterval(fetchAndRenderOnlineTraffic, 15000);
    }

    try { localStorage.setItem('aeroglass_online_net', onlineNetworkMode); } catch (e) {}
    if (persist && window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try { await window.pywebview.api.save_setting('online_network', onlineNetworkMode); } catch (e) {}
    }
}

function cycleOnlineNetworkMode() {
    const order = ['off', 'vatsim', 'ivao'];
    const next = order[(order.indexOf(onlineNetworkMode) + 1) % order.length];
    applyOnlineNetworkMode(next, true);
}

async function fetchAndRenderOnlineTraffic() {
    if (onlineNetworkMode === 'off' || onlineTrafficFetching) return;
    if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;
    if (!onlineTrafficLayer) onlineTrafficLayer = L.layerGroup().addTo(map);

    onlineTrafficFetching = true;
    try {
        let pilots = [];
        if (onlineNetworkMode === 'vatsim') {
            const res = await fetch('https://data.vatsim.net/v3/vatsim-data.json');
            if (res.ok) {
                const data = await res.json();
                pilots = (data.pilots || []).map(p => ({
                    callsign: p.callsign || 'N/A',
                    lat: p.latitude,
                    lon: p.longitude,
                    alt: p.altitude || 0,
                    gs: p.groundspeed || 0,
                    hdg: p.heading || 0,
                    dep: p.flight_plan?.departure || '---',
                    arr: p.flight_plan?.arrival || '---',
                    acft: p.flight_plan?.aircraft_short || p.flight_plan?.aircraft_faa || 'ACFT'
                }));
            }
        } else if (onlineNetworkMode === 'ivao') {
            const res = await fetch('https://api.ivao.aero/v2/tracker/whazzup');
            if (res.ok) {
                const data = await res.json();
                const rawPilots = data.clients?.pilots || [];
                pilots = rawPilots.map(p => ({
                    callsign: p.callsign || 'N/A',
                    lat: p.lastTrack?.latitude,
                    lon: p.lastTrack?.longitude,
                    alt: p.lastTrack?.altitude || 0,
                    gs: p.lastTrack?.groundSpeed || 0,
                    hdg: p.lastTrack?.heading || 0,
                    dep: p.flightPlan?.departureId || '---',
                    arr: p.flightPlan?.arrivalId || '---',
                    acft: p.flightPlan?.aircraftId || 'ACFT'
                }));
            }
        }
        window._lastOnlinePilotsCache = pilots;
        renderOnlineTrafficMarkers(pilots, onlineNetworkMode);
    } catch (e) {
    } finally {
        onlineTrafficFetching = false;
    }
}

function renderOnlineTrafficMarkers(pilots, netMode) {
    if (!onlineTrafficLayer || typeof map === 'undefined' || !map) return;
    onlineTrafficLayer.clearLayers();
    if (!Array.isArray(pilots) || pilots.length === 0) return;

    const c = map.getCenter();
    const color = netMode === 'vatsim' ? '#34d399' : '#38bdf8';
    const netBadge = netMode.toUpperCase();
    let count = 0;

    for (const p of pilots) {
        if (p.lat === undefined || p.lon === undefined || isNaN(p.lat) || isNaN(p.lon)) continue;
        const distNm = computeGreatCircleNm(c.lat, c.lng, p.lat, p.lon);
        if (distNm > onlineTrafficRadiusNm) continue;

        const rot = ((Number(p.hdg) || 0) - 45);
        const fl = p.alt >= 5000 ? `FL${String(Math.round(p.alt / 100)).padStart(3, '0')}` : `${Math.round(p.alt)}ft`;

        const m = L.marker([p.lat, p.lon], {
            icon: L.divIcon({
                className: 'online-traffic-icon',
                html: `
                    <div class="online-acft-glyph" style="color:${color};transform:rotate(${rot}deg);">✈️</div>
                    <div class="online-acft-tag" style="border-color:${color}66;">${p.callsign}</div>
                `,
                iconSize: [56, 30],
                iconAnchor: [28, 15]
            })
        }).addTo(onlineTrafficLayer);

        m.bindTooltip(
            `<div style="font-family:Consolas,monospace;font-size:11px;line-height:1.45;">
                <b style="color:${color};">[${netBadge}] ${p.callsign}</b> <span style="color:#94a3b8;">(${p.acft})</span><br>
                🛫 <b>${p.dep}</b> ➔ 🛬 <b>${p.arr}</b><br>
                ALT: <b>${fl}</b> | GS: <b>${Math.round(p.gs)} kt</b> | HDG: <b>${String(Math.round(p.hdg)).padStart(3, '0')}°</b>
            </div>`,
            { direction: 'top', className: 'vnav-route-tooltip' }
        );

        count++;
        if (count >= 160) break;
    }
}

function ensureSettingsModalDOM() {
    if (document.getElementById('aeroSettingsModal')) return;
    const modal = document.createElement('div');
    modal.id = 'aeroSettingsModal';
    modal.className = 'custom-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="modal-content glass-panel" style="max-width:440px;width:92%;padding:18px 20px;border:1px solid rgba(0,210,255,0.45);border-radius:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid rgba(148,163,184,0.2);">
                <h3 style="margin:0;font-size:14px;color:#00d2ff;display:flex;align-items:center;gap:8px;">⚙️ <span id="settingsModalTitle">IMPOSTAZIONI AEROGLASS NAV</span></h3>
                <button class="top-btn" onclick="closeSettingsModal()" style="padding:2px 8px;font-size:12px;">✕</button>
            </div>

            <div class="settings-modal-row">
                <div>
                    <span class="settings-modal-lbl">SimBrief Pilot ID / Username</span>
                    <span class="settings-modal-sub">ID predefinito per importazione rapida OFP</span>
                </div>
                <input id="settingsSimbriefInput" type="text" placeholder="es. 312844" style="width:120px;padding:5px 8px;background:rgba(9,13,19,0.9);border:1px solid rgba(148,163,184,0.35);border-radius:6px;color:#f0f6fc;font-family:Consolas,monospace;font-size:12px;text-align:center;">
            </div>

            <div class="settings-modal-row">
                <div>
                    <span class="settings-modal-lbl">Rete Traffico Online</span>
                    <span class="settings-modal-sub">Mostra aerei live VATSIM o IVAO intorno alla mappa</span>
                </div>
                <select id="settingsNetSelect" onchange="applyOnlineNetworkMode(this.value, true)" style="padding:5px 8px;background:#0d1117;border:1px solid rgba(0,210,255,0.4);border-radius:6px;color:#f0f6fc;font-size:12px;">
                    <option value="off">Disattivato (OFF)</option>
                    <option value="vatsim">VATSIM Live</option>
                    <option value="ivao">IVAO Whazzup</option>
                </select>
            </div>

            <div class="settings-modal-row">
                <div>
                    <span class="settings-modal-lbl">Raggio Filtro Traffico (NM)</span>
                    <span class="settings-modal-sub">Distanza massima dal centro mappa</span>
                </div>
                <select id="settingsTrafficRadius" onchange="updateTrafficRadiusSetting(this.value)" style="padding:5px 8px;background:#0d1117;border:1px solid rgba(148,163,184,0.35);border-radius:6px;color:#f0f6fc;font-size:12px;">
                    <option value="80">80 NM</option>
                    <option value="180">180 NM</option>
                    <option value="350">350 NM</option>
                    <option value="600">600 NM</option>
                </select>
            </div>

            <div class="settings-modal-row">
                <div>
                    <span class="settings-modal-lbl">Modalità Interfaccia</span>
                    <span class="settings-modal-sub">Estesa (Pianificazione) o FLY (Mini-HUD)</span>
                </div>
                <button class="top-btn" onclick="toggleUIMode()" style="min-width:110px;justify-content:center;">Cambia Vista</button>
            </div>

            <div class="settings-modal-row">
                <div>
                    <span class="settings-modal-lbl">Tema Cockpit & Suggerimenti</span>
                    <span class="settings-modal-sub">Cicla tema visivo o attiva/disattiva i tooltip</span>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="top-btn" onclick="toggleThemeMode()">🌙 Tema</button>
                    <button class="top-btn" onclick="applyTooltipsMode(!tooltipsEnabled, true)">💬 Info</button>
                </div>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
                <button class="top-btn" onclick="saveSettingsFromModal()" style="border-color:#00d2ff;color:#00d2ff;padding:6px 16px;font-weight:700;">💾 Salva & Chiudi</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function updateTrafficRadiusSetting(val) {
    onlineTrafficRadiusNm = parseInt(val, 10) || 180;
    try { localStorage.setItem('aeroglass_traffic_radius', String(onlineTrafficRadiusNm)); } catch (e) {}
    if (onlineNetworkMode !== 'off' && window._lastOnlinePilotsCache) {
        renderOnlineTrafficMarkers(window._lastOnlinePilotsCache, onlineNetworkMode);
    }
}

function openSettingsModal() {
    ensureSettingsModalDOM();
    const modal = document.getElementById('aeroSettingsModal');
    if (!modal) return;

    const sbMain = document.getElementById('simbriefIdInput');
    const sbSet = document.getElementById('settingsSimbriefInput');
    if (sbSet && sbMain) sbSet.value = sbMain.value || '';

    const netSel = document.getElementById('settingsNetSelect');
    if (netSel) netSel.value = onlineNetworkMode;

    const radSel = document.getElementById('settingsTrafficRadius');
    if (radSel) radSel.value = String(onlineTrafficRadiusNm);

    modal.style.display = 'flex';
}

function closeSettingsModal() {
    const modal = document.getElementById('aeroSettingsModal');
    if (modal) modal.style.display = 'none';
}

async function saveSettingsFromModal() {
    const sbSet = document.getElementById('settingsSimbriefInput');
    const sbMain = document.getElementById('simbriefIdInput');
    if (sbSet && sbSet.value.trim()) {
        const val = sbSet.value.trim();
        if (sbMain) sbMain.value = val;
        if (window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
            try { await window.pywebview.api.save_setting('simbrief_id', val); } catch (e) {}
        }
    }
    closeSettingsModal();
}

// --- HOOKS DI COLLEGAMENTO UI (VNAV ToD, NAVLOG, TOUCH) ---

// --- 🗺️ DATABASE TOPOGRAFICO LOCALE AFFIDABILE (STANDARD PROFESSIONALE) ---
const CUSTOM_APT_LAYOUTS = {
    LIPZ: {
        name: "Venezia Marco Polo (LIPZ)",
        lat: 45.5053, lon: 12.3519,
        runways: [
            // Piste reali uniche e pulite di LIPZ (04R/22L e 04L/22R)
            { ref: "04R/22L", width: 45, surface: "asphalt", coords: [[45.4912, 12.3325], [45.5186, 12.3654]] },
            { ref: "04L/22R", width: 45, surface: "asphalt", coords: [[45.4954, 12.3278], [45.5228, 12.3607]] }
        ],
        taxiways: [
            // Raccordi principali puliti senza doppioni
            { ref: "A", coords: [[45.5012, 12.3390], [45.5100, 12.3480]] },
            { ref: "B", coords: [[45.4980, 12.3350], [45.5050, 12.3430]] },
            { ref: "C", coords: [[45.5030, 12.3410], [45.5080, 12.3450]] },
            { ref: "M", coords: [[45.4940, 12.3300], [45.5150, 12.3600]] }
        ],
        aprons: [
            // Piazzale commerciale principale circoscritto e pulito
            [[45.5035, 12.3410], [45.5035, 12.3460], [45.5085, 12.3460], [45.5085, 12.3410]]
        ],
        stands: [
            // Parcheggi ufficiali e posizionamento esatto del Gate 116
            { ref: "114", lat: 45.5065, lon: 12.3438 },
            { ref: "115", lat: 45.5069, lon: 12.3442 },
            { ref: "116", lat: 45.5073, lon: 12.3446 }, // <- Il tuo aereo parcheggiato qui
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
    if (Array.isArray(airportsData)) {
        let best = null;
        let minDist = 0.05;
        for (const apt of airportsData) {
            const d = Math.hypot(lat - apt.lat, lon - apt.lon);
            if (d < minDist) {
                minDist = d;
                best = apt;
            }
        }
        if (best) return best;
    }
    if (Array.isArray(flightPlan)) {
        for (const wp of flightPlan) {
            if (Math.hypot(lat - wp.lat, lon - wp.lon) < 0.045) {
                return { icao: wp.icao || wp.id, name: wp.name || wp.icao, lat: wp.lat, lon: wp.lon };
            }
        }
    }
    return null;
}

async function evaluateAirportGroundMap() {
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
    const cacheKey = nearApt ? nearApt.icao : `${center.lat.toFixed(2)}_${center.lng.toFixed(2)}`;

    if (lastRenderedGroundKey === cacheKey) return;
    lastRenderedGroundKey = cacheKey;

    if (badge && badgeName) {
        badge.style.display = 'flex';
        badgeName.innerText = nearApt ? `${nearApt.icao} - ${nearApt.name || 'GROUND CHART'}` : 'LOADING TAXI/GATES...';
    }

if (nearApt && nearApt.custom) {
        renderCustomAirportLayout(nearApt.custom);
        return; // Interrompe ed evita di scaricare dati OSM rumorosi se abbiamo il layout pulito locale
    } else if (nearApt && CUSTOM_APT_LAYOUTS[nearApt.icao]) {
        renderCustomAirportLayout(CUSTOM_APT_LAYOUTS[nearApt.icao]);
        return; // Interrompe ed usa esclusivamente il database locale validato
    }

    // Per gli altri aeroporti senza layout custom locale, fallback pulito
    const refLat = nearApt ? nearApt.lat : center.lat;
    const refLon = nearApt ? nearApt.lon : center.lon;

    if (groundOsmCache[cacheKey]) {
        renderOsmAirportLayout(groundOsmCache[cacheKey], nearApt);
        return;
    }

    if (groundFetchInProgress) return;
    groundFetchInProgress = true;

    try {
        const delta = 0.042;
        const bbox = `${(refLat - delta).toFixed(4)},${(refLon - delta).toFixed(4)},${(refLat + delta).toFixed(4)},${(refLon + delta).toFixed(4)}`;
        const query = `[out:json][timeout:15];(way["aeroway"~"runway|taxiway|apron|taxilane|parking_position"](${bbox});node["aeroway"~"parking_position|gate|holding_position"](${bbox});way["aeroway"~"gate|parking_position"](${bbox}););out body geom;`;
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query)
        });
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.elements) && data.elements.length > 0) {
                groundOsmCache[cacheKey] = data.elements;
                if (lastRenderedGroundKey === cacheKey) {
                    renderOsmAirportLayout(data.elements, nearApt);
                }
            }
        }
    } catch (e) {
    } finally {
        groundFetchInProgress = false;
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

function renderOsmAirportLayout(elements, nearApt) {
    if (!groundLayerGroup || !Array.isArray(elements)) return;
    if (!nearApt || !CUSTOM_APT_LAYOUTS[nearApt.icao]) {
        groundLayerGroup.clearLayers();
    }

    const shownTwyLabels = new Set();

    elements.filter(el => el.type === 'way' && el.tags?.aeroway === 'apron' && el.geometry).forEach(el => {
        const latlngs = el.geometry.map(pt => [pt.lat, pt.lon]);
        L.polygon(latlngs, {
            color: '#475569',
            weight: 1,
            fillColor: '#1e293b',
            fillOpacity: 0.5,
            interactive: false
        }).addTo(groundLayerGroup);
    });

    elements.filter(el => el.type === 'way' && (el.tags?.aeroway === 'taxiway' || el.tags?.aeroway === 'taxilane') && el.geometry).forEach(el => {
        const latlngs = el.geometry.map(pt => [pt.lat, pt.lon]);
        const isLane = el.tags.aeroway === 'taxilane';
        L.polyline(latlngs, {
            color: isLane ? '#eab308' : '#f59e0b',
            weight: isLane ? 2.2 : 3.8,
            opacity: 0.85,
            dashArray: isLane ? '4, 4' : null
        }).addTo(groundLayerGroup);

        const ref = el.tags.ref || el.tags.name;
        if (ref && latlngs.length >= 2 && !shownTwyLabels.has(ref)) {
            shownTwyLabels.add(ref);
            const mid = latlngs[Math.floor(latlngs.length / 2)];
            L.marker(mid, {
                icon: L.divIcon({
                    className: 'apt-twy-label',
                    html: ref,
                    iconSize: null
                }),
                interactive: false
            }).addTo(groundLayerGroup);
        }
    });

    elements.filter(el => el.type === 'way' && el.tags?.aeroway === 'runway' && el.geometry).forEach(el => {
        const latlngs = el.geometry.map(pt => [pt.lat, pt.lon]);
        const isGrass = (el.tags.surface || '').includes('grass') || (el.tags.surface || '').includes('turf');
        L.polyline(latlngs, {
            color: isGrass ? '#15803d' : '#334155',
            weight: 14,
            opacity: 0.92,
            lineCap: 'butt'
        }).addTo(groundLayerGroup);

        L.polyline(latlngs, {
            color: isGrass ? '#86efac' : '#f8fafc',
            weight: 1.5,
            dashArray: '8, 8',
            opacity: 0.88
        }).addTo(groundLayerGroup);

        const ref = el.tags.ref;
        if (ref && latlngs.length >= 2) {
            const parts = ref.split('/');
            L.marker(latlngs[0], {
                icon: L.divIcon({ className: 'apt-rwy-thr-label', html: parts[0] || ref, iconSize: null }),
                interactive: false
            }).addTo(groundLayerGroup);
            if (parts[1]) {
                L.marker(latlngs[latlngs.length - 1], {
                    icon: L.divIcon({ className: 'apt-rwy-thr-label', html: parts[1], iconSize: null }),
                    interactive: false
                }).addTo(groundLayerGroup);
            }
        }
    });

    const getElementCenter = (el) => {
        if (el.lat !== undefined && el.lon !== undefined) return { lat: el.lat, lon: el.lon };
        if (el.geometry && Array.isArray(el.geometry) && el.geometry.length > 0) {
            let sumLat = 0, sumLon = 0;
            el.geometry.forEach(pt => { sumLat += pt.lat; sumLon += pt.lon; });
            return { lat: sumLat / el.geometry.length, lon: sumLon / el.geometry.length };
        }
        return null;
    };

    elements.forEach(el => {
        const tags = el.tags || {};
        const aw = tags.aeroway;
        const isStand = (aw === 'parking_position' || aw === 'gate' || tags.gate || ta+gs.stand || tags['aeroway:ref']);
        if (!isStand) return;

        const ref = tags.ref || tags.gate || tags.stand || tags['aeroway:ref'] || tags.name;
        if (!ref || ref.length > 6) return;

        const center = getElementCenter(el);
        if (!center) return;

        const m = L.marker([center.lat, center.lon], {
            icon: L.divIcon({
                className: 'apt-stand-marker',
                html: ref,
                iconSize: [23, 23]
            })
        }).addTo(groundLayerGroup);
        m.bindTooltip(`🅿️ Stand / Gate <b>${ref}</b><br><span style="font-size:10px;color:#94a3b8;">Lat: ${center.lat.toFixed(5)} Lon: ${center.lon.toFixed(5)}</span>`, {
            direction: 'top',
            className: 'vnav-route-tooltip'
        });
    });
}

// --- HOOKS DI COLLEGAMENTO UI (VNAV ToD, NAVLOG, TOUCH) ---
function installTodAndTouchHooks() {
    if (window._todHooksInstalled) return;
    window._todHooksInstalled = true;

    if (typeof ensureNavlogAndFuelUI === 'function') ensureNavlogAndFuelUI();
    ensureDrawerToggleTab();
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

            const fpRes = await window.pywebview.api.get_setting('fuel_perf_config');
            if (fpRes && fpRes.success && fpRes.value) {
                try { fuelPerfConfig = { ...fuelPerfConfig, ...JSON.parse(fpRes.value) }; } catch (e) {}
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
    } catch (e) {}

    if (typeof updateTopOfDescentOverlay === 'function') setTimeout(updateTopOfDescentOverlay, 250);

    setInterval(() => {
        if (!window._demoTourActive && typeof pollTelemetry === 'function') pollTelemetry();
        if (typeof updateTodHeaderStatus === 'function') updateTodHeaderStatus();
        if (typeof updateFlyHudStrip === 'function') updateFlyHudStrip();
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
    if (typeof updateFlightInfoBar === 'function') updateFlightInfoBar(43.5, 12.0);
    if (typeof setFollowState === 'function') setFollowState(followState);
    if (typeof renderNavAids === 'function') renderNavAids(vorsData, ilsData);
    if (typeof updateMapScale === 'function') updateMapScale();

    window.addEventListener('click', (event) => {
        if (event.target.id === 'createFplModal' && typeof closeCreateFplModal === 'function') closeCreateFplModal();
        else if (event.target.id === 'flightHistoryModal' && typeof closeFlightHistoryModal === 'function') closeFlightHistoryModal();
        else if (event.target.id === 'efbNetworkModal' && typeof closeEfbNetworkModal === 'function') closeEfbNetworkModal();
        else if (event.target.id === 'navlogModal' && typeof closeNavlogModal === 'function') closeNavlogModal();
        else if (event.target.id === 'fuelPerfModal' && typeof closeFuelPerfModal === 'function') closeFuelPerfModal();
        else if (event.target.id === 'aeroSettingsModal' && typeof closeSettingsModal === 'function') closeSettingsModal();
    });

    applyOnlineNetworkMode(onlineNetworkMode, false);
    setTimeout(initAeroGlassApp, 300);
});

window.addEventListener('pywebviewready', initAeroGlassApp);
