const map = L.map('map', { zoomControl: false }).setView([43.5, 12.0], 6);

const translations = {
    en: {
        searchPlaceholder: "Search ICAO, VOR or Airport...",
        activeFpl: "Active Flight Plan",
        noFpl: "No active flight plan",
        vnavTitle: "Altitude Profile & Terrain (VNAV Multi-Step)",
        btnCreate: "Create",
        btnImport: ".pln",
        btnExport: ".pln",
        btnReload: "SimBrief",
        btnSimbrief: "SimBrief",
        btnFilters: "Filters & SID/STAR",
        btnNavaids: "📡 VOR / ILS: ON",
        btnNavaidsOff: "📡 VOR / ILS: OFF",
        btnFollowOn: "🎯 Follow Acft: ON",
        btnFollowFree: "✋ Free Map",
        btnReduce: "[ Reduce / Expand ]"
    },
    it: {
        searchPlaceholder: "Cerca ICAO, VOR o Aeroporto...",
        activeFpl: "Piano di Volo Attivo",
        noFpl: "Nessun piano di volo attivo",
        vnavTitle: "Profilo Altitudinale & Terreno (VNAV Multi-Step)",
        btnCreate: "Crea",
        btnImport: ".pln",
        btnExport: ".pln",
        btnReload: "SimBrief",
        btnSimbrief: "SimBrief",
        btnFilters: "Filtri & SID/STAR",
        btnNavaids: "📡 VOR / ILS: ON",
        btnNavaidsOff: "📡 VOR / ILS: OFF",
        btnFollowOn: "🎯 Segui Aereo: ON",
        btnFollowFree: "✋ Mappa Libera",
        btnReduce: "[ Riduci / Espandi ]"
    }
};

let currentLang = 'it';

function checkSystemLanguage() {
    const sysLang = navigator.language || navigator.userLanguage || '';
    const isItalianSystem = sysLang.toLowerCase().startsWith('it');
    const langBtn = document.getElementById('btnLangSelect');
    if (langBtn) {
        if (isItalianSystem) {
            langBtn.style.display = 'inline-flex';
            currentLang = 'it';
        } else {
            langBtn.style.display = 'none';
            currentLang = 'en';
        }
    }
    applyCurrentLanguageUI();
}

function applyCurrentLanguageUI() {
    const langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.innerText = currentLang.toUpperCase();
    const t = translations[currentLang];

    const searchInput = document.getElementById('omniSearch');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;

    const fplTitleEl = document.getElementById('fplSectionTitle');
    if (fplTitleEl) fplTitleEl.innerText = t.activeFpl.toUpperCase();

    const btnCreate = document.getElementById('btnCreateFpl');
    if (btnCreate) btnCreate.innerHTML = `➕ ${t.btnCreate}`;

    const btnImport = document.getElementById('btnImportPln');
    if (btnImport) btnImport.innerHTML = `📁 ${t.btnImport}`;

    const btnExport = document.getElementById('btnExportPln');
    if (btnExport) btnExport.innerHTML = `💾 ${t.btnExport}`;

    const btnReload = document.getElementById('simbriefCompactBtn');
    if (btnReload) btnReload.innerHTML = `✈️ ${t.btnReload}`;

    const lblFilters = document.getElementById('lblFilters');
    if (lblFilters) lblFilters.innerText = t.btnFilters;

    const vnavText = document.getElementById('vnavText');
    if (vnavText) {
        if (!flightPlan || flightPlan.length === 0) {
            vnavText.textContent = t.noFpl.toUpperCase();
        } else {
            const maxAlt = Math.max(...flightPlan.map(w => Number(w.alt_ft) || 5000), 5000);
            vnavText.textContent = `VNAV MULTI-STEP (MAX ALT: ${maxAlt.toLocaleString()} FT)`;
        }
    }

    const btnFollow = document.getElementById('btnFollowAcft');
    if (btnFollow) btnFollow.innerText = followAircraft ? t.btnFollowOn : t.btnFollowFree;

    const btnNavaids = document.getElementById('btnToggleNavaids');
    if (btnNavaids) btnNavaids.innerText = showNavaids ? t.btnNavaids : t.btnNavaidsOff;

    const lblReduce = document.getElementById('lblReduceExpand');
    if (lblReduce) lblReduce.innerText = t.btnReduce;
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'it' : 'en';
    applyCurrentLanguageUI();
}

const tileSources = {
    dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    vfr: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    lowifr: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    highifr: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

let currentTileLayer = L.tileLayer(tileSources.dark, { maxZoom: 19 }).addTo(map);

function switchMapStyle(style) {
    const mapEl = document.getElementById('map');
    map.removeLayer(currentTileLayer);
    let url = tileSources[style] || tileSources.dark;
    if (style === 'dark' || style === 'lowifr') {
        mapEl.classList.add('map-dark-filter');
    } else {
        mapEl.classList.remove('map-dark-filter');
    }
    currentTileLayer = L.tileLayer(url, { maxZoom: 19 }).addTo(map);
}

const EXTRA_AIRPORTS = [
    {"icao": "LIPX", "name": "Verona Villafranca", "lat": 45.3957, "lon": 10.8885, "elev": 239, "rwy": "04/22", "metar": "LIPX 061650Z 04006KT CAVOK 16/09 Q1018"},
    {"icao": "LIPO", "name": "Brescia Montichiari", "lat": 45.4289, "lon": 10.3306, "elev": 356, "rwy": "14/32", "metar": "LIPO 061650Z 06005KT 9999 FEW040 16/10 Q1018"},
    {"icao": "LIDT", "name": "Trento Mattarello", "lat": 46.0219, "lon": 11.1242, "elev": 607, "rwy": "18/36", "metar": "LIDT 061650Z VRB03KT CAVOK 14/06 Q1019"},
    {"icao": "LIPD", "name": "Udine Campoformido", "lat": 46.0319, "lon": 13.1869, "elev": 308, "rwy": "09/27", "metar": "LIPD 061650Z 05004KT CAVOK 17/08 Q1018"},
    {"icao": "LIPA", "name": "Aviano Air Base", "lat": 46.0319, "lon": 12.5965, "elev": 413, "rwy": "05/23", "metar": "LIPA 061650Z 05005KT CAVOK 17/08 Q1018"},
    {"icao": "LIKL", "name": "La Comina Pordenone", "lat": 46.0025, "lon": 12.6908, "elev": 275, "rwy": "18/36", "metar": "LIKL 061650Z VRB03KT CAVOK 17/09 Q1018"},
    {"icao": "LITY", "name": "Agrigento Valle dei Templi", "lat": 37.2450, "lon": 13.6620, "elev": 145, "rwy": "11/29", "metar": "LITY 061650Z 12008KT CAVOK 22/13 Q1016"},
    {"icao": "LIRF", "name": "Roma Fiumicino", "lat": 41.8003, "lon": 12.2389, "elev": 15, "rwy": "16L/34R", "metar": "LIRF 061650Z 25010KT CAVOK 18/11 Q1018"},
    {"icao": "LIPE", "name": "Bologna Borgo Panigale", "lat": 44.5354, "lon": 11.2887, "elev": 123, "rwy": "12/30", "metar": "LIPE 061650Z 12005KT CAVOK 16/10 Q1018"},
    {"icao": "LIMC", "name": "Milano Malpensa", "lat": 45.6306, "lon": 8.7281, "elev": 768, "rwy": "17/35", "metar": "LIMC 061650Z 35005KT CAVOK 15/08 Q1019"},
    {"icao": "LIME", "name": "Bergamo Orio al Serio", "lat": 45.6739, "lon": 9.7042, "elev": 782, "rwy": "10/28", "metar": "LIME 061650Z 09004KT CAVOK 15/09 Q1019"},
    {"icao": "LIML", "name": "Milano Linate", "lat": 45.4451, "lon": 9.2767, "elev": 353, "rwy": "18/36", "metar": "LIML 061650Z 11004KT CAVOK 16/10 Q1019"},
    {"icao": "LIPZ", "name": "Venezia Tessera", "lat": 45.5053, "lon": 12.3519, "elev": 7, "rwy": "04/22", "metar": "LIPZ 061650Z 04006KT CAVOK 16/11 Q1018"},
    {"icao": "LIPQ", "name": "Trieste Ronchi dei Legionari", "lat": 45.8275, "lon": 13.4722, "elev": 39, "rwy": "09/27", "metar": "LIPQ 061650Z 06005KT CAVOK 16/09 Q1018"},
    {"icao": "LIPV", "name": "Venezia San Nicolo Lido", "lat": 45.4281, "lon": 12.3878, "elev": 13, "rwy": "05/23", "metar": "LIPV 061650Z 05005KT CAVOK 16/11 Q1018"},
    {"icao": "LDZA", "name": "Zagreb Franjo Tudman", "lat": 45.7429, "lon": 16.0688, "elev": 353, "rwy": "04/22", "metar": "LDZA 061650Z 05006KT CAVOK 15/08 Q1019"},
    {"icao": "LJLJ", "name": "Ljubljana Brnik", "lat": 46.2237, "lon": 14.4576, "elev": 1273, "rwy": "12/30", "metar": "LJLJ 061650Z VRB02KT CAVOK 13/07 Q1020"},
    {"icao": "LIRQ", "name": "Firenze Peretola", "lat": 43.8100, "lon": 11.2051, "elev": 142, "rwy": "05/23", "metar": "LIRQ 061650Z 23006KT CAVOK 17/10 Q1018"},
    {"icao": "LIRP", "name": "Pisa San Giusto", "lat": 43.6839, "lon": 10.3927, "elev": 6, "rwy": "04/22", "metar": "LIRP 061650Z 25008KT CAVOK 18/12 Q1018"},
    {"icao": "LIRN", "name": "Napoli Capodichino", "lat": 40.8860, "lon": 14.2908, "elev": 294, "rwy": "06/24", "metar": "LIRN 061650Z 24007KT CAVOK 19/12 Q1017"},
    {"icao": "LICJ", "name": "Palermo Punta Raisi", "lat": 38.1759, "lon": 13.0910, "elev": 65, "rwy": "07/25", "metar": "LICJ 061650Z 07009KT CAVOK 21/14 Q1016"},
    {"icao": "LICC", "name": "Catania Fontanarossa", "lat": 37.4668, "lon": 15.0664, "elev": 39, "rwy": "08/26", "metar": "LICC 061650Z 10008KT CAVOK 21/14 Q1016"},
    {"icao": "LKPR", "name": "Prague Ruzyne Airport", "lat": 50.1008, "lon": 14.2600, "elev": 1247, "rwy": "06/24", "metar": "LKPR 061650Z 24008KT CAVOK 14/07 Q1017"}
];

const KNOWN_FIXES = {
    "SOVAN": { lat: 42.6369, lon: 11.6669 },
    "AMTEL": { lat: 43.1972, lon: 11.4556 },
    "IBRID": { lat: 43.5186, lon: 11.3328 },
    "KUGIX": { lat: 43.9114, lon: 11.1831 },
    "LOMED": { lat: 44.1758, lon: 11.1683 },
    "GAVRA": { lat: 43.7850, lon: 11.2400 },
    "ERTUK": { lat: 44.6200, lon: 11.4800 },
    "LOBSI": { lat: 45.4200, lon: 11.8300 },
    "MALUG": { lat: 46.5400, lon: 12.4200 },
    "NEMAL": { lat: 47.5800, lon: 13.2400 },
    "MEDEL": { lat: 48.3200, lon: 13.6800 },
    "APRAQ": { lat: 49.4500, lon: 14.0500 }
};

const DEFAULT_VORS = [
    {"ident": "OST", "name": "Ostia VOR-DME", "freq": "114.90", "lat": 41.8019, "lon": 12.2378, "type": "VOR-DME"},
    {"ident": "CMP", "name": "Campagnano VOR-DME", "freq": "111.80", "lat": 42.1250, "lon": 12.3817, "type": "VOR-DME"},
    {"ident": "BOL", "name": "Bologna VOR-DME", "freq": "112.20", "lat": 44.5369, "lon": 11.2906, "type": "VOR-DME"},
    {"ident": "FLR", "name": "Firenze VOR-DME", "freq": "115.20", "lat": 43.8090, "lon": 11.2005, "type": "VOR-DME"},
    {"ident": "VIL", "name": "Villafranca VOR-DME", "freq": "115.80", "lat": 45.4022, "lon": 10.9064, "type": "VOR-DME"},
    {"ident": "RON", "name": "Ronchi VOR-DME", "freq": "114.20", "lat": 45.8297, "lon": 13.4803, "type": "VOR-DME"},
    {"ident": "PAL", "name": "Palermo VOR-DME", "freq": "112.30", "lat": 38.1756, "lon": 13.0911, "type": "VOR-DME"}
];

const DEFAULT_ILS = [
    {"ident": "IFLL", "rwy": "16L", "name": "ILS-DME Fiumicino RWY 16L", "freq": "109.75", "course": 161, "gs_alt": "3,000 ft", "lat": 41.8250, "lon": 12.2480},
    {"ident": "IFRR", "rwy": "34R", "name": "ILS-DME Fiumicino RWY 34R", "freq": "110.30", "course": 341, "gs_alt": "3,000 ft", "lat": 41.7780, "lon": 12.2320},
    {"ident": "IBOL", "rwy": "12", "name": "ILS Bologna RWY 12", "freq": "109.30", "course": 118, "gs_alt": "2,500 ft", "lat": 44.5420, "lon": 11.2720},
    {"ident": "IVIL", "rwy": "04", "name": "ILS Verona RWY 04", "freq": "109.50", "course": 43, "gs_alt": "3,000 ft", "lat": 45.3820, "lon": 10.8710}
];

const AIRSPACES_DATA = {
    tma: [
        { name: "TMA ROMA", color: "#38bdf8", coords: [[42.4, 11.6], [42.4, 13.0], [41.2, 13.0], [41.2, 11.6]] },
        { name: "TMA MILANO", color: "#38bdf8", coords: [[46.2, 8.0], [46.2, 10.0], [45.0, 10.0], [45.0, 8.0]] },
        { name: "TMA VENEZIA", color: "#38bdf8", coords: [[46.0, 11.8], [46.0, 13.5], [45.2, 13.5], [45.2, 11.8]] }
    ],
    ctr: [
        { name: "CTR FIUMICINO", color: "#fbbf24", coords: [[41.95, 12.05], [41.95, 12.45], [41.65, 12.45], [41.65, 12.05]] },
        { name: "CTR VENEZIA", color: "#fbbf24", coords: [[45.65, 12.20], [45.65, 12.50], [45.35, 12.50], [45.35, 12.20]] },
        { name: "CTR AVIANO", color: "#fbbf24", coords: [[46.12, 12.48], [46.12, 12.72], [45.94, 12.72], [45.94, 12.48]] }
    ],
    restricted: [
        { name: "LI R1 (Pericolosa / Proibita)", color: "#f43f5e", coords: [[42.0, 13.2], [42.2, 13.5], [41.8, 13.6]] }
    ]
};
let airspaceLayers = { tma: [], ctr: [], restricted: [] };

let showNavaids = true;
let followAircraft = true;
let lastAcftLatLng = null;
let lastAcftHdgTrue = 0;

function setFollowState(state) {
    followAircraft = state;
    const btn = document.getElementById('btnFollowAcft');
    const t = translations[currentLang];
    if (!btn) return;
    if (followAircraft) {
        btn.classList.add('active');
        btn.innerText = t.btnFollowOn;
        if (lastAcftLatLng) map.panTo(lastAcftLatLng, { animate: true, duration: 0.4 });
    } else {
        btn.classList.remove('active');
        btn.innerText = t.btnFollowFree;
    }
}

function toggleFollowAircraft() { setFollowState(!followAircraft); }

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

map.on('dragstart', function() { if (followAircraft) setFollowState(false); });

// --- GESTIONE USER WAYPOINTS & CLICK SU MAPPA ---
let userWaypoints = [];
let userWpMarkers = [];
let isPickingUserWp = false;
let tempPickMarker = null;

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

async function loadUserWaypoints() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_user_waypoints) {
        try {
            const res = await window.pywebview.api.get_user_waypoints();
            if (res && res.success) {
                userWaypoints = res.waypoints || [];
                renderUserWaypointsUI();
            }
        } catch (e) {}
    }
}

async function addUserWaypoint() {
    const id = document.getElementById('uwId').value.trim().toUpperCase();
    const alt = parseInt(document.getElementById('uwAlt').value, 10) || 5000;
    const lat = parseFloat(document.getElementById('uwLat').value);
    const lon = parseFloat(document.getElementById('uwLon').value);

    if (!id || isNaN(lat) || isNaN(lon)) {
        alert("Inserisci un ID valido e coordinate numeriche (Lat/Lon) o clicca '📍 Mappa' per selezionarle.");
        return;
    }

    userWaypoints.push({ ident: id, lat, lon, alt_ft: alt, type: "USER" });
    if (tempPickMarker) {
        map.removeLayer(tempPickMarker);
        tempPickMarker = null;
    }
    await saveAndRefreshUserWaypoints();

    document.getElementById('uwId').value = '';
    document.getElementById('uwLat').value = '';
    document.getElementById('uwLon').value = '';
}

async function saveAndRefreshUserWaypoints() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_user_waypoints) {
        await window.pywebview.api.save_user_waypoints(userWaypoints);
    }
    renderUserWaypointsUI();
}

async function deleteUserWaypoint(index) {
    userWaypoints.splice(index, 1);
    await saveAndRefreshUserWaypoints();
}

function renderUserWaypointsUI() {
    const container = document.getElementById('userWpContainer');
    if (!container) return;
    container.innerHTML = '';

    if (userWpMarkers.length > 0) {
        userWpMarkers.forEach(m => map.removeLayer(m));
    }
    userWpMarkers = [];

    userWaypoints.forEach((wp, idx) => {
        const marker = L.circleMarker([wp.lat, wp.lon], {
            radius: 5,
            color: '#fbbf24',
            fillColor: '#fbbf24',
            fillOpacity: 0.9,
            weight: 2
        }).addTo(map);
        
        marker.bindPopup(`<b>User WP: ${wp.ident}</b><br>Alt: ${wp.alt_ft} ft<br>Lat: ${wp.lat}, Lon: ${wp.lon}<br><button class="btn btn-cyan" style="margin-top:4px; padding:2px 6px; font-size:10px;" onclick="addWpToRoute('${wp.ident}')">➕ Aggiungi a Rotta</button>`);
        userWpMarkers.push(marker);

        const div = document.createElement('div');
        div.className = 'wpt-card';
        div.onclick = () => {
            setFollowState(false);
            map.flyTo([wp.lat, wp.lon], 11);
            marker.openPopup();
        };
        div.innerHTML = `
            <div style="min-width:0; flex:1;">
                <span class="wpt-icao" style="color:var(--amber);">${wp.ident}</span>
                <div class="wpt-name">${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}</div>
            </div>
            <div style="display:flex; align-items:center; gap:5px;">
                <button class="btn btn-cyan" style="padding:2px 6px; font-size:10px;" title="Aggiungi al piano di volo attivo" onclick="event.stopPropagation(); addWpToRoute('${wp.ident}')">➕</button>
                <span class="wpt-alt">${wp.alt_ft} ft</span>
                <button class="btn btn-danger" style="padding:2px 6px; font-size:10px; flex:0 0 auto;" title="Elimina" onclick="event.stopPropagation(); deleteUserWaypoint(${idx})">✕</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function addWpToRoute(ident) {
    const wp = userWaypoints.find(w => w.ident === ident);
    if (!wp) return;
    if (!flightPlan || flightPlan.length === 0) {
        alert("Crea o importa prima un piano di volo attivo.");
        return;
    }
    flightPlan.splice(flightPlan.length - 1, 0, {
        ident: wp.ident,
        name: "User Waypoint",
        lat: wp.lat,
        lon: wp.lon,
        alt_ft: wp.alt_ft,
        type: "WPT"
    });
    updateFlightPlanUI(undefined, false);
}

// --- GESTIONE SIDEBAR E CASSETTO VNAV ---
const sidebarPanel = document.getElementById('sidebarPanel');
const sidebarResizer = document.getElementById('sidebarResizer');
let isResizingSidebar = false;

if (sidebarResizer && sidebarPanel) {
    sidebarResizer.addEventListener('mousedown', function(e) {
        isResizingSidebar = true;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
        if (!isResizingSidebar) return;
        const newWidth = Math.max(260, Math.min(680, e.clientX - 16));
        sidebarPanel.style.width = newWidth + 'px';
    });
    document.addEventListener('mouseup', function() {
        if (isResizingSidebar) {
            isResizingSidebar = false;
            document.body.style.cursor = '';
        }
    });
}

function setSimbriefCompactMode(isCompact) {
    const setupBox = document.getElementById('simbriefSetupBox');
    const compactBtn = document.getElementById('simbriefCompactBtn');
    const editIdBtn = document.getElementById('simbriefEditIdBtn');
    if (!setupBox || !compactBtn || !editIdBtn) return;
    if (isCompact) {
        setupBox.style.display = 'none';
        compactBtn.style.display = 'inline-flex';
        editIdBtn.style.display = 'inline-flex';
    } else {
        setupBox.style.display = 'flex';
        compactBtn.style.display = 'none';
        editIdBtn.style.display = 'none';
    }
}

function showSimbriefBox() {
    setSimbriefCompactMode(false);
    const input = document.getElementById('simbriefIdInput');
    if (input) input.focus();
}

let sidebarOpen = true;
function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const sidebar = document.getElementById('sidebarPanel');
    const arrow = document.getElementById('sidebarArrow');
    const label = document.getElementById('sidebarLabel');
    if (!sidebar) return;
    if (sidebarOpen) {
        sidebar.classList.remove('collapsed');
        if (arrow) arrow.innerText = '◀';
        if (label) label.style.display = 'none';
    } else {
        sidebar.classList.add('collapsed');
        if (arrow) arrow.innerText = '▶';
        if (label) label.style.display = 'block';
    }
}

let drawerOpen = true;
function toggleDrawer() {
    drawerOpen = !drawerOpen;
    const drawer = document.getElementById('elevationDrawer');
    const sidebar = document.getElementById('sidebarPanel');
    const infoBar = document.getElementById('flightInfoBar');
    const arrow = document.getElementById('drawerArrow');
    if (!drawer || !sidebar) return;
    if (drawerOpen) {
        drawer.classList.remove('collapsed');
        sidebar.style.bottom = '134px';
        if (infoBar) infoBar.style.bottom = '134px';
        if (arrow) arrow.innerText = '▼';
    } else {
        drawer.classList.add('collapsed');
        sidebar.style.bottom = '56px';
        if (infoBar) infoBar.style.bottom = '56px';
        if (arrow) arrow.innerText = '▲';
    }
}

function parseMetarInfo(metarStr) {
    if (!metarStr) return null;
    let wind = '---';
    const windMatch = metarStr.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)\b/);
    if (windMatch) {
        const dir = windMatch[1] === 'VRB' ? 'VRB' : windMatch[1] + '°';
        const spd = parseInt(windMatch[2], 10);
        const gust = windMatch[3] ? 'G' + parseInt(windMatch[3], 10) : '';
        const unit = windMatch[4] === 'MPS' ? 'm/s' : 'kt';
        wind = `${dir}/${spd}${gust}${unit}`;
    }
    let temp = '---';
    const tempMatch = metarStr.match(/\b(M?\d{2})\/(M?\d{2}|\/\/)\b/);
    if (tempMatch) temp = `${parseInt(tempMatch[1].replace('M', '-'), 10)}°C`;
    let qnh = '---';
    const qnhMatch = metarStr.match(/\bQ(\d{4})\b/);
    if (qnhMatch) {
        qnh = `${parseInt(qnhMatch[1], 10)} mb`;
    } else {
        const altimMatch = metarStr.match(/\bA(\d{4})\b/);
        if (altimMatch) {
            const inHg = parseInt(altimMatch[1], 10) / 100.0;
            qnh = `${Math.round(inHg * 33.8639)} mb`;
        }
    }
    if (wind === '---' && temp === '---' && qnh === '---') return null;
    return { wind, temp, qnh, raw: metarStr };
}

let airportsData = [...EXTRA_AIRPORTS];
let vorsData = DEFAULT_VORS;
let ilsData = DEFAULT_ILS;
let flightPlan = [];
let currentAlternate = null;
let routeLine = null;
let alternateLine = null;
let waypointMarkers = [];
let vorMarkers = [];
let ilsMarkers = [];
let alternateMarker = null;
let aircraftMarker = null;
let mouseRouteMarker = null;
let initialized = false;

function findAirport(ident) {
    return airportsData.find(a => a.icao === ident) || EXTRA_AIRPORTS.find(a => a.icao === ident);
}

function resolveKnownCoords(ident) {
    const apt = findAirport(ident);
    if (apt) return { lat: apt.lat, lon: apt.lon, name: apt.name, metar: apt.metar || "" };
    if (KNOWN_FIXES[ident]) return { lat: KNOWN_FIXES[ident].lat, lon: KNOWN_FIXES[ident].lon, name: KNOWN_FIXES[ident].name || "Waypoint Navlog", metar: "" };
    const userWp = userWaypoints.find(w => w.ident === ident);
    if (userWp) return { lat: userWp.lat, lon: userWp.lon, name: "User Waypoint", metar: "" };
    const vor = vorsData.find(v => v.ident === ident);
    if (vor) return { lat: vor.lat, lon: vor.lon, name: vor.name, metar: "" };
    return null;
}

const acftIcon = L.divIcon({
    className: '',
    html: '<div id="acftSvg" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;transform-origin:center center;transition:transform 0.25s linear;filter:drop-shadow(0 0 10px #38bdf8) drop-shadow(0 0 20px #38bdf8);"><svg viewBox="0 0 24 24" width="30" height="30" fill="#38bdf8"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></div>',
    iconSize: [36, 36], iconAnchor: [18, 18]
});

function createVorIcon(ident) {
    return L.divIcon({ className: '', html: `<div class="navaid-badge navaid-vor"><span>❖</span><span>${ident}</span></div>`, iconSize: [0, 0] });
}
function createIlsIcon(rwy, ident) {
    return L.divIcon({ className: '', html: `<div class="navaid-badge navaid-ils"><span>📡</span><span>ILS ${rwy}</span></div>`, iconSize: [0, 0] });
}

function clearMapRoutes() {
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    if (alternateLine) { map.removeLayer(alternateLine); alternateLine = null; }
    if (waypointMarkers && waypointMarkers.length > 0) {
        waypointMarkers.forEach(m => { if (m) map.removeLayer(m); });
    }
    waypointMarkers = [];
    if (alternateMarker) { map.removeLayer(alternateMarker); alternateMarker = null; }
    if (mouseRouteMarker) { map.removeLayer(mouseRouteMarker); mouseRouteMarker = null; }
}

function renderNavAids(vors, ilsList) {
    if (vorMarkers && vorMarkers.length > 0) vorMarkers.forEach(m => map.removeLayer(m));
    vorMarkers = [];
    if (ilsMarkers && ilsMarkers.length > 0) ilsMarkers.forEach(m => map.removeLayer(m));
    ilsMarkers = [];

    if (!showNavaids) return;

    (vors || DEFAULT_VORS).forEach(vor => {
        if (vor.lat && vor.lon) {
            const marker = L.marker([vor.lat, vor.lon], { icon: createVorIcon(vor.ident), zIndexOffset: 400 }).addTo(map);
            marker.bindPopup(
                '<div style="font-weight:700;font-size:12px;color:#38bdf8;">VOR: ' + vor.ident + '</div>' +
                '<div style="font-size:11px;color:#f8fafc;">' + vor.name + '</div>' +
                '<div style="font-size:11px;font-family:monospace;color:#34d399;margin-top:2px;">FREQ: ' + vor.freq + ' MHz</div>'
            );
            vorMarkers.push(marker);
        }
    });

    (ilsList || DEFAULT_ILS).forEach(ils => {
        if (ils.lat && ils.lon) {
            const marker = L.marker([ils.lat, ils.lon], { icon: createIlsIcon(ils.rwy, ils.ident), zIndexOffset: 450 }).addTo(map);
            marker.bindPopup(
                '<div style="font-weight:700;font-size:12px;color:#e879f9;">ILS RWY ' + ils.rwy + ' (' + ils.ident + ')</div>' +
                '<div style="font-size:11px;color:#f8fafc;margin-bottom:4px;">' + ils.name + '</div>' +
                '<div style="font-size:11px;font-family:monospace;color:#38bdf8;">FREQ: ' + ils.freq + ' MHz</div>' +
                '<div style="font-size:11px;font-family:monospace;color:#34d399;">COURSE: ' + ils.course + '°</div>' +
                '<div style="font-size:11px;font-family:monospace;color:#fbbf24;">GLIDE ALT: ' + ils.gs_alt + '</div>'
            );
            ilsMarkers.push(marker);
        }
    });
}

function applyClimbDescentProfile(waypoints, cruiseAlt) {
    const lastIdx = waypoints.length - 1;
    if (waypoints.length < 2) return waypoints;
    if (waypoints[0].lat !== null && waypoints[lastIdx].lat !== null) {
        for (let i = 1; i < lastIdx; i++) {
            if (waypoints[i].lat === null || isNaN(waypoints[i].lat)) {
                let prevIdx = i - 1;
                while (prevIdx > 0 && waypoints[prevIdx].lat === null) prevIdx--;
                let nextIdx = i + 1;
                while (nextIdx < lastIdx && waypoints[nextIdx].lat === null) nextIdx++;
                const span = nextIdx - prevIdx;
                const frac = (i - prevIdx) / span;
                waypoints[i].lat = Number((waypoints[prevIdx].lat + frac * (waypoints[nextIdx].lat - waypoints[prevIdx].lat)).toFixed(5));
                waypoints[i].lon = Number((waypoints[prevIdx].lon + frac * (waypoints[nextIdx].lon - waypoints[prevIdx].lon)).toFixed(5));
            }
        }
    }

    if (waypoints.length >= 4) {
        const midAlts = waypoints.slice(1, lastIdx).map(w => Number(w.alt_ft) || 0);
        const maxCruise = cruiseAlt || Math.max(...midAlts);
        const allSame = midAlts.every(a => a === maxCruise && a > 0);

        if (allSame) {
            let totalDist = 0;
            let cumDist = [0];
            for (let i = 0; i < lastIdx; i++) {
                if (waypoints[i].lat !== null && waypoints[i + 1].lat !== null) {
                    totalDist += L.latLng(waypoints[i].lat, waypoints[i].lon).distanceTo(L.latLng(waypoints[i + 1].lat, waypoints[i + 1].lon));
                }
                cumDist.push(totalDist);
            }
            if (totalDist > 0) {
                const depAlt = Number(waypoints[0].alt_ft) || 0;
                const destAlt = Number(waypoints[lastIdx].alt_ft) || 0;
                const climbEndFrac = 0.22;
                const descStartFrac = 0.75;

                for (let i = 1; i < lastIdx; i++) {
                    const frac = cumDist[i] / totalDist;
                    if (frac < climbEndFrac) {
                        const cFrac = frac / climbEndFrac;
                        waypoints[i].alt_ft = Math.round((depAlt + cFrac * (maxCruise - depAlt)) / 100) * 100;
                    } else if (frac > descStartFrac) {
                        const dFrac = (frac - descStartFrac) / (1 - descStartFrac);
                        waypoints[i].alt_ft = Math.round((maxCruise - dFrac * (maxCruise - destAlt)) / 100) * 100;
                    }
                }
            }
        }
    }
    return waypoints;
}

function updateFlightPlanUI(alternateData = undefined, fitMap = true) {
    if (alternateData !== undefined) currentAlternate = alternateData;
    const container = document.getElementById('fplContainer');
    if (!container) return;
    container.innerHTML = '';
    clearMapRoutes();

    const coords = [];
    const altitutes = [];

    flightPlan.forEach((wp, index) => {
        const apt = findAirport(wp.ident);
        const isEndpoint = (index === 0 || index === flightPlan.length - 1 || wp.type === 'DEP' || wp.type === 'DEST' || wp.type === 'APT');
        const rawMetar = wp.metar || (apt ? apt.metar : '');
        const wx = isEndpoint ? parseMetarInfo(rawMetar) : null;
        const altVal = Number(wp.alt_ft) || 0;

        if (wp.lat !== undefined && wp.lat !== null && wp.lon !== undefined && wp.lon !== null) {
            coords.push([wp.lat, wp.lon]);
            altitutes.push(altVal);

            const marker = L.circleMarker([wp.lat, wp.lon], {
                radius: isEndpoint ? 5 : 4,
                color: '#38bdf8',
                fillColor: isEndpoint ? '#34d399' : '#0284c7',
                fillOpacity: 0.85,
                weight: 1.5
            }).addTo(map);

            let popupHtml =
                '<div style="font-weight:700;font-size:13px;color:#38bdf8;">' + wp.ident + '</div>' +
                '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Altitudine: <span style="color:#e879f9;cursor:pointer;text-decoration:underline;font-weight:600;" onclick="editWaypointAlt(' + index + ', ' + altVal + ')">' + altVal + ' ft ✏️</span></div>';
            
            if (wx) {
                popupHtml +=
                    '<div style="font-size:10px;color:#34d399;font-family:monospace;border-top:1px solid rgba(148,163,184,0.2);padding-top:4px;margin-top:4px;">' +
                    '💨 ' + wx.wind + ' &nbsp;|&nbsp; 🌡️ ' + wx.temp + ' &nbsp;|&nbsp; 📊 ' + wx.qnh +
                    '</div>';
            }

            marker.bindPopup(popupHtml);
            waypointMarkers.push(marker);
        }

        const div = document.createElement('div');
        div.className = 'wpt-card' + (isEndpoint ? ' apt-endpoint' : '');
        div.setAttribute('data-wpt-index', index);
        if (wp.lat !== null && wp.lon !== null) {
            div.onclick = () => {
                setFollowState(false);
                map.flyTo([wp.lat, wp.lon], 10);
            };
        }

        let wxBadgesHtml = '';
        if (wx) {
            wxBadgesHtml =
                '<div class="wpt-wx-row" title="METAR: ' + wx.raw + '">' +
                    '<span class="wx-pill">💨 ' + wx.wind + '</span>' +
                    '<span class="wx-pill">🌡️ ' + wx.temp + '</span>' +
                    '<span class="wx-pill">📊 ' + wx.qnh + '</span>' +
                '</div>';
        }
        
        div.innerHTML =
            '<div style="min-width: 0; flex: 1; padding-right: 8px;">' +
                '<div style="display:flex; align-items:center; gap:6px;">' +
                    '<span class="wpt-icao">' + wp.ident + '</span>' +
                    (index === 0 ? '<span style="font-size:9px;background:rgba(56,189,248,0.18);color:var(--cyan);padding:1px 5px;border-radius:3px;font-weight:700;">DEP</span>' : '') +
                    (index === flightPlan.length - 1 && flightPlan.length > 1 ? '<span style="font-size:9px;background:rgba(52,211,153,0.18);color:var(--emerald);padding:1px 5px;border-radius:3px;font-weight:700;">ARR</span>' : '') +
                '</div>' +
                '<div class="wpt-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (wp.name || (apt ? apt.name : 'Waypoint Navlog')) + '</div>' +
                wxBadgesHtml +
            '</div>' +
            '<div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0;">' +
                '<span class="wpt-alt" onclick="event.stopPropagation(); editWaypointAlt(' + index + ', ' + altVal + ')">' + altVal + ' ft</span>' +
                '<span class="wpt-dist" id="wptDist_' + index + '">--- NM</span>' +
                '<span style="font-size:10px;color:var(--text-muted);">' + (apt && apt.rwy ? ('RWY ' + apt.rwy) : (wp.type || 'WPT')) + '</span>' +
            '</div>';
        container.appendChild(div);
    });

    if (coords.length > 1) {
        routeLine = L.polyline(coords, { color: '#e879f9', weight: 2.5, dashArray: '6, 4' }).addTo(map);
        if (fitMap) {
            setFollowState(false);
            map.fitBounds(routeLine.getBounds(), { padding: [80, 80] });
        }
    }

    if (currentAlternate && coords.length > 0 && currentAlternate.lat !== undefined) {
        const lastDestCoords = coords[coords.length - 1];
        const altCoords = [lastDestCoords, [currentAlternate.lat, currentAlternate.lon]];
        alternateLine = L.polyline(altCoords, { color: '#38bdf8', weight: 1, dashArray: '4, 4' }).addTo(map);
        alternateMarker = L.circleMarker([currentAlternate.lat, currentAlternate.lon], {
            radius: 4,
            color: '#38bdf8',
            fillColor: '#38bdf8',
            fillOpacity: 0.6,
            weight: 1
        }).addTo(map);
        alternateMarker.bindPopup('<div style="font-weight:700;font-size:13px;color:#38bdf8;">Alternato: ' + currentAlternate.ident + '</div>');
    }

    renderVnavChart(altitutes);
}

async function editWaypointAlt(index, currentAlt) {
    const newAlt = prompt("Inserisci la quota target in piedi (ft) per questo waypoint:", currentAlt);
    if (newAlt !== null && !isNaN(newAlt)) {
        flightPlan[index].alt_ft = parseInt(newAlt, 10);
        updateFlightPlanUI(undefined, false);
        try {
            if (window.pywebview && window.pywebview.api) {
                await window.pywebview.api.update_waypoint_altitude(index, newAlt);
            }
        } catch (e) {}
    }
}

function openCreateFplModal() { document.getElementById('createFplModal').style.display = 'flex'; }
function closeCreateFplModal() { document.getElementById('createFplModal').style.display = 'none'; }

async function exportCurrentFlightPlan() {
    if (!flightPlan || flightPlan.length < 2) {
        alert("Nessun piano di volo attivo da esportare.");
        return;
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.export_pln_file) {
        const res = await window.pywebview.api.export_pln_file(flightPlan);
        if (res && res.success) alert(`Piano di volo salvato in Download:\n${res.path}`);
        else alert("Errore export PLN: " + (res.error || "Sconosciuto"));
    }
}

async function buildAndExportManualFlightPlan(doExport = true) {
    const depInput = document.getElementById('manualDep').value.trim().toUpperCase();
    const wptsInput = document.getElementById('manualWpts').value.trim().toUpperCase();
    const destInput = document.getElementById('manualDest').value.trim().toUpperCase();
    const cruiseAlt = parseInt(document.getElementById('manualCruiseAlt').value, 10) || 12000;

    if (!depInput || !destInput) {
        alert("Inserisci almeno l'aeroporto di partenza e di arrivo.");
        return;
    }

    let generatedPlan = [];
    const depRes = resolveKnownCoords(depInput);
    const depApt = findAirport(depInput);
    generatedPlan.push({
        ident: depInput,
        name: depRes ? depRes.name : "Aeroporto di Partenza",
        lat: depRes ? depRes.lat : null,
        lon: depRes ? depRes.lon : null,
        alt_ft: depApt ? (depApt.elev || 0) : 0,
        type: "DEP",
        metar: depRes ? depRes.metar : ""
    });

    if (wptsInput) {
        wptsInput.split(/[\s,]+/).forEach(token => {
            if (!token) return;
            const wptRes = resolveKnownCoords(token);
            generatedPlan.push({
                ident: token,
                name: wptRes ? wptRes.name : "Waypoint Rotta",
                lat: wptRes ? wptRes.lat : null,
                lon: wptRes ? wptRes.lon : null,
                alt_ft: cruiseAlt,
                type: "WPT"
            });
        });
    }

    const destRes = resolveKnownCoords(destInput);
    const destApt = findAirport(destInput);
    generatedPlan.push({
        ident: destInput,
        name: destRes ? destRes.name : "Aeroporto di Arrivo",
        lat: destRes ? destRes.lat : null,
        lon: destRes ? destRes.lon : null,
        alt_ft: destApt ? (destApt.elev || 0) : 0,
        type: "DEST",
        metar: destRes ? destRes.metar : ""
    });

    if (generatedPlan[0].lat === null || generatedPlan[generatedPlan.length - 1].lat === null) {
        alert("Coordinate non trovate per l'aeroporto di partenza o di arrivo inserito.");
        return;
    }

    flightPlan = applyClimbDescentProfile(generatedPlan, cruiseAlt);
    currentAlternate = null;
    closeCreateFplModal();
    updateFlightPlanUI(null, true);

    if (doExport) await exportCurrentFlightPlan();
}

async function clearFlightPlanUI() {
    if (confirm("Sei sicuro di voler eliminare il piano di volo corrente e ripulire la mappa?")) {
        flightPlan = [];
        currentAlternate = null;
        clearMapRoutes();
        document.getElementById('fplContainer').innerHTML = '';
        document.getElementById('vnavPath').setAttribute('d', 'M0,50 L1000,50 Z');
        document.getElementById('vnavText').textContent = translations[currentLang].noFpl.toUpperCase();
        updateHoverSync(null);
        if (window.pywebview && window.pywebview.api && window.pywebview.api.clear_flight_plan) {
            await window.pywebview.api.clear_flight_plan();
        }
    }
}

function renderVnavChart(alts) {
    const svgPath = document.getElementById('vnavPath');
    const svgText = document.getElementById('vnavText');
    if (!svgPath || !alts || alts.length === 0) return;

    const maxAlt = Math.max(...alts, 5000);
    const width = 1000;
    const height = 40;

    let pathD = `M0,50 `;
    if (alts.length === 1) {
        const y = height - (alts[0] / maxAlt) * height + 5;
        pathD += `L0,${y} L${width},${y} `;
    } else {
        alts.forEach((alt, i) => {
            const x = (i / (alts.length - 1)) * width;
            const y = height - (alt / maxAlt) * height + 5;
            pathD += `L${x.toFixed(1)},${y.toFixed(1)} `;
        });
    }
    pathD += `L${width},50 Z`;
    svgPath.setAttribute('d', pathD);
    if (svgText) svgText.textContent = `VNAV MULTI-STEP (MAX ALT: ${maxAlt.toLocaleString()} FT)`;
}

// --- SCORRIMENTO E HOVER SINCRONIZZATO TRA MAPPA E PROFILO VNAV ---
function getSegmentFraction(A, B, P) {
    let dx = B.lng - A.lng;
    let dy = B.lat - A.lat;
    let lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;
    return ((P.lng - A.lng) * dx + (P.lat - A.lat) * dy) / lenSq;
}

function calculateRouteProgress(lat, lon) {
    if (!flightPlan || flightPlan.length < 2) return null;
    let totalDist = 0;
    let segDistances = [];
    for (let i = 0; i < flightPlan.length - 1; i++) {
        if (flightPlan[i].lat === null || flightPlan[i+1].lat === null) return null;
        let d = L.latLng(flightPlan[i].lat, flightPlan[i].lon).distanceTo(L.latLng(flightPlan[i+1].lat, flightPlan[i+1].lon));
        segDistances.push(d);
        totalDist += d;
    }
    if (totalDist === 0) return null;

    let minGlobalDist = Infinity, bestFraction = 0, accumulatedDist = 0;
    for (let i = 0; i < flightPlan.length - 1; i++) {
        let A = L.latLng(flightPlan[i].lat, flightPlan[i].lon);
        let B = L.latLng(flightPlan[i+1].lat, flightPlan[i+1].lon);
        let segLen = segDistances[i];
        let P = L.latLng(lat, lon);
        let t = getSegmentFraction(A, B, P);
        let clampedT = Math.max(0, Math.min(1, t));
        let latProj = A.lat + clampedT * (B.lat - A.lat);
        let lonProj = A.lng + clampedT * (B.lng - A.lng);
        let distToProj = P.distanceTo(L.latLng(latProj, lonProj));
        if (distToProj < minGlobalDist) {
            minGlobalDist = distToProj;
            bestFraction = (accumulatedDist + (clampedT * segLen)) / totalDist;
        }
        accumulatedDist += segLen;
    }
    return { fraction: Math.max(0, Math.min(1, bestFraction)), distanceToRoute: minGlobalDist };
}

function getRouteDetailsAtFraction(fraction) {
    if (!flightPlan || flightPlan.length < 2) return null;
    
    let totalDist = 0;
    let segments = [];
    
    for (let i = 0; i < flightPlan.length - 1; i++) {
        if (flightPlan[i].lat === null || flightPlan[i+1].lat === null) continue;
        let p1 = L.latLng(flightPlan[i].lat, flightPlan[i].lon);
        let p2 = L.latLng(flightPlan[i+1].lat, flightPlan[i+1].lon);
        let d = p1.distanceTo(p2);
        let alt1 = Number(flightPlan[i].alt_ft) || 0;
        let alt2 = Number(flightPlan[i+1].alt_ft) || 0;
        segments.push({
            p1, p2, d, alt1, alt2,
            fromIdent: flightPlan[i].ident,
            toIdent: flightPlan[i+1].ident
        });
        totalDist += d;
    }
    
    if (totalDist === 0 || segments.length === 0) return null;
    
    let clampedFrac = Math.max(0, Math.min(1, fraction));
    let targetDist = clampedFrac * totalDist;
    let accumulated = 0;
    
    for (let seg of segments) {
        if (accumulated + seg.d >= targetDist) {
            let segFrac = seg.d === 0 ? 0 : (targetDist - accumulated) / seg.d;
            let lat = seg.p1.lat + segFrac * (seg.p2.lat - seg.p1.lat);
            let lng = seg.p1.lng + segFrac * (seg.p2.lng - seg.p1.lng);
            let alt = Math.round(seg.alt1 + segFrac * (seg.alt2 - seg.alt1));
            let distNm = (targetDist / 1852).toFixed(1);
            let totalNm = (totalDist / 1852).toFixed(1);
            return {
                latlng: L.latLng(lat, lng),
                alt,
                distNm,
                totalNm,
                leg: `${seg.fromIdent} ➔ ${seg.toIdent}`
            };
        }
        accumulated += seg.d;
    }
    
    let last = segments[segments.length - 1];
    return {
        latlng: last.p2,
        alt: last.alt2,
        distNm: (totalDist / 1852).toFixed(1),
        totalNm: (totalDist / 1852).toFixed(1),
        leg: `${last.fromIdent} ➔ ${last.toIdent}`
    };
}

function updateHoverSync(fraction) {
    const mouseLine = document.getElementById('mouseVnavLine');
    const container = document.querySelector('.elevation-canvas-container');
    let vnavBadge = document.getElementById('vnavHoverBadge');
    
    if (!vnavBadge && container) {
        vnavBadge = document.createElement('div');
        vnavBadge.id = 'vnavHoverBadge';
        vnavBadge.className = 'vnav-hover-badge';
        container.appendChild(vnavBadge);
    }

    if (fraction === null || !flightPlan || flightPlan.length < 2) {
        if (mouseLine) mouseLine.style.display = 'none';
        if (vnavBadge) vnavBadge.style.display = 'none';
        if (mouseRouteMarker) {
            map.removeLayer(mouseRouteMarker);
            mouseRouteMarker = null;
        }
        return;
    }

    const details = getRouteDetailsAtFraction(fraction);
    if (!details) return;

    if (mouseLine) {
        const xPos = fraction * 1000;
        mouseLine.setAttribute('x1', xPos);
        mouseLine.setAttribute('x2', xPos);
        mouseLine.style.display = 'block';
    }

    const labelText = `${details.leg} | ${details.alt.toLocaleString()} ft | ${details.distNm} NM`;

    if (vnavBadge) {
        vnavBadge.innerText = labelText;
        const safePct = Math.max(10, Math.min(90, fraction * 100));
        vnavBadge.style.left = `${safePct}%`;
        vnavBadge.style.display = 'block';
    }

    if (!mouseRouteMarker) {
        mouseRouteMarker = L.circleMarker(details.latlng, {
            radius: 6,
            color: '#fbbf24',
            fillColor: '#fbbf24',
            fillOpacity: 0.95,
            weight: 2,
            interactive: false
        }).addTo(map);
        mouseRouteMarker.bindTooltip(labelText, {
            permanent: true,
            direction: 'top',
            offset: [0, -10],
            className: 'vnav-route-tooltip'
        }).openTooltip();
    } else {
        mouseRouteMarker.setLatLng(details.latlng);
        mouseRouteMarker.setTooltipContent(labelText);
    }
}

map.on('mousemove', function(e) {
    if (!flightPlan || flightPlan.length < 2) {
        updateHoverSync(null);
        return;
    }
    const res = calculateRouteProgress(e.latlng.lat, e.latlng.lng);
    if (res && res.distanceToRoute < 25000) {
        updateHoverSync(res.fraction);
    } else {
        updateHoverSync(null);
    }
});

const vnavSvgEl = document.getElementById('vnavSvg');
if (vnavSvgEl) {
    vnavSvgEl.addEventListener('mousemove', function(e) {
        if (!flightPlan || flightPlan.length < 2) return;
        const rect = vnavSvgEl.getBoundingClientRect();
        if (rect.width === 0) return;
        const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        updateHoverSync(fraction);
    });

    vnavSvgEl.addEventListener('mouseleave', function() {
        updateHoverSync(null);
    });
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const toRad = d => d * Math.PI / 180;
    const toDeg = r => r * 180 / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function updateActiveWaypointHighlight(acftLat, acftLon, acftHdg) {
    if (!flightPlan || flightPlan.length === 0) return;
    let activeIdx = 0;
    let minDistance = Infinity;

    flightPlan.forEach((wp, i) => {
        if (wp.lat !== null && wp.lon !== null) {
            const wptLatLng = L.latLng(wp.lat, wp.lon);
            const distMeters = L.latLng(acftLat, acftLon).distanceTo(wptLatLng);
            const distNm = (distMeters / 1852).toFixed(1);

            const bearingToWp = calculateBearing(acftLat, acftLon, wp.lat, wp.lon);
            let angleDiff = Math.abs(bearingToWp - acftHdg);
            if (angleDiff > 180) angleDiff = 360 - angleDiff;

            const isAhead = (angleDiff < 90 || distMeters < 3000);
            const sign = isAhead ? '+' : '-';

            const distEl = document.getElementById('wptDist_' + i);
            if (distEl) {
                distEl.innerText = `${sign}${distNm} NM`;
                distEl.style.color = isAhead ? 'var(--cyan)' : 'var(--text-muted)';
            }

            if ((angleDiff < 90 || distMeters < 5000) && distMeters < minDistance) {
                minDistance = distMeters;
                activeIdx = i;
            }
        }
    });

    const cards = document.querySelectorAll('#fplContainer .wpt-card');
    cards.forEach((card, idx) => {
        if (idx === activeIdx) {
            card.style.borderColor = 'var(--emerald)';
            card.style.background = 'rgba(52, 211, 153, 0.12)';
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            card.style.borderColor = '';
            card.style.background = '';
        }
    });
}

function updateFlightInfoBar(lat, lon) {
    const now = new Date();
    document.getElementById('infoDate').innerText = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    document.getElementById('infoUtc').innerText = `UTC: ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}`;
    document.getElementById('infoSys').innerText = `SYS: ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    if (lat !== undefined && lon !== undefined) {
        document.getElementById('infoCoords').innerText = `LAT: ${Number(lat).toFixed(5)} LON: ${Number(lon).toFixed(5)}`;
    }
}

function parseDmsCoord(dmsStr) {
    const parts = dmsStr.split(',');
    if (parts.length < 2) return null;
    const parsePart = (s) => {
        const m = s.trim().match(/([NSWE])\s*(\d+)[^\d]+(\d+)[^\d]+([\d.]+)/i);
        if (!m) return null;
        let dec = parseFloat(m[2]) + parseFloat(m[3]) / 60 + parseFloat(m[4]) / 3600;
        if (m[1].toUpperCase() === 'S' || m[1].toUpperCase() === 'W') dec = -dec;
        return dec;
    };
    const lat = parsePart(parts[0]);
    const lon = parsePart(parts[1]);
    let alt = null;
    if (parts.length >= 3) {
        const rawAlt = parseFloat(parts[2].trim());
        if (!isNaN(rawAlt) && rawAlt > 0) alt = Math.round(rawAlt);
    }
    if (lat !== null && lon !== null) return { lat, lon, alt };
    return null;
}

function parsePlnXmlString(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    let cruiseAlt = 24000;
    const cruiseNodes = xmlDoc.getElementsByTagName("CruisingAlt");
    if (cruiseNodes.length > 0 && cruiseNodes[0].textContent) {
        cruiseAlt = parseInt(parseFloat(cruiseNodes[0].textContent.trim()), 10) || 24000;
    }

    let parsedWaypoints = [];

    const depNodes = xmlDoc.getElementsByTagName("DepartureID");
    if (depNodes.length > 0 && depNodes[0].textContent) {
        const depCode = depNodes[0].textContent.trim();
        const resolved = resolveKnownCoords(depCode);
        const apt = findAirport(depCode);
        parsedWaypoints.push({
            ident: depCode,
            name: resolved ? resolved.name : "Aeroporto di Partenza",
            lat: resolved ? resolved.lat : null,
            lon: resolved ? resolved.lon : null,
            alt_ft: apt ? (apt.elev || 0) : 0,
            type: "DEP",
            metar: resolved ? resolved.metar : ""
        });
    }

    const wptNodes = [
        ...Array.from(xmlDoc.getElementsByTagName("ATCWaypoint")),
        ...Array.from(xmlDoc.getElementsByTagName("FlightPlan.Waypoint"))
    ];

    wptNodes.forEach(wp => {
        let code = "";
        const identNodes = wp.getElementsByTagName("ICAOIdent");
        if (identNodes.length > 0 && identNodes[0].textContent) {
            code = identNodes[0].textContent.trim();
        } else if (wp.getAttribute("id")) {
            code = wp.getAttribute("id").trim();
        }
        if (!code || code === "TIMECRUIS" || code === "TIMEDSCNT" || code === "TIMECLIMB") return;

        let wpLat = null, wpLon = null;
        let wpName = "Waypoint Navlog";

        const worldPtNodes = wp.getElementsByTagName("WorldPoint");
        if (worldPtNodes.length > 0 && worldPtNodes[0].textContent) {
            const p = worldPtNodes[0].textContent.split(",");
            if (p.length >= 2) {
                wpLat = parseFloat(p[0]);
                wpLon = parseFloat(p[1]);
            }
        }

        let altFt = null;
        const altNodes = wp.getElementsByTagName("Altitude");
        if (altNodes.length > 0 && altNodes[0].textContent) {
            altFt = parseInt(parseFloat(altNodes[0].textContent.trim()), 10);
        }

        const worldPosNodes = wp.getElementsByTagName("WorldPosition");
        if (worldPosNodes.length > 0 && worldPosNodes[0].textContent) {
            const dms = parseDmsCoord(worldPosNodes[0].textContent);
            if (dms) {
                if (wpLat === null || isNaN(wpLat)) {
                    wpLat = dms.lat;
                    wpLon = dms.lon;
                }
                if (!altFt && dms.alt !== null) altFt = dms.alt;
            }
        }

        if (wpLat === null || isNaN(wpLat) || wpLat === 0) {
            const resolved = resolveKnownCoords(code);
            if (resolved) {
                wpLat = resolved.lat;
                wpLon = resolved.lon;
                wpName = resolved.name || wpName;
            }
        }

        if (!altFt || isNaN(altFt)) altFt = cruiseAlt;

        if (parsedWaypoints.length === 0 || parsedWaypoints[parsedWaypoints.length - 1].ident !== code) {
            parsedWaypoints.push({
                ident: code,
                name: wpName,
                lat: wpLat,
                lon: wpLon,
                alt_ft: altFt,
                type: "WPT"
            });
        } else if (parsedWaypoints.length === 1 && parsedWaypoints[0].ident === code && parsedWaypoints[0].lat === null) {
            parsedWaypoints[0].lat = wpLat;
            parsedWaypoints[0].lon = wpLon;
        }
    });

    const destNodes = xmlDoc.getElementsByTagName("DestinationID");
    if (destNodes.length > 0 && destNodes[0].textContent) {
        const destCode = destNodes[0].textContent.trim();
        const resolved = resolveKnownCoords(destCode);
        const apt = findAirport(destCode);
        if (parsedWaypoints.length === 0 || parsedWaypoints[parsedWaypoints.length - 1].ident !== destCode) {
            parsedWaypoints.push({
                ident: destCode,
                name: resolved ? resolved.name : "Aeroporto di Arrivo",
                lat: resolved ? resolved.lat : null,
                lon: resolved ? resolved.lon : null,
                alt_ft: apt ? (apt.elev || 0) : 0,
                type: "DEST",
                metar: resolved ? resolved.metar : ""
            });
        } else {
            parsedWaypoints[parsedWaypoints.length - 1].type = "DEST";
            parsedWaypoints[parsedWaypoints.length - 1].alt_ft = apt ? (apt.elev || 0) : 0;
            if (resolved) {
                parsedWaypoints[parsedWaypoints.length - 1].lat = resolved.lat;
                parsedWaypoints[parsedWaypoints.length - 1].lon = resolved.lon;
                parsedWaypoints[parsedWaypoints.length - 1].name = resolved.name;
                parsedWaypoints[parsedWaypoints.length - 1].metar = resolved.metar;
            }
        }
    }

    return parsedWaypoints;
}

async function processAndRenderPlnXml(xmlText) {
    let parsed = parsePlnXmlString(xmlText);
    if (!parsed || parsed.length === 0) {
        alert("Nessun waypoint trovato nel file .pln selezionato.");
        return;
    }
    parsed = applyClimbDescentProfile(parsed, null);
    flightPlan = parsed;
    currentAlternate = null;
    updateFlightPlanUI(null, true);
}

async function importPlnFile() {
    if (window.pywebview && window.pywebview.api) {
        const res = await window.pywebview.api.load_pln_file();
        if (res && res.success && res.xml_text) {
            await processAndRenderPlnXml(res.xml_text);
        }
    }
}

async function saveSimbriefId(val) {
    if (window.pywebview && window.pywebview.api) await window.pywebview.api.save_simbrief_id(val);
}

async function fetchSimbriefPlan() {
    if (window.pywebview && window.pywebview.api) {
        const val = document.getElementById('simbriefIdInput').value.trim();
        if (val) await window.pywebview.api.save_simbrief_id(val);
        const res = await window.pywebview.api.fetch_simbrief_plan();
        if (res.success && res.flight_plan) {
            flightPlan = res.flight_plan;
            updateFlightPlanUI(res.alternate, true);
            setSimbriefCompactMode(true);
        } else {
            setSimbriefCompactMode(false);
            alert("Errore SimBrief: " + (res.error || "ID non valido"));
        }
    }
}

function filterAirports(query) {
    const q = query.toUpperCase().trim();
    if (q.length < 2) return;
    const found = airportsData.find(a => a.icao.includes(q) || a.name.toUpperCase().includes(q));
    if (found) {
        setFollowState(false);
        map.flyTo([found.lat, found.lon], 11);
        return;
    }
    const foundVor = vorsData.find(v => v.ident.includes(q) || v.name.toUpperCase().includes(q));
    if (foundVor) {
        setFollowState(false);
        map.flyTo([foundVor.lat, foundVor.lon], 11);
    }
}

async function pollTelemetry() {
    if (!window.pywebview || !window.pywebview.api) return;
    try {
        let data = await window.pywebview.api.get_telemetry();
        document.getElementById('simStatus').innerText = data.mode;
        document.getElementById('simDot').className = 'status-dot' + (data.connected ? ' live' : '');
        document.getElementById('valAlt').innerText = data.alt_ft;
        document.getElementById('valGs').innerText = data.gs_kt;
        document.getElementById('valHdg').innerText = data.hdg_deg;
        document.getElementById('valAcft').innerText = data.aircraft || "MSFS 2024";

        if (data.lat !== undefined && data.lon !== undefined && data.lat !== null) {
            const newLatLng = L.latLng(data.lat, data.lon);
            let mapHeading = (data.hdg_true !== undefined && data.hdg_true !== null) ? Number(data.hdg_true) : Number(data.hdg_deg);
            if (isNaN(mapHeading)) mapHeading = lastAcftHdgTrue;
            lastAcftHdgTrue = mapHeading;
            lastAcftLatLng = newLatLng;

            if (data.connected) {
                if (!aircraftMarker) {
                    aircraftMarker = L.marker(newLatLng, { icon: acftIcon, zIndexOffset: 1000 }).addTo(map);
                } else {
                    aircraftMarker.setLatLng(newLatLng);
                }
                const svgEl = document.getElementById('acftSvg');
                if (svgEl) svgEl.style.transform = `rotate(${mapHeading}deg)`;

                if (followAircraft) {
                    map.panTo(newLatLng, { animate: true, duration: 0.5 });
                }
            } else if (aircraftMarker) {
                map.removeLayer(aircraftMarker);
                aircraftMarker = null;
            }
            updateFlightInfoBar(data.lat, data.lon);

            const acftLine = document.getElementById('acftVnavLine');
            if (acftLine && flightPlan && flightPlan.length >= 2) {
                const res = calculateRouteProgress(data.lat, data.lon);
                if (res) {
                    const xPos = res.fraction * 1000;
                    acftLine.setAttribute('x1', xPos);
                    acftLine.setAttribute('x2', xPos);
                    acftLine.style.display = 'block';
                    updateActiveWaypointHighlight(data.lat, data.lon, mapHeading);
                } else {
                    acftLine.style.display = 'none';
                }
            } else if (acftLine) {
                acftLine.style.display = 'none';
            }
        }
    } catch (err) {}
}

const dropOverlay = document.getElementById('dropZoneOverlay');
window.addEventListener('dragenter', (e) => { e.preventDefault(); if (dropOverlay) dropOverlay.style.display = 'flex'; });
window.addEventListener('dragover', (e) => { e.preventDefault(); });
if (dropOverlay) {
    dropOverlay.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
            dropOverlay.style.display = 'none';
        }
    });
    dropOverlay.addEventListener('dragover', (e) => { e.preventDefault(); });
}
window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dropOverlay) dropOverlay.style.display = 'none';
    const files = e.dataTransfer ? e.dataTransfer.files : null;
    if (files && files.length > 0) {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try { await processAndRenderPlnXml(event.target.result); }
            catch (err) { alert("Formato XML non valido: " + err.message); }
        };
        reader.readAsText(files[0]);
    }
});

async function initApp() {
    if (initialized || !window.pywebview || !window.pywebview.api) return;
    initialized = true;
    checkSystemLanguage();
    map.invalidateSize();

    renderNavAids(vorsData, ilsData);
    updateFlightInfoBar(41.8003, 12.2389);

    await window.pywebview.api.connect_sim();
    const nav = await window.pywebview.api.get_navdata();
    if (nav.simbrief_userid) {
        document.getElementById('simbriefIdInput').value = nav.simbrief_userid;
        setSimbriefCompactMode(true);
    }

    await loadUserWaypoints();

    pollTelemetry();
    setInterval(pollTelemetry, 1000);
}

window.addEventListener('resize', () => { if (map) map.invalidateSize(); });
window.addEventListener('pywebviewready', initApp);
setTimeout(initApp, 150);