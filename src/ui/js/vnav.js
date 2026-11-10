// --- STATO OROGRAFIA TERRENO VNAV ---
let currentTerrainSamples = [];
let terrainFetchToken = 0;

// Costruisce la stringa SVG 'd' per un array di quote
function buildSvgAreaPath(samples, maxAlt, width = 1000, height = 40) {
    if (!samples || samples.length === 0) return 'M0,50 L1000,50 Z';
    let d = 'M0,50 ';
    if (samples.length === 1) {
        const y = Math.max(2, Math.min(49, height - (samples[0] / maxAlt) * height + 5));
        d += `L0,${y.toFixed(1)} L${width},${y.toFixed(1)} `;
    } else {
        samples.forEach((alt, i) => {
            const x = (i / (samples.length - 1)) * width;
            const y = Math.max(2, Math.min(49, height - (alt / maxAlt) * height + 5));
            d += `L${x.toFixed(1)},${y.toFixed(1)} `;
        });
    }
    d += `L${width},50 Z`;
    return d;
}

// Scarica le elevazioni reali (DEM/SRTM) su 40 punti lungo la rotta
async function fetchRouteTerrainProfile(maxAlt) {
    const terrainPath = document.getElementById('terrainPath');
    if (!terrainPath) return;

    if (!flightPlan || flightPlan.length < 2) {
        currentTerrainSamples = [];
        terrainPath.setAttribute('d', 'M0,50 L1000,50 Z');
        return;
    }

    const token = ++terrainFetchToken;
    const numSamples = 40;
    const lats = [];
    const lons = [];

    for (let i = 0; i < numSamples; i++) {
        const frac = i / (numSamples - 1);
        const pt = getRouteDetailsAtFraction(frac);
        if (!pt || !pt.latlng) return;
        lats.push(pt.latlng.lat.toFixed(4));
        lons.push(pt.latlng.lng.toFixed(4));
    }

    try {
        const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lons.join(',')}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Elevation API non raggiungibile");
        const data = await res.json();

        // Evita sovrascritture se l'utente ha cambiato rotta nel frattempo
        if (token !== terrainFetchToken || !data.elevation) return;

        currentTerrainSamples = data.elevation.map(m => Math.max(0, Math.round(Number(m || 0) * 3.28084)));
        terrainPath.setAttribute('d', buildSvgAreaPath(currentTerrainSamples, maxAlt));
    } catch (err) {
        // Fallback offline: interpolazione lineare tra elevazione partenza e arrivo
        if (token !== terrainFetchToken) return;
        const depApt = findAirport(flightPlan[0]?.ident);
        const destApt = findAirport(flightPlan[flightPlan.length - 1]?.ident);
        const startElev = depApt ? (depApt.elev || 0) : 0;
        const endElev = destApt ? (destApt.elev || 0) : 0;

        currentTerrainSamples = [];
        for (let i = 0; i < numSamples; i++) {
            const frac = i / (numSamples - 1);
            currentTerrainSamples.push(Math.round(startElev + frac * (endElev - startElev)));
        }
        terrainPath.setAttribute('d', buildSvgAreaPath(currentTerrainSamples, maxAlt));
    }
}

// Restituisce l'elevazione del terreno in ft alla frazione di rotta (0..1)
function getTerrainAtFraction(fraction) {
    if (!currentTerrainSamples || currentTerrainSamples.length === 0) return null;
    const idx = Math.min(
        currentTerrainSamples.length - 1,
        Math.max(0, Math.round(fraction * (currentTerrainSamples.length - 1)))
    );
    return currentTerrainSamples[idx];
}

// --- PROFILO OROGRAFICO TERRENO LUNGO LA ROTTA ---
async function updateTerrainProfile(coords) {
    const terrainPathEl = document.getElementById('terrainPath');
    if (!terrainPathEl || !coords || coords.length < 2) return;

    try {
        const sampledCoords = sampleRouteCoordinates(coords, 50);
        const lats = sampledCoords.map(c => c[0]).join(',');
        const lons = sampledCoords.map(c => c[1]).join(',');

        const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.elevation) {
            const elevations = data.elevation;
            const maxAlt = 35000;
            const width = 1000;
            const height = 100;

            let pathD = `M0,${height} `;
            const stepX = width / (elevations.length - 1);

            elevations.forEach((elevMeters, idx) => {
                const elevFt = elevMeters * 3.28084;
                const y = height - Math.min(Math.max((elevFt / maxAlt) * height, 0), height - 5);
                const x = idx * stepX;
                pathD += `L${x.toFixed(1)},${y.toFixed(1)} `;
            });

            pathD += `L${width},${height} Z`;
            terrainPathEl.setAttribute('d', pathD);
        }
    } catch (e) {
        console.warn("Impossibile caricare il profilo orografico del terreno:", e);
    }
}

// Funzione di supporto per campionare i punti lungo la polilinea
function sampleRouteCoordinates(coords, numPoints) {
    let result = [];
    for (let i = 0; i < numPoints; i++) {
        const frac = i / (numPoints - 1);
        const totalIdx = frac * (coords.length - 1);
        const idx1 = Math.floor(totalIdx);
        const idx2 = Math.min(idx1 + 1, coords.length - 1);
        const subFrac = totalIdx - idx1;

        const lat = coords[idx1][0] + subFrac * (coords[idx2][0] - coords[idx1][0]);
        const lon = coords[idx1][1] + subFrac * (coords[idx2][1] - coords[idx1][1]);
        result.push([lat, lon]);
    }
    return result;
}

// --- DISEGNO PROFILO VNAV MULTI-STEP + TERRENO ---
function renderVnavChart(alts) {
    const svgPath = document.getElementById('vnavPath');
    const terrainPath = document.getElementById('terrainPath');
    const svgText = document.getElementById('vnavText');
    if (!svgPath) return;

    if (!alts || alts.length === 0) {
        svgPath.setAttribute('d', 'M0,50 L1000,50 Z');
        if (terrainPath) terrainPath.setAttribute('d', 'M0,50 L1000,50 Z');
        currentTerrainSamples = [];
        return;
    }

    const maxAlt = Math.max(...alts, 5000);
    svgPath.setAttribute('d', buildSvgAreaPath(alts, maxAlt));

    if (svgText) {
        svgText.textContent = `VNAV MULTI-STEP (MAX ALT: ${maxAlt.toLocaleString()} FT)`;
    }

    // Avvia il campionamento altimetrico del terreno lungo la rotta
    fetchRouteTerrainProfile(maxAlt);

    if (typeof flightPlan !== 'undefined' && flightPlan.length > 0) {
        const routeCoords = flightPlan
            .filter(w => w.lat !== null && w.lon !== null)
            .map(w => [w.lat, w.lon]);
        
        if (routeCoords.length > 1) {
            updateTerrainProfile(routeCoords);
        }
    }
}

// --- CALCOLO PROGRESSO ROTTA E HOVER SINCRONIZZATO ---
function getSegmentFraction(A, B, P) {
    const dx = B.lng - A.lng;
    const dy = B.lat - A.lat;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;
    return ((P.lng - A.lng) * dx + (P.lat - A.lat) * dy) / lenSq;
}

function calculateRouteProgress(lat, lon) {
    if (!flightPlan || flightPlan.length < 2) return null;
    let totalDist = 0;
    const segDistances = [];
    for (let i = 0; i < flightPlan.length - 1; i++) {
        if (flightPlan[i].lat === null || flightPlan[i + 1].lat === null) return null;
        const d = L.latLng(flightPlan[i].lat, flightPlan[i].lon).distanceTo(L.latLng(flightPlan[i + 1].lat, flightPlan[i + 1].lon));
        segDistances.push(d);
        totalDist += d;
    }
    if (totalDist === 0) return null;

    let minGlobalDist = Infinity, bestFraction = 0, accumulatedDist = 0;
    for (let i = 0; i < flightPlan.length - 1; i++) {
        const A = L.latLng(flightPlan[i].lat, flightPlan[i].lon);
        const B = L.latLng(flightPlan[i + 1].lat, flightPlan[i + 1].lon);
        const segLen = segDistances[i];
        const P = L.latLng(lat, lon);
        const t = getSegmentFraction(A, B, P);
        const clampedT = Math.max(0, Math.min(1, t));
        const latProj = A.lat + clampedT * (B.lat - A.lat);
        const lonProj = A.lng + clampedT * (B.lng - A.lng);
        const distToProj = P.distanceTo(L.latLng(latProj, lonProj));
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
    const segments = [];

    for (let i = 0; i < flightPlan.length - 1; i++) {
        if (flightPlan[i].lat === null || flightPlan[i + 1].lat === null) continue;
        const p1 = L.latLng(flightPlan[i].lat, flightPlan[i].lon);
        const p2 = L.latLng(flightPlan[i + 1].lat, flightPlan[i + 1].lon);
        const d = p1.distanceTo(p2);
        const alt1 = Number(flightPlan[i].alt_ft) || 0;
        const alt2 = Number(flightPlan[i + 1].alt_ft) || 0;
        segments.push({
            p1, p2, d, alt1, alt2,
            fromIdent: flightPlan[i].ident,
            toIdent: flightPlan[i + 1].ident
        });
        totalDist += d;
    }

    if (totalDist === 0 || segments.length === 0) return null;

    const clampedFrac = Math.max(0, Math.min(1, fraction));
    const targetDist = clampedFrac * totalDist;
    let accumulated = 0;

    for (const seg of segments) {
        if (accumulated + seg.d >= targetDist) {
            const segFrac = seg.d === 0 ? 0 : (targetDist - accumulated) / seg.d;