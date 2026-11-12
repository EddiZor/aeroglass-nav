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

// --- MODALITÀ NOTTURNA DEDICATA & SWITCH RAPIDO (☀️ GIORNO / 🌙 DARK / 🌑 NOTTE) ---
let currentThemeMode = localStorage.getItem('aeroglass_theme_mode') || 'dark';

function injectThemeModeStyles() {
    if (document.getElementById('aeroglassThemeStyles')) return;
    const style = document.createElement('style');
    style.id = 'aeroglassThemeStyles';
    style.textContent = `
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
        /* Oscura automaticamente anche le mappe chiare (VFR Topo, High IFR) lasciando nitide rotte e icone */
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
    `;
    document.head.appendChild(style);
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

    // Inserisce lo switch nell'angolo destro dei controlli barra strumenti (accanto allo stile mappa)
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
        btn.title = isEn
            ? 'Dedicated Night Mode active (Anti-Glare) - Click for Day Mode'
            : 'Modalità Notte Profonda attiva (Anti-Abbagliamento) - Clicca per Giorno';
    } else if (currentThemeMode === 'day') {
        btn.innerHTML = isEn ? '☀️ <span>Day</span>' : '☀️ <span>Giorno</span>';
        btn.style.borderColor = 'rgba(2, 132, 199, 0.55)';
        btn.style.color = '#0284c7';
        btn.title = isEn
            ? 'Day Mode active - Click for Dark Cockpit'
            : 'Modalità Giorno attiva - Clicca per Dark Cockpit';
    } else {
        btn.innerHTML = isEn ? '🌙 <span>Dark</span>' : '🌙 <span>Dark</span>';
        btn.style.borderColor = 'rgba(56, 189, 248, 0.45)';
        btn.style.color = '#38bdf8';
        btn.title = isEn
            ? 'Standard Dark Cockpit - Click for Dedicated Night Dimmer'
            : 'Dark Cockpit standard - Clicca per Modalità Notte Profonda';
    }
}

async function applyThemeMode(mode, persist = true) {
    if (!['dark', 'night', 'day'].includes(mode)) mode = 'dark';
    currentThemeMode = mode;

    injectThemeModeStyles();
    ensureThemeToggleButton();

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
    if (!window.pywebview || !window.pywebview.api || (typeof rubberBandState !== 'undefined' && rubberBandState) || window._touchRbActive) return;
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

// --- CALCOLO E VISUALIZZAZIONE TOP OF DESCENT (ToD 3°) SU MAPPA E VNAV ---
function calcGreatCircleNm(lat1, lon1, lat2, lon2) {
    const R = 3440.065;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

    // Regola standard 3°: 3.0 NM per ogni 1.000 ft da perdere
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

    // Stima Ground Speed attuale o nominale per calcolo VS (fpm = GS * 5.2)
    const gsText = document.getElementById('valGs')?.innerText || '';
    const parsedGs = parseInt(gsText.replace(/[^0-9]/g, ''), 10);
    const defaultGs = maxAlt > 18000 ? 420 : (maxAlt > 9000 ? 220 : 125);
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
    if (typeof map === 'undefined' || !map) return;

    if (window._todMapMarker) {
        try { map.removeLayer(window._todMapMarker); } catch (e) {}
        window._todMapMarker = null;
    }

    const existingSvgGroup = document.getElementById('todVnavGroup');
    if (existingSvgGroup) existingSvgGroup.remove();

    const tod = computeTopOfDescentData();
    if (!tod) return;

    // 1. Marker ToD sulla mappa Leaflet
    const todIcon = L.divIcon({
        className: '',
        html: `
            <div style="display:flex;align-items:center;gap:4px;transform:translate(-50%,-50%);cursor:pointer;white-space:nowrap;">
                <div style="width:12px;height:12px;border-radius:50%;background:#fbbf24;border:2px solid #0f172a;box-shadow:0 0 10px #fbbf24;"></div>
                <span style="background:rgba(15,23,42,0.92);border:1px solid #fbbf24;color:#fbbf24;font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,0.6);">
                    📉 ToD (-${tod.descentDistNm.toFixed(0)} NM)
                </span>
            </div>
        `,
        iconSize: [110, 22],
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

    // 2. Linea e Badge ToD nel grafico SVG VNAV
    const acftLine = document.getElementById('acftVnavLine');
    const svg = acftLine ? acftLine.ownerSVGElement : document.querySelector('#elevationDrawer svg');
    if (svg) {
        const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width
            ? svg.viewBox.baseVal
            : { width: 1000, height: 110 };
        const xPos = (tod.fraction * vb.width).toFixed(1);
        const h = vb.height || 110;

        const ns = "http://www.w3.org/2000/svg";
        const g = document.createElementNS(ns, "g");
        g.setAttribute("id", "todVnavGroup");

        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", xPos);
        line.setAttribute("x2", xPos);
        line.setAttribute("y1", "6");
        line.setAttribute("y2", String(h));
        line.setAttribute("stroke", "#fbbf24");
        line.setAttribute("stroke-width", "1.8");
        line.setAttribute("stroke-dasharray", "4,3");
        g.appendChild(line);

        const labelX = Math.min(vb.width - 78, Math.max(8, Number(xPos) - 36));
        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(labelX));
        rect.setAttribute("y", "2");
        rect.setAttribute("width", "74");
        rect.setAttribute("height", "15");
        rect.setAttribute("rx", "4");
        rect.setAttribute("fill", "#0f172a");
        rect.setAttribute("stroke", "#fbbf24");
        rect.setAttribute("stroke-width", "1");
        g.appendChild(rect);

        const txt = document.createElementNS(ns, "text");
        txt.setAttribute("x", String(labelX + 37));
        txt.setAttribute("y", "12.5");
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("fill", "#fbbf24");
        txt.setAttribute("font-size", "9.5");
        txt.setAttribute("font-weight", "bold");
        txt.textContent = `ToD -${tod.descentDistNm.toFixed(0)}NM`;
        g.appendChild(txt);

        svg.appendChild(g);
    }

    updateTodHeaderStatus(tod);
}

function updateTodHeaderStatus(todInput) {
    const tod = todInput || computeTopOfDescentData();
    const vnavText = document.getElementById('vnavText');
    if (!vnavText || !tod) return;

    let statusSuffix = `  |  📉 ToD: ${tod.descentDistNm.toFixed(1)} NM prima di ${tod.destIdent} (VS ${tod.vs3DegFpm} fpm @ ${tod.activeGsKt}kt)`;

    if (typeof lastAcftLatLng !== 'undefined' && lastAcftLatLng && typeof calculateRouteProgress === 'function') {
        const simDot = document.getElementById('simDot');
        const isLive = simDot && simDot.classList.contains('live');
        if (isLive) {
            const prog = calculateRouteProgress(lastAcftLatLng.lat, lastAcftLatLng.lng);
            if (prog) {
                const acftDistNm = prog.fraction * tod.totalDistNm;
                const distToTod = tod.todDistFromStart - acftDistNm;
                const distToDest = Math.max(0.1, tod.totalDistNm - acftDistNm);

                if (distToTod > 0.5) {
                    statusSuffix = `  |  📉 ToD tra ${distToTod.toFixed(1)} NM (VS 3°: ${tod.vs3DegFpm} fpm)`;
                } else {
                    const altTxt = document.getElementById('valAlt')?.innerText || '';
                    const curAlt = parseInt(altTxt.replace(/[^0-9]/g, ''), 10) || tod.maxAlt;
                    const remAlt = Math.max(0, curAlt - tod.destElev);
                    const reqVs = -Math.round(((remAlt / distToDest) * (tod.activeGsKt / 60.0)) / 50) * 50;
                    statusSuffix = `  |  📉 DISCESA -> ${tod.destIdent} (${distToDest.toFixed(1)} NM) • VS Richiesto: ${reqVs} fpm`;
                }
            }
        }
    }

    const baseText = vnavText.innerText.split('  |  📉')[0];
    vnavText.innerText = baseText + statusSuffix;
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
        let minPx = 28; // Raggio di aggancio magnetico sul touch (in pixel)

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

        // 1. Verifica se il dito ha toccato un Waypoint intermedio esistente
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

        // 2. Verifica se il dito ha toccato un segmento della linea di rotta
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

    if (typeof window.updateFlightPlanUI === 'function') {
        const origUpdateFpl = window.updateFlightPlanUI;
        window.updateFlightPlanUI = function(...args) {
            const res = origUpdateFpl.apply(this, args);
            setTimeout(updateTopOfDescentOverlay, 40);
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
        pollTelemetry();
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
        if (createModal && event.target === createModal) {
            closeCreateFplModal();
        }
        const histModal = document.getElementById('flightHistoryModal');
        if (histModal && event.target === histModal) {
            closeFlightHistoryModal();
        }
        const efbModal = document.getElementById('efbNetworkModal');
        if (efbModal && event.target === efbModal) {
            closeEfbNetworkModal();
        }
    });

    setTimeout(initAeroGlassApp, 300);
});

window.addEventListener('pywebviewready', initAeroGlassApp);