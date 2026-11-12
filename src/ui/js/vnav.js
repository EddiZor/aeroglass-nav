// --- STATO OROGRAFIA TERRENO VNAV ---
let currentTerrainSamples = [];
let terrainFetchToken = 0;

function sampleRouteCoordinates(coords, numPoints) {
    let result = [];
    if (!coords || coords.length < 2) return result;

    let totalDist = 0;
    const segments = [];
    for (let i = 0; i < coords.length - 1; i++) {
        const p1 = L.latLng(coords[i][0], coords[i][1]);
        const p2 = L.latLng(coords[i + 1][0], coords[i + 1][1]);
        const d = p1.distanceTo(p2);
        segments.push({ p1, p2, d });
        totalDist += d;
    }

    for (let i = 0; i < numPoints; i++) {
        const targetDist = (i / (numPoints - 1)) * totalDist;
        let accumulated = 0;
        let found = false;
        for (const seg of segments) {
            if (accumulated + seg.d >= targetDist) {
                const frac = seg.d === 0 ? 0 : (targetDist - accumulated) / seg.d;
                const lat = seg.p1.lat + frac * (seg.p2.lat - seg.p1.lat);
                const lng = seg.p1.lng + frac * (seg.p2.lng - seg.p1.lng);
                result.push([lat, lng]);
                found = true;
                break;
            }
            accumulated += seg.d;
        }
        if (!found) {
            const last = segments[segments.length - 1].p2;
            result.push([last.lat, last.lng]);
        }
    }
    return result;
}

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
    const lats = [], lons = [];

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

        if (token !== terrainFetchToken || !data.elevation) return;

        currentTerrainSamples = data.elevation.map(m => Math.max(0, Math.round(Number(m || 0) * 3.28084)));
        terrainPath.setAttribute('d', buildSvgAreaPath(currentTerrainSamples, maxAlt));
    } catch (err) {
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

function getTerrainAtFraction(fraction) {
    if (!currentTerrainSamples || currentTerrainSamples.length === 0) return null;
    const idx = Math.min(
        currentTerrainSamples.length - 1,
        Math.max(0, Math.round(fraction * (currentTerrainSamples.length - 1)))
    );
    return currentTerrainSamples[idx];
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
        updateTopOfDescentOverlay();
        return;
    }

    const validAlts = alts.map(a => Number(a) || 0);
    const maxAlt = Math.max(...validAlts, 5000);
    svgPath.setAttribute('d', buildSvgAreaPath(validAlts, maxAlt));

    if (svgText) {
        svgText.textContent = `VNAV MULTI-STEP (MAX ALT: ${maxAlt.toLocaleString()} FT)`;
    }

    fetchRouteTerrainProfile(maxAlt);
    setTimeout(updateTopOfDescentOverlay, 30);
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

    let minGlobalDist = Infinity, bestFraction = 0, accumulatedDist = 0, bestLegIdx = 0;
    for (let i = 0; i < flightPlan.length - 1; i++) {
        const A = L.latLng(flightPlan[i].lat, flightPlan[i].lon);
        const B = L.latLng(flightPlan[i + 1].lat, flightPlan[i + 1].lon);
        const segLen = segDistances[i];
        const P = L.latLng(lat, lon);
        const clampedT = Math.max(0, Math.min(1, getSegmentFraction(A, B, P)));
        const latProj = A.lat + clampedT * (B.lat - A.lat);
        const lonProj = A.lng + clampedT * (B.lng - A.lng);
        const distToProj = P.distanceTo(L.latLng(latProj, lonProj));
        if (distToProj < minGlobalDist) {
            minGlobalDist = distToProj;
            bestFraction = (accumulatedDist + (clampedT * segLen)) / totalDist;
            bestLegIdx = i;
        }
        accumulatedDist += segLen;
    }
    return { fraction: Math.max(0, Math.min(1, bestFraction)), distanceToRoute: minGlobalDist, legIndex: bestLegIdx };
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
        segments.push({
            p1, p2, d,
            alt1: Number(flightPlan[i].alt_ft) || 0,
            alt2: Number(flightPlan[i + 1].alt_ft) || 0,
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
            const lat = seg.p1.lat + segFrac * (seg.p2.lat - seg.p1.lat);
            const lng = seg.p1.lng + segFrac * (seg.p2.lng - seg.p1.lng);
            const alt = Math.round(seg.alt1 + segFrac * (seg.alt2 - seg.alt1));
            return {
                latlng: L.latLng(lat, lng),
                alt,
                distNm: (targetDist / 1852).toFixed(1),
                totalNm: (totalDist / 1852).toFixed(1),
                leg: `${seg.fromIdent} ➔ ${seg.toIdent}`
            };
        }
        accumulated += seg.d;
    }

    const last = segments[segments.length - 1];
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

    const gndElev = getTerrainAtFraction(fraction);
    const gndInfo = gndElev !== null ? ` (GND: ${gndElev.toLocaleString()} ft)` : '';
    const labelText = `${details.leg} | ${details.alt.toLocaleString()} ft${gndInfo} | ${details.distNm} NM`;

    if (vnavBadge) {
        vnavBadge.innerText = labelText;
        const safePct = Math.max(12, Math.min(88, fraction * 100));
        vnavBadge.style.left = `${safePct}%`;
        vnavBadge.style.display = 'block';
    }

    if (!mouseRouteMarker) {
        mouseRouteMarker = L.circleMarker(details.latlng, {
            radius: 6, color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.95, weight: 2, interactive: false
        }).addTo(map);
        mouseRouteMarker.bindTooltip(labelText, {
            permanent: true, direction: 'top', offset: [0, -10], className: 'vnav-route-tooltip'
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
    if (res && res.distanceToRoute < 25000) updateHoverSync(res.fraction);
    else updateHoverSync(null);
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
    vnavSvgEl.addEventListener('mouseleave', () => updateHoverSync(null));
}

// --- EVIDENZIAZIONE WAYPOINT ATTIVO IN VOLO ---
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

    const fplContainer = document.getElementById('fplContainer');
    const cards = document.querySelectorAll('#fplContainer .wpt-card');
    const hasChangedWpt = (window._lastActiveWptIdx !== activeIdx);
    window._lastActiveWptIdx = activeIdx;

    cards.forEach((card, idx) => {
        if (idx === activeIdx) {
            card.style.borderColor = 'var(--emerald)';
            card.style.background = 'rgba(52, 211, 153, 0.12)';
            if (fplContainer && hasChangedWpt) {
                fplContainer.scrollTo({
                    top: card.offsetTop - fplContainer.offsetTop,
                    behavior: 'smooth'
                });
            }
        } else {
            card.style.borderColor = '';
            card.style.background = '';
        }
    });
}

// --- CALCOLO E VISUALIZZAZIONE TOP OF DESCENT (ToD 3°) SU MAPPA E VNAV ---
function computeTopOfDescentData() {
    if (typeof flightPlan === 'undefined' || !Array.isArray(flightPlan) || flightPlan.length < 2) return null;

    const cumDist = [0];
    for (let i = 0; i < flightPlan.length - 1; i++) {
        const p1 = L.latLng(Number(flightPlan[i].lat), Number(flightPlan[i].lon));
        const p2 = L.latLng(Number(flightPlan[i + 1].lat), Number(flightPlan[i + 1].lon));
        cumDist.push(cumDist[i] + (p1.distanceTo(p2) / 1852));
    }

    const totalDistNm = cumDist[cumDist.length - 1];
    if (totalDistNm < 3) return null;

    const altitudes = flightPlan.map(wp => Number(wp.alt_ft) || 0);
    const maxAlt = Math.max(...altitudes);
    const destWp = flightPlan[flightPlan.length - 1];
    const destElev = Number(destWp.alt_ft) || 0;
    const altToLose = Math.max(0, maxAlt - destElev);
    if (altToLose < 500) return null;

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
    const p1 = flightPlan[legIdx], p2 = flightPlan[legIdx + 1];

    const todLat = Number(p1.lat) + segFrac * (Number(p2.lat) - Number(p1.lat));
    const todLon = Number(p1.lon) + segFrac * (Number(p2.lon) - Number(p1.lon));

    const gsText = document.getElementById('valGs')?.innerText || '';
    const parsedGs = parseInt(gsText.replace(/[^0-9]/g, ''), 10);
    const cfgCruise = (typeof fuelPerfConfig !== 'undefined' && fuelPerfConfig.cruiseKt) ? Number(fuelPerfConfig.cruiseKt) : 0;
    const defaultGs = cfgCruise || (maxAlt > 18000 ? 420 : (maxAlt > 9000 ? 220 : 125));
    const activeGsKt = (!isNaN(parsedGs) && parsedGs > 35) ? parsedGs : defaultGs;
    const vs3DegFpm = -Math.round((activeGsKt * 5.2) / 50) * 50;

    return {
        lat: todLat, lon: todLon, fraction: todFraction,
        totalDistNm, todDistFromStart, descentDistNm: totalDistNm - todDistFromStart,
        maxAlt, destElev, destIdent: destWp.ident || 'DEST',
        altToLose, activeGsKt, vs3DegFpm
    };
}

function updateTopOfDescentOverlay() {
    if (typeof ensureDrawerToggleTab === 'function') ensureDrawerToggleTab();
    if (typeof map === 'undefined' || !map) return;

    if (window._todMapMarker) {
        try { map.removeLayer(window._todMapMarker); } catch (e) {}
        window._todMapMarker = null;
    }

    const existingSvgGroup = document.getElementById('todVnavGroup');
    if (existingSvgGroup) existingSvgGroup.remove();

    const existingHtmlBadge = document.getElementById('todVnavHtmlBadge');
    if (existingHtmlBadge) existingHtmlBadge.remove();

    const tod = computeTopOfDescentData();
    if (!tod) return;

    const todIcon = L.divIcon({
        className: '',
        html: `
            <div style="display:inline-flex;align-items:center;gap:3px;transform:translate(-50%,-50%);cursor:pointer;white-space:nowrap;">
                <div style="width:8px;height:8px;border-radius:50%;background:#fbbf24;border:1.5px solid #0f172a;box-shadow:0 0 6px #fbbf24;"></div>
                <span style="background:rgba(15,23,42,0.92);border:1px solid rgba(251,191,36,0.75);color:#fbbf24;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;line-height:1.2;box-shadow:0 2px 6px rgba(0,0,0,0.5);">
                    ToD -${tod.descentDistNm.toFixed(0)}NM
                </span>
            </div>
        `,
        iconSize: [80, 16],
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
        icon: todIcon, zIndexOffset: 750
    }).addTo(map).bindPopup(popupHtml);

    const acftLine = document.getElementById('acftVnavLine');
    const svg = acftLine ? acftLine.ownerSVGElement : document.querySelector('#elevationDrawer svg');
    if (svg) {
        const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width
            ? svg.viewBox.baseVal
            : { width: 1000, height: 60 };
        const xPos = (tod.fraction * vb.width).toFixed(1);
        const h = vb.height || 60;

        const ns = "http://www.w3.org/2000/svg";
        const g = document.createElementNS(ns, "g");
        g.setAttribute("id", "todVnavGroup");

        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", xPos);
        line.setAttribute("x2", xPos);
        line.setAttribute("y1", "2");
        line.setAttribute("y2", String(h));
        line.setAttribute("stroke", "#fbbf24");
        line.setAttribute("stroke-width", "1.3");
        line.setAttribute("stroke-dasharray", "3,3");
        g.appendChild(line);
        svg.appendChild(g);

        const svgParent = svg.parentElement;
        if (svgParent) {
            if (getComputedStyle(svgParent).position === 'static') svgParent.style.position = 'relative';
            const pct = Math.min(95, Math.max(5, tod.fraction * 100));
            const badge = document.createElement('div');
            badge.id = 'todVnavHtmlBadge';
            badge.style.cssText = `position:absolute;left:${pct.toFixed(2)}%;top:2px;transform:translateX(-50%);background:rgba(15,23,42,0.92);border:1px solid rgba(251,191,36,0.75);color:#fbbf24;font-size:9px;font-weight:700;padding:0px 5px;border-radius:3px;line-height:14px;pointer-events:none;white-space:nowrap;z-index:10;box-shadow:0 1px 4px rgba(0,0,0,0.6);`;
            badge.innerText = `ToD -${tod.descentDistNm.toFixed(0)}NM`;
            svgParent.appendChild(badge);
        }
    }

    updateTodHeaderStatus(tod);
}

function updateTodHeaderStatus(todInput) {
    const vnavText = document.getElementById('vnavText');
    if (!vnavText) return;

    const cleanBase = vnavText.innerText.replace(/\s*\|\s*📉[\s\S]*$/, '').trim();
    const tod = todInput || computeTopOfDescentData();
    if (!tod) {
        if (vnavText.innerText !== cleanBase) vnavText.innerText = cleanBase;
        return;
    }

    let statusSuffix = ` | 📉 ToD: ${tod.descentDistNm.toFixed(1)} NM prima di ${tod.destIdent} (VS ${tod.vs3DegFpm} fpm @ ${tod.activeGsKt}kt)`;

    if (typeof lastAcftLatLng !== 'undefined' && lastAcftLatLng && typeof calculateRouteProgress === 'function') {
        const simDot = document.getElementById('simDot');
        const isLive = (simDot && simDot.classList.contains('live')) || window._demoTourActive;
        if (isLive) {
            const prog = calculateRouteProgress(lastAcftLatLng.lat, lastAcftLatLng.lng);
            if (prog) {
                const acftDistNm = prog.fraction * tod.totalDistNm;
                const distToTod = tod.todDistFromStart - acftDistNm;
                const distToDest = Math.max(0.1, tod.totalDistNm - acftDistNm);

                if (distToTod > 0.5) {
                    statusSuffix = ` | 📉 ToD tra ${distToTod.toFixed(1)} NM (VS 3°: ${tod.vs3DegFpm} fpm)`;
                } else {
                    const altTxt = document.getElementById('valAlt')?.innerText || '';
                    const curAlt = parseInt(altTxt.replace(/[^0-9]/g, ''), 10) || tod.maxAlt;
                    const remAlt = Math.max(0, curAlt - tod.destElev);
                    const reqVs = -Math.round(((remAlt / distToDest) * (tod.activeGsKt / 60.0)) / 50) * 50;
                    statusSuffix = ` | 📉 DISCESA -> ${tod.destIdent} (${distToDest.toFixed(1)} NM) • VS Richiesto: ${reqVs} fpm`;
                }
            }
        }
    }

    const nextText = cleanBase + statusSuffix;
    if (vnavText.innerText !== nextText) vnavText.innerText = nextText;
}