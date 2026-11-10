// --- TRADUZIONI INTERFACCIA ---
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
        btnFollowFree: "✋ Mappa Libera",
        btnFollowNorth: "🎯 Follow (North Up)",
        btnFollowTrack: "🧭 Follow (Track Up)",
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
        btnFollowNorth: "🎯 Segui (North Up)",
        btnFollowTrack: "🧭 Segui (Track Up)",
        btnReduce: "[ Riduci / Espandi ]"
    }
};

// --- SORGENTI TILE MAPPA ---
const tileSources = {
    dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    vfr: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    lowifr: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    highifr: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

// --- DATABASE STATICI DI FALLBACK ---
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

// --- VARIABILI DI STATO GLOBALE ---
let currentLang = 'it';
let showNavaids = true;
let followState = 1; // 0 = Free, 1 = North Up, 2 = Track Up
let lastAcftHdgTrue = 0;
let lastRenderedAcftKey = null;

let airportsData = [...EXTRA_AIRPORTS];
let vorsData = [...DEFAULT_VORS];
let ilsData = [...DEFAULT_ILS];
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
let airspaceLayers = { tma: [], ctr: [], restricted: [] };

let userWaypoints = [];
let userWpMarkers = [];
let isPickingUserWp = false;
let tempPickMarker = null;

let sidebarOpen = true;
let drawerOpen = true;
let initialized = false;

// --- FUNZIONI HELPER DI RICERCA E PARSING METAR ---
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