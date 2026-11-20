// --- INIZIALIZZAZIONE MAPPA LEAFLET ---
const map = L.map('map', { zoomControl: false }).setView([43.5, 12.0], 6);
let currentTileLayer = L.tileLayer(tileSources.dark, { maxZoom: 19 }).addTo(map);

// Layer cartografici aeronautici continui (Open Flight Maps / OpenAIP)
const aeronauticalTileProviders = {
    ofm_base: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    // Tile server Mercator Open Flight Maps (Aggiornato con spazi aerei ICAO, CTR e VFR reporting points)
    ofm_aero: "https://snapshots.openflightmaps.org/live/2405/tiles/world/mercator/{z}/{x}/{y}.png",
    // Backup enroute layer
    openaip_tiles: "https://api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png"
};

let ofmAeroOverlayLayer = null;

function switchMapStyle(style) {
    if (!map) return;

    // Rimuove l'overlay aeronautico OFM se si passa a un'altra mappa
    if (ofmAeroOverlayLayer) {
        map.removeLayer(ofmAeroOverlayLayer);
        ofmAeroOverlayLayer = null;
    }

    if (style === "ofm_vfr") {
        // 1. Imposta mappa base chiara ad alto contrasto
        if (typeof currentTileLayer !== 'undefined' && currentTileLayer) {
            currentTileLayer.setUrl(aeronauticalTileProviders.ofm_base);
        }
        // 2. Sovrappone la cartografia aeronautica continua Open Flight Maps ICAO 1:500.000
        ofmAeroOverlayLayer = L.tileLayer(aeronauticalTileProviders.ofm_aero, {
            maxZoom: 14,
            minZoom: 4,
            opacity: 0.90,
            zIndex: 10,
            attribution: '&copy; <a href="https://www.openflightmaps.org" target="_blank">OpenFlightMaps</a> (ICAO VFR)'
        }).addTo(map);

        if (typeof showAeroNavToast === 'function') {
            showAeroNavToast("🗺️ Mappa attiva: <b>Open Flight Maps (VFR ICAO Ufficiale)</b>");
        }
        return;
    }
    const mapEl = document.getElementById('map');
    map.removeLayer(currentTileLayer);
    const url = tileSources[style] || tileSources.dark;
    if (style === 'dark' || style === 'lowifr') {
        mapEl.classList.add('map-dark-filter');
    } else {
        mapEl.classList.remove('map-dark-filter');
    }
    currentTileLayer = L.tileLayer(url, { maxZoom: 19 }).addTo(map);
}

// --- FOLLOW AIRCRAFT & CONTROLLI MAPPA ---
function setFollowState(stateIdx) {
    if (typeof stateIdx === 'boolean') followState = stateIdx ? 1 : 0;
    else followState = stateIdx;

    const btn = document.getElementById('btnFollowAcft');
    const t = translations[currentLang];
    const mapEl = document.getElementById('map');
    if (!btn) return;

    if (followState === 0) {
        btn.classList.remove('active');
        btn.innerText = t.btnFollowFree;
        if (mapEl) {
            mapEl.style.transition = 'transform 0.4s ease';
            mapEl.style.transform = `rotate(0deg)`;
        }
    } else if (followState === 1) {
        btn.classList.add('active');
        btn.innerText = t.btnFollowNorth;
        if (mapEl) {
            mapEl.style.transition = 'transform 0.4s ease';
            mapEl.style.transform = `rotate(0deg)`;
        }
        if (lastAcftLatLng) map.panTo(lastAcftLatLng, { animate: true, duration: 0.4 });
    } else if (followState === 2) {
        btn.classList.add('active');
        btn.innerText = t.btnFollowTrack;
        if (lastAcftLatLng) map.panTo(lastAcftLatLng, { animate: true, duration: 0.4 });
    }
}

function toggleFollowAircraft() {
    setFollowState((followState + 1) % 3);
}

map.on('dragstart', function() {
    if (followState !== 0) setFollowState(0);
});

// --- RADIOASSISTENZE CON BUFFER SPAZIALE DEL 25% ---
function createVorIcon(ident) {
    return L.divIcon({ className: '', html: `<div class="navaid-badge navaid-vor"><span>❖</span><span>${ident}</span></div>`, iconSize: [0, 0] });
}

function createIlsIcon(rwy) {
    return L.divIcon({ className: '', html: `<div class="navaid-badge navaid-ils"><span>📡</span><span>ILS ${rwy}</span></div>`, iconSize: [0, 0] });
}

function getBufferedBounds() {
    const bounds = map.getBounds();
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    const latBuffer = (northEast.lat - southWest.lat) * 0.125;
    const lngBuffer = (northEast.lng - southWest.lng) * 0.125;

    return L.latLngBounds(
        [southWest.lat - latBuffer, southWest.lng - lngBuffer],
        [northEast.lat + latBuffer, northEast.lng + lngBuffer]
    );
}

// Database di riserva VOR per garantire la visualizzazione anche offline
const FALLBACK_VORS = [
    { ident: "TES", name: "Tessera (Venezia)", freq: "115.30", lat: 45.5083, lon: 12.3514 },
    { ident: "CHI", name: "Chioggia", freq: "114.10", lat: 45.0683, lon: 12.2858 },
    { ident: "VFR", name: "Villafranca (Verona)", freq: "110.65", lat: 45.3958, lon: 10.8753 },
    { ident: "VIC", name: "Vicenza", freq: "113.80", lat: 45.5683, lon: 11.5317 },
    { ident: "TBN", name: "Treviso", freq: "112.50", lat: 45.6886, lon: 12.0833 },
    { ident: "BOA", name: "Bologna", freq: "115.20", lat: 44.5317, lon: 11.2953 },
    { ident: "RIV", name: "Rivolto", freq: "110.05", lat: 45.9786, lon: 13.0531 },
    { ident: "RON", name: "Ronchi", freq: "114.20", lat: 45.8236, lon: 13.4722 },
    { ident: "BZO", name: "Bolzano", freq: "112.15", lat: 46.4608, lon: 11.3283 },
    { ident: "SRN", name: "Saronno", freq: "113.70", lat: 45.6186, lon: 9.0278 },
    { ident: "LIN", name: "Linate", freq: "112.25", lat: 45.4453, lon: 9.2783 },
    { ident: "MMP", name: "Malpensa", freq: "113.15", lat: 45.6267, lon: 8.7281 },
    { ident: "BKL", name: "Bergamo", freq: "114.45", lat: 45.6739, lon: 9.7042 },
    { ident: "TRN", name: "Torino", freq: "114.50", lat: 45.2008, lon: 7.6492 },
    { ident: "GEN", name: "Genova", freq: "112.80", lat: 44.4150, lon: 8.8500 },
    { ident: "PIS", name: "Pisa", freq: "112.70", lat: 43.6839, lon: 10.3956 },
    { ident: "FRZ", name: "Firenze", freq: "115.65", lat: 43.8100, lon: 11.2050 },
    { ident: "RMI", name: "Rimini", freq: "116.20", lat: 44.0200, lon: 12.6117 },
    { ident: "ANC", name: "Ancona", freq: "112.30", lat: 43.6167, lon: 13.3600 },
    { ident: "OST", name: "Ostia", freq: "114.90", lat: 41.7333, lon: 12.2667 },
    { ident: "CMP", name: "Campagnano", freq: "114.30", lat: 42.1383, lon: 12.3683 },
    { ident: "NAP", name: "Napoli", freq: "117.40", lat: 40.8861, lon: 14.2908 },
    { ident: "BRI", name: "Bari", freq: "115.70", lat: 41.1389, lon: 16.7650 },
    { ident: "PAL", name: "Palermo", freq: "112.30", lat: 38.1783, lon: 13.3150 },
    { ident: "CTN", name: "Catania", freq: "113.80", lat: 37.4667, lon: 15.0667 },
    { ident: "CAG", name: "Cagliari", freq: "113.20", lat: 39.2517, lon: 9.0550 }
];

let navaidsLayerGroup = null;
let navaidsVisible = (typeof showNavaids !== 'undefined') ? Boolean(showNavaids) : true;
let _navaidsFetchTimer = null;

function scheduleNavaidsUpdate() {
    if (_navaidsFetchTimer) clearTimeout(_navaidsFetchTimer);
    _navaidsFetchTimer = setTimeout(fetchAndRenderNavaidsInView, 180);
}

async function fetchAndRenderNavaidsInView() {
    if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;

    if (!navaidsLayerGroup) {
        navaidsLayerGroup = L.layerGroup().addTo(map);
    }

    if (!navaidsVisible) {
        navaidsLayerGroup.clearLayers();
        return;
    }

    const zoom = map.getZoom();

    // Decluttering: a zoom panoramico (< 7.0) nasconde le radioassistenze per mantenere la mappa pulita
    if (zoom < 7.0) {
        navaidsLayerGroup.clearLayers();
        return;
    }

    const bounds = map.getBounds().pad(0.18);
    let navaidsList = [];
    let backendResponded = false;

    // 1. Query asincrona SQLite Bounding Box tramite pywebview
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_navaids_in_bounds) {
        try {
            const res = await window.pywebview.api.get_navaids_in_bounds(
                bounds.getSouth(), bounds.getNorth(),
                bounds.getWest(), bounds.getEast(),
                zoom
            );
            if (res && res.success && Array.isArray(res.navaids)) {
                navaidsList = res.navaids;
                backendResponded = true;
            }
        } catch (e) {
            console.warn("[Navaids] Errore query Bounding Box:", e);
        }
    }

    // Fallback locale solo se pywebview non ha risposto
    if (!backendResponded && Array.isArray(FALLBACK_VORS)) {
        navaidsList = FALLBACK_VORS.filter(v => bounds.contains([v.lat, v.lon]));
    }

    // Pulizia completa prima del ridisegno (così riducendo lo zoom spariscono subito gli NDB/dettagli)
    navaidsLayerGroup.clearLayers();

    // 2. Renderizzazione delle radioassistenze (VOR / VORTAC / TACAN / NDB)
    navaidsList.forEach(item => {
        const lat = Number(item.lat);
        const lon = Number(item.lon);
        if (isNaN(lat) || isNaN(lon)) return;

        const isNdb = String(item.type || '').toUpperCase().includes('NDB');
        const badgeClass = isNdb ? 'ndb-badge' : 'vor-badge';
        const iconChar = isNdb ? '📻' : '🧭';
        const typeLabel = item.type || (isNdb ? 'NDB' : 'VOR/DME');
        const freqVal = item.freq_mhz || item.freq || '';
        const freqText = isNdb ? `${freqVal || '---'} kHz` : `${freqVal || '---'} MHz`;

        const icon = L.divIcon({
            className: 'navaid-div-icon',
            html: `
                <div class="navaid-badge ${badgeClass}">
                    <span class="navaid-icon">${iconChar}</span>
                    <span class="navaid-id">${item.ident}</span>
                    <span class="navaid-freq">${freqVal}</span>
                </div>
            `,
            iconSize: null
        });

        const m = L.marker([lat, lon], { icon, zIndexOffset: isNdb ? 680 : 720 }).addTo(navaidsLayerGroup);

        const popupContent = `
            <div class="navaid-popup-body">
                <div class="navaid-popup-title" style="color:${isNdb ? '#fbbf24' : '#00d2ff'};">${iconChar} ${typeLabel} ${item.ident}</div>
                <div class="navaid-popup-subtitle">${item.name || ''} ${item.associated_airport ? '(' + item.associated_airport + ')' : ''}</div>
                <div class="navaid-popup-row">
                    <span>FREQUENZA:</span> <strong style="color:${isNdb ? '#fbbf24' : '#00d2ff'};">${freqText}</strong>
                </div>
                <div class="navaid-popup-row">
                    <span>COORDINATE:</span> <strong>${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</strong>
                </div>
                <div class="navaid-popup-hint" onclick="if(typeof sendFreqToScratchpad==='function'){sendFreqToScratchpad('${freqVal}');}">
                    📻 Clicca per inviare a Note EFB
                </div>
            </div>
        `;

        m.bindPopup(popupContent, { className: 'navaid-glass-popup', offset: [0, -4] });
    });

    // 3. Renderizzazione ILS (visibili solo in avvicinamento/terminale, zoom >= 8.5)
    const ilsSource = (typeof ilsData !== 'undefined' && Array.isArray(ilsData) && ilsData.length > 0)
        ? ilsData
        : ((Array.isArray(window.ilsData) && window.ilsData.length > 0)
            ? window.ilsData
            : ((typeof DEFAULT_ILS !== 'undefined' && Array.isArray(DEFAULT_ILS)) ? DEFAULT_ILS : []));
    const effectiveIls = (zoom >= 8.5) ? ilsSource : [];

    effectiveIls.forEach(ils => {
        const lat = Number(ils.lat || ils.latitude);
        const lon = Number(ils.lon || ils.longitude);
        if (isNaN(lat) || isNaN(lon) || !bounds.contains([lat, lon])) return;

        const freq = ils.freq || ils.freq_mhz || '---';
        const rwy = ils.rwy || ils.runway || ils.ident || '';
        const identOrApt = ils.ident || ils.apt_icao || ils.airport || '';
        const ilsName = ils.name || 'Sistema di Atterraggio Strumentale';
        const crs = ils.course || ils.crs || '---';
        const glideAlt = ils.gs_alt || ils.glide_alt || '3,000 ft';

        const ilsIcon = L.divIcon({
            className: 'navaid-div-icon',
            html: `
                <div class="navaid-badge ils-badge">
                    <span class="navaid-icon">📡</span>
                    <span class="navaid-id">ILS ${rwy}</span>
                    <span class="navaid-freq">${freq}</span>
                </div>
            `,
            iconSize: null
        });

        const m = L.marker([lat, lon], { icon: ilsIcon, zIndexOffset: 740 }).addTo(navaidsLayerGroup);

        const popupContent = `
            <div class="navaid-popup-body">
                <div class="navaid-popup-title" style="color:#e040fb;">📡 ILS RWY ${rwy}${identOrApt ? ' (' + identOrApt + ')' : ''}</div>
                <div class="navaid-popup-subtitle">${ilsName}</div>
                <div class="navaid-popup-row">
                    <span>FREQUENZA:</span> <strong style="color:#38bdf8;">${freq} MHz</strong>
                </div>
                <div class="navaid-popup-row">
                    <span>INBOUND CRS:</span> <strong style="color:#34d399;">${crs}°</strong>
                </div>
                <div class="navaid-popup-row">
                    <span>GLIDE INTERCEPT:</span> <strong style="color:#fbbf24;">${glideAlt}</strong>
                </div>
                <div class="navaid-popup-hint" onclick="if(typeof sendFreqToScratchpad==='function'){sendFreqToScratchpad('${freq}');}">
                    📻 Clicca per inviare a Note EFB
                </div>
            </div>
        `;

        m.bindPopup(popupContent, { className: 'navaid-glass-popup', offset: [0, -4] });
    });
}

function renderNavAids() {
    scheduleNavaidsUpdate();
}

function toggleNavaids() {
    navaidsVisible = !navaidsVisible;
    window.showNavaids = navaidsVisible;
    if (typeof showNavaids !== 'undefined') showNavaids = navaidsVisible;

    const btn = document.getElementById('btnToggleNavaids');
    if (btn) {
        btn.classList.toggle('active', navaidsVisible);
        btn.style.borderColor = navaidsVisible ? 'rgba(0, 210, 255, 0.65)' : 'rgba(148, 163, 184, 0.30)';
        btn.style.color = navaidsVisible ? '#00d2ff' : '#8b949e';
        btn.style.opacity = navaidsVisible ? '1' : '0.6';
    }

    if (!navaidsVisible && navaidsLayerGroup) {
        navaidsLayerGroup.clearLayers();
    } else {
        scheduleNavaidsUpdate();
    }
}

function toggleNavaidsLayer() {
    toggleNavaids();
}

window.toggleNavaids = toggleNavaids;
window.toggleNavaidsLayer = toggleNavaids;
window.renderNavAids = renderNavAids;

map.on('moveend zoomend', function() {
    if (navaidsVisible) {
        scheduleNavaidsUpdate();
    }
});

// --- FILTRI E SPAZI AEREI ---
function toggleProceduresPanel() {
    const panel = document.getElementById('proceduresPanel');
    if (panel) panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
}

function toggleFixesLayer(enabled) {
    waypointMarkers.forEach(m => { if (enabled) map.addLayer(m); else map.removeLayer(m); });
}

function toggleSidStarLayer(enabled) {
    showSidStar = enabled;
    if (typeof updateFlightPlanUI === 'function' && flightPlan && flightPlan.length > 0) {
        updateFlightPlanUI(undefined, false);
    }
}

function toggleApproachConeLayer(enabled) {
    showApproachCone = enabled;
    if (typeof updateFlightPlanUI === 'function' && flightPlan && flightPlan.length > 0) {
        updateFlightPlanUI(undefined, false);
    }
}

function toggleAirspaceLayer(type, enabled) {
    if (!airspaceLayers[type]) airspaceLayers[type] = [];
    if (enabled) {
        if (airspaceLayers[type].length === 0 && AIRSPACES_DATA[type]) {
            AIRSPACES_DATA[type].forEach(zone => {
                const poly = L.polygon(zone.coords, {
                    color: zone.color, weight: 1.5, fillColor: zone.color, fillOpacity: 0.12,
                    dashArray: type === 'restricted' ? '4,4' : null
                }).addTo(map);
                poly.bindPopup(`<div style="font-weight:700; color:${zone.color};">${zone.name} (${type.toUpperCase()})</div>`);
                airspaceLayers[type].push(poly);
            });
        } else {
            airspaceLayers[type].forEach(p => map.addLayer(p));
        }
    } else {
        airspaceLayers[type].forEach(p => map.removeLayer(p));
    }
}

// --- SELEZIONE WAYPOINT UTENTE SULLA MAPPA ---
function toggleMapPickMode(forceState) {
    isPickingUserWp = (forceState !== undefined) ? forceState : !isPickingUserWp;
    const btn = document.getElementById('btnPickMapWp');
    const mapEl = document.getElementById('map');

    if (isPickingUserWp) {
        if (btn) { btn.classList.add('btn-pick-active'); btn.innerHTML = '🎯 Clicca Mappa...'; }
        if (mapEl) mapEl.classList.add('map-pick-cursor');
    } else {
        if (btn) { btn.classList.remove('btn-pick-active'); btn.innerHTML = '📍 Mappa'; }
        if (mapEl) mapEl.classList.remove('map-pick-cursor');
    }
}

function getNextAutoWpId() {
    let idx = userWaypoints.length + 1;
    while (userWaypoints.some(w => w.ident === `WP${idx}`)) idx++;
    return `WP${idx}`;
}

map.on('click', function(e) {
    if (!isPickingUserWp) return;

    const lat = Number(e.latlng.lat.toFixed(5));
    const lon = Number(e.latlng.lng.toFixed(5));
    const latInput = document.getElementById('uwLat');
    const lonInput = document.getElementById('uwLon');
    const idInput = document.getElementById('uwId');

    if (latInput) latInput.value = lat;
    if (lonInput) lonInput.value = lon;
    if (idInput && !idInput.value.trim()) idInput.value = getNextAutoWpId();

    if (tempPickMarker) map.removeLayer(tempPickMarker);
    tempPickMarker = L.circleMarker([lat, lon], {
        radius: 6, color: '#38bdf8', fillColor: '#fbbf24', fillOpacity: 0.9, weight: 2
    }).addTo(map);

    toggleMapPickMode(false);
    if (idInput) idInput.focus();
});

map.on('contextmenu', function(e) {
    if (rubberBandState) return;
    const lat = Number(e.latlng.lat.toFixed(5));
    const lon = Number(e.latlng.lng.toFixed(5));
    const suggestedId = getNextAutoWpId();
    const defaultAlt = parseInt(document.getElementById('uwAlt')?.value, 10) || 5000;
    const hasActiveRoute = (flightPlan && flightPlan.length >= 2);

    const popupContent = `
        <div style="min-width: 195px; font-family: 'Segoe UI', sans-serif;">
            <div style="font-weight: 700; font-size: 12px; color: #fbbf24; margin-bottom: 4px;">📍 NUOVO USER WAYPOINT</div>
            <div style="font-size: 11px; color: #94a3b8; font-family: monospace; margin-bottom: 6px;">LAT: ${lat} | LON: ${lon}</div>
            <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                <input type="text" id="ctxWpId" value="${suggestedId}" style="flex: 1; width: 75px; background: #0f172a; border: 1px solid #38bdf8; color: #f8fafc; border-radius: 4px; padding: 4px 6px; font-size: 11px; text-transform: uppercase;">
                <input type="number" id="ctxWpAlt" value="${defaultAlt}" style="width: 80px; background: #0f172a; border: 1px solid #38bdf8; color: #f8fafc; border-radius: 4px; padding: 4px 6px; font-size: 11px;" step="500">
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <button class="btn btn-emerald" style="width: 100%; padding: 5px; font-size: 11px;" onclick="quickSaveMapWaypoint(${lat}, ${lon}, false)">💾 Salva in Waypoints Utente</button>
                ${hasActiveRoute ? `<button class="btn btn-cyan" style="width: 100%; padding: 5px; font-size: 11px;" onclick="quickSaveMapWaypoint(${lat}, ${lon}, true)">🚀 Salva & Inserisci in Rotta</button>` : ''}
            </div>
        </div>
    `;
    L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(map);
});

async function quickSaveMapWaypoint(lat, lon, insertInRoute = false) {
    const idEl = document.getElementById('ctxWpId');
    const altEl = document.getElementById('ctxWpAlt');
    const id = (idEl && idEl.value.trim()) ? idEl.value.trim().toUpperCase() : getNextAutoWpId();
    const alt = (altEl && !isNaN(parseInt(altEl.value, 10))) ? parseInt(altEl.value, 10) : 5000;

    const wpObj = { ident: id, name: "User Waypoint", lat: Number(lat), lon: Number(lon), alt_ft: alt, type: "USER" };
    const existingIdx = userWaypoints.findIndex(w => w.ident === id);
    if (existingIdx >= 0) userWaypoints[existingIdx] = wpObj;
    else userWaypoints.push(wpObj);

    map.closePopup();
    if (tempPickMarker) { map.removeLayer(tempPickMarker); tempPickMarker = null; }
    await saveAndRefreshUserWaypoints();

    if (insertInRoute && flightPlan && flightPlan.length >= 2) addWpToRoute(id);
}

// --- LOGICA RUBBER BANDING (MOUSE + TOUCH TABLET) ---
function findNearestSnapTarget(latlng, excludeIdent = null) {
    const maxSnapPixels = 20;
    const cursorPt = map.latLngToContainerPoint(latlng);
    let bestTarget = null;
    let minPixelDist = maxSnapPixels;

    const checkCandidate = (ident, name, lat, lon, alt_ft, type) => {
        if (!ident || ident === excludeIdent || lat === null || lon === null) return;
        const pt = map.latLngToContainerPoint([lat, lon]);
        const distPx = cursorPt.distanceTo(pt);
        if (distPx < minPixelDist) {
            minPixelDist = distPx;
            bestTarget = { ident, name, lat: Number(lat), lon: Number(lon), alt_ft, type };
        }
    };

    (userWaypoints || []).forEach(w => checkCandidate(w.ident, w.name || "User Waypoint", w.lat, w.lon, w.alt_ft, "USER"));
    (vorsData || []).forEach(v => checkCandidate(v.ident, v.name, v.lat, v.lon, null, "VOR"));
    (airportsData || []).forEach(a => checkCandidate(a.icao, a.name, a.lat, a.lon, a.elev || 0, "APT"));
    Object.keys(KNOWN_FIXES || {}).forEach(k => {
        const f = KNOWN_FIXES[k];
        checkCandidate(k, "Waypoint Navlog", f.lat, f.lon, null, "WPT");
    });

    return bestTarget;
}

function startRouteRubberBand(mode, index, startLatLng, originalEvent) {
    if (!flightPlan || flightPlan.length < 2) return;
    if (originalEvent) L.DomEvent.stopPropagation(originalEvent);

    map.closePopup();
    map.dragging.disable();

    rubberBandState = {
        mode: mode,
        index: index,
        startPoint: map.latLngToContainerPoint(startLatLng),
        currentLatLng: startLatLng,
        snapTarget: null,
        moved: false
    };
}

map.on('mousemove', function(e) {
    if (!rubberBandState) return;

    const curPt = map.latLngToContainerPoint(e.latlng);
    if (!rubberBandState.moved && curPt.distanceTo(rubberBandState.startPoint) < 7) return;
    rubberBandState.moved = true;

    const excludeId = rubberBandState.mode === 'move' ? flightPlan[rubberBandState.index]?.ident : null;
    const snap = findNearestSnapTarget(e.latlng, excludeId);
    rubberBandState.snapTarget = snap;

    const targetLatLng = snap ? L.latLng(snap.lat, snap.lon) : e.latlng;
    rubberBandState.currentLatLng = targetLatLng;

    const pPrev = rubberBandState.mode === 'insert' ? flightPlan[rubberBandState.index] : flightPlan[rubberBandState.index - 1];
    const pNext = flightPlan[rubberBandState.index + 1];

    const polyCoords = [[pPrev.lat, pPrev.lon], [targetLatLng.lat, targetLatLng.lng], [pNext.lat, pNext.lon]];

    if (!rubberBandPoly) {
        rubberBandPoly = L.polyline(polyCoords, { color: '#fbbf24', weight: 3, dashArray: '6, 6', interactive: false }).addTo(map);
    } else {
        rubberBandPoly.setLatLngs(polyCoords);
    }

    const d1 = (L.latLng(pPrev.lat, pPrev.lon).distanceTo(targetLatLng) / 1852).toFixed(1);
    const d2 = (targetLatLng.distanceTo(L.latLng(pNext.lat, pNext.lon)) / 1852).toFixed(1);
    const labelHtml = snap
        ? `🧲 SNAP: ${snap.ident} (${snap.name}) | ${d1} + ${d2} NM`
        : `${rubberBandState.mode === 'insert' ? '➕ NUOVO WP: ' + getNextAutoWpId() : '✥ SPOSTA: ' + flightPlan[rubberBandState.index].ident} (${targetLatLng.lat.toFixed(4)}, ${targetLatLng.lng.toFixed(4)}) | ${d1} + ${d2} NM`;

    if (!rubberBandMarker) {
        rubberBandMarker = L.circleMarker(targetLatLng, {
            radius: 7, color: snap ? '#34d399' : '#fbbf24', fillColor: snap ? '#34d399' : '#fbbf24',
            fillOpacity: 0.95, weight: 2, interactive: false
        }).addTo(map);
        rubberBandMarker.bindTooltip(labelHtml, { permanent: true, direction: 'top', offset: [0, -10], className: 'vnav-route-tooltip' }).openTooltip();
    } else {
        rubberBandMarker.setLatLng(targetLatLng);
        rubberBandMarker.setStyle({ color: snap ? '#34d399' : '#fbbf24', fillColor: snap ? '#34d399' : '#fbbf24' });
        rubberBandMarker.setTooltipContent(labelHtml);
    }
});

window.addEventListener('mouseup', async function() {
    if (!rubberBandState) return;
    const state = rubberBandState;
    rubberBandState = null;
    map.dragging.enable();

    if (rubberBandPoly) { map.removeLayer(rubberBandPoly); rubberBandPoly = null; }
    if (rubberBandMarker) { map.removeLayer(rubberBandMarker); rubberBandMarker = null; }
    if (!state.moved || !state.currentLatLng) return;

    if (typeof pushFlightPlanUndoState === 'function') pushFlightPlanUndoState();

    const lat = Number(state.currentLatLng.lat.toFixed(5));
    const lon = Number(state.currentLatLng.lng.toFixed(5));

    if (state.mode === 'insert') {
        const p1 = flightPlan[state.index], p2 = flightPlan[state.index + 1];
        const interpAlt = Math.round(((Number(p1.alt_ft) || 5000) + (Number(p2.alt_ft) || 5000)) / 200) * 100;

        let newWp;
        if (state.snapTarget) {
            newWp = {
                ident: state.snapTarget.ident, name: state.snapTarget.name || "Waypoint Rotta",
                lat: state.snapTarget.lat, lon: state.snapTarget.lon,
                alt_ft: state.snapTarget.alt_ft || interpAlt, type: "WPT", proc_type: "ENR", proc_name: "DCT"
            };
        } else {
            const newId = getNextAutoWpId();
            userWaypoints.push({ ident: newId, name: "User Waypoint", lat, lon, alt_ft: interpAlt, type: "USER" });
            await persistUserWaypoints();
            newWp = { ident: newId, name: "User Waypoint", lat, lon, alt_ft: interpAlt, type: "WPT", proc_type: "ENR", proc_name: "DCT" };
        }
        flightPlan.splice(state.index + 1, 0, newWp);
        updateFlightPlanUI(undefined, false);
    } else if (state.mode === 'move') {
        const wpt = flightPlan[state.index];
        if (!wpt) return;
        if (state.snapTarget) {
            wpt.ident = state.snapTarget.ident;
            wpt.name = state.snapTarget.name || wpt.name;
            wpt.lat = state.snapTarget.lat;
            wpt.lon = state.snapTarget.lon;
        } else {
            wpt.lat = lat;
            wpt.lon = lon;
            const uIdx = userWaypoints.findIndex(u => u.ident === wpt.ident);
            if (uIdx >= 0) {
                userWaypoints[uIdx].lat = lat;
                userWaypoints[uIdx].lon = lon;
                await persistUserWaypoints();
            }
        }
        updateFlightPlanUI(undefined, false);
    }
});

function initTouchRubberBanding() {
    if (typeof map === 'undefined' || !map) return;
    const mapContainer = map.getContainer();
    if (!mapContainer || mapContainer._touchRbInitialized) return;
    mapContainer._touchRbInitialized = true;

    let touchState = null, previewLine = null, previewBadge = null;

    function findTouchSnapCandidate(containerPt) {
        let best = null, minPx = 28;
        const checkList = (arr, typeLabel) => {
            if (!Array.isArray(arr)) return;
            for (const item of arr) {
                if (item.lat === undefined || item.lon === undefined) continue;
                const pt = map.latLngToContainerPoint([Number(item.lat), Number(item.lon)]);
                const dist = containerPt.distanceTo(pt);
                if (dist < minPx) {
                    minPx = dist;
                    best = {
                        ident: item.icao || item.ident || 'WPT', name: item.name || typeLabel,
                        lat: Number(item.lat), lon: Number(item.lon),
                        elev: Number(item.elev || item.alt_ft || 0), type: typeLabel
                    };
                }
            }
        };
        checkList(airportsData, 'APT');
        checkList(vorsData, 'VOR');
        checkList(userWaypoints, 'USER');
        return best;
    }

    function clearTouchPreview() {
        if (previewLine) { try { map.removeLayer(previewLine); } catch (e) {} previewLine = null; }
        if (previewBadge) { try { map.removeLayer(previewBadge); } catch (e) {} previewBadge = null; }
        window._touchRbActive = false;
        try { map.dragging.enable(); } catch (e) {}
    }

    mapContainer.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) {
            if (touchState) { clearTouchPreview(); touchState = null; }
            return;
        }
        if (!flightPlan || flightPlan.length < 2 || isPickingUserWp) return;

        const pt = map.mouseEventToContainerPoint(e.touches[0]);
        for (let i = 1; i < flightPlan.length - 1; i++) {
            const wpPt = map.latLngToContainerPoint([Number(flightPlan[i].lat), Number(flightPlan[i].lon)]);
            if (pt.distanceTo(wpPt) <= 26) {
                touchState = { mode: 'move', wpIndex: i, startPt: pt, hasDragged: false, currentLatLng: L.latLng(Number(flightPlan[i].lat), Number(flightPlan[i].lon)), snapTarget: null };
                window._touchRbActive = true;
                map.dragging.disable();
                return;
            }
        }
        for (let i = 0; i < flightPlan.length - 1; i++) {
            const p1 = map.latLngToContainerPoint([Number(flightPlan[i].lat), Number(flightPlan[i].lon)]);
            const p2 = map.latLngToContainerPoint([Number(flightPlan[i + 1].lat), Number(flightPlan[i + 1].lon)]);
            if ((i === 0 && pt.distanceTo(p1) < 22) || (i === flightPlan.length - 2 && pt.distanceTo(p2) < 22)) continue;
            if (L.LineUtil.pointToSegmentDistance(pt, p1, p2) <= 22) {
                touchState = { mode: 'insert', legIndex: i, startPt: pt, hasDragged: false, currentLatLng: map.containerPointToLatLng(pt), snapTarget: null };
                window._touchRbActive = true;
                map.dragging.disable();
                return;
            }
        }
    }, { passive: true });

    mapContainer.addEventListener('touchmove', (e) => {
        if (!touchState) return;
        if (!e.touches || e.touches.length !== 1) { clearTouchPreview(); touchState = null; return; }

        const pt = map.mouseEventToContainerPoint(e.touches[0]);
        if (!touchState.hasDragged && pt.distanceTo(touchState.startPt) < 8) return;
        touchState.hasDragged = true;
        if (e.cancelable) e.preventDefault();

        const snap = findTouchSnapCandidate(pt);
        touchState.snapTarget = snap;
        const targetLatLng = snap ? L.latLng(snap.lat, snap.lon) : map.containerPointToLatLng(pt);
        touchState.currentLatLng = targetLatLng;

        const prevWp = touchState.mode === 'move' ? flightPlan[touchState.wpIndex - 1] : flightPlan[touchState.legIndex];
        const nextWp = touchState.mode === 'move' ? flightPlan[touchState.wpIndex + 1] : flightPlan[touchState.legIndex + 1];
        const polyCoords = [[Number(prevWp.lat), Number(prevWp.lon)], [targetLatLng.lat, targetLatLng.lng], [Number(nextWp.lat), Number(nextWp.lon)]];
        const lineColor = snap ? '#34d399' : '#38bdf8';

        if (!previewLine) previewLine = L.polyline(polyCoords, { color: lineColor, weight: 4, dashArray: '8, 6', opacity: 0.95 }).addTo(map);
        else { previewLine.setLatLngs(polyCoords); previewLine.setStyle({ color: lineColor }); }

        const badgeHtml = snap
            ? `<div style="background:rgba(6,78,59,0.95);border:1.5px solid #34d399;color:#34d399;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;transform:translate(-50%,-145%);box-shadow:0 3px 12px rgba(0,0,0,0.6);">🧲 SNAP: ${snap.ident}</div>`
            : `<div style="background:rgba(15,23,42,0.92);border:1.5px solid #38bdf8;color:#38bdf8;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;transform:translate(-50%,-145%);box-shadow:0 3px 12px rgba(0,0,0,0.6);">📍 ${targetLatLng.lat.toFixed(3)}, ${targetLatLng.lng.toFixed(3)}</div>`;
        const badgeIcon = L.divIcon({ className: '', html: badgeHtml, iconSize: [120, 24], iconAnchor: [0, 0] });

        if (!previewBadge) previewBadge = L.marker(targetLatLng, { icon: badgeIcon, interactive: false, zIndexOffset: 2000 }).addTo(map);
        else { previewBadge.setLatLng(targetLatLng); previewBadge.setIcon(badgeIcon); }
    }, { passive: false });

    const finishTouchRubberBand = () => {
        if (!touchState) return;
        const state = touchState;
        touchState = null;
        clearTouchPreview();
        if (!state.hasDragged || !state.currentLatLng) return;

        if (typeof pushFlightPlanUndoState === 'function') pushFlightPlanUndoState();

        const lat = Number(state.currentLatLng.lat.toFixed(5));
        const lon = Number(state.currentLatLng.lng.toFixed(5));
        const snap = state.snapTarget;

        if (state.mode === 'move') {
            const wp = flightPlan[state.wpIndex];
            if (snap) {
                wp.ident = snap.ident; wp.name = snap.name; wp.lat = snap.lat; wp.lon = snap.lon; wp.type = snap.type;
            } else {
                wp.lat = lat; wp.lon = lon;
                const uwp = userWaypoints.find(u => u.ident === wp.ident);
                if (uwp) { uwp.lat = lat; uwp.lon = lon; persistUserWaypoints(); }
            }
        } else if (state.mode === 'insert') {
            const prevWp = flightPlan[state.legIndex], nextWp = flightPlan[state.legIndex + 1];
            const interpAlt = Math.max(1000, Math.round(((Number(prevWp.alt_ft || 5000) + Number(nextWp.alt_ft || 5000)) / 2) / 100) * 100);
            let newWp = null;
            if (snap) {
                newWp = { ident: snap.ident, name: snap.name, lat: snap.lat, lon: snap.lon, alt_ft: interpAlt, type: snap.type, proc_type: 'ENR', proc_name: 'DCT' };
            } else {
                const newIdent = getNextAutoWpId();
                newWp = { ident: newIdent, name: 'User Waypoint (Touch)', lat, lon, alt_ft: interpAlt, type: 'USER', proc_type: 'ENR', proc_name: 'DCT' };
                userWaypoints.push({ ident: newIdent, name: 'User Waypoint (Touch)', lat, lon, alt_ft: interpAlt, type: 'USER' });
                persistUserWaypoints();
            }
            flightPlan.splice(state.legIndex + 1, 0, newWp);
        }
        updateFlightPlanUI(currentAlternate, false);
    };

    mapContainer.addEventListener('touchend', finishTouchRubberBand);
    mapContainer.addEventListener('touchcancel', () => { touchState = null; clearTouchPreview(); });
}

// --- AGGIORNAMENTO DINAMICO BARRA DI SCALA (NM) E COORDINATE MOUSE ---
function updateMapScale() {
    const scaleTextEl = document.getElementById('scaleText');
    if (!scaleTextEl || typeof map === 'undefined' || !map) return;

    const p1 = map.containerPointToLatLng([0, 0]);
    const p2 = map.containerPointToLatLng([80, 0]);
    let nm = p1.distanceTo(p2) / 1852;

    if (nm >= 10) nm = Math.round(nm);
    else if (nm >= 1) nm = nm.toFixed(1);
    else nm = nm.toFixed(2);

    scaleTextEl.innerText = `${nm} NM`;
}

map.on('move zoom viewreset', updateMapScale);
setTimeout(updateMapScale, 300);
setTimeout(updateMapScale, 1000);

map.on('mousemove', function(e) {
    const coordsEl = document.getElementById('infoCoords');
    if (coordsEl) {
        coordsEl.innerText = `LAT: ${e.latlng.lat.toFixed(5)} LON: ${e.latlng.lng.toFixed(5)}`;
    }
});