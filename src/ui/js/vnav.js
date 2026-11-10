// --- DISEGNO PROFILO VNAV MULTI-STEP ---
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
            const lat = seg.p1.lat + segFrac * (seg.p2.lat - seg.p1.lat);
            const lng = seg.p1.lng + segFrac * (seg.p2.lng - seg.p1.lng);
            const alt = Math.round(seg.alt1 + segFrac * (seg.alt2 - seg.alt1));
            const distNm = (targetDist / 1852).toFixed(1);
            const totalNm = (totalDist / 1852).toFixed(1);
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