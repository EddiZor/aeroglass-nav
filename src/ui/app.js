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
        it: "📲 Invia a MSFS: Carica direttamente il Piano di Volo attivo nel sistema di navigazione dell'aeromobile in uso",
        en: "📲 Send to MSFS: Directly load the active Flight Plan into the current aircraft's navigation system"
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
    },
    simbriefEditIdBtn: {
        it: "⚙️ Modifica PilotID",
        en: "⚙️ Edit PilotID"
    },
    btnOpenGlossary: {
        it: "📖 Glossario Funzioni: Apre nel browser l'elenco alfabetico IT/EN delle funzioni",
        en: "📖 Feature Glossary: Opens the alphabetical IT/EN feature reference in your browser"
    },
    btnOpenCredits: {
        it: "ℹ️ Credits, Licenza, Link Community e Disclaimer",
        en: "ℹ️ Credits, License, Community Links & Disclaimer"
    },
    btnToggleRadar: {
        it: "🌧️ Radar Meteo Live: Mostra/nascondi precipitazioni e temporali in tempo reale (RainViewer)",
        en: "🌧️ Live Weather Radar: Toggle real-time rain and storm precipitation radar (RainViewer)"
    }
};

// ==============================================================================
// MODULO RADAR METEO PRECIPITAZIONI LIVE (RAINVIEWER API V2)
// ==============================================================================
let weatherRadarState = {
    enabled: false,
    host: "https://tilecache.rainviewer.com",
    frames: [],
    currentFrameIdx: -1,
    layer: null,
    isPlaying: false,
    timer: null,
    refreshInterval: null
};

function injectWeatherRadarStyles() {
    if (document.getElementById('weatherRadarStyles')) return;
    const s = document.createElement('style');
    s.id = 'weatherRadarStyles';
    s.textContent = `
        /* Disattiva contorno rettangolare di focus Chromium sulle geometrie e percorsi SVG */
        path.leaflet-interactive:focus,
        svg.leaflet-zoom-animated:focus,
        .leaflet-container:focus,
        .leaflet-interactive:focus {
            outline: none !important;
        }

        #weatherRadarBar {
            position: fixed;
            bottom: 140px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(56, 189, 248, 0.45);
            border-radius: 999px;
            padding: 4px 14px;
            display: none;
            align-items: center;
            gap: 10px;
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(6px);
            font-family: 'Segoe UI', system-ui, sans-serif;
            color: #f8fafc;
            user-select: none;
            transition: bottom 0.25s ease;
        }
        #btnRadarPlay {
            background: rgba(56, 189, 248, 0.2);
            border: 1px solid rgba(56, 189, 248, 0.6);
            color: #38bdf8;
            border-radius: 50%;
            width: 26px;
            height: 26px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.15s ease;
            padding: 0;
        }
        #btnRadarPlay:hover {
            background: rgba(56, 189, 248, 0.35);
            transform: scale(1.08);
        }
        #radarTimeSlider {
            -webkit-appearance: none;
            appearance: none;
            width: 140px;
            height: 4px;
            background: rgba(148, 163, 184, 0.35);
            border-radius: 2px;
            outline: none;
            cursor: pointer;
        }
        #radarTimeSlider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #38bdf8;
            box-shadow: 0 0 8px #38bdf8;
            cursor: pointer;
        }
        #radarTimeLabel {
            font-size: 11.5px;
            font-family: 'Consolas', monospace;
            font-weight: 700;
            color: #38bdf8;
            min-width: 95px;
            text-align: right;
        }
        #btnToggleRadar {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 7px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(148, 163, 184, 0.35);
            color: #e2e8f0;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s ease;
        }
        #btnToggleRadar:hover {
            background: rgba(56, 189, 248, 0.15);
            border-color: rgba(56, 189, 248, 0.5);
            color: #38bdf8;
        }
        #btnToggleRadar.btn-radar-active {
            background: rgba(56, 189, 248, 0.28) !important;
            border-color: #38bdf8 !important;
            color: #38bdf8 !important;
            box-shadow: 0 0 12px rgba(56, 189, 248, 0.45) !important;
        }
    `;
    document.head.appendChild(s);
}

function ensureWeatherRadarUI() {
    injectWeatherRadarStyles();
    if (document.getElementById('weatherRadarBar')) return;

    const bar = document.createElement('div');
    bar.id = 'weatherRadarBar';
    bar.innerHTML = `
        <span style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:#94a3b8;display:flex;align-items:center;gap:4px;">
            🌧️ <span style="color:#e2e8f0;">RADAR</span>
        </span>
        <button id="btnRadarPlay" type="button" title="Play / Pause Animazione" onclick="toggleRadarPlayback()">▶</button>
        <input id="radarTimeSlider" type="range" min="0" max="0" value="0" step="1" oninput="onRadarSliderChange(this.value)">
        <span id="radarTimeLabel">--:-- UTC</span>
    `;
    document.body.appendChild(bar);
}

function formatRadarTime(timestamp) {
    if (!timestamp) return '--:-- UTC';
    const d = new Date(timestamp * 1000);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm} UTC`;
}

async function loadRainViewerData() {
    try {
        const resp = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        weatherRadarState.host = data.host || "https://tilecache.rainviewer.com";
        const past = (data.radar && Array.isArray(data.radar.past)) ? data.radar.past : [];
        const nowcast = (data.radar && Array.isArray(data.radar.nowcast)) ? data.radar.nowcast : [];

        // Considera gli ultimi 60-70 minuti di radar (ultimi 6-7 frame passati) + 1 frame nowcast se presente
        const recentPast = past.slice(-7);
        const combined = [...recentPast, ...nowcast.slice(0, 1)];

        if (combined.length === 0) return false;

        weatherRadarState.frames = combined;
        const slider = document.getElementById('radarTimeSlider');
        if (slider) {
            slider.max = combined.length - 1;
            // Di default mostra il frame più recente (LIVE)
            slider.value = combined.length - 1;
        }

        setRadarFrame(combined.length - 1);
        return true;
    } catch (err) {
        console.warn("[WeatherRadar] Errore caricamento API RainViewer:", err);
        return false;
    }
}

function setRadarFrame(idx) {
    if (!weatherRadarState.frames || weatherRadarState.frames.length === 0) return;
    idx = Math.max(0, Math.min(idx, weatherRadarState.frames.length - 1));
    weatherRadarState.currentFrameIdx = idx;

    const frame = weatherRadarState.frames[idx];
    const tileUrl = `${weatherRadarState.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;

    if (weatherRadarState.layer && typeof map !== 'undefined' && map) {
        weatherRadarState.layer.setUrl(tileUrl);
    } else if (typeof map !== 'undefined' && map) {
        weatherRadarState.layer = L.tileLayer(tileUrl, {
            tileSize: 256,
            opacity: 0.68,
            minZoom: 2,
            maxZoom: 18,
            maxNativeZoom: 7,
            zIndex: 350
        });
        // Se il CDN RainViewer va in errore o rate-limit, ferma l'animazione per non intasare la rete
        weatherRadarState.layer.on('tileerror', () => {
            if (weatherRadarState.isPlaying) stopRadarPlayback();
        });
        weatherRadarState.layer.addTo(map);
    }

    const slider = document.getElementById('radarTimeSlider');
    if (slider) slider.value = idx;

    const label = document.getElementById('radarTimeLabel');
    if (label) {
        const isLatest = (idx === weatherRadarState.frames.length - 1);
        const diffMin = Math.round((frame.time - (Date.now() / 1000)) / 60);
        let tag = isLatest ? " (LIVE)" : (diffMin < 0 ? ` (${diffMin}m)` : ` (+${diffMin}m)`);
        label.innerHTML = `${formatRadarTime(frame.time)}<span style="font-size:9.5px;opacity:0.8;">${tag}</span>`;
    }
}

function onRadarSliderChange(val) {
    stopRadarPlayback();
    setRadarFrame(parseInt(val, 10));
}

function toggleRadarPlayback() {
    if (weatherRadarState.isPlaying) {
        stopRadarPlayback();
    } else {
        startRadarPlayback();
    }
}

function startRadarPlayback() {
    if (weatherRadarState.frames.length <= 1) return;
    weatherRadarState.isPlaying = true;
    const playBtn = document.getElementById('btnRadarPlay');
    if (playBtn) playBtn.innerHTML = '⏸';

    if (weatherRadarState.timer) clearInterval(weatherRadarState.timer);
    weatherRadarState.timer = setInterval(() => {
        let nextIdx = weatherRadarState.currentFrameIdx + 1;
        if (nextIdx >= weatherRadarState.frames.length) nextIdx = 0;
        setRadarFrame(nextIdx);
    }, 1800);
}

function stopRadarPlayback() {
    weatherRadarState.isPlaying = false;
    const playBtn = document.getElementById('btnRadarPlay');
    if (playBtn) playBtn.innerHTML = '▶';
    if (weatherRadarState.timer) {
        clearInterval(weatherRadarState.timer);
        weatherRadarState.timer = null;
    }
}

async function toggleWeatherRadar() {
    ensureWeatherRadarUI();
    const btn = document.getElementById('btnToggleRadar');
    const bar = document.getElementById('weatherRadarBar');

    weatherRadarState.enabled = !weatherRadarState.enabled;

    if (btn) btn.classList.toggle('btn-radar-active', weatherRadarState.enabled);
    if (bar) bar.style.display = weatherRadarState.enabled ? 'flex' : 'none';

    if (weatherRadarState.enabled) {
        const ok = await loadRainViewerData();
        if (!ok && bar) bar.style.display = 'none';

        if (weatherRadarState.refreshInterval) clearInterval(weatherRadarState.refreshInterval);
        weatherRadarState.refreshInterval = setInterval(loadRainViewerData, 10 * 60 * 1000);
    } else {
        stopRadarPlayback();
        if (weatherRadarState.refreshInterval) {
            clearInterval(weatherRadarState.refreshInterval);
            weatherRadarState.refreshInterval = null;
        }
        if (weatherRadarState.layer && typeof map !== 'undefined' && map) {
            map.removeLayer(weatherRadarState.layer);
            weatherRadarState.layer = null;
        }
    }
}

function ensureWeatherRadarTopBarButton() {
    if (document.getElementById('btnToggleRadar')) return;
    const pillsGroup = document.querySelector('.top-pills-group');
    if (!pillsGroup) return;

    const btn = document.createElement('button');
    btn.id = 'btnToggleRadar';
    btn.type = 'button';
    btn.className = 'pill-btn';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '5px';
    btn.innerHTML = '🌧️ <span>Radar</span>';
    btn.onclick = () => toggleWeatherRadar();

    // Inserisce il pulsante Radar prima del tasto Credits
    const creditsBtn = document.getElementById('btnOpenCredits');
    if (creditsBtn && creditsBtn.parentNode === pillsGroup) {
        pillsGroup.insertBefore(btn, creditsBtn);
    } else {
        pillsGroup.appendChild(btn);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            ensureWeatherRadarTopBarButton();
            ensureWeatherRadarUI();
        }, 260);
    });
} else {
    setTimeout(() => {
        ensureWeatherRadarTopBarButton();
        ensureWeatherRadarUI();
    }, 260);
}

// --- FINESTRA CREDITS (BILINGUE EN/IT CON DEFAULT INGLESE E SCROLL) ---
const CREDITS_LINKS = {
    flightsimTo: "https://flightsim.to/file/00000/aeroglass-nav",
    discord: "https://discord.gg/placeholder-invite",
    buyMeACoffee: "https://buymeacoffee.com/placeholder-user"
};

let creditsModalLang = 'en';

const CREDITS_CONTENT = {
    en: {
        title: "About AeroGlass-Nav",
        subtitle: "Standalone EFB & Moving Map for Microsoft Flight Simulator 2024",
        authorLabel: "Author",
        authorValue: "Eddi Zorzini (EddiZor) — © 2026",
        desc: "A completely standalone flight planner, moving map and tablet EFB powered by local SQLite storage and direct MSFS 2024 SimConnect telemetry, with no external subscriptions required.",
        linksTitle: "Community & Support",
        linkFlightsim: "Flightsim.to Page",
        linkDiscord: "Discord Community",
        linkCoffee: "Buy Me a Coffee",
        attrTitle: "Data Sources & Open Source",
        attrList: [
            "<strong>Map Tiles:</strong> Esri / ArcGIS (Street, Canvas, Imagery), OpenTopoMap & © OpenStreetMap contributors.",
            "<strong>Aviation Data:</strong> OurAirports (airports & runways), SimBrief API (OFP import), MSFS 2024 SimConnect (live telemetry & native ground layouts).",
            "<strong>Core Stack:</strong> Python, pywebview, Leaflet.js, Python-SimConnect, SQLite."
        ],
        licenseTitle: "License & Terms of Use",
        licenseText: "Freeware / Open Source (MIT License) — free for personal use, not for resale.",
        disclaimerTitle: "Aviation Disclaimer",
        disclaimerText: "For flight simulation use only (Microsoft Flight Simulator 2024). Not for real-world navigation.",
        closeBtn: "Close"
    },
    it: {
        title: "Informazioni su AeroGlass-Nav",
        subtitle: "EFB & Moving Map autonoma per Microsoft Flight Simulator 2024",
        authorLabel: "Autore",
        authorValue: "Eddi Zorzini (EddiZor) — © 2026",
        desc: "Pianificatore di volo, moving map ed EFB per tablet completamente autonomo con database SQLite locale e telemetria diretta MSFS 2024 via SimConnect, senza abbonamenti o dipendenze esterne.",
        linksTitle: "Community & Supporto",
        linkFlightsim: "Pagina Flightsim.to",
        linkDiscord: "Community Discord",
        linkCoffee: "Buy Me a Coffee",
        attrTitle: "Fonti Dati & Open Source",
        attrList: [
            "<strong>Cartografia:</strong> Esri / ArcGIS (Street, Canvas, Satellitare), OpenTopoMap & © OpenStreetMap contributors.",
            "<strong>Dati Aeronautici:</strong> OurAirports (aeroporti e piste), SimBrief API (importazione OFP), MSFS 2024 SimConnect (telemetria live e layout di terra nativi).",
            "<strong>Tecnologie:</strong> Python, pywebview, Leaflet.js, Python-SimConnect, SQLite."
        ],
        licenseTitle: "Licenza e Condizioni d'Uso",
        licenseText: "Freeware / Open Source (MIT License) — libero per uso personale, non rivendibile.",
        disclaimerTitle: "Disclaimer Aeronautico",
        disclaimerText: "Solo per uso in simulazione di volo (Microsoft Flight Simulator 2024). Non utilizzare per la navigazione aerea reale.",
        closeBtn: "Chiudi"
    }
};

function injectCreditsStyles() {
    if (document.getElementById('aeroglassCreditsStyles')) return;
    const style = document.createElement('style');
    style.id = 'aeroglassCreditsStyles';
    style.textContent = `
        #creditsModalOverlay {
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(2, 6, 23, 0.72);
            backdrop-filter: blur(4px);
            display: none; align-items: center; justify-content: center;
            padding: 16px;
        }
        #creditsModalBox {
            width: 460px; max-width: 92vw; max-height: 72vh;
            background: linear-gradient(180deg, #0f172a 0%, #0b1120 100%);
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 12px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75);
            display: flex; flex-direction: column; overflow: hidden;
            color: #e2e8f0; font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .credits-header {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 12px 16px;
            background: rgba(15, 23, 42, 0.95);
            border-bottom: 1px solid rgba(148, 163, 184, 0.18);
            flex-shrink: 0;
        }
        .credits-body {
            padding: 14px 16px;
            overflow-y: auto; flex: 1;
            display: flex; flex-direction: column; gap: 12px;
            font-size: 12.5px; line-height: 1.48;
        }
        .credits-body::-webkit-scrollbar { width: 6px; }
        .credits-body::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
        .credits-body::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.35); border-radius: 999px; }
        .credits-card {
            background: rgba(30, 41, 59, 0.45);
            border: 1px solid rgba(148, 163, 184, 0.16);
            border-radius: 8px; padding: 10px 12px;
        }
        .credits-section-title {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.6px; color: #38bdf8; margin-bottom: 6px;
        }
        .credits-links-row {
            display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
        }
        .credits-link-btn {
            flex: 1 1 120px; text-decoration: none; text-align: center;
            padding: 7px 10px; border-radius: 7px; font-size: 12px; font-weight: 600;
            transition: transform 0.15s ease, filter 0.15s ease;
            display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        }
        .credits-link-btn:hover { transform: translateY(-1px); filter: brightness(1.12); }
        .credits-disclaimer {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.42);
            border-radius: 8px; padding: 9px 12px; color: #fde68a;
        }
        .credits-footer {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 16px;
            background: rgba(15, 23, 42, 0.95);
            border-top: 1px solid rgba(148, 163, 184, 0.18);
            flex-shrink: 0;
        }
        .credits-lang-switch {
            display: inline-flex; align-items: center; gap: 4px;
            background: rgba(30, 41, 59, 0.9);
            border: 1px solid rgba(56, 189, 248, 0.45);
            color: #38bdf8; border-radius: 6px; padding: 3px 9px;
            font-size: 11px; font-weight: 700; cursor: pointer;
        }
        .credits-lang-switch:hover { background: rgba(56, 189, 248, 0.18); }
        #btnOpenGlossary,
        #btnOpenCredits {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 7px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(148, 163, 184, 0.35);
            color: #e2e8f0;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
            transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        #btnOpenGlossary {
            order: 9998;
            margin-left: auto;
        }
        #btnOpenCredits {
            order: 9999;
            margin-left: 0;
        }
        #btnOpenGlossary:hover,
        #btnOpenCredits:hover {
            background: rgba(56, 189, 248, 0.18);
            border-color: rgba(56, 189, 248, 0.65);
            color: #38bdf8;
        }
    `;
    document.head.appendChild(style);
}

function renderCreditsModalContent() {
    const bodyEl = document.getElementById('creditsModalBody');
    const titleEl = document.getElementById('creditsModalTitle');
    const switchBtn = document.getElementById('btnCreditsLangSwitch');
    const closeBtn = document.getElementById('btnCreditsFooterClose');
    if (!bodyEl || !titleEl) return;

    const c = CREDITS_CONTENT[creditsModalLang] || CREDITS_CONTENT.en;
    titleEl.textContent = `ℹ️ ${c.title}`;
    if (switchBtn) switchBtn.innerHTML = creditsModalLang === 'en' ? '🌐 EN ➔ IT' : '🌐 IT ➔ EN';
    if (closeBtn) closeBtn.textContent = c.closeBtn;

    const attrItems = c.attrList.map(item => `<li style="margin-bottom:4px;">${item}</li>`).join('');

    bodyEl.innerHTML = `
        <div class="credits-card" style="border-color:rgba(56,189,248,0.28);">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <span style="font-size:15px;font-weight:800;color:#f8fafc;">AeroGlass-Nav</span>
                <span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(56,189,248,0.18);color:#38bdf8;">v1.0.0 • MSFS 2024</span>
            </div>
            <div style="font-size:11.5px;color:#94a3b8;margin-top:2px;">${c.subtitle}</div>
            <div style="margin-top:8px;font-size:12px;">
                <span style="color:#94a3b8;">${c.authorLabel}:</span>
                <strong style="color:#f8fafc;">${c.authorValue}</strong>
            </div>
            <div style="margin-top:6px;color:#cbd5e1;font-size:12px;">${c.desc}</div>
        </div>

        <div class="credits-card">
            <div class="credits-section-title">${c.linksTitle}</div>
            <div class="credits-links-row">
                <a class="credits-link-btn" href="${CREDITS_LINKS.flightsimTo}" target="_blank" rel="noopener noreferrer"
                   style="background:rgba(56,189,248,0.16);border:1px solid rgba(56,189,248,0.45);color:#7dd3fc;">
                    ✈️ ${c.linkFlightsim}
                </a>
                <a class="credits-link-btn" href="${CREDITS_LINKS.discord}" target="_blank" rel="noopener noreferrer"
                   style="background:rgba(99,102,241,0.2);border:1px solid rgba(129,140,248,0.5);color:#c7d2fe;">
                    💬 ${c.linkDiscord}
                </a>
                <a class="credits-link-btn" href="${CREDITS_LINKS.buyMeACoffee}" target="_blank" rel="noopener noreferrer"
                   style="background:rgba(251,191,36,0.16);border:1px solid rgba(251,191,36,0.5);color:#fde047;">
                    ☕ ${c.linkCoffee}
                </a>
            </div>
        </div>

        <div class="credits-card">
            <div class="credits-section-title">${c.attrTitle}</div>
            <ul style="margin:0;padding-left:16px;color:#cbd5e1;font-size:11.8px;">
                ${attrItems}
            </ul>
        </div>

        <div class="credits-card">
            <div class="credits-section-title">${c.licenseTitle}</div>
            <div style="color:#cbd5e1;font-size:12px;">${c.licenseText}</div>
        </div>

        <div class="credits-disclaimer">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#fbbf24;margin-bottom:4px;">⚠️ ${c.disclaimerTitle}</div>
            <div style="font-size:12px;font-weight:600;">${c.disclaimerText}</div>
        </div>
    `;
}

function toggleCreditsModalLang() {
    creditsModalLang = (creditsModalLang === 'en') ? 'it' : 'en';
    renderCreditsModalContent();
}

function openCreditsModal() {
    ensureCreditsModalExists();
    // Si apre sempre in inglese come richiesto, con switch rapido in italiano
    creditsModalLang = 'en';
    renderCreditsModalContent();
    const overlay = document.getElementById('creditsModalOverlay');
    const bodyEl = document.getElementById('creditsModalBody');
    if (overlay) overlay.style.display = 'flex';
    if (bodyEl) bodyEl.scrollTop = 0;
}

function closeCreditsModal() {
    const overlay = document.getElementById('creditsModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

function ensureCreditsModalExists() {
    injectCreditsStyles();
    if (document.getElementById('creditsModalOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'creditsModalOverlay';
    overlay.innerHTML = `
        <div id="creditsModalBox" role="dialog" aria-modal="true">
            <div class="credits-header">
                <div id="creditsModalTitle" style="font-weight:700;font-size:14px;color:#f8fafc;">ℹ️ About AeroGlass-Nav</div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <button id="btnCreditsLangSwitch" class="credits-lang-switch" type="button" onclick="toggleCreditsModalLang()">🌐 EN ➔ IT</button>
                    <button type="button" onclick="closeCreditsModal()" style="background:transparent;border:none;color:#94a3b8;font-size:16px;cursor:pointer;padding:2px 6px;" title="Close">✕</button>
                </div>
            </div>
            <div id="creditsModalBody" class="credits-body"></div>
            <div class="credits-footer">
                <span style="font-size:11px;color:#64748b;">AeroGlass-Nav • Freeware EFB</span>
                <button id="btnCreditsFooterClose" class="btn btn-cyan" type="button" style="padding:4px 14px;font-size:11.5px;" onclick="closeCreditsModal()">Close</button>
            </div>
        </div>
    `;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeCreditsModal();
    });
    document.body.appendChild(overlay);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCreditsModal();
    });
}

async function openGlossaryInBrowser() {
    const lang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'it';
    if (window.pywebview && window.pywebview.api && window.pywebview.api.open_glossary) {
        try {
            await window.pywebview.api.open_glossary(lang);
            return;
        } catch (e) {}
    }
    window.open(`glossary.html?lang=${lang}`, '_blank');
}

function updateGlossaryButtonUI() {
    const btn = document.getElementById('btnOpenGlossary');
    if (!btn) return;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    btn.innerHTML = isEn ? '📖 <span>Glossary</span>' : '📖 <span>Glossario</span>';
}

function ensureGlossaryTopBarButton() {
    injectCreditsStyles();
    if (document.getElementById('btnOpenGlossary')) return;
    const pillsGroup = document.querySelector('.top-pills-group');
    if (!pillsGroup) return;

    pillsGroup.style.flex = '1';

    const btn = document.createElement('button');
    btn.id = 'btnOpenGlossary';
    btn.type = 'button';
    btn.onclick = () => openGlossaryInBrowser();
    pillsGroup.appendChild(btn);
    updateGlossaryButtonUI();
}

function ensureCreditsTopBarButton() {
    injectCreditsStyles();
    ensureGlossaryTopBarButton();
    if (document.getElementById('btnOpenCredits')) return;
    const pillsGroup = document.querySelector('.top-pills-group');
    if (!pillsGroup) return;

    pillsGroup.style.flex = '1';

    const btn = document.createElement('button');
    btn.id = 'btnOpenCredits';
    btn.type = 'button';
    btn.innerHTML = 'ℹ️ <span>Credits</span>';
    btn.onclick = () => openCreditsModal();

    pillsGroup.appendChild(btn);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(ensureCreditsTopBarButton, 250));
} else {
    setTimeout(ensureCreditsTopBarButton, 250);
}

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
    if (onclickStr.includes('showsimbriefbox')) return lang === 'en' ? '⚙️ Edit PilotID' : '⚙️ Modifica PilotID';
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
    ensureNetAtcBadgeStyles();
    organizeTopBarButtons();
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
    const modes = ['dark', 'night', 'day'];
    const nextIdx = (modes.indexOf(currentThemeMode) + 1) % modes.length;
    applyThemeMode(modes[nextIdx], true);
}

// --- GESTIONE CARTOGRAFIA AD ALTA DEFINIZIONE (100% FREE, ZERO API KEY) ---
let currentMapStyleKey = 'ifr';
let currentMapLighting = 'night'; // Default: tema Dark Cockpit ad alta leggibilità
let reliefOverlayActive = false;
let reliefLayer = null;

function getAeroTileConfiguration(styleKey) {
    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let maxZ = 19;
    let sub = 'abc';
    let attr = '&copy; OpenStreetMap contributors';

    if (styleKey === 'vfr') {
        // OpenTopoMap VFR (gratuita e senza API key)
        url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        sub = 'abc';
        maxZ = 17;
        attr = '&copy; OpenTopoMap';
    } else if (styleKey === 'topo') {
        // Esri ArcGIS World Topo Map (gratuita e senza API key)
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
        sub = 'abc';
        attr = 'Tiles &copy; Esri';
    } else if (styleKey === 'sat') {
        // Esri ArcGIS World Imagery Satellitare HD (gratuita e senza API key)
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        sub = 'abc';
        attr = 'Tiles &copy; Esri';
    } else {
        // IFR / Standard: OpenStreetMap Tile Server ufficiale aperto
        url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        sub = 'abc';
        maxZ = 19;
        attr = '&copy; OpenStreetMap contributors';
    }

    return { url, maxZ, sub, attr };
}

function switchMapStyle(styleKey) {
    if (!styleKey) styleKey = 'ifr';
    currentMapStyleKey = styleKey;

    const mapEl = document.getElementById('map');
    if (!mapEl || typeof map === 'undefined' || !map) return;

    // Rimuove qualsiasi filtro dal contenitore principale per preservare le linee vettoriali e i marker
    mapEl.style.filter = '';
    mapEl.className = mapEl.className.replace(/map-(dark|light|vfr|sat|map|topo)-mode/g, '').trim();
    mapEl.classList.add(`map-${styleKey}-mode`);

    if (typeof currentBaseTileLayer !== 'undefined' && currentBaseTileLayer) {
        map.removeLayer(currentBaseTileLayer);
    }

    const cfg = getAeroTileConfiguration(currentMapStyleKey);
    currentBaseTileLayer = L.tileLayer(cfg.url, {
        maxZoom: cfg.maxZ,
        subdomains: cfg.sub,
        attribution: cfg.attr
    }).addTo(map);

    applyMapLightingState();
}

function toggleMapLighting() {
    currentMapLighting = (currentMapLighting === 'day') ? 'night' : 'day';
    applyMapLightingState();
}

function applyMapLightingState() {
    const mapEl = document.getElementById('map');
    const lbl = document.getElementById('lblMapLighting');
    const btn = document.getElementById('btnMapLighting');
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

    if (!mapEl) return;

    // Assicura che l'elemento principale #map non abbia MAI filtri distorsivi
    mapEl.style.filter = '';

    const tilePane = mapEl.querySelector('.leaflet-tile-pane');
    if (tilePane) {
        const vals = (typeof getActiveFilterValues === 'function')
            ? getActiveFilterValues()
            : { b: 1.0, c: 1.0, s: 1.0 };

        let filterStr = '';
        if (currentMapStyleKey === 'ifr' || currentMapStyleKey === 'map') {
            if (currentMapLighting === 'night') {
                filterStr = `invert(100%) hue-rotate(180deg) brightness(${vals.b}) contrast(${vals.c}) saturate(${vals.s})`;
            } else {
                filterStr = `brightness(${vals.b}) contrast(${vals.c}) saturate(${vals.s})`;
            }
        } else {
            filterStr = `brightness(${vals.b}) contrast(${vals.c}) saturate(${vals.s})`;
        }

        tilePane.style.setProperty('filter', filterStr, 'important');
    }

    // Se la maschera dei cursori è aperta, aggiorna la posizione dei cursori per la nuova mappa/luce
    const modal = document.getElementById('mapFilterCalibratorModal');
    if (modal && modal.style.display === 'flex' && typeof syncCalibratorSlidersFromProfile === 'function') {
        syncCalibratorSlidersFromProfile();
    }

    if (currentMapLighting === 'night') {
        mapEl.classList.remove('map-light-mode');
        mapEl.classList.add('map-night-mode');
        if (lbl) lbl.innerText = isEn ? 'Night' : 'Notte';
        if (btn) {
            btn.innerHTML = '🌙 <span id="lblMapLighting">' + (isEn ? 'Night' : 'Notte') + '</span>';
            btn.classList.add('active');
        }
    } else {
        mapEl.classList.remove('map-night-mode');
        mapEl.classList.add('map-light-mode');
        if (lbl) lbl.innerText = isEn ? 'Day' : 'Giorno';
        if (btn) {
            btn.innerHTML = '☀️ <span id="lblMapLighting">' + (isEn ? 'Day' : 'Giorno') + '</span>';
            btn.classList.remove('active');
        }
    }
}

function toggleMapRelief() {
    reliefOverlayActive = !reliefOverlayActive;
    const btn = document.getElementById('btnMapRelief');
    const lbl = document.getElementById('lblMapRelief');
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

    if (typeof map === 'undefined' || !map) return;

    if (reliefOverlayActive) {
        if (!reliefLayer) {
            // Hillshading orografico puro ArcGIS Esri (World_Hillshade)
            reliefLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 18,
                opacity: 0.42,
                interactive: false
            });
        }
        reliefLayer.addTo(map);
        if (btn) btn.classList.add('active');
        if (lbl) lbl.innerText = isEn ? 'Relief ON' : 'Rilievi ON';
    } else {
        if (reliefLayer && map.hasLayer(reliefLayer)) {
            map.removeLayer(reliefLayer);
        }
        if (btn) btn.classList.remove('active');
        if (lbl) lbl.innerText = isEn ? 'Relief' : 'Rilievi';
    }
}

// --- 🔍 RICERCA RAPIDA AEROPORTO & CENTRATURA MAPPA ---
let _omniSearchSeq = 0;

function centerMapVisuallyOn(lat, lon, targetZoom = 14) {
    if (typeof map === 'undefined' || !map) return;
    if (typeof map.stop === 'function') map.stop();
    if (typeof map.invalidateSize === 'function') map.invalidateSize({ pan: false });

    const mapRect = map.getContainer().getBoundingClientRect();
    const mapCenterX = (mapRect.left + mapRect.right) / 2;
    const mapCenterY = (mapRect.top + mapRect.bottom) / 2;

    // Area visibile libera della finestra (escludendo sidebar sinistra, barra alta e cassetto VNAV)
    let visLeft = 0;
    const sb = document.getElementById('sidebarPanel');
    if (sb && !sb.classList.contains('collapsed')) {
        const sbRect = sb.getBoundingClientRect();
        if (sbRect.width > 60 && sbRect.right > 0) {
            visLeft = Math.min(window.innerWidth * 0.5, sbRect.right);
        }
    }

    let visTop = 48;
    const topBar = document.querySelector('.top-pills-group');
    if (topBar) {
        const tbRect = topBar.getBoundingClientRect();
        if (tbRect.bottom > 0 && tbRect.bottom < 160) {
            visTop = tbRect.bottom;
        }
    }

    let visBottom = window.innerHeight;
    const dr = document.getElementById('elevationDrawer');
    if (dr) {
        const drRect = dr.getBoundingClientRect();
        if (drRect.top > visTop && drRect.top < window.innerHeight) {
            visBottom = drRect.top;
        }
    }

    const targetScreenX = (visLeft + window.innerWidth) / 2;
    const targetScreenY = (visTop + visBottom) / 2;

    const pt = map.project([lat, lon], targetZoom);
    const centerPt = L.point(
        pt.x + (mapCenterX - targetScreenX),
        pt.y + (mapCenterY - targetScreenY)
    );
    const visualCenter = map.unproject(centerPt, targetZoom);
    map.setView(visualCenter, targetZoom, { animate: false });
}

async function searchAndCenterAirport(query) {
    const q = (query || '').trim().toUpperCase();
    if (!q) return;

    const mySeq = ++_omniSearchSeq;

    const centerOnApt = (icao, lat, lon, name, metar) => {
        if (mySeq !== _omniSearchSeq) return;
        if (typeof map === 'undefined' || !map) return;
        if (typeof setFollowState === 'function') setFollowState(0);
        lastRenderedGroundKey = null;
        centerMapVisuallyOn(lat, lon, 14);
        if (typeof openQuickMetarPopup === 'function') {
            openQuickMetarPopup(icao, lat, lon, name, metar || '', false);
        }
        setTimeout(() => {
            if (mySeq === _omniSearchSeq && typeof evaluateAirportGroundMap === 'function') {
                evaluateAirportGroundMap();
            }
        }, 120);
    };

    const localApts = Array.isArray(airportsData) ? airportsData : [];
    const localVors = Array.isArray(vorsData) ? vorsData : [];

    // 1. Match esatto ICAO in memoria
    const exactApt = localApts.find(a => a.icao && a.icao.toUpperCase() === q);
    if (exactApt && exactApt.lat !== undefined && exactApt.lon !== undefined) {
        centerOnApt(exactApt.icao, exactApt.lat, exactApt.lon, exactApt.name, exactApt.metar || '');
        return;
    }

    // 2. Match esatto VOR in memoria (es. TES, SME, CHI)
    if (q.length === 3) {
        const exactVor = localVors.find(v => v.ident && v.ident.toUpperCase() === q);
        if (exactVor && exactVor.lat !== undefined && exactVor.lon !== undefined) {
            if (typeof setFollowState === 'function') setFollowState(0);
            centerMapVisuallyOn(exactVor.lat, exactVor.lon, 11);
            return;
        }
    }

    // 3. Ricerca istantanea su SQLite world_airports (match esatto ICAO prioritario su nome/città)
    if (window.pywebview && window.pywebview.api) {
        try {
            if (window.pywebview.api.search_world_airports) {
                const searchRes = await window.pywebview.api.search_world_airports(q);
                if (mySeq !== _omniSearchSeq) return;
                if (searchRes && searchRes.success && Array.isArray(searchRes.results) && searchRes.results.length > 0) {
                    const apt = searchRes.results.find(r => r.icao && r.icao.toUpperCase() === q) || searchRes.results[0];
                    if (apt && apt.lat !== undefined && apt.lon !== undefined) {
                        centerOnApt(apt.icao, apt.lat, apt.lon, apt.name, '');
                        return;
                    }
                }
            }

            // 4. Fallback online (aviationweather) solo per codici ICAO a 4 caratteri non presenti in SQLite
            if (/^[A-Z0-9]{4}$/.test(q) && window.pywebview.api.resolve_icao) {
                const res = await window.pywebview.api.resolve_icao(q);
                if (mySeq !== _omniSearchSeq) return;
                if (res && res.success && res.lat !== undefined && res.lon !== undefined) {
                    centerOnApt(res.icao, res.lat, res.lon, res.name, res.metar || '');
                    return;
                }
            }
        } catch (e) {
            console.error("Errore ricerca aeroporto:", e);
        }
    }

    // 5. Fallback finale su nomi parziali in memoria
    const partialApt = localApts.find(a => a.name && a.name.toUpperCase().includes(q));
    if (partialApt && partialApt.lat !== undefined && partialApt.lon !== undefined) {
        centerOnApt(partialApt.icao, partialApt.lat, partialApt.lon, partialApt.name, partialApt.metar || '');
        return;
    }
    const partialVor = localVors.find(v => (v.ident && v.ident.toUpperCase() === q) || (v.name && v.name.toUpperCase().includes(q)));
    if (partialVor && partialVor.lat !== undefined && partialVor.lon !== undefined) {
        if (typeof setFollowState === 'function') setFollowState(0);
        centerMapVisuallyOn(partialVor.lat, partialVor.lon, 11);
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
            btn.className = 'top-btn';
            btn.style.borderColor = 'rgba(0, 210, 255, 0.55)';
            btn.style.color = '#00d2ff';
            const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
            btn.innerHTML = isEn ? '📲 <span>Send to Sim</span>' : '📲 <span>Invia a MSFS</span>';
            btn.onclick = () => sendFlightPlanToAircraftNav();
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

let _navToastTimer = null;

function showAeroNavToast(message, isWarning = true, durationMs = 3000) {
    let toast = document.getElementById('aeroNavSystemToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'aeroNavSystemToast';
        toast.className = 'glass-panel';
        toast.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:4500;padding:10px 18px;border-radius:10px;font-family:Consolas,monospace;font-size:12px;font-weight:700;display:none;align-items:center;gap:10px;box-shadow:0 10px 30px rgba(0,0,0,0.75);backdrop-filter:blur(14px);transition:opacity 0.25s ease;pointer-events:none;';
        document.body.appendChild(toast);
    }

    if (_navToastTimer) {
        clearTimeout(_navToastTimer);
        _navToastTimer = null;
    }

    if (isWarning) {
        toast.style.background = 'rgba(28, 19, 14, 0.96)';
        toast.style.border = '1.5px solid #f59e0b';
        toast.style.color = '#fbbf24';
    } else {
        toast.style.background = 'rgba(13, 25, 22, 0.96)';
        toast.style.border = '1.5px solid #34d399';
        toast.style.color = '#34d399';
    }

    toast.innerHTML = message;
    toast.style.display = 'flex';
    toast.style.opacity = '1';

    _navToastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 250);
    }, durationMs);
}

async function sendFlightPlanToAircraftNav() {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

    if (!Array.isArray(flightPlan) || flightPlan.length < 2) {
        showAeroNavToast(
            isEn
                ? '⚠️ No active flight plan to send (add at least Departure and Destination).'
                : '⚠️ Nessun piano di volo attivo da inviare (inserisci almeno Partenza e Destinazione).',
            true,
            3000
        );
        return;
    }

    if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.send_flight_plan_to_msfs) {
        return;
    }

    try {
        const res = await window.pywebview.api.send_flight_plan_to_msfs(flightPlan);
        if (!res) return;

        if (res.no_nav_system) {
            const acft = res.aircraft || 'MSFS 2024';
            showAeroNavToast(
                isEn
                    ? `⚠️ Current aircraft (<b>${acft}</b>) does not have a navigation system.`
                    : `⚠️ L'aeromobile in uso (<b>${acft}</b>) non dispone di un sistema di navigazione.`,
                true,
                3000
            );
            return;
        }

        if (res.success) {
            const acft = res.aircraft || 'MSFS 2024';
            showAeroNavToast(
                isEn
                    ? `✅ Flight Plan <b>${res.dep} ➔ ${res.dest}</b> (${res.waypoints_count} WPT) sent to <b>${acft}</b> navigation system!`
                    : `✅ Piano di volo <b>${res.dep} ➔ ${res.dest}</b> (${res.waypoints_count} WPT) inviato al sistema di navigazione di <b>${acft}</b>!`,
                false,
                3000
            );
        } else {
            showAeroNavToast(`⚠️ ${res.message || 'Impossibile inviare il piano di volo.'}`, true, 3000);
        }
    } catch (err) {
        showAeroNavToast('⚠️ Errore di comunicazione con il simulatore.', true, 3000);
    }
}

function findNearestAirportAtCenter(lat, lon) {
    for (const [icao, data] of Object.entries(CUSTOM_APT_LAYOUTS)) {
        if (Math.hypot(lat - data.lat, lon - data.lon) < 0.045) {
            return { icao, name: data.name, lat: data.lat, lon: data.lon, custom: data };
        }
    }
    if (typeof airportsData !== 'undefined' && Array.isArray(airportsData)) {
        let closest = null;
        let minWeightedDist = 0.18;
        for (const apt of airportsData) {
            if (!apt.icao || apt.lat === undefined || apt.lon === undefined) continue;
            const rawDist = Math.hypot(lat - apt.lat, lon - apt.lon);
            if (rawDist > 0.18) continue;
            // Dà priorità agli scali principali/medi ed evita che piccoli eliporti con trattino (es. IT-0012) rubino il focus
            let weight = 1.0;
            if (apt.icao.includes('-')) continue;
            if (apt.type === 'large_airport') weight = 0.5;
            else if (apt.type === 'medium_airport') weight = 0.75;

            const weightedDist = rawDist * weight;
            if (weightedDist < minWeightedDist) {
                minWeightedDist = weightedDist;
                closest = { icao: apt.icao, name: apt.name || apt.icao, lat: apt.lat, lon: apt.lon, custom: null };
            }
        }
        if (closest) return closest;
    }
    return null;
}

let _groundFetchInFlight = null;

async function fetchOsmGroundFromBrowser(icao, lat, lon, aptName, existingRunways) {
    const s = (lat - 0.032).toFixed(5);
    const w = (lon - 0.045).toFixed(5);
    const n = (lat + 0.032).toFixed(5);
    const e = (lon + 0.045).toFixed(5);
    const query = `[out:json][timeout:10][bbox:${s},${w},${n},${e}];(way["aeroway"="runway"];way["aeroway"="taxiway"];way["aeroway"="taxilane"];way["aeroway"="apron"];way["aeroway"="parking_position"];node["aeroway"="parking_position"];node["aeroway"="gate"];node["aeroway"="helipad"];);out geom qt;`;

    const mirrors = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];

    for (const url of mirrors) {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 9000);
            const resp = await fetch(`${url}?data=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: ctrl.signal
            });
            clearTimeout(timer);
            if (!resp.ok) continue;
            const data = await resp.json();
            if (!data || !Array.isArray(data.elements) || data.elements.length === 0) continue;

            const layout = {
                icao,
                name: aptName || icao,
                lat,
                lon,
                source: 'osm',
                runways: existingRunways || [],
                taxiways: [],
                aprons: [],
                stands: []
            };
            const osmRunways = [];
            const rawNodeStands = [];
            const rawWayStands = [];

            for (const el of data.elements) {
                const tags = el.tags || {};
                const aeroway = tags.aeroway;
                const ref = String(tags.ref || tags.name || '').trim();

                if (el.type === 'way' && Array.isArray(el.geometry)) {
                    const coords = el.geometry.map(pt => [Number(pt.lat), Number(pt.lon)]);
                    if (coords.length < 2) continue;

                    if (aeroway === 'taxiway' || aeroway === 'taxilane') {
                        layout.taxiways.push({ ref: aeroway === 'taxiway' ? ref : '', kind: aeroway, coords });
                    } else if (aeroway === 'apron') {
                        layout.aprons.push(coords);
                    } else if (aeroway === 'runway') {
                        const surf = String(tags.surface || 'asphalt').toLowerCase();
                        const isGrassSurf = surf.includes('grass') || surf.includes('turf');
                        let rwyWidthM = 0;
                        if (tags.width) {
                            const rawW = String(tags.width).trim().toLowerCase();
                            const numW = parseFloat(rawW.replace(',', '.'));
                            if (Number.isFinite(numW) && numW > 5) {
                                rwyWidthM = rawW.includes('ft') || rawW.includes("'") ? numW * 0.3048 : numW;
                            }
                        }
                        if (!rwyWidthM && Array.isArray(existingRunways) && existingRunways.length > 0) {
                            const normRef = (ref || '').toUpperCase().replace(/\s+/g, '');
                            const matchedDb = existingRunways.find(er =>
                                normRef && er.ref && String(er.ref).toUpperCase().replace(/\s+/g, '') === normRef
                            ) || existingRunways[0];
                            if (matchedDb && Number(matchedDb.width) > 5) {
                                rwyWidthM = Number(matchedDb.width);
                            }
                        }
                        osmRunways.push({
                            ref: ref || 'RWY',
                            width: Math.round((rwyWidthM || (isGrassSurf ? 25 : 45)) * 10) / 10,
                            surface: isGrassSurf ? 'grass' : 'asphalt',
                            coords
                        });
                    } else if (aeroway === 'parking_position') {
                        layout.taxiways.push({ ref: '', kind: 'taxilane', coords });
                        const nosePt = coords[coords.length - 1];
                        if (ref) rawWayStands.push({ ref, lat: nosePt[0], lon: nosePt[1] });
                    }
                } else if (el.type === 'node' && (aeroway === 'parking_position' || aeroway === 'gate' || aeroway === 'helipad')) {
                    if (el.lat !== undefined && el.lon !== undefined) {
                        const stRef = ref || (aeroway === 'helipad' ? 'H' : '');
                        if (stRef) {
                            rawNodeStands.push({ ref: stRef, lat: Number(el.lat), lon: Number(el.lon) });
                        }
                    }
                }
            }

            const seen = [];
            for (const st of [...rawNodeStands, ...rawWayStands]) {
                const dup = seen.some(s => (s.ref === st.ref && Math.abs(s.lat - st.lat) < 0.0006 && Math.abs(s.lon - st.lon) < 0.0006) ||
                                           (Math.abs(s.lat - st.lat) < 0.00008 && Math.abs(s.lon - st.lon) < 0.00008));
                if (!dup) {
                    seen.push(st);
                    layout.stands.push(st);
                }
            }

            if (osmRunways.length > 0) layout.runways = osmRunways;
            if (layout.taxiways.length > 0 || layout.aprons.length > 0 || layout.stands.length > 0) {
                return layout;
            }
        } catch (err) {}
    }
    return null;
}

async function evaluateAirportGroundMap() {
    if (!groundMapEnabled || typeof map === 'undefined' || !map) return;
    if (!groundLayerGroup && typeof L !== 'undefined') {
        groundLayerGroup = L.layerGroup().addTo(map);
    }
    if (!groundLayerGroup) return;

    const zoom = map.getZoom();
    const badge = document.getElementById('aptGroundBadge');
    const badgeName = document.getElementById('aptGroundName');

    if (zoom < 11.0) {
        if (lastRenderedGroundKey !== null) {
            groundLayerGroup.clearLayers();
            lastRenderedGroundKey = null;
        }
        if (badge) badge.style.display = 'none';
        return;
    }

    const center = map.getCenter();
    let nearApt = findNearestAirportAtCenter(center.lat, center.lng);

    if (!nearApt && window.pywebview && window.pywebview.api && window.pywebview.api.get_nearest_airport) {
        try {
            const res = await window.pywebview.api.get_nearest_airport(center.lat, center.lng);
            if (res && res.success && res.airport) {
                nearApt = {
                    icao: res.airport.icao,
                    name: res.airport.name,
                    lat: res.airport.lat,
                    lon: res.airport.lon,
                    custom: (typeof CUSTOM_APT_LAYOUTS !== 'undefined' ? CUSTOM_APT_LAYOUTS[res.airport.icao] : null)
                };
            }
        } catch (e) {}
    }

    if (!nearApt) {
        if (lastRenderedGroundKey !== null) {
            groundLayerGroup.clearLayers();
            lastRenderedGroundKey = null;
        }
        if (badge) badge.style.display = 'none';
        return;
    }

    if (lastRenderedGroundKey === nearApt.icao || _groundFetchInFlight === nearApt.icao) return;

    if (badge && badgeName) {
        badge.style.display = 'flex';
        badgeName.innerText = `⏳ ${nearApt.icao} - ${nearApt.name || 'GROUND CHART'}`;
    }

    if (nearApt.custom) {
        lastRenderedGroundKey = nearApt.icao;
        if (badgeName) badgeName.innerText = `${nearApt.icao} - ${nearApt.name || 'GROUND CHART'}`;
        renderCustomAirportLayout(nearApt.custom);
        return;
    }

    if (window.pywebview && window.pywebview.api) {
        const targetIcao = nearApt.icao;
        _groundFetchInFlight = targetIcao;
        try {
            let ly = null;
            if (window.pywebview.api.get_airport_ground_layout) {
                const res = await window.pywebview.api.get_airport_ground_layout(targetIcao);
                if (res && res.success && res.layout) {
                    ly = res.layout;
                }
            }

            const isRealGround = (obj) => Boolean(
                obj &&
                (obj.source === 'osm' || obj.source === 'msfs') &&
                ((Array.isArray(obj.taxiways) && obj.taxiways.length > 0) ||
                 (Array.isArray(obj.stands) && obj.stands.length > 0))
            );

            // Se il layout non è ancora reale (OSM/MSFS), disegna subito SOLO le piste reali scartando taxiway/stand sintetici
            if (ly && !isRealGround(ly) && Array.isArray(ly.runways) && ly.runways.length > 0) {
                renderCustomAirportLayout({
                    ...ly,
                    taxiways: [],
                    aprons: [],
                    stands: []
                });
            }

            // Se mancano dati reali (OSM o MSFS), scarica taxiway, piazzali e parcheggi reali da Overpass OSM
            if (!isRealGround(ly)) {
                if (badgeName) badgeName.innerText = `⏳ Download dati Ground OSM (${targetIcao})...`;
                const osmLayout = await fetchOsmGroundFromBrowser(targetIcao, nearApt.lat, nearApt.lon, nearApt.name, ly ? ly.runways : []);
                if (osmLayout) {
                    ly = osmLayout;
                    if (window.pywebview.api.save_airport_ground_layout) {
                        try { window.pywebview.api.save_airport_ground_layout(targetIcao, osmLayout); } catch(e) {}
                    }
                } else if (ly) {
                    // Se Overpass non è raggiungibile, mostra solo le piste reali senza parcheggi fasulli
                    ly = { ...ly, source: 'runways_only', taxiways: [], aprons: [], stands: [] };
                }
            }
            _groundFetchInFlight = null;

            if (ly) {
                lastRenderedGroundKey = targetIcao;
                if (badgeName) badgeName.innerText = `${targetIcao} - ${nearApt.name || ly.name || 'GROUND CHART'}`;
                renderCustomAirportLayout(ly);

                const realRefsCount = (ly.taxiways || []).filter(t => t.ref && !t._autoRef && String(t.ref).trim() !== '').length;
                if ((ly.taxiways || []).length > 0 && realRefsCount === 0) {
                    enrichLayoutTaxiwayRefsFromOsm(targetIcao, nearApt.lat, nearApt.lon, ly);
                }
            } else {
                lastRenderedGroundKey = null;
                if (groundLayerGroup) groundLayerGroup.clearLayers();
                if (badge) badge.style.display = 'none';
            }
        } catch (err) {
            _groundFetchInFlight = null;
            lastRenderedGroundKey = null;
            if (groundLayerGroup) groundLayerGroup.clearLayers();
        }
    }
}

const _osmRefEnrichCache = new Map();

function _extractCleanTaxiwayRef(tags) {
    if (!tags) return '';
    let raw = String(tags.ref || tags['aeroway:ref'] || tags.loc_ref || tags.nat_ref || tags.name || '').trim();
    if (!raw) return '';
    // Pulisce prefissi descrittivi tipo "Taxiway A", "TWY B1", "Taxilane N2"
    raw = raw.replace(/^(taxiway|taxilane|twy|raccordo|via di rullaggio)\s+/i, '').trim().toUpperCase();
    // Accetta solo sigle aeronautiche compatte (es. A, B1, AA, N3, TWY A)
    if (raw.length >= 1 && raw.length <= 5 && /^[A-Z0-9]+$/.test(raw)) {
        return raw;
    }
    return '';
}

function _segAxisAngleDeg(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    let ang = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 180;
    return ang;
}

function _angleDiffUndirected(a1, a2) {
    const d = Math.abs(a1 - a2) % 180;
    return d > 90 ? 180 - d : d;
}

async function enrichLayoutTaxiwayRefsFromOsm(icao, lat, lon, layout) {
    if (!icao || !layout || !Array.isArray(layout.taxiways) || layout.taxiways.length === 0) return;

    if (_osmRefEnrichCache.has(icao)) {
        const cachedSegs = _osmRefEnrichCache.get(icao);
        if (cachedSegs && cachedSegs.length > 0 && _applyOsmRefsToLayout(layout, cachedSegs)) {
            if (lastRenderedGroundKey === icao) renderCustomAirportLayout(layout);
        }
        return;
    }

    // Bounding box ampio (±0.052 lat, ±0.068 lon) per coprire grandi hub come LIRF
    const s = (lat - 0.052).toFixed(5);
    const w = (lon - 0.068).toFixed(5);
    const n = (lat + 0.052).toFixed(5);
    const e = (lon + 0.068).toFixed(5);
    const query = `[out:json][timeout:8][bbox:${s},${w},${n},${e}];(way["aeroway"~"^(taxiway|taxilane)$"]["ref"];way["aeroway"~"^(taxiway|taxilane)$"]["name"];);out geom qt;`;

    const mirrors = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];

    for (const url of mirrors) {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 7500);
            const resp = await fetch(`${url}?data=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: ctrl.signal
            });
            clearTimeout(timer);
            if (!resp.ok) continue;
            const data = await resp.json();
            if (!data || !Array.isArray(data.elements)) continue;

            const osmNamedSegs = [];
            for (const el of data.elements) {
                if (el.type !== 'way' || !Array.isArray(el.geometry) || el.geometry.length < 2) continue;
                const ref = _extractCleanTaxiwayRef(el.tags);
                if (!ref) continue;

                for (let i = 1; i < el.geometry.length; i++) {
                    const p1 = el.geometry[i - 1];
                    const p2 = el.geometry[i];
                    const mLat = (Number(p1.lat) + Number(p2.lat)) / 2;
                    const mLon = (Number(p1.lon) + Number(p2.lon)) / 2;
                    const ang = _segAxisAngleDeg(Number(p1.lat), Number(p1.lon), Number(p2.lat), Number(p2.lon));
                    osmNamedSegs.push({ ref, lat: mLat, lon: mLon, ang });
                }
            }

            _osmRefEnrichCache.set(icao, osmNamedSegs);
            if (osmNamedSegs.length > 0 && _applyOsmRefsToLayout(layout, osmNamedSegs)) {
                if (lastRenderedGroundKey === icao) {
                    renderCustomAirportLayout(layout);
                }
            }
            return;
        } catch (err) {}
    }
}

function _applyOsmRefsToLayout(layout, osmNamedSegs) {
    if (!layout || !Array.isArray(layout.taxiways) || !Array.isArray(osmNamedSegs) || osmNamedSegs.length === 0) return false;
    let matchedCount = 0;

    // Pulisce eventuali lettere automatiche di fallback prima di applicare i nomi reali OSM
    layout.taxiways.forEach(twy => {
        if (twy._autoRef) {
            twy.ref = '';
            delete twy._autoRef;
        }
    });

    layout.taxiways.forEach(twy => {
        if (!Array.isArray(twy.coords) || twy.coords.length < 2) return;
        const pFirst = twy.coords[0];
        const pLast = twy.coords[twy.coords.length - 1];
        const midPt = twy.coords[Math.floor(twy.coords.length / 2)];
        const mLat = (pFirst[0] + pLast[0] + midPt[0]) / 3;
        const mLon = (pFirst[1] + pLast[1] + midPt[1]) / 3;
        const twyAng = _segAxisAngleDeg(pFirst[0], pFirst[1], pLast[0], pLast[1]);

        let bestRef = '';
        let bestDist = 34; // Raggio max di accoppiamento in metri

        for (let i = 0; i < osmNamedSegs.length; i++) {
            const os = osmNamedSegs[i];
            if (Math.abs(mLat - os.lat) > 0.0004 || Math.abs(mLon - os.lon) > 0.0005) continue;
            const dM = Math.hypot((mLat - os.lat) * 111320, (mLon - os.lon) * 111320 * Math.cos(mLat * Math.PI / 180));
            if (dM < bestDist && _angleDiffUndirected(twyAng, os.ang) < 32) {
                bestDist = dM;
                bestRef = os.ref;
            }
        }

        if (bestRef) {
            twy.ref = bestRef;
            matchedCount++;
        }
    });

    return matchedCount > 0;
}

function ensureAirportTaxiwayRefs(layout) {
    if (!layout || !Array.isArray(layout.taxiways) || layout.taxiways.length === 0) return;

    // Se l'aeroporto possiede già nomi reali (non auto-generati), non sovrascriverli
    const hasRealRefs = layout.taxiways.some(t => t.ref && !t._autoRef && String(t.ref).trim() !== '');
    if (hasRealRefs) return;

    const fastDist = (lat1, lon1, lat2, lon2) => {
        return Math.hypot((lat2 - lat1) * 111320, (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180));
    };

    const stands = Array.isArray(layout.stands) ? layout.stands : [];
    const segs = [];

    layout.taxiways.forEach((twy, idx) => {
        if (!Array.isArray(twy.coords) || twy.coords.length < 2) return;
        let len = 0;
        for (let i = 1; i < twy.coords.length; i++) {
            len += fastDist(twy.coords[i - 1][0], twy.coords[i - 1][1], twy.coords[i][0], twy.coords[i][1]);
        }
        if (len < 18) return;

        const pStart = twy.coords[0];
        const pEnd = twy.coords[twy.coords.length - 1];

        // Esclude i corti baffi di ingresso alle singole piazzole di parcheggio (< 85m vicini a uno stand)
        if (len < 85 && stands.length > 0) {
            const nearStand = stands.some(st =>
                fastDist(pStart[0], pStart[1], st.lat, st.lon) < 36 ||
                fastDist(pEnd[0], pEnd[1], st.lat, st.lon) < 36
            );
            if (nearStand) return;
        }

        const ang = _segAxisAngleDeg(pStart[0], pStart[1], pEnd[0], pEnd[1]);
        segs.push({ idx, twy, pStart, pEnd, len, ang, visited: false });
    });

    // Raggruppa i segmenti connessi e collineari (stessa via di rullaggio spezzata agli incroci)
    const branches = [];
    for (let i = 0; i < segs.length; i++) {
        if (segs[i].visited) continue;
        segs[i].visited = true;
        const cluster = [segs[i]];
        const queue = [segs[i]];
        let totalLen = segs[i].len;

        while (queue.length > 0) {
            const curr = queue.shift();
            for (let j = 0; j < segs.length; j++) {
                const cand = segs[j];
                if (cand.visited) continue;
                if (_angleDiffUndirected(curr.ang, cand.ang) > 25) continue;

                const d1 = fastDist(curr.pStart[0], curr.pStart[1], cand.pStart[0], cand.pStart[1]);
                const d2 = fastDist(curr.pStart[0], curr.pStart[1], cand.pEnd[0], cand.pEnd[1]);
                const d3 = fastDist(curr.pEnd[0], curr.pEnd[1], cand.pStart[0], cand.pStart[1]);
                const d4 = fastDist(curr.pEnd[0], curr.pEnd[1], cand.pEnd[0], cand.pEnd[1]);

                if (Math.min(d1, d2, d3, d4) <= 26) {
                    cand.visited = true;
                    cluster.push(cand);
                    queue.push(cand);
                    totalLen += cand.len;
                }
            }
        }

        // Etichetta solo le diramazioni significative (>= 75m complessivi)
        if (totalLen >= 75) {
            branches.push({ cluster, totalLen });
        }
    }

    // Ordina le vie di rullaggio dalla più lunga (principale) alla più corta (raccordi)
    branches.sort((a, b) => b.totalLen - a.totalLen);

    // Alfabeto standard ICAO per vie di rullaggio (escluse I, O, Q, U, X)
    const ICAO_CHARS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W', 'Y', 'Z'];

    branches.forEach((br, bIdx) => {
        let label = '';
        if (bIdx < ICAO_CHARS.length) {
            label = ICAO_CHARS[bIdx];
        } else {
            const pfx = ICAO_CHARS[bIdx % ICAO_CHARS.length];
            const num = Math.floor(bIdx / ICAO_CHARS.length);
            label = `${pfx}${num}`;
        }
        br.cluster.forEach(s => {
            s.twy.ref = label;
            s.twy._autoRef = true;
        });
    });
}

function renderCustomAirportLayout(layout) {
    if (!groundLayerGroup || !layout) return;
    groundLayerGroup.clearLayers();
    ensureAirportTaxiwayRefs(layout);

    (layout.aprons || []).forEach(poly => {
        L.polygon(poly, {
            color: '#475569',
            weight: 1,
            fillColor: '#1e293b',
            fillOpacity: 0.55,
            interactive: false
        }).addTo(groundLayerGroup);
    });

    const fastDistM = (lat1, lon1, lat2, lon2) => {
        const dLat = (lat2 - lat1) * 111320;
        const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
        return Math.hypot(dLat, dLon);
    };

    const getPolylineMidpointAndLength = (coords) => {
        let totalLen = 0;
        const segLens = [];
        for (let i = 1; i < coords.length; i++) {
            const d = fastDistM(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
            segLens.push(d);
            totalLen += d;
        }
        if (totalLen <= 0) return { mid: coords[0], len: 0 };

        const half = totalLen / 2;
        let acc = 0;
        for (let i = 0; i < segLens.length; i++) {
            if (acc + segLens[i] >= half && segLens[i] > 0) {
                const ratio = (half - acc) / segLens[i];
                return {
                    mid: [
                        coords[i][0] + (coords[i + 1][0] - coords[i][0]) * ratio,
                        coords[i][1] + (coords[i + 1][1] - coords[i][1]) * ratio
                    ],
                    len: totalLen
                };
            }
            acc += segLens[i];
        }
        return { mid: coords[Math.floor(coords.length / 2)], len: totalLen };
    };

    const twyCandidates = [];
    const totalLenByRef = {};

    (layout.taxiways || []).forEach(twy => {
        if (!Array.isArray(twy.coords) || twy.coords.length < 2) return;

        L.polyline(twy.coords, {
            color: '#f59e0b',
            weight: 4,
            opacity: 0.85,
            interactive: false
        }).addTo(groundLayerGroup);

        const cleanRef = String(twy.ref || '').trim().toUpperCase();
        if (!cleanRef) return;

        const { mid, len } = getPolylineMidpointAndLength(twy.coords);
        totalLenByRef[cleanRef] = (totalLenByRef[cleanRef] || 0) + len;
        twyCandidates.push({ ref: cleanRef, lat: mid[0], lon: mid[1], len });
    });

    // Ordina i segmenti dal più lungo al più corto per posizionare le lettere sui rami principali
    twyCandidates.sort((a, b) => b.len - a.len);

    const SAME_REF_MIN_DIST_M = 280; // Distanza minima tra due cartelli con la STESSA lettera
    const ANY_REF_MIN_DIST_M  = 50;  // Distanza minima tra cartelli di lettere DIVERSE agli incroci
    const placedByRef = {};
    const allPlaced = [];

    twyCandidates.forEach(cand => {
        const refList = placedByRef[cand.ref] || [];
        // Massimo 1 cartello per raccordi corti (< 350m totali), massimo 2 per taxiway lunghe
        const maxForThisRef = (totalLenByRef[cand.ref] || 0) >= 350 ? 2 : 1;

        if (refList.length >= maxForThisRef) return;
        if (cand.len < 22 && refList.length > 0) return;

        const tooCloseSame = refList.some(p => fastDistM(cand.lat, cand.lon, p.lat, p.lon) < SAME_REF_MIN_DIST_M);
        if (tooCloseSame) return;

        const tooCloseAny = allPlaced.some(p => fastDistM(cand.lat, cand.lon, p.lat, p.lon) < ANY_REF_MIN_DIST_M);
        if (tooCloseAny) return;

        refList.push({ lat: cand.lat, lon: cand.lon });
        placedByRef[cand.ref] = refList;
        allPlaced.push({ lat: cand.lat, lon: cand.lon });

        L.marker([cand.lat, cand.lon], {
            icon: L.divIcon({
                className: 'apt-twy-label',
                html: cand.ref,
                iconSize: null
            }),
            interactive: false
        }).addTo(groundLayerGroup);
    });

    const buildRunwayPolygonCoords = (coords, widthMeters) => {
        if (!Array.isArray(coords) || coords.length < 2) return null;
        // Se OSM restituisce già l'area chiusa della pista, usala direttamente
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (coords.length >= 4 && Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-5) {
            return { poly: coords, isClosedArea: true };
        }

        const halfW = Math.max(10, Number(widthMeters) || 45) / 2;
        const leftPts = [];
        const rightPts = [];
        const n = coords.length;

        for (let i = 0; i < n; i++) {
            const lat = Number(coords[i][0]);
            const lon = Number(coords[i][1]);
            const mPerLat = 111320;
            const mPerLon = 111320 * Math.max(0.05, Math.cos(lat * Math.PI / 180));

            let dx = 0;
            let dy = 0;
            if (i === 0) {
                dx = (Number(coords[1][1]) - lon) * mPerLon;
                dy = (Number(coords[1][0]) - lat) * mPerLat;
            } else if (i === n - 1) {
                dx = (lon - Number(coords[n - 2][1])) * mPerLon;
                dy = (lat - Number(coords[n - 2][0])) * mPerLat;
            } else {
                dx = (Number(coords[i + 1][1]) - Number(coords[i - 1][1])) * mPerLon;
                dy = (Number(coords[i + 1][0]) - Number(coords[i - 1][0])) * mPerLat;
            }

            const segLen = Math.hypot(dx, dy);
            if (segLen < 1e-6) continue;

            const nx = -dy / segLen;
            const ny = dx / segLen;
            const dLat = (ny * halfW) / mPerLat;
            const dLon = (nx * halfW) / mPerLon;

            leftPts.push([lat + dLat, lon + dLon]);
            rightPts.push([lat - dLat, lon - dLon]);
        }

        if (leftPts.length < 2) return null;
        return { poly: leftPts.concat(rightPts.reverse()), isClosedArea: false };
    };

    (layout.runways || []).forEach(rwy => {
        if (!Array.isArray(rwy.coords) || rwy.coords.length < 2) return;
        const isGrass = rwy.surface === 'grass';
        const rwyWidthM = Number(rwy.width) > 5 ? Number(rwy.width) : (isGrass ? 25 : 45);
        const built = buildRunwayPolygonCoords(rwy.coords, rwyWidthM);

        if (built && built.poly) {
            L.polygon(built.poly, {
                color: isGrass ? '#22c55e' : '#475569',
                weight: 1.5,
                opacity: 0.9,
                fillColor: isGrass ? '#15803d' : '#334155',
                fillOpacity: 0.88,
                interactive: false
            }).addTo(groundLayerGroup);
        } else {
            L.polyline(rwy.coords, {
                color: isGrass ? '#15803d' : '#334155',
                weight: 14,
                opacity: 0.92,
                lineCap: 'butt',
                interactive: false
            }).addTo(groundLayerGroup);
        }

        if (!built || !built.isClosedArea) {
            L.polyline(rwy.coords, {
                color: isGrass ? '#86efac' : '#f8fafc',
                weight: 1.5,
                dashArray: '8, 8',
                opacity: 0.85,
                interactive: false
            }).addTo(groundLayerGroup);
        }

        if (rwy.ref && rwy.coords.length >= 2 && (!built || !built.isClosedArea)) {
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
    btn.classList.toggle('active', weatherOverlayEnabled);
    btn.innerHTML = '💨 <span>WX</span>';
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

async function openQuickMetarPopup(icao, lat, lon, fallbackName, cachedMetar, allowAutoPan = true) {
    if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;

    const popup = L.popup({
        className: 'wx-metar-glass-popup',
        closeButton: true,
        maxWidth: 290,
        offset: [0, -6],
        autoPan: allowAutoPan
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
    showCTR: true,
    vaPrefixes: '',         // Prefissi callsign o parole chiave OPR/ (es. "ITY, RYR, IVV")
    vaFilterMode: 'highlight', // 'highlight' (evidenzia) | 'only' (mostra solo VA filtrate)
    vaGlobalRange: true,    // Mostra aerei VA in tutta la mappa visibile (ignora limite 160 NM)
    vaColor: '#e879f9'      // Colore evidenziazione VA
};

try {
    const savedAtcCfg = localStorage.getItem('aeroglass_atc_cfg');
    if (savedAtcCfg) atcCoverageSettings = { ...atcCoverageSettings, ...JSON.parse(savedAtcCfg) };
} catch (e) {}

function saveAtcCoverageSettings() {
    const raw = JSON.stringify(atcCoverageSettings);
    try { localStorage.setItem('aeroglass_atc_cfg', raw); } catch (e) {}
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try { window.pywebview.api.save_setting('atc_radar_cfg', raw); } catch (e) {}
    }
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

        <div style="display:flex;flex-direction:column;gap:6px;padding-top:8px;border-top:1px solid rgba(148,163,184,0.22);">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;">
                <span style="font-weight:800;color:#e879f9;">🏢 FILTRO COMPAGNIA / VA</span>
                <span id="lblVaMatchCount" style="font-size:9.5px;color:#94a3b8;background:rgba(30,41,59,0.85);padding:1px 6px;border-radius:4px;">Nessun filtro</span>
            </div>
            <input type="text" id="inpVaPrefixes" value="${atcCoverageSettings.vaPrefixes || ''}"
                   placeholder="Prefissi o OPR (es. ITY, RYR, IVV)"
                   style="width:100%;box-sizing:border-box;background:rgba(15,23,42,0.95);border:1px solid rgba(232,121,249,0.45);border-radius:6px;padding:5px 8px;color:#f8fafc;font-family:Consolas,monospace;font-size:11px;text-transform:uppercase;outline:none;">
            <div style="display:flex;gap:5px;">
                <button id="btnVaModeHighlight" style="flex:1;padding:4px;border-radius:5px;font-size:9.5px;font-weight:700;cursor:pointer;">✨ Evidenzia</button>
                <button id="btnVaModeOnly" style="flex:1;padding:4px;border-radius:5px;font-size:9.5px;font-weight:700;cursor:pointer;">🎯 Solo VA</button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <label for="chkVaGlobalRange" style="display:inline-flex;align-items:center;gap:5px;font-size:9.8px;color:#cbd5e1;cursor:pointer;">
                    <input type="checkbox" id="chkVaGlobalRange" ${atcCoverageSettings.vaGlobalRange ? 'checked' : ''} style="accent-color:#e879f9;cursor:pointer;">
                    <span>🌍 Raggio Globale VA</span>
                </label>
                <div id="vaColorPalette" style="display:inline-flex;gap:5px;align-items:center;">
                    <span class="va-color-dot" data-color="#e879f9" title="Magenta" style="background:#e879f9;"></span>
                    <span class="va-color-dot" data-color="#34d399" title="Smeraldo" style="background:#34d399;"></span>
                    <span class="va-color-dot" data-color="#fb7185" title="Corallo" style="background:#fb7185;"></span>
                    <span class="va-color-dot" data-color="#facc15" title="Oro" style="background:#facc15;"></span>
                </div>
            </div>
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

        const inpVa = document.getElementById('inpVaPrefixes');
        if (inpVa && inpVa !== document.activeElement) {
            inpVa.value = atcCoverageSettings.vaPrefixes || '';
        }
        const chkGlob = document.getElementById('chkVaGlobalRange');
        if (chkGlob) chkGlob.checked = Boolean(atcCoverageSettings.vaGlobalRange);

        const vaCol = atcCoverageSettings.vaColor || '#e879f9';
        const isOnly = (atcCoverageSettings.vaFilterMode === 'only');
        const btnHi = document.getElementById('btnVaModeHighlight');
        const btnOn = document.getElementById('btnVaModeOnly');
        if (btnHi) {
            btnHi.style.border = `1px solid ${!isOnly ? vaCol : 'rgba(148,163,184,0.3)'}`;
            btnHi.style.background = !isOnly ? `${vaCol}28` : 'rgba(30,41,59,0.5)';
            btnHi.style.color = !isOnly ? vaCol : '#94a3b8';
        }
        if (btnOn) {
            btnOn.style.border = `1px solid ${isOnly ? vaCol : 'rgba(148,163,184,0.3)'}`;
            btnOn.style.background = isOnly ? `${vaCol}28` : 'rgba(30,41,59,0.5)';
            btnOn.style.color = isOnly ? vaCol : '#94a3b8';
        }
        pop.querySelectorAll('.va-color-dot').forEach(dot => {
            const active = dot.dataset.color === vaCol;
            dot.style.outline = active ? '2px solid #ffffff' : 'none';
            dot.style.transform = active ? 'scale(1.18)' : 'scale(1)';
        });
    };

    window._syncAtcPopoverUI = syncUI;

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

    document.getElementById('inpVaPrefixes').addEventListener('input', (e) => {
        atcCoverageSettings.vaPrefixes = (e.target.value || '').toUpperCase();
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    });
    document.getElementById('btnVaModeHighlight').onclick = () => {
        atcCoverageSettings.vaFilterMode = 'highlight';
        syncUI();
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    };
    document.getElementById('btnVaModeOnly').onclick = () => {
        atcCoverageSettings.vaFilterMode = 'only';
        syncUI();
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    };
    document.getElementById('chkVaGlobalRange').addEventListener('change', (e) => {
        atcCoverageSettings.vaGlobalRange = Boolean(e.target.checked);
        saveAtcCoverageSettings();
        if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
    });
    pop.querySelectorAll('.va-color-dot').forEach(dot => {
        dot.onclick = () => {
            atcCoverageSettings.vaColor = dot.dataset.color || '#e879f9';
            syncUI();
            saveAtcCoverageSettings();
            if (typeof redrawCachedNetworkTraffic === 'function') redrawCachedNetworkTraffic();
        };
    });

    document.getElementById('btnAtcCfgReset').onclick = () => {
        atcCoverageSettings = {
            radiusScale: 100, opacityScale: 100, pilotRangeNm: 160,
            showTWR: true, showAPP: true, showCTR: true,
            vaPrefixes: '', vaFilterMode: 'highlight', vaGlobalRange: true, vaColor: '#e879f9'
        };
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

        /* Barra superiore dinamica, estesa a tutta larghezza e reattiva alla chiusura della sidebar */
        .top-bar, header, .top-navigation-bar, div[class*="top"], div[class*="header"] {
            transition: all 0.25s ease !important;
        }
        body.sidebar-collapsed .top-bar,
        body.sidebar-collapsed header,
        body.sidebar-collapsed .top-navigation-bar,
        body.sidebar-collapsed div[class*="top-nav"],
        body.sidebar-collapsed div[class*="header"] {
            left: 45px !important;
            margin-left: 45px !important;
            width: calc(100% - 45px) !important;
            max-width: none !important;
        }
        .top-pills-group {
            display: flex !important;
            flex-wrap: wrap !important;
            flex: 1 1 auto !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            overflow-y: visible !important;
            row-gap: 5px !important;
            column-gap: 6px !important;
            padding: 4px 10px !important;
            justify-content: flex-start !important;
            align-items: center !important;
        }
        .top-pills-group .top-btn {
            padding: 4px 8px !important;
            font-size: 10.5px !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
        }
        #btnToggleTooltips span,
        #btnToggleUIMode span,
        #btnThemeMode span {
            display: none !important;
        }
        #btnThemeMode, #btnToggleTooltips, #btnToggleUIMode {
            min-width: 28px !important;
            padding: 4px 6px !important;
        }
        .va-color-dot {
            width: 13px;
            height: 13px;
            border-radius: 50%;
            cursor: pointer;
            display: inline-block;
            transition: transform 0.15s ease;
        }
        .net-va-wrap {
            position: relative;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .net-va-tag {
            position: absolute;
            top: 22px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(11, 17, 32, 0.94);
            border: 1.2px solid #e879f9;
            border-radius: 4px;
            padding: 0px 5px;
            font-family: Consolas, monospace;
            font-size: 9.5px;
            font-weight: 800;
            color: #f8fafc;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.75);
            pointer-events: none;
            line-height: 1.35;
        }
    `;
    document.head.appendChild(st);
    setupErgonomicSidebarAndTopBar();
}

function organizeTopBarButtons() {
    const pillsGroup = document.querySelector('.top-pills-group');
    if (!pillsGroup) return;

    // Rimuove i vecchi separatori prima di riordinare
    pillsGroup.querySelectorAll('.top-bar-sep').forEach(el => el.remove());

    const clusters = [
        // 1. EFB & Strumenti di Pianificazione
        ['btnEfbNet', 'btnLogbook', 'btnNavlogTop', 'btnFuelPerfTop', 'btnToggleScratchpad', 'btnToggleMeasure'],
        // 2. Layer Cartografici & Traffico
        ['btnFilters', 'btnToggleNavaids', 'btnToggleGroundMap', 'btnToggleWeather', 'btnToggleNetwork', 'btnAtcRadarCfg'],
        // 3. Controllo Mappa (Stile Navigraph: IFR/VFR/MAP/SAT + Giorno/Notte + Rilievi)
        ['btnFollowAcft', 'mapStyleSelect', 'btnMapLighting', 'btnMapRelief'],
        // 4. Impostazioni Interfaccia (Icone compatte)
        ['btnToggleTooltips', 'btnToggleUIMode', 'btnThemeMode', 'btnLangSelect']
    ];

    clusters.forEach((group, gIdx) => {
        let addedInGroup = 0;
        group.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.parentNode === pillsGroup) {
                pillsGroup.appendChild(el);
                addedInGroup++;
            }
        });
        if (addedInGroup > 0 && gIdx < clusters.length - 1) {
            const sep = document.createElement('span');
            sep.className = 'top-bar-sep';
            pillsGroup.appendChild(sep);
        }
    });

    // Forza e mantiene nel tempo le etichette compatte senza farsi sovrascrivere dal loop telemetria
    const enforceCompactLabels = () => {
        const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
        const efbBtn = document.getElementById('btnEfbNet');
        const efbLbl = document.getElementById('lblEfbNet');
        if (efbLbl && efbLbl.innerText !== 'EFB') {
            if (efbBtn && efbLbl.innerText.includes(':')) {
                efbBtn.title = `Tablet Wi-Fi (${efbLbl.innerText}) — Clicca per QR Code`;
            }
            efbLbl.innerText = 'EFB';
        }
        const fltLbl = document.getElementById('lblFilters');
        if (fltLbl) fltLbl.innerText = isEn ? 'Filters' : 'Filtri';

        const navBtn = document.getElementById('btnToggleNavaids');
        if (navBtn) navBtn.innerHTML = '📡 <span>VOR/ILS</span>';

        const fuelBtn = document.querySelector('#btnFuelPerfTop span');
        if (fuelBtn) fuelBtn.innerText = 'Fuel';

        const spBtn = document.querySelector('#btnToggleScratchpad span');
        if (spBtn) spBtn.innerText = isEn ? 'Notes' : 'Note';
    };

    enforceCompactLabels();
    if (!window._compactLabelsTimer) {
        window._compactLabelsTimer = setInterval(enforceCompactLabels, 1000);
    }
}

function setupErgonomicSidebarAndTopBar() {
    organizeTopBarButtons();
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

        if (oMult > 0) {
            if (Array.isArray(c.polygon) && c.polygon.length >= 3) {
                // Colori ufficiali poligoni IVAO WebEye: TWR Rosso/Corallo, APP Blu, CTR Viola
                const polyColor = (c.role === 'TWR') ? '#f43f5e' : ((c.role === 'APP') ? '#3b82f6' : '#a855f7');
                L.polygon(c.polygon, {
                    color: polyColor,
                    weight: 1.8,
                    dashArray: cfg.dash,
                    opacity: Math.min(1, 0.85 * oMult),
                    fillColor: polyColor,
                    fillOpacity: Math.min(0.85, 0.16 * oMult),
                    interactive: false,
                    smoothFactor: 1.2
                }).addTo(networkLayerGroup);
            } else if (radiusM > 50) {
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

    // 2. AEREI ONLINE (CON FILTRO/EVIDENZIAZIONE VA, SAGOME PER CATEGORIA E OPERATORE)
    const getAircraftCategorySvg = (cat, color, sizePx) => {
        if (cat === 'heli') {
            return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="${color}">
                <path d="M12 2L13 11H21V13H13.5L13 19L16 21V22H8V21L11 19L10.5 13H3V11H11L12 2ZM4 5L20 19M20 5L4 19" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>
            </svg>`;
        }
        if (cat === 'ga') {
            return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="${color}">
                <path d="M12 2.5C11.2 2.5 10.7 3.2 10.7 4V9.2L3 10.2V12L10.7 11.8V18L8 19.8V21.2L12 20.2L16 21.2V19.8L13.3 18V11.8L21 12V10.2L13.3 9.2V4C13.3 3.2 12.8 2.5 12 2.5Z"/>
            </svg>`;
        }
        if (cat === 'turboprop') {
            return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="${color}">
                <path d="M12 2C11.1 2 10.5 2.8 10.5 3.8V9.2L2 10.5V12.5L7 12.2V13.8H8.5V12.1L10.5 12V18.2L7.5 20V21.5L12 20.5L16.5 21.5V20L13.5 18.2V12L15.5 12.1V13.8H17V12.2L22 12.5V10.5L13.5 9.2V3.8C13.5 2.8 12.9 2 12 2Z"/>
            </svg>`;
        }
        if (cat === 'mil') {
            return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="${color}">
                <path d="M12 1.5L13.5 8.5L21 15.5V17.5L13.5 14.8L13.2 19L16.2 21V22.5L12 21.2L7.8 22.5V21L10.8 19L10.5 14.8L3 17.5V15.5L10.5 8.5L12 1.5Z"/>
            </svg>`;
        }
        if (cat === 'heavy') {
            return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="${color}">
                <path d="M22 16.2V14L13.6 8.6V3.2C13.6 2.2 12.9 1.5 12 1.5S10.4 2.2 10.4 3.2V8.6L2 14V16.2L10.4 13.5V18.8L7.4 20.6V22.2L12 21L16.6 22.2V20.6L13.6 18.8V13.5L22 16.2Z"/>
            </svg>`;
        }
        return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="${color}">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>`;
    };

    const vaTokens = String(atcCoverageSettings.vaPrefixes || '')
        .split(/[\s,;]+/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
    const hasVaFilter = vaTokens.length > 0;
    const vaOnly = hasVaFilter && atcCoverageSettings.vaFilterMode === 'only';
    const vaGlobal = Boolean(atcCoverageSettings.vaGlobalRange);
    const vaColor = atcCoverageSettings.vaColor || '#e879f9';

    let vaOnlineTotal = 0;
    const nearbyPilots = [];

    (res.pilots || []).forEach(p => {
        if (p.lat === undefined || p.lon === undefined) return;
        const isVatsim = (p.network === 'vatsim');
        if (networkOverlayMode === 'ivao' && isVatsim) return;
        if (networkOverlayMode === 'vatsim' && !isVatsim) return;

        const csUpper = String(p.callsign || '').toUpperCase();
        const oprUpper = String(p.operator || '').toUpperCase();
        const isVaMatch = hasVaFilter && vaTokens.some(tok =>
            csUpper.startsWith(tok) || (oprUpper && oprUpper.includes(tok))
        );

        if (isVaMatch) vaOnlineTotal++;
        if (vaOnly && !isVaMatch) return;

        const distNm = computeDistanceNm(refPos.lat, refPos.lng, p.lat, p.lon);
        const allowGlobal = isVaMatch && vaGlobal;
        if (!bounds.contains([p.lat, p.lon])) return;
        if (!allowGlobal && distNm > maxPilotNm) return;

        nearbyPilots.push({ ...p, distNm, isVaMatch });
    });

    const vaCountEl = document.getElementById('lblVaMatchCount');
    if (vaCountEl) {
        vaCountEl.textContent = hasVaFilter ? `${vaOnlineTotal} in volo` : 'Nessun filtro';
        vaCountEl.style.color = (hasVaFilter && vaOnlineTotal > 0) ? vaColor : '#94a3b8';
    }

    // Priorità assoluta agli aerei della VA filtrata, poi i più vicini
    nearbyPilots.sort((a, b) => {
        if (a.isVaMatch !== b.isVaMatch) return a.isVaMatch ? -1 : 1;
        return a.distNm - b.distNm;
    });

    nearbyPilots.slice(0, 100).forEach(p => {
        const isVatsim = (p.network === 'vatsim');
        const planeColor = p.isVaMatch ? vaColor : (isVatsim ? '#fbbf24' : '#00d2ff');
        const netLabel = isVatsim ? 'VATSIM' : 'IVAO';
        const hdg = p.hdg || 0;
        const csSafe = escapeHtml(String(p.callsign || 'N/A'));
        const acftTxt = p.aircraft ? escapeHtml(String(p.aircraft)) : '';
        const oprTxt = p.operator ? escapeHtml(String(p.operator)) : '';
        const routeTxt = (p.dep || p.arr) ? `${escapeHtml(String(p.dep || '----'))} ➔ ${escapeHtml(String(p.arr || '----'))}` : '';

        const svgSize = p.isVaMatch ? 21 : (p.category === 'heavy' ? 20 : 18);
        const glowStyle = p.isVaMatch ? `filter: drop-shadow(0 0 6px ${vaColor});` : '';
        const svgHtml = getAircraftCategorySvg(p.category || 'jet', planeColor, svgSize);

        let markerHtml;
        if (p.isVaMatch) {
            const tagLabel = acftTxt ? `${csSafe} · ${acftTxt}` : csSafe;
            markerHtml = `<div class="net-va-wrap">
                <div class="net-pilot-marker" style="transform: rotate(${hdg}deg); ${glowStyle}">${svgHtml}</div>
                <div class="net-va-tag" style="border-color:${vaColor};color:${vaColor};">${tagLabel}</div>
            </div>`;
        } else {
            markerHtml = `<div class="net-pilot-marker" style="transform: rotate(${hdg}deg);">${svgHtml}</div>`;
        }

        const pilotIcon = L.divIcon({
            className: '',
            html: markerHtml,
            iconSize: p.isVaMatch ? [24, 24] : [20, 20],
            iconAnchor: p.isVaMatch ? [12, 12] : [10, 10]
        });

        const m = L.marker([p.lat, p.lon], {
            icon: pilotIcon,
            zIndexOffset: p.isVaMatch ? 920 : 700
        }).addTo(networkLayerGroup);

        const vaBadge = p.isVaMatch
            ? ` <span style="background:${vaColor}30;border:1px solid ${vaColor};color:${vaColor};padding:0 4px;border-radius:3px;font-size:9px;">VA</span>`
            : '';
        const infoParts = [];
        if (acftTxt) infoParts.push(`<b style="color:#38bdf8;">${acftTxt}</b>`);
        if (oprTxt) infoParts.push(`<span style="color:#e2e8f0;">${oprTxt}</span>`);
        const line2 = infoParts.length > 0 ? `<br>✈️ ${infoParts.join(' • ')}` : '';
        const line3 = routeTxt ? `<br>🛫 <span style="color:#34d399;font-weight:700;">${routeTxt}</span>` : '';

        m.bindTooltip(
            `<b>[${netLabel}] ${csSafe}</b>${vaBadge} <span style="color:#94a3b8;">(${p.distNm.toFixed(1)} NM)</span>` +
            line2 +
            line3 +
            `<br>Alt: ${p.alt} ft | GS: ${p.gs} kt | HDG: ${String(hdg).padStart(3, '0')}°`,
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
    document.body.classList.toggle('sidebar-collapsed', !sidebarOpen);
    if (arrow) arrow.innerText = sidebarOpen ? '◀' : '▶';
    if (label) label.style.display = sidebarOpen ? 'none' : 'block';

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (typeof map !== 'undefined' && map && map.invalidateSize) {
            map.invalidateSize();
        }
    }, 200);
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

    const radarBar = document.getElementById('weatherRadarBar');
    if (arrow) arrow.innerText = drawerOpen ? '▼' : '▲';
    if (infoBar) infoBar.style.bottom = drawerOpen ? '134px' : '56px';
    if (sidebar) sidebar.style.bottom = drawerOpen ? '134px' : '56px';
    if (radarBar) radarBar.style.bottom = drawerOpen ? '140px' : '64px';
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
    if (typeof updateGlossaryButtonUI === 'function') updateGlossaryButtonUI();

    const vnavText = document.getElementById('vnavText');
    if (vnavText && (!window.flightPlan || window.flightPlan.length === 0)) {
        vnavText.innerText = (t.noFpl || '').toUpperCase();
    }
}

async function setAppLanguage(lang, persist = true) {
    const safeLang = (String(lang || '').toLowerCase() === 'it') ? 'it' : 'en';
    currentLang = safeLang;
    window.currentLang = safeLang;
    window._demoLang = safeLang;
    if (typeof demo2Lang !== 'undefined') {
        demo2Lang = safeLang;
    }

    try { localStorage.setItem('aeroglass_lang', safeLang); } catch (e) {}

    const langSelect = document.getElementById('btnLangSelect');
    if (langSelect && langSelect.tagName === 'SELECT') {
        langSelect.value = safeLang;
    }

    applyTranslations();

    if (typeof updateDemoCaptionUI === 'function' && document.getElementById('demo2CaptionBanner')) {
        updateDemoCaptionUI();
    }
    if (window._demoTourActive && typeof window.renderCurrentDemoStep === 'function') {
        window.renderCurrentDemoStep();
    }

    if (persist && window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        try { await window.pywebview.api.save_setting('app_language', safeLang); } catch (e) {}
    }
}

function toggleLanguage() {
    const nextLang = (currentLang === 'it') ? 'en' : 'it';
    setAppLanguage(nextLang, true);
}

function showFirstLaunchLanguageModal() {
    if (document.getElementById('firstLaunchLangOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'firstLaunchLangOverlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 100000;
        background: rgba(2, 6, 23, 0.78);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
    `;

    overlay.innerHTML = `
        <div role="dialog" aria-modal="true" style="
            width: 390px;
            max-width: 92vw;
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 13, 22, 0.98) 100%);
            border: 1.5px solid rgba(56, 189, 248, 0.55);
            border-radius: 12px;
            padding: 18px 20px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85), 0 0 24px rgba(56, 189, 248, 0.2);
            color: #f8fafc;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            gap: 14px;
        ">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(148,163,184,0.2);padding-bottom:8px;">
                <span style="font-family:Consolas,monospace;font-size:12px;font-weight:800;color:#38bdf8;letter-spacing:0.6px;">🌐 LANGUAGE / LINGUA</span>
                <span style="font-family:Consolas,monospace;font-size:10px;color:#94a3b8;">FIRST LAUNCH</span>
            </div>
            <div style="font-size:13px;line-height:1.5;color:#e2e8f0;">
                <div>Default language is set to <b>English</b>. Would you like to switch to <b>Italian</b>?</div>
                <div style="color:#94a3b8;font-size:12px;margin-top:6px;">La lingua predefinita è l'<b>inglese</b>. Vuoi passare all'<b>italiano</b>?</div>
            </div>
            <div style="display:flex;gap:10px;margin-top:2px;">
                <button id="btnPickLangEn" type="button" style="
                    flex:1;
                    padding:8px 12px;
                    border-radius:8px;
                    border:1px solid #38bdf8;
                    background:rgba(56, 189, 248, 0.22);
                    color:#38bdf8;
                    font-family:Consolas,monospace;
                    font-size:12px;
                    font-weight:800;
                    cursor:pointer;
                ">🇬🇧 English (Keep)</button>
                <button id="btnPickLangIt" type="button" style="
                    flex:1;
                    padding:8px 12px;
                    border-radius:8px;
                    border:1px solid rgba(52, 211, 153, 0.7);
                    background:rgba(52, 211, 153, 0.16);
                    color:#34d399;
                    font-family:Consolas,monospace;
                    font-size:12px;
                    font-weight:800;
                    cursor:pointer;
                ">🇮🇹 Italiano</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const choose = async (lang) => {
        overlay.remove();
        await setAppLanguage(lang, true);
    };

    document.getElementById('btnPickLangEn').onclick = () => choose('en');
    document.getElementById('btnPickLangIt').onclick = () => choose('it');
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

    const omniInp = document.getElementById('omniSearch');
    if (omniInp) {
        omniInp.style.textTransform = 'uppercase';
        if (!omniInp._upperHooked) {
            omniInp._upperHooked = true;
            omniInp.addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
            omniInp.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (typeof filterAirports === 'function') {
                        filterAirports(this.value, true);
                    } else if (typeof searchAndCenterAirport === 'function') {
                        searchAndCenterAirport(this.value);
                    }
                }
            });
        }
    }

    if (!window.pywebview || !window.pywebview.api || typeof window.pywebview.api.get_initial_data !== 'function') return;
    if (initialized) return;
    initialized = true;

    // Fallback sicuro sul Friuli / Venezia se la telemetria non ha ancora coordinate valide
    if (typeof map !== 'undefined' && map) {
        const center = map.getCenter();
        if (!center || (Math.abs(center.lat) < 0.1 && Math.abs(center.lng) < 0.1)) {
            map.setView([45.8319, 12.5930], 10); // Centrato vicino a Pasiano / La Comina / Venezia
        }
    }
    if (typeof updateFlightInfoBar === 'function') updateFlightInfoBar(45.8319, 12.5930);
    if (typeof setFollowState === 'function') setFollowState(followState);
    if (typeof renderNavAids === 'function') renderNavAids(vorsData, ilsData);
    if (typeof updateMapScale === 'function') updateMapScale();

    try {
        if (window.pywebview.api.get_setting) {
            const langRes = await window.pywebview.api.get_setting('app_language');
            if (langRes && langRes.success && (langRes.value === 'it' || langRes.value === 'en')) {
                await setAppLanguage(langRes.value, false);
            } else {
                // Primo avvio assoluto: parte in inglese e chiede conferma per eventuale passaggio in italiano
                await setAppLanguage('en', false);
                setTimeout(showFirstLaunchLanguageModal, 350);
            }

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

            const atcCfgRes = await window.pywebview.api.get_setting('atc_radar_cfg');
            if (atcCfgRes && atcCfgRes.success && atcCfgRes.value) {
                try {
                    atcCoverageSettings = { ...atcCoverageSettings, ...JSON.parse(atcCfgRes.value) };
                    if (typeof window._syncAtcPopoverUI === 'function') window._syncAtcPopoverUI();
                } catch (e) {}
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
    // Fallback sicuro sul Friuli / Venezia se la telemetria non ha ancora coordinate valide
    if (typeof map !== 'undefined' && map) {
        const center = map.getCenter();
        if (!center || (Math.abs(center.lat) < 0.1 && Math.abs(center.lng) < 0.1)) {
            map.setView([45.8319, 12.5930], 10); // Centrato vicino a Pasiano / La Comina / Venezia
        }
    }
    if (typeof updateFlightInfoBar === 'function') updateFlightInfoBar(45.8319, 12.5930);
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

// --- 🤖 CO-PILOTA VIRTUALE ORWILL ---
let orwillOpen = false;

function toggleOrwillChat() {
    orwillOpen = !orwillOpen;
    const body = document.getElementById('orwillBody');
    const arrow = document.getElementById('orwillToggleArrow');
    if (body) body.style.display = orwillOpen ? 'flex' : 'none';
    if (arrow) arrow.innerText = orwillOpen ? '▼' : '▲';
}

async function sendOrwillQuery() {
    const inp = document.getElementById('orwillInput');
    const msgBox = document.getElementById('orwillMessages');
    if (!inp || !msgBox) return;

    const query = inp.value.trim();
    if (!query) return;

    msgBox.innerHTML += `<div class="orwill-msg user">${escapeHtml(query)}</div>`;
    inp.value = '';
    msgBox.scrollTop = msgBox.scrollHeight;

    const loadingId = 'orwill_load_' + Date.now();
    msgBox.innerHTML += `<div id="${loadingId}" class="orwill-msg bot">Orwill sta analizzando i dati di volo...</div>`;
    msgBox.scrollTop = msgBox.scrollHeight;

    try {
        let answer = "Orwill: Connessione temporaneamente non disponibile.";
        if (window.pywebview && window.pywebview.api && window.pywebview.api.ask_orwill) {
            const telemetryPayload = window.lastTelemetry || {};
            const res = await window.pywebview.api.ask_orwill(query, telemetryPayload, window.flightPlan);
            if (res && res.success) {
                answer = res.answer;
            }
        } else {
            answer = `Orwill (Offline Simulator): Ho ricevuto la tua domanda "${query}". Tutto regolare a bordo!`;
        }

        const loadEl = document.getElementById(loadingId);
        if (loadEl) loadEl.remove();

        msgBox.innerHTML += `<div class="orwill-msg bot">${escapeHtml(answer)}</div>`;
        msgBox.scrollTop = msgBox.scrollHeight;
    } catch (e) {
        const loadEl = document.getElementById(loadingId);
        if (loadEl) loadEl.remove();
        msgBox.innerHTML += `<div class="orwill-msg bot">Orwill: Errore di comunicazione con il modulo di bordo.</div>`;
        msgBox.scrollTop = msgBox.scrollHeight;
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function openGeminiWeb() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.open_external_gemini) {
        try {
            await window.pywebview.api.open_external_gemini();
        } catch (e) {
            window.open("https://gemini.google.com", "_blank");
        }
    } else {
        window.open("https://gemini.google.com", "_blank");
    }
}

window.addEventListener('pywebviewready', initAeroGlassApp);

// --- 🎛️ SISTEMA PROFILI DI TARATURA FILTRI (INDIPENDENTE PER MAPPA & GIORNO/NOTTE) ---
const DEFAULT_MAP_FILTERS = {
    'ifr_night':  { b: 0.88, c: 1.18, s: 0.92 },
    'ifr_day':    { b: 1.00, c: 1.02, s: 1.00 },
    'vfr_day':    { b: 1.00, c: 1.05, s: 1.00 },
    'vfr_night':  { b: 0.72, c: 1.20, s: 0.85 },
    'topo_day':   { b: 1.00, c: 1.05, s: 1.00 },
    'topo_night': { b: 0.72, c: 1.20, s: 0.85 },
    'sat_day':    { b: 1.00, c: 1.05, s: 1.00 },
    'sat_night':  { b: 0.65, c: 1.15, s: 0.92 },
    'map_day':    { b: 1.00, c: 1.02, s: 1.00 },
    'map_night':  { b: 0.88, c: 1.18, s: 0.92 }
};

let customMapFilters = {};
try {
    const saved = localStorage.getItem('aeroglass_map_filters_profile');
    if (saved) customMapFilters = JSON.parse(saved);
} catch (e) {}

function getActiveMapProfileKey() {
    const mapSelect = document.getElementById('mapStyleSelect');
    const style = (mapSelect && mapSelect.value) ? mapSelect.value.toLowerCase() : (currentMapStyleKey || 'ifr').toLowerCase();
    const light = (currentMapLighting || 'night').toLowerCase();
    return `${style}_${light}`;
}

function getActiveFilterValues() {
    const key = getActiveMapProfileKey();
    const def = DEFAULT_MAP_FILTERS[key] || { b: 1.00, c: 1.00, s: 1.00 };
    const cur = customMapFilters[key] || {};
    return {
        b: cur.b !== undefined ? cur.b : def.b,
        c: cur.c !== undefined ? cur.c : def.c,
        s: cur.s !== undefined ? cur.s : def.s
    };
}

function syncCalibratorSlidersFromProfile() {
    const key = getActiveMapProfileKey();
    const vals = getActiveFilterValues();

    const bSlider = document.getElementById('sliderBrightness');
    const cSlider = document.getElementById('sliderContrast');
    const sSlider = document.getElementById('sliderSaturate');

    if (bSlider) bSlider.value = vals.b;
    if (cSlider) cSlider.value = vals.c;
    if (sSlider) sSlider.value = vals.s;

    const bTxt = document.getElementById('valCalBrightness');
    const cTxt = document.getElementById('valCalContrast');
    const sTxt = document.getElementById('valCalSaturate');

    if (bTxt) bTxt.textContent = parseFloat(vals.b).toFixed(2);
    if (cTxt) cTxt.textContent = parseFloat(vals.c).toFixed(2);
    if (sTxt) sTxt.textContent = parseFloat(vals.s).toFixed(2);

    // Aggiorna intestazione del modal con la mappa attiva
    const titleEl = document.querySelector('#mapFilterCalibratorModal h3') || document.querySelector('#mapFilterCalibratorModal .modal-title');
    if (titleEl) {
        titleEl.innerHTML = `🎛️ TARATURA: <span style="color:#00d2ff;">${(currentMapStyleKey || 'IFR').toUpperCase()} (${(currentMapLighting || 'NOTTE').toUpperCase()})</span>`;
    }
}

function toggleFilterCalibrator() {
    const modal = document.getElementById('mapFilterCalibratorModal');
    if (!modal) return;
    const isVisible = (modal.style.display === 'flex');
    modal.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
        syncCalibratorSlidersFromProfile();
    }
}

function applyInteractiveFilters() {
    const bSlider = document.getElementById('sliderBrightness');
    const cSlider = document.getElementById('sliderContrast');
    const sSlider = document.getElementById('sliderSaturate');
    if (!bSlider || !cSlider || !sSlider) return;

    const bVal = parseFloat(bSlider.value);
    const cVal = parseFloat(cSlider.value);
    const sVal = parseFloat(sSlider.value);

    const bTxt = document.getElementById('valCalBrightness');
    const cTxt = document.getElementById('valCalContrast');
    const sTxt = document.getElementById('valCalSaturate');

    if (bTxt) bTxt.textContent = bVal.toFixed(2);
    if (cTxt) cTxt.textContent = cVal.toFixed(2);
    if (sTxt) sTxt.textContent = sVal.toFixed(2);

    const key = getActiveMapProfileKey();
    customMapFilters[key] = { b: bVal, c: cVal, s: sVal };

    try {
        localStorage.setItem('aeroglass_map_filters_profile', JSON.stringify(customMapFilters));
    } catch (e) {}

    // Applica istantaneamente il filtro forzando il bypass delle regole CSS con !important
    const mapEl = document.getElementById('map');
    const tilePane = mapEl ? mapEl.querySelector('.leaflet-tile-pane') : null;
    if (tilePane) {
        const isIfrNight = (key === 'ifr_night' || key === 'map_night');
        let filterStr = isIfrNight
            ? `invert(100%) hue-rotate(180deg) brightness(${bVal}) contrast(${cVal}) saturate(${sVal})`
            : `brightness(${bVal}) contrast(${cVal}) saturate(${sVal})`;

        tilePane.style.setProperty('filter', filterStr, 'important');
    }
}

function resetActiveMapFilters() {
    const key = getActiveMapProfileKey();
    const def = DEFAULT_MAP_FILTERS[key] || { b: 1.00, c: 1.00, s: 1.00 };
    delete customMapFilters[key];
    try {
        localStorage.setItem('aeroglass_map_filters_profile', JSON.stringify(customMapFilters));
    } catch (e) {}
    syncCalibratorSlidersFromProfile();
    applyMapLightingState();
}