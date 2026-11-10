// --- INIZIALIZZAZIONE MAPPA LEAFLET ---
const map = L.map('map', { zoomControl: false }).setView([43.5, 12.0], 6);
let currentTileLayer = L.tileLayer(tileSources.dark, { maxZoom: 19 }).addTo(map);

function switchMapStyle(style) {
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
    // Gestione retrocompatibilità per le chiamate boolean da altri script
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
        // La rotazione continua (Track Up) è applicata in telemetry.js
        if (lastAcftLatLng) map.panTo(lastAcftLatLng, { animate: true, duration: 0.4 });
    }
}

function toggleFollowAircraft() {
    // Passa ciclicamente tra: 0 (Libera) -> 1 (North) -> 2 (Track) -> 0...
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

    const latSpan = northEast.lat - southWest.lat;
    const lngSpan = northEast.lng - southWest.lng;

    // Buffer del 25% complessivo (12.5% per ciascun lato)
    const latBuffer = latSpan * 0.125;
    const lngBuffer = lngSpan * 0.125;

    return L.latLngBounds(
        [southWest.lat - latBuffer, southWest.lng - lngBuffer],
        [northEast.lat + latBuffer, northEast.lng + lngBuffer]
    );
}

function renderNavAids(vors, ilsList) {
    if (vorMarkers && vorMarkers.length > 0) vorMarkers.forEach(m => map.removeLayer(m));
    vorMarkers = [];
    if (ilsMarkers && ilsMarkers.length > 0) ilsMarkers.forEach(m => map.removeLayer(m));
    ilsMarkers = [];

    if (!showNavaids) return;

    const bufferedBounds = getBufferedBounds();

    (vors || DEFAULT_VORS).forEach(vor => {
        if (vor.lat && vor.lon) {
            const latLng = L.latLng(vor.lat, vor.lon);
            if (bufferedBounds.contains(latLng)) {
                const marker = L.marker(latLng, { icon: createVorIcon(vor.ident), zIndexOffset: 400 }).addTo(map);
                marker.bindPopup(
                    `<div style="font-weight:700;font-size:12px;color:#38bdf8;">VOR: ${vor.ident}</div>` +
                    `<div style="font-size:11px;color:#f8fafc;">${vor.name}</div>` +
                    `<div style="font-size:11px;font-family:monospace;color:#34d399;margin-top:2px;">FREQ: ${vor.freq} MHz</div>`
                );
                vorMarkers.push(marker);
            }
        }
    });

    (ilsList || DEFAULT_ILS).forEach(ils => {
        if (ils.lat && ils.lon) {
            const latLng = L.latLng(ils.lat, ils.lon);
            if (bufferedBounds.contains(latLng)) {
                const marker = L.marker(latLng, { icon: createIlsIcon(ils.rwy, ils.ident), zIndexOffset: 450 }).addTo(map);
                marker.bindPopup(
                    `<div style="font-weight:700;font-size:12px;color:#e879f9;">ILS RWY ${ils.rwy} (${ils.ident})</div>` +
                    `<div style="font-size:11px;color:#f8fafc;margin-bottom:4px;">${ils.name}</div>` +
                    `<div style="font-size:11px;font-family:monospace;color:#38bdf8;">FREQ: ${ils.freq} MHz</div>` +
                    `<div style="font-size:11px;font-family:monospace;color:#34d399;">COURSE: ${ils.course}°</div>` +
                    `<div style="font-size:11px;font-family:monospace;color:#fbbf24;">GLIDE ALT: ${ils.gs_alt}</div>`
                );
                ilsMarkers.push(marker);
            }
        }
    });
}

map.on('moveend', function() {
    renderNavAids(vorsData, ilsData);
});

function toggleNavaidsLayer() {
    showNavaids = !showNavaids;
    const btn = document.getElementById('btnToggleNavaids');
    const t = translations[currentLang];
    if (btn) {
        if (showNavaids) {
            btn.classList.add('active');
            btn.innerText = t.btnNavaids;
        } else {
            btn.classList.remove('active');
            btn.innerText = t.btnNavaidsOff;
        }
    }
    renderNavAids(vorsData, ilsData);
}

// --- FILTRI E SPAZI AEREI ---
function toggleProceduresPanel() {
    const panel = document.getElementById('proceduresPanel');
    if (panel) panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
}

function toggleFixesLayer(enabled) {
    waypointMarkers.forEach(m => { if (enabled) map.addLayer(m); else map.removeLayer(m); });
}

function toggleAirspaceLayer(type, enabled) {
    if (!airspaceLayers[type]) airspaceLayers[type] = [];
    if (enabled) {
        if (airspaceLayers[type].length === 0 && AIRSPACES_DATA[type]) {
            AIRSPACES_DATA[type].forEach(zone => {
                const poly = L.polygon(zone.coords, {
                    color: zone.color,
                    weight: 1.5,
                    fillColor: zone.color,
                    fillOpacity: 0.12,
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
        if (btn) {
            btn.classList.add('btn-pick-active');
            btn.innerHTML = '🎯 Clicca Mappa...';
        }
        if (mapEl) mapEl.classList.add('map-pick-cursor');
    } else {
        if (btn) {
            btn.classList.remove('btn-pick-active');
            btn.innerHTML = '📍 Mappa';
        }
        if (mapEl) mapEl.classList.remove('map-pick-cursor');
    }
}

function getNextAutoWpId() {
    let idx = userWaypoints.length + 1;
    while (userWaypoints.some(w => w.ident === `WP${idx}`)) {
        idx++;
    }
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
    if (idInput && !idInput.value.trim()) {
        idInput.value = getNextAutoWpId();
    }

    if (tempPickMarker) map.removeLayer(tempPickMarker);
    tempPickMarker = L.circleMarker([lat, lon], {
        radius: 6,
        color: '#38bdf8',
        fillColor: '#fbbf24',
        fillOpacity: 0.9,
        weight: 2
    }).addTo(map);

    toggleMapPickMode(false);
    if (idInput) idInput.focus();
});

map.on('contextmenu', function(e) {
    const lat = Number(e.latlng.lat.toFixed(5));
    const lon = Number(e.latlng.lng.toFixed(5));
    const suggestedId = getNextAutoWpId();
    const defaultAlt = parseInt(document.getElementById('uwAlt')?.value, 10) || 5000;

    const popupContent = `
        <div style="min-width: 175px; font-family: 'Segoe UI', sans-serif;">
            <div style="font-weight: 700; font-size: 12px; color: #fbbf24; margin-bottom: 4px;">📍 NUOVO USER WAYPOINT</div>
            <div style="font-size: 11px; color: #94a3b8; font-family: monospace; margin-bottom: 6px;">
                LAT: ${lat}<br>LON: ${lon}
            </div>
            <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                <input type="text" id="ctxWpId" value="${suggestedId}" style="width: 75px; background: #0f172a; border: 1px solid #38bdf8; color: #f8fafc; border-radius: 4px; padding: 3px 6px; font-size: 11px; text-transform: uppercase;">
                <input type="number" id="ctxWpAlt" value="${defaultAlt}" style="width: 75px; background: #0f172a; border: 1px solid #38bdf8; color: #f8fafc; border-radius: 4px; padding: 3px 6px; font-size: 11px;" step="500">
            </div>
            <button class="btn btn-emerald" style="width: 100%; padding: 5px; font-size: 11px;" onclick="quickSaveMapWaypoint(${lat}, ${lon})">
                ➕ Salva User WP
            </button>
        </div>
    `;

    L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);
});

async function quickSaveMapWaypoint(lat, lon) {
    const idEl = document.getElementById('ctxWpId');
    const altEl = document.getElementById('ctxWpAlt');
    const id = (idEl && idEl.value.trim()) ? idEl.value.trim().toUpperCase() : getNextAutoWpId();
    const alt = (altEl && !isNaN(parseInt(altEl.value, 10))) ? parseInt(altEl.value, 10) : 5000;

    userWaypoints.push({ ident: id, lat: Number(lat), lon: Number(lon), alt_ft: alt, type: "USER" });
    map.closePopup();
    if (tempPickMarker) {
        map.removeLayer(tempPickMarker);
        tempPickMarker = null;
    }
    await saveAndRefreshUserWaypoints();
}