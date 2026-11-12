// --- MODALITÀ DIMOSTRATIVA INTERATTIVA (TOUR GUIDATO FUMETTI LIRF -> EGLL) ---
const DEMO_LIRF_EGLL_FPL = [
    { ident: "LIRF", name: "Roma Fiumicino Leonardo da Vinci", lat: 41.8003, lon: 12.2389, alt_ft: 15, type: "DEP", rwy: "34L", proc_type: "SID", proc_name: "RWY 34L", metar: "LIRF 121350Z 25010KT 9999 FEW035 19/11 Q1018" },
    { ident: "GILIO", name: "Giglio Island (SID GILIO6A)", lat: 42.3694, lon: 11.4556, alt_ft: 14000, type: "WPT", proc_type: "SID", proc_name: "GILIO6A" },
    { ident: "ELB", name: "Elba VOR/DME", lat: 42.7306, lon: 10.3956, alt_ft: 24000, type: "VOR", proc_type: "SID", proc_name: "GILIO6A" },
    { ident: "GEN", name: "Genova Sestri VOR", lat: 44.4144, lon: 8.8475, alt_ft: 34000, type: "VOR", proc_type: "ENR", proc_name: "UM858" },
    { ident: "TOR", name: "Torino Caselle VOR", lat: 45.2008, lon: 7.6496, alt_ft: 36000, type: "VOR", proc_type: "ENR", proc_name: "UM729" },
    { ident: "MOLUS", name: "Monte Bianco / Geneva FIR", lat: 46.1433, lon: 6.7725, alt_ft: 36000, type: "WPT", proc_type: "ENR", proc_name: "UN853" },
    { ident: "DIJ", name: "Dijon Longvic VOR", lat: 47.2708, lon: 5.0972, alt_ft: 36000, type: "VOR", proc_type: "ENR", proc_name: "UM729" },
    { ident: "RESMI", name: "Paris South Sector", lat: 48.5686, lon: 2.8919, alt_ft: 32000, type: "WPT", proc_type: "ENR", proc_name: "UN857" },
    { ident: "ABB", name: "Abbeville VOR", lat: 50.1350, lon: 1.8547, alt_ft: 24000, type: "VOR", proc_type: "STAR", proc_name: "BIG4B" },
    { ident: "ALESO", name: "English Channel Entry (STAR BIG4B)", lat: 50.9756, lon: 1.3539, alt_ft: 16000, type: "WPT", proc_type: "STAR", proc_name: "BIG4B" },
    { ident: "BIG", name: "Biggin Hill VOR (IAF)", lat: 51.3308, lon: 0.0347, alt_ft: 7000, type: "VOR", proc_type: "STAR", proc_name: "BIG4B" },
    { ident: "EGLL", name: "London Heathrow", lat: 51.4700, lon: -0.4543, alt_ft: 83, type: "DEST", rwy: "27L", proc_type: "APPR", proc_name: "APPR RWY 27L", metar: "EGLL 121350Z 26014KT 9999 SCT028 BKN045 13/08 Q1014" }
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
    if (typeof closeNavlogModal === 'function') closeNavlogModal();
    if (typeof closeFuelPerfModal === 'function') closeFuelPerfModal();
    if (typeof closeEfbNetworkModal === 'function') closeEfbNetworkModal();
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
    if (typeof updateTodHeaderStatus === 'function') updateTodHeaderStatus();
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
        action: () => closeAllModalsForDemo()
    },
    {
        title: "📐 Cono ILS & Rubber Banding Elastico",
        desc: "Sulla pista <strong>27L di Heathrow (EGLL)</strong> vedi il cono di avvicinamento strumentale <strong>ILS</strong>. Trascinando qualsiasi tratto della rotta col mouse (o col dito sul tablet) modifichi il piano con aggancio magnetico <em>Snap</em> e <strong>Undo (Ctrl+Z)</strong>.",
        targetSelector: "#map",
        placement: "center",
        action: () => {
            closeAllModalsForDemo();
            if (typeof map !== 'undefined' && map) map.flyTo([51.38, 0.15], 9, { duration: 1.1 });
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
            if (typeof map !== 'undefined' && map) map.flyTo([46.0, 6.9], 7, { duration: 1.0 });
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
    if (typeof step.action === 'function') step.action();

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
            <div style="font-size:13.5px;font-weight:700;color:#fbbf24;margin-bottom:6px;line-height:1.3;">${step.title}</div>
            <div style="font-size:12px;color:#e2e8f0;line-height:1.5;margin-bottom:10px;">${step.desc}</div>
            <div style="width:100%;height:4px;background:rgba(148,163,184,0.2);border-radius:999px;overflow:hidden;margin-bottom:10px;">
                <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#38bdf8,#34d399);transition:width 0.3s ease;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <div style="display:flex;gap:5px;">
                    <button class="aero-demo-btn" onclick="prevDemoTourStep()" ${index === 0 ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>◀ Indietro</button>
                    <button class="aero-demo-btn amber" onclick="toggleDemoAutoPlay()">${demoState.autoPlay ? '⏸️ Pausa' : '▶️ Auto'}</button>
                    <button class="aero-demo-btn primary" onclick="nextDemoTourStep()">${index === total - 1 ? '✅ Fine' : 'Avanti ▶'}</button>
                </div>
                <div style="display:flex;gap:5px;">
                    <button class="aero-demo-btn" style="border-color:rgba(52,211,153,0.45);color:#34d399;" onclick="stopInteractiveDemoTour(true)" title="Termina il tour ma mantieni il piano di volo LIRF - EGLL">📌 Tieni Rotta</button>
                    <button class="aero-demo-btn" style="border-color:rgba(244,63,94,0.45);color:#f43f5e;" onclick="stopInteractiveDemoTour(false)" title="Chiudi Demo e ripristina il piano di volo precedente">✕ Esci</button>
                </div>
            </div>
        `;
    }

    setTimeout(() => positionDemoCallout(step.targetSelector, step.placement), 120);
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

function nextDemoTourStep() { if (window._demoTourActive) renderDemoStep(demoState.stepIndex + 1); }
function prevDemoTourStep() { if (window._demoTourActive) renderDemoStep(Math.max(0, demoState.stepIndex - 1)); }
function toggleDemoAutoPlay() { demoState.autoPlay = !demoState.autoPlay; renderDemoStep(demoState.stepIndex); }

function startInteractiveDemoTour() {
    if (window._demoTourActive) {
        stopInteractiveDemoTour(false);
        return;
    }
    window._demoTourActive = true;
    demoState.autoPlay = true;

    demoState.backupFpl = JSON.parse(JSON.stringify(typeof flightPlan !== 'undefined' ? flightPlan : []));
    demoState.backupAlt = JSON.parse(JSON.stringify(typeof currentAlternate !== 'undefined' ? currentAlternate : null));
    demoState.backupFuelCfg = JSON.parse(JSON.stringify(fuelPerfConfig));

    flightPlan = JSON.parse(JSON.stringify(DEMO_LIRF_EGLL_FPL));
    currentAlternate = JSON.parse(JSON.stringify(DEMO_LIRF_EGLL_ALT));

    window._skipRemoteSave = true;
    if (typeof updateFlightPlanUI === 'function') updateFlightPlanUI(currentAlternate, true);
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

    if (aircraftMarker) {
        try { map.removeLayer(aircraftMarker); } catch (e) {}
        aircraftMarker = null;
        lastRenderedAcftKey = null;
    }
    const acftLine = document.getElementById('acftVnavLine');
    if (acftLine) acftLine.style.display = 'none';

    if (demoState.backupFuelCfg) fuelPerfConfig = demoState.backupFuelCfg;

    if (!keepDemoRoute && demoState.backupFpl) {
        flightPlan = demoState.backupFpl;
        currentAlternate = demoState.backupAlt;
        window._skipRemoteSave = true;
        if (typeof updateFlightPlanUI === 'function') updateFlightPlanUI(currentAlternate, true);
        window._skipRemoteSave = false;
    } else if (keepDemoRoute && typeof updateFlightPlanUI === 'function') {
        updateFlightPlanUI(currentAlternate, true);
    }
}

function initDemoKeyboardShortcuts() {
    if (window._demoKeysInstalled) return;
    window._demoKeysInstalled = true;

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F1' || ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'd')) {
            e.preventDefault();
            startInteractiveDemoTour();
            return;
        }
        if (!window._demoTourActive) return;

        if (e.key === 'Escape') { e.preventDefault(); stopInteractiveDemoTour(false); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); nextDemoTourStep(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); prevDemoTourStep(); }
        else if (e.key === ' ') { e.preventDefault(); toggleDemoAutoPlay(); }
    });

    window.addEventListener('resize', () => {
        if (window._demoTourActive) {
            const step = DEMO_TOUR_STEPS[demoState.stepIndex];
            if (step) positionDemoCallout(step.targetSelector, step.placement);
        }
    });
}