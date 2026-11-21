// --- GESTIONE WAYPOINT UTENTE (CUSTOM SU SQLITE) ---
async function loadUserWaypoints() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_user_waypoints) {
        try {
            const res = await window.pywebview.api.get_user_waypoints();
            if (res && res.success && Array.isArray(res.waypoints)) {
                userWaypoints = res.waypoints;
            }
        } catch (err) {
            console.warn("Errore lettura user_waypoints da SQLite:", err);
        }
    }
    renderUserWaypointsUI();
}

async function persistUserWaypoints() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_user_waypoints) {
        try {
            const res = await window.pywebview.api.save_user_waypoints(userWaypoints);
            if (res && res.fpl_ts) window._lastFplTs = res.fpl_ts;
        } catch (err) {
            console.warn("Errore salvataggio user_waypoints in SQLite:", err);
        }
    }
}

async function addUserWaypoint() {
    const idEl = document.getElementById('uwId');
    const altEl = document.getElementById('uwAlt');
    const latEl = document.getElementById('uwLat');
    const lonEl = document.getElementById('uwLon');

    const ident = (idEl?.value || '').trim().toUpperCase();
    const alt_ft = parseInt(altEl?.value || '5000', 10) || 5000;
    const lat = parseFloat(latEl?.value);
    const lon = parseFloat(lonEl?.value);

    if (!ident || isNaN(lat) || isNaN(lon)) return;

    const existingIdx = userWaypoints.findIndex(w => w.ident === ident);
    const wpObj = {
        ident,
        name: "User Waypoint",
        lat: Number(lat.toFixed(5)),
        lon: Number(lon.toFixed(5)),
        alt_ft,
        type: "USER"
    };

    if (existingIdx >= 0) userWaypoints[existingIdx] = wpObj;
    else userWaypoints.push(wpObj);

    await persistUserWaypoints();
    renderUserWaypointsUI();

    if (idEl) idEl.value = '';
    if (latEl) latEl.value = '';
    if (lonEl) lonEl.value = '';

    if (tempPickMarker) {
        map.removeLayer(tempPickMarker);
        tempPickMarker = null;
    }
    if (isPickingUserWp) toggleMapPickMode(false);
}

async function saveAndRefreshUserWaypoints() {
    await persistUserWaypoints();
    renderUserWaypointsUI();
}

async function deleteUserWaypoint(identOrIdx) {
    if (typeof identOrIdx === 'number') {
        userWaypoints.splice(identOrIdx, 1);
    } else {
        userWaypoints = userWaypoints.filter(w => w.ident !== identOrIdx);
    }
    await persistUserWaypoints();
    renderUserWaypointsUI();
}

function renderUserWaypointsUI() {
    const container = document.getElementById('userWpContainer');
    if (!container) return;
    container.innerHTML = '';

    if (userWpMarkers.length > 0) {
        userWpMarkers.forEach(m => map.removeLayer(m));
    }
    userWpMarkers = [];

    const activeIdents = new Set((flightPlan || []).map(fp => fp.ident));
    const availableWaypoints = userWaypoints.filter(wp => !activeIdents.has(wp.ident));

    availableWaypoints.forEach((wp) => {
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
        div.style.cssText = 'padding: 4px 8px; flex-shrink: 0; min-height: 28px;';
        div.onclick = () => {
            setFollowState(false);
            map.flyTo([wp.lat, wp.lon], 11);
            marker.openPopup();
        };
        div.innerHTML = `
            <div style="min-width:0; flex:1; display:flex; align-items:baseline; gap:6px; overflow:hidden;">
                <span class="wpt-icao" style="color:var(--amber); font-size:12px;">${wp.ident}</span>
                <span class="wpt-name" style="margin-top:0; font-size:10px; font-family:Consolas,monospace; white-space:nowrap;">${Number(wp.lat).toFixed(4)}, ${Number(wp.lon).toFixed(4)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                <button class="btn btn-cyan" style="padding:1px 5px; font-size:10px;" title="Aggiungi al piano di volo attivo" onclick="event.stopPropagation(); addWpToRoute('${wp.ident}')">➕</button>
                <span class="wpt-alt" style="font-size:10px; padding:1px 5px;">${wp.alt_ft} ft</span>
                <button class="btn btn-danger" style="padding:1px 5px; font-size:10px; flex:0 0 auto;" title="Elimina definitivamente dal DB" onclick="event.stopPropagation(); deleteUserWaypoint('${wp.ident}')">✕</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function findBestLegIndexForPoint(lat, lon) {
    if (!flightPlan || flightPlan.length < 2) return 0;
    const P = L.latLng(lat, lon);
    let bestLegIdx = flightPlan.length - 2;
    let minCrossDist = Infinity;

    for (let i = 0; i < flightPlan.length - 1; i++) {
        if (flightPlan[i].lat === null || flightPlan[i + 1].lat === null) continue;
        const A = L.latLng(flightPlan[i].lat, flightPlan[i].lon);
        const B = L.latLng(flightPlan[i + 1].lat, flightPlan[i + 1].lon);
        const t = Math.max(0, Math.min(1, getSegmentFraction(A, B, P)));
        const proj = L.latLng(A.lat + t * (B.lat - A.lat), A.lng + t * (B.lng - A.lng));
        const d = P.distanceTo(proj);
        if (d < minCrossDist) {
            minCrossDist = d;
            bestLegIdx = i;
        }
    }
    return bestLegIdx;
}

function pushFlightPlanUndoState() {
    if (!flightPlan || flightPlan.length === 0) return;
    fplUndoStack.push({
        flightPlan: JSON.parse(JSON.stringify(flightPlan)),
        userWaypoints: JSON.parse(JSON.stringify(userWaypoints || []))
    });
    if (fplUndoStack.length > 25) fplUndoStack.shift();
    updateUndoButtonUI();
}

function clearFlightPlanUndoHistory() {
    fplUndoStack = [];
    updateUndoButtonUI();
}

function ensureUndoButtonExists() {
    let btn = document.getElementById('btnUndoFpl');
    if (btn) return btn;

    const titleEl = document.getElementById('fplSectionTitle');
    if (!titleEl || !titleEl.parentNode) return null;

    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-shrink: 0;';
    titleEl.parentNode.insertBefore(headerRow, titleEl);
    titleEl.style.marginBottom = '0';
    headerRow.appendChild(titleEl);

    btn = document.createElement('button');
    btn.id = 'btnUndoFpl';
    btn.className = 'btn btn-cyan';
    btn.title = 'Ripristina la traccia nella posizione precedente (Ctrl+Z)';
    btn.onclick = () => undoFlightPlanChange();
    headerRow.appendChild(btn);
    return btn;
}

function updateUndoButtonUI() {
    const btn = ensureUndoButtonExists();
    if (!btn) return;

    const count = (fplUndoStack && fplUndoStack.length) ? fplUndoStack.length : 0;
    btn.style.display = 'inline-flex';
    btn.style.flex = '0 0 auto';
    btn.style.padding = '2px 8px';
    btn.style.fontSize = '10.5px';

    if (count > 0) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.style.borderColor = 'var(--amber)';
        btn.style.color = 'var(--amber)';
        btn.style.background = 'rgba(251, 191, 36, 0.18)';
        btn.innerHTML = `↩️ Ripristina (${count})`;
    } else {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.style.cursor = 'default';
        btn.style.borderColor = 'rgba(148, 163, 184, 0.3)';
        btn.style.color = 'var(--text-muted)';
        btn.style.background = 'rgba(30, 41, 59, 0.4)';
        btn.innerHTML = `↩️ Ripristina`;
    }
}

async function undoFlightPlanChange() {
    if (!fplUndoStack || fplUndoStack.length === 0) return;
    const prevState = fplUndoStack.pop();
    flightPlan = prevState.flightPlan || [];
    userWaypoints = prevState.userWaypoints || [];
    updateUndoButtonUI();
    await persistUserWaypoints();
    updateFlightPlanUI(undefined, false);
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
        if (fplUndoStack && fplUndoStack.length > 0) {
            e.preventDefault();
            undoFlightPlanChange();
        }
    }
});

function addWpToRoute(ident, explicitLegIdx = undefined) {
    const wp = userWaypoints.find(w => w.ident === ident);
    if (!wp) return;
    if (!flightPlan || flightPlan.length === 0) {
        const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
        const msg = isEn
            ? "Create or import an active flight plan first."
            : "Crea o importa prima un piano di volo attivo.";
        if (typeof window.showAeroAlert === 'function') window.showAeroAlert(msg);
        else alert(msg);
        return;
    }
    pushFlightPlanUndoState();
    const legIdx = (explicitLegIdx !== undefined) ? explicitLegIdx : findBestLegIndexForPoint(wp.lat, wp.lon);
    flightPlan.splice(legIdx + 1, 0, {
        ident: wp.ident,
        name: "User Waypoint",
        lat: wp.lat,
        lon: wp.lon,
        alt_ft: wp.alt_ft,
        type: "WPT",
        proc_type: "ENR",
        proc_name: "DCT"
    });
    updateFlightPlanUI(undefined, false);
}

// --- RENDERING PIANO DI VOLO ATTIVO, PROCEDURE SID/STAR E CONO AVVICINAMENTO ---
function clearMapRoutes() {
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    if (routeSegmentLines && routeSegmentLines.length > 0) {
        routeSegmentLines.forEach(l => { if (l) map.removeLayer(l); });
    }
    routeSegmentLines = [];
    if (approachFeatherLayer) { map.removeLayer(approachFeatherLayer); approachFeatherLayer = null; }
    if (alternateLine) { map.removeLayer(alternateLine); alternateLine = null; }
    if (waypointMarkers && waypointMarkers.length > 0) {
        waypointMarkers.forEach(m => { if (m) map.removeLayer(m); });
    }
    waypointMarkers = [];
    if (alternateMarker) { map.removeLayer(alternateMarker); alternateMarker = null; }
    if (mouseRouteMarker) { map.removeLayer(mouseRouteMarker); mouseRouteMarker = null; }
}

function destPointNm(lat, lon, brngDeg, distNm) {
    const R = 3440.065;
    const d = distNm / R;
    const brng = brngDeg * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;
    const dLon = (lon2 - lon1) * toRad;
    const y = Math.sin(dLon) * Math.cos(lat2 * toRad);
    const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
              Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos(dLon);
    return (Math.atan2(y, x) * toDeg + 360) % 360;
}

function calculateDistanceNm(lat1, lon1, lat2, lon2) {
    const R = 3440.065;
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function enrichProceduresProfile(waypoints) {
    if (!waypoints || waypoints.length < 2) return waypoints;
    const lastIdx = waypoints.length - 1;
    const hasExplicitProc = waypoints.some((w, i) => i > 0 && i < lastIdx && (w.proc_type === 'SID' || w.proc_type === 'STAR' || w.proc_type === 'APPR'));

    if (!hasExplicitProc && waypoints.length >= 3) {
        waypoints[1].proc_type = 'SID';
        waypoints[1].proc_name = waypoints[1].proc_name || 'SID TRANS';
        if (waypoints.length >= 4) {
            waypoints[lastIdx - 1].proc_type = 'STAR';
            waypoints[lastIdx - 1].proc_name = waypoints[lastIdx - 1].proc_name || 'STAR TRANS';
        }
    }
    waypoints[0].proc_type = 'SID';
    waypoints[lastIdx].proc_type = 'APPR';
    return waypoints;
}

function drawApproachFeather(waypoints) {
    if (!showApproachCone || !waypoints || waypoints.length < 2) return;
    const dest = waypoints[waypoints.length - 1];
    const prev = waypoints[waypoints.length - 2];
    if (dest.lat === null || dest.lon === null || prev.lat === null || prev.lon === null) return;

    const apt = findAirport(dest.ident);
    const cleanRwy = (r) => String(r || '').trim().toUpperCase().replace(/^RWY\s*/i, '');
    let destRwy = cleanRwy(dest.rwy);
    if (!destRwy && dest.proc_name) {
        const mRwy = String(dest.proc_name).match(/RWY\s*(\d{1,2}[LRC]?)/i);
        if (mRwy) destRwy = mRwy[1].toUpperCase();
    }
    if (!destRwy && apt && apt.rwy) {
        destRwy = cleanRwy(apt.rwy.split('/')[0]);
    }

    const matchedIls = (ilsData || []).find(i => {
        const d = L.latLng(dest.lat, dest.lon).distanceTo(L.latLng(i.lat, i.lon));
        if (destRwy) {
            return cleanRwy(i.rwy) === destRwy && d < 15000;
        }
        return d < 8000;
    });

    let finalCourse = null;
    if (matchedIls && matchedIls.course !== undefined) {
        finalCourse = Number(matchedIls.course);
    } else if (destRwy && /^\d{1,2}/.test(destRwy)) {
        finalCourse = (parseInt(destRwy.match(/^\d{1,2}/)[0], 10) * 10) % 360;
    } else {
        finalCourse = calculateBearing(prev.lat, prev.lon, dest.lat, dest.lon);
    }
    const reciprocal = (finalCourse + 180) % 360;

    const tip = [dest.lat, dest.lon];
    const leftWing = destPointNm(dest.lat, dest.lon, (reciprocal - 4.5 + 360) % 360, 8.0);
    const centerNotch = destPointNm(dest.lat, dest.lon, reciprocal, 6.8);
    const rightWing = destPointNm(dest.lat, dest.lon, (reciprocal + 4.5) % 360, 8.0);
    const extCenterline = destPointNm(dest.lat, dest.lon, reciprocal, 10.5);

    const apprGroup = L.layerGroup();
    const conePoly = L.polygon([tip, leftWing, centerNotch, rightWing], {
        color: '#38bdf8', weight: 1.8, fillColor: '#38bdf8', fillOpacity: 0.22
    });
    const centerLine = L.polyline([tip, extCenterline], {
        color: '#38bdf8', weight: 1.5, dashArray: '4, 4'
    });

    const procLabel = matchedIls
        ? `ILS RWY ${matchedIls.rwy} (${matchedIls.ident} - ${matchedIls.freq} MHz)`
        : (dest.proc_name || `RNAV / FINAL RWY ${destRwy || 'ARR'}`);

    conePoly.bindPopup(
        `<div style="font-weight:700;font-size:12.5px;color:#38bdf8;">🛬 ${procLabel}</div>` +
        `<div style="font-size:11px;color:#f8fafc;font-family:monospace;margin-top:3px;">FINAL CRS: ${Math.round(finalCourse)}° | GS: ${matchedIls ? matchedIls.gs_alt : '3.0° VNAV'}</div>`
    );

    apprGroup.addLayer(centerLine);
    apprGroup.addLayer(conePoly);
    apprGroup.addTo(map);
    approachFeatherLayer = apprGroup;
}

function applyClimbDescentProfile(waypoints, cruiseAlt) {
    const lastIdx = waypoints.length - 1;
    if (!waypoints || waypoints.length < 2) return waypoints;
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
            const cumDist = [0];
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

    if (flightPlan && flightPlan.length >= 2) {
        flightPlan = enrichProceduresProfile(flightPlan);
    }

    const coords = [];
    const altitutes = [];
    let detectedSid = "---", detectedStar = "---", detectedAppr = "---";

    const maxCruiseAlt = (flightPlan && flightPlan.length > 0)
        ? Math.max(...flightPlan.map(w => Number(w.alt_ft) || 0))
        : 10000;

    flightPlan.forEach((wp, index) => {
        const apt = findAirport(wp.ident);
        const isEndpoint = (index === 0 || index === flightPlan.length - 1 || wp.type === 'DEP' || wp.type === 'DEST' || wp.type === 'APT');
        const rawMetar = wp.metar || (apt ? apt.metar : '');
        const wx = isEndpoint ? parseMetarInfo(rawMetar) : null;
        const altVal = Number(wp.alt_ft) || 0;
        altitutes.push(altVal > 0 ? altVal : 5000);

        if (wp.proc_type === 'SID' && wp.proc_name && index > 0 && detectedSid === "---") detectedSid = wp.proc_name;
        if (wp.proc_type === 'STAR' && wp.proc_name && detectedStar === "---") detectedStar = wp.proc_name;
        if (index === flightPlan.length - 1) {
            const rwyStr = wp.rwy || (apt && apt.rwy ? apt.rwy : '');
            detectedAppr = wp.proc_name || (rwyStr ? `RWY ${rwyStr}` : 'VISUAL / VNAV');
        }

        let legDistNm = "0.0";
        if (index > 0 && flightPlan[index - 1].lat !== null && wp.lat !== null) {
            const prevLatLng = L.latLng(flightPlan[index - 1].lat, flightPlan[index - 1].lon);
            const currLatLng = L.latLng(wp.lat, wp.lon);
            legDistNm = (prevLatLng.distanceTo(currLatLng) / 1852).toFixed(1);
        }

        const procColor = wp.proc_type === 'SID' ? '#34d399'
                        : wp.proc_type === 'STAR' ? '#fbbf24'
                        : wp.proc_type === 'APPR' ? '#38bdf8' : '#e879f9';

        // Calcolo e formattazione vincoli procedurali IFR
        const isProcWp = (wp.proc_type === 'SID' || wp.proc_type === 'STAR' || wp.proc_type === 'APPR');
        const hasExplicitConstraint = Boolean(wp.alt_restriction || wp.speed_restriction || (isProcWp && wp.alt_ft && wp.alt_ft < maxCruiseAlt));

        let altStr = "", spdStr = "";
        if (hasExplicitConstraint && typeof formatIfrConstraints === 'function') {
            const res = formatIfrConstraints(wp.alt_restriction_type || "+", wp.alt_restriction || wp.alt_ft, wp.speed_restriction || wp.speed_limit);
            altStr = res.altStr;
            spdStr = res.spdStr;
        }

        if (wp.lat !== undefined && wp.lat !== null && wp.lon !== undefined && wp.lon !== null) {
            coords.push([wp.lat, wp.lon]);

            const marker = L.circleMarker([wp.lat, wp.lon], {
                radius: isEndpoint ? 5.8 : 4.8,
                color: showSidStar ? procColor : '#38bdf8',
                fillColor: isEndpoint ? '#34d399' : (showSidStar ? procColor : '#0284c7'),
                fillOpacity: 0.92,
                weight: 1.8
            }).addTo(map);

            let popupHtml =
                '<div style="font-weight:700;font-size:13px;color:' + procColor + ';">' + wp.ident +
                (wp.proc_name ? ' <span style="font-size:10px;opacity:0.85;">[' + wp.proc_name + ']</span>' : '') + '</div>' +
                '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Altitudine: <span style="color:#e879f9;cursor:pointer;text-decoration:underline;font-weight:600;" onclick="editWaypointAlt(' + index + ', ' + altVal + ')">' + altVal + ' ft ✏️</span></div>';

            if (wx) {
                popupHtml +=
                    '<div style="font-size:13px;font-weight:600;color:#34d399;font-family:monospace;border-top:1px solid rgba(148,163,184,0.2);padding-top:4px;margin-top:4px;">' +
                    '💨 ' + wx.wind + ' &nbsp;|&nbsp; 🌡️ ' + wx.temp + ' &nbsp;|&nbsp; 📊 ' + wx.qnh + '</div>';
            }

            marker.bindPopup(popupHtml);

            // Badge vincolo IFR georeferenziato in mappa Leaflet (+50% dimensioni e auto-fit)
            if (!isEndpoint && (altStr || spdStr)) {
                let badgeParts = [];
                if (altStr) badgeParts.push(`<span style="color:#38bdf8;">${altStr}</span>`);
                if (spdStr) badgeParts.push(`<span style="color:#fbbf24;">${spdStr}</span>`);

                const constraintTag = L.marker([wp.lat, wp.lon], {
                    icon: L.divIcon({
                        className: '',
                        iconSize: null,
                        html: `<div style="display:inline-block;width:max-content;background:rgba(15,23,42,0.95);border:1.8px solid #0284c7;border-radius:5px;padding:3px 8px;font-size:13.5px;font-weight:700;font-family:Consolas,monospace;white-space:nowrap;margin-top:10px;margin-left:10px;box-shadow:0 3px 10px rgba(0,0,0,0.7), 0 0 8px rgba(2,132,199,0.35);pointer-events:none;line-height:1.2;">${badgeParts.join(' ')}</div>`,
                        iconAnchor: [0, 0]
                    })
                }).addTo(map);
                waypointMarkers.push(constraintTag);
            }

            if (!isEndpoint && typeof startRouteRubberBand === 'function') {
                marker.on('mousedown', (ev) => {
                    if (ev.originalEvent && ev.originalEvent.button === 0) {
                        startRouteRubberBand('move', index, ev.latlng, ev.originalEvent);
                    }
                });
            }
            waypointMarkers.push(marker);
        }

        const isHoldActive = (typeof IFR_PROC !== 'undefined' && IFR_PROC.holdingLayers && IFR_PROC.holdingLayers.has(wp.ident));
        const holdBtnStyle = isHoldActive
            ? 'background:rgba(217,70,239,0.3); border:1px solid #d946ef; color:#fdf4ff; box-shadow:0 0 6px rgba(217,70,239,0.45);'
            : 'background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#7dd3fc;';

        const holdBtnHtml = !isEndpoint
            ? `<button id="btnHold_${index}" class="btn" style="padding:1px 5px; font-size:9px; font-weight:700; ${holdBtnStyle}" title="${isHoldActive ? 'Rimuovi holding' : 'Attiva circuito di attesa (Holding)'}" onclick="event.stopPropagation(); toggleWaypointHolding('${wp.ident}', ${index})">🔄 HOLD</button>`
            : '';

        const deleteBtnHtml = !isEndpoint
            ? `<button class="btn btn-danger" style="padding:1px 5px; font-size:10px;" title="Rimuovi dalla rotta" onclick="event.stopPropagation(); removeWaypointFromRoute(${index})">✕</button>`
            : '';

        const rwyLabel = wp.rwy ? ('RWY ' + wp.rwy) : (apt && apt.rwy ? ('RWY ' + apt.rwy) : (wp.type || 'WPT'));
        const constraintBadgeSidebar = (altStr || spdStr)
            ? `<div style="display:flex;gap:3px;margin-top:1px;"><span style="font-size:9px;font-family:Consolas,monospace;font-weight:700;color:#38bdf8;">${altStr}</span>${spdStr ? `<span style="font-size:9px;font-family:Consolas,monospace;font-weight:700;color:#fbbf24;">${spdStr}</span>` : ''}</div>`
            : '';

        const div = document.createElement('div');
        div.className = 'wpt-card' + (isEndpoint ? ' apt-endpoint' : '');
        div.setAttribute('data-wpt-index', index);
        if (wp.lat !== null && wp.lon !== null) {
            div.onclick = () => {
                setFollowState(false);
                map.flyTo([wp.lat, wp.lon], 10);
            };
        }

        let procBadgeHtml = '';
        if (!isEndpoint && wp.proc_type && (wp.proc_type === 'SID' || wp.proc_type === 'STAR' || wp.proc_type === 'APPR')) {
            const badgeBg = wp.proc_type === 'SID' ? 'rgba(52,211,153,0.18)' : (wp.proc_type === 'STAR' ? 'rgba(251,191,36,0.18)' : 'rgba(56,189,248,0.18)');
            const badgeCol = wp.proc_type === 'SID' ? 'var(--emerald)' : (wp.proc_type === 'STAR' ? 'var(--amber)' : 'var(--cyan)');
            const badgeLabel = wp.proc_name && wp.proc_name !== wp.proc_type ? `${wp.proc_type}: ${wp.proc_name}` : wp.proc_type;
            procBadgeHtml = `<span style="font-size:9px;background:${badgeBg};color:${badgeCol};padding:1px 5px;border-radius:3px;font-weight:700;">${badgeLabel}</span>`;
        } else if (!isEndpoint && wp.proc_name && wp.proc_name !== 'ENR') {
            procBadgeHtml = `<span style="font-size:9px;background:rgba(232,121,249,0.15);color:var(--purple);padding:1px 5px;border-radius:3px;font-weight:700;">${wp.proc_name}</span>`;
        }

        const wxBadgesHtml = wx
            ? `<div class="wpt-wx-row" title="METAR: ${wx.raw}"><span class="wx-pill">💨 ${wx.wind}</span><span class="wx-pill">🌡️ ${wx.temp}</span><span class="wx-pill">📊 ${wx.qnh}</span></div>`
            : '';

        div.innerHTML =
            '<div style="min-width: 0; flex: 1; padding-right: 8px;">' +
                '<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">' +
                    '<span class="wpt-icao">' + wp.ident + '</span>' +
                    (index === 0 ? '<span style="font-size:9px;background:rgba(56,189,248,0.18);color:var(--cyan);padding:1px 5px;border-radius:3px;font-weight:700;">DEP</span>' : '') +
                    (index === flightPlan.length - 1 && flightPlan.length > 1 ? '<span style="font-size:9px;background:rgba(52,211,153,0.18);color:var(--emerald);padding:1px 5px;border-radius:3px;font-weight:700;">ARR</span>' : '') +
                    procBadgeHtml +
                '</div>' +
                '<div class="wpt-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (wp.name || (apt ? apt.name : 'Waypoint Navlog')) + '</div>' +
                wxBadgesHtml +
            '</div>' +
            '<div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0;">' +
                '<span class="wpt-alt" onclick="event.stopPropagation(); editWaypointAlt(' + index + ', ' + altVal + ')">' + altVal + ' ft</span>' +
                constraintBadgeSidebar +
                '<span class="wpt-dist" id="wptDist_' + index + '">' + (index === 0 ? '0.0 NM' : `+${legDistNm} NM`) + '</span>' +
                '<span style="font-size:10px;color:var(--text-muted);">' + rwyLabel + '</span>' +
                '<div style="display:flex; gap:4px; align-items:center; margin-top:2px;">' +
                    holdBtnHtml +
                    deleteBtnHtml +
                '</div>' +
            '</div>';
        container.appendChild(div);
    });

    const sumSidEl = document.getElementById('sumSid');
    const sumStarEl = document.getElementById('sumStar');
    const sumApprEl = document.getElementById('sumAppr');
    if (sumSidEl) sumSidEl.innerText = detectedSid;
    if (sumStarEl) sumStarEl.innerText = detectedStar;
    if (sumApprEl) sumApprEl.innerText = detectedAppr;

    if (coords.length > 1) {
        routeLine = L.polyline(coords, {
            color: '#e879f9',
            weight: showSidStar ? 1.5 : 2.5,
            opacity: showSidStar ? 0.35 : 0.95,
            dashArray: '6, 4'
        }).addTo(map);

        for (let i = 0; i < flightPlan.length - 1; i++) {
            const p1 = flightPlan[i], p2 = flightPlan[i + 1];
            if (p1.lat === null || p2.lat === null) continue;

            let segType = p2.proc_type || 'ENR';
            if (i === flightPlan.length - 2) segType = 'APPR';

            const isVectorsLeg = (p2.ident === 'VECTORS' || p2.proc_name?.includes('VECTORS') || p2.proc_type === 'VECTORS');

            // Verifica se la tratta appartiene a un arco DME rispetto a un VOR
            let dmeArcPoints = null;
            let dmeArcVor = null;
            let dmeArcRadius = 0;

            if (typeof vorsData !== 'undefined' && Array.isArray(vorsData) && (p1.ident.startsWith('D') || p2.ident.startsWith('D') || p2.proc_name?.includes('DME') || p2.proc_name?.includes('ARC'))) {
                for (const vor of vorsData) {
                    if (!vor.lat || !vor.lon) continue;
                    const d1 = calculateDistanceNm(vor.lat, vor.lon, p1.lat, p1.lon);
                    const d2 = calculateDistanceNm(vor.lat, vor.lon, p2.lat, p2.lon);
                    if (d1 >= 4.0 && d1 <= 30.0 && Math.abs(d1 - d2) <= 0.65) {
                        dmeArcRadius = Math.round((d1 + d2) / 2 * 10) / 10;
                        const r1 = calculateBearing(vor.lat, vor.lon, p1.lat, p1.lon);
                        const r2 = calculateBearing(vor.lat, vor.lon, p2.lat, p2.lon);
                        let diff = (r2 - r1 + 360) % 360;
                        const clockwise = (diff <= 180);
                        if (typeof IFR_PROC !== 'undefined') {
                            dmeArcPoints = IFR_PROC.generateDmeArcPoints(vor.lat, vor.lon, dmeArcRadius, r1, r2, clockwise);
                            dmeArcVor = vor.ident;
                        }
                        break;
                    }
                }
            }

            let segCoords = [[p1.lat, p1.lon], [p2.lat, p2.lon]];
            let segColor = !showSidStar ? '#e879f9'
                         : segType === 'SID' ? '#34d399'
                         : segType === 'STAR' ? '#fbbf24'
                         : segType === 'APPR' ? '#38bdf8' : '#e879f9';
            let segDash = (showSidStar && (segType === 'SID' || segType === 'STAR')) ? '5, 5' : null;
            let segWeight = 3.2;

            if (isVectorsLeg) {
                segColor = '#f59e0b';
                segDash = '6, 8';
                segWeight = 2.6;
            } else if (dmeArcPoints && dmeArcPoints.length > 2) {
                segCoords = dmeArcPoints;
                segColor = '#38bdf8';
                segDash = '4, 4';
                segWeight = 3.0;
            }

            const segLine = L.polyline(segCoords, {
                color: segColor, weight: segWeight, opacity: 0.92, dashArray: segDash
            }).addTo(map);

            if (isVectorsLeg) {
                const mid = [(p1.lat + p2.lat) / 2, (p1.lon + p2.lon) / 2];
                const vTag = L.marker(mid, {
                    icon: L.divIcon({
                        className: 'ifr-vector-badge',
                        html: `<div style="background:rgba(15,23,42,0.92);border:1px solid #f59e0b;color:#fbbf24;font-size:9.5px;font-family:Consolas,monospace;padding:1px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.6);">📡 ATC VECTORS</div>`,
                        iconAnchor: [38, 8]
                    })
                }).addTo(map);
                routeSegmentLines.push(vTag);
            } else if (dmeArcPoints && dmeArcVor) {
                const midArc = dmeArcPoints[Math.floor(dmeArcPoints.length / 2)];
                const arcTag = L.marker(midArc, {
                    icon: L.divIcon({
                        className: 'ifr-arc-badge',
                        html: `<div style="background:rgba(15,23,42,0.92);border:1px solid #38bdf8;color:#38bdf8;font-size:9.5px;font-family:Consolas,monospace;padding:1px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.6);">⌒ ARC ${dmeArcRadius} DME ${dmeArcVor}</div>`,
                        iconAnchor: [45, 8]
                    })
                }).addTo(map);
                routeSegmentLines.push(arcTag);
            }

            const hitLine = L.polyline(segCoords, {
                color: '#000', weight: 16, opacity: 0.01
            }).addTo(map);

            const segLabel = p2.proc_name || segType;
            hitLine.bindTooltip(`${p1.ident} ➔ ${p2.ident} (${segLabel}) • Trascina per aggiungere WP`, { sticky: true, className: 'vnav-route-tooltip' });

            hitLine.on('mousedown', (ev) => {
                if (ev.originalEvent && ev.originalEvent.button === 0 && typeof startRouteRubberBand === 'function') {
                    startRouteRubberBand('insert', i, ev.latlng, ev.originalEvent);
                }
            });

            routeSegmentLines.push(segLine, hitLine);
        }

        drawApproachFeather(flightPlan);

        if (fitMap) {
            setFollowState(0);
            const vw = window.innerWidth || 1280;
            const vh = window.innerHeight || 720;
            const offX = Math.round(vw * 0.35);
            const offY = Math.round(vh * 0.35);

            const sidebarEl = document.getElementById('sidebarPanel');
            const leftUi = (sidebarOpen && sidebarEl) ? (sidebarEl.offsetWidth + 28) : 28;
            const rightUi = 28, topUi = 64, bottomUi = drawerOpen ? 142 : 52;

            const freeW = Math.max(200, vw - leftUi - rightUi);
            const freeH = Math.max(200, vh - topUi - bottomUi);
            const marginX = Math.round(freeW * 0.08);
            const marginY = Math.round(freeH * 0.08);

            map.fitBounds(routeLine.getBounds(), {
                paddingTopLeft: [offX + leftUi + marginX, offY + topUi + marginY],
                paddingBottomRight: [offX + rightUi + marginX, offY + bottomUi + marginY],
                maxZoom: 12
            });
        }
    }

    if (currentAlternate && coords.length > 0 && currentAlternate.lat !== undefined) {
        const lastDestCoords = coords[coords.length - 1];
        const altCoords = [lastDestCoords, [currentAlternate.lat, currentAlternate.lon]];
        alternateLine = L.polyline(altCoords, { color: '#38bdf8', weight: 1, dashArray: '4, 4' }).addTo(map);
        alternateMarker = L.circleMarker([currentAlternate.lat, currentAlternate.lon], {
            radius: 4, color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.6, weight: 1
        }).addTo(map);
        alternateMarker.bindPopup('<div style="font-weight:700;font-size:13px;color:#38bdf8;">Alternato: ' + currentAlternate.ident + '</div>');
    }

    renderVnavChart(altitutes);
    renderUserWaypointsUI();
    updateUndoButtonUI();

    if (!window._skipRemoteSave && window.pywebview && window.pywebview.api && window.pywebview.api.save_active_flight_plan) {
        window.pywebview.api.save_active_flight_plan(flightPlan, currentAlternate).then(res => {
            if (res && res.fpl_ts) window._lastFplTs = res.fpl_ts;
        }).catch(() => {});
    }
}

function removeWaypointFromRoute(index) {
    if (!flightPlan || index <= 0 || index >= flightPlan.length - 1) return;
    pushFlightPlanUndoState();
    flightPlan.splice(index, 1);

    const maxCruise = Math.max(...flightPlan.map(w => Number(w.alt_ft) || 0));
    flightPlan = applyClimbDescentProfile(flightPlan, maxCruise);
    updateFlightPlanUI(currentAlternate, false);
}

async function editWaypointAlt(index, currentAlt) {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const msg = isEn
        ? "Enter target altitude in feet (ft) for this waypoint:"
        : "Inserisci la quota target in piedi (ft) per questo waypoint:";
    const title = isEn ? "✈️ WAYPOINT ALTITUDE" : "✈️ QUOTA WAYPOINT";
    const newAlt = (typeof window.showAeroPrompt === 'function')
        ? await window.showAeroPrompt(msg, currentAlt, title)
        : prompt(msg, currentAlt);
    if (newAlt !== null && String(newAlt).trim() !== '' && !isNaN(newAlt)) {
        pushFlightPlanUndoState();
        flightPlan[index].alt_ft = parseInt(newAlt, 10);
        updateFlightPlanUI(undefined, false);
        try {
            if (window.pywebview && window.pywebview.api) {
                await window.pywebview.api.update_waypoint_altitude(index, newAlt);
            }
        } catch (e) {}
    }
}

// --- AIRWAY AUTO-ROUTING (SQLITE & PYTHON IPC) ---
function onAutoRouteTypeChange(typeVal) {
    const altInput = document.getElementById('manualCruiseAlt');
    if (!altInput) return;
    if (typeVal === 'IFR_HIGH') altInput.value = '28000';
    else if (typeVal === 'IFR_LOW') altInput.value = '12000';
    else if (typeVal === 'VFR') altInput.value = '5500';
}

async function generateAutoAirwayRoute() {
    const depInp = document.getElementById('manualDep');
    const destInp = document.getElementById('manualDest');
    const wptsInp = document.getElementById('manualWpts');
    const typeInp = document.getElementById('autoRouteType');
    const altInp = document.getElementById('manualCruiseAlt');

    const depCode = (depInp?.value || '').trim().toUpperCase();
    const destCode = (destInp?.value || '').trim().toUpperCase();
    const routeType = typeInp?.value || 'IFR_LOW';
    const cruiseAlt = parseInt(altInp?.value || '12000', 10) || 12000;

    const isEnRoute = (typeof currentLang !== 'undefined' && currentLang === 'en');
    if (!depCode || !destCode) {
        const msg = isEnRoute
            ? "Please enter both Departure and Destination airports first."
            : "Inserisci prima l'aeroporto di Partenza e di Arrivo.";
        if (typeof window.showAeroAlert === 'function') window.showAeroAlert(msg);
        else alert(msg);
        return;
    }

    if (wptsInp) {
        wptsInp.placeholder = isEnRoute
            ? "⏳ Calculating airway route on SQLite..."
            : "⏳ Calcolo rotta su aerovie SQLite...";
    }

    // Risoluzione coordinate direttamente dal client
    let depLat = null, depLon = null, destLat = null, destLon = null;
    const depRes = await resolveKnownOrOnlineCoords(depCode);
    if (depRes && depRes.lat !== null) {
        depLat = depRes.lat;
        depLon = depRes.lon;
    }
    const destRes = await resolveKnownOrOnlineCoords(destCode);
    if (destRes && destRes.lat !== null) {
        destLat = destRes.lat;
        destLon = destRes.lon;
    }

    if (window.pywebview && window.pywebview.api && window.pywebview.api.calculate_auto_route) {
        try {
            const res = await window.pywebview.api.calculate_auto_route(
                depCode, destCode, cruiseAlt, routeType,
                depLat, depLon, destLat, destLon
            );
            if (res && res.success && Array.isArray(res.waypoints) && res.waypoints.length > 0) {
                // Inserisce i fix calcolati nella casella di testo
                const idents = res.waypoints.map(w => w.ident).join(' ');
                if (wptsInp) {
                    wptsInp.value = idents;
                    wptsInp.style.borderColor = '#00d2ff';
                    wptsInp.style.color = '#38bdf8';
                }

                const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
                showAeroNavToast(
                    isEn
                        ? `⚡ Auto-Route: <b>${res.waypoints.length} fixes</b> via ${routeType.replace('_', ' ')}`
                        : `⚡ Rotta generata: <b>${res.waypoints.length} punti</b> via ${routeType.replace('_', ' ')}`,
                    false,
                    3000
                );
                return;
            } else if (res && !res.success) {
                const msg = `Auto-Route: ${res.error || (isEnRoute ? 'No route found' : 'Nessun percorso trovato')}`;
                if (typeof window.showAeroAlert === 'function') window.showAeroAlert(msg);
                else alert(msg);
            }
        } catch (err) {
            console.error("[AutoRoute] Errore chiamata IPC:", err);
        }
    }
}

// --- CREAZIONE MANUALE, EXPORT ED ELIMINAZIONE PIANO DI VOLO ---
function openCreateFplModal() { document.getElementById('createFplModal').style.display = 'flex'; }
function closeCreateFplModal() { document.getElementById('createFplModal').style.display = 'none'; }

async function exportCurrentFlightPlan() {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    if (!flightPlan || flightPlan.length < 2) {
        const msg = isEn
            ? "No active flight plan to export."
            : "Nessun piano di volo attivo da esportare.";
        if (typeof window.showAeroAlert === 'function') window.showAeroAlert(msg);
        else alert(msg);
        return;
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.export_pln_file) {
        const res = await window.pywebview.api.export_pln_file(flightPlan);
        if (res && res.success) {
            const msg = isEn
                ? `Flight plan saved to Downloads:\n${res.path}`
                : `Piano di volo salvato in Download:\n${res.path}`;
            const title = isEn ? "💾 EXPORT .PLN" : "💾 ESPORTAZIONE .PLN";
            if (typeof window.showAeroAlert === 'function') window.showAeroAlert(msg, title);
            else alert(msg);
        } else {
            const msg = (isEn ? "PLN export error: " : "Errore export PLN: ") + (res?.error || (isEn ? "Unknown" : "Sconosciuto"));
            if (typeof window.showAeroAlert === 'function') window.showAeroAlert(msg);
            else alert(msg);
        }
    }
}

async function resolveKnownOrOnlineCoords(ident) {
    let res = resolveKnownCoords(ident);
    if (res && res.lat !== null && res.lon !== null) return res;

    if (window.pywebview && window.pywebview.api && window.pywebview.api.resolve_icao) {
        try {
            const apiRes = await window.pywebview.api.resolve_icao(ident);
            if (apiRes && apiRes.success && apiRes.lat !== null && apiRes.lon !== null) {
                if (apiRes.is_airport && !findAirport(ident)) {
                    airportsData.push({
                        icao: ident, name: apiRes.name || ident,
                        lat: apiRes.lat, lon: apiRes.lon,
                        elev: apiRes.elev || 0, rwy: "", metar: apiRes.metar || ""
                    });
                }
                return {
                    lat: apiRes.lat, lon: apiRes.lon,
                    name: apiRes.name || ident, elev: apiRes.elev || 0,
                    metar: apiRes.metar || ""
                };
            }
        } catch (e) {}
    }
    return null;
}

async function buildAndExportManualFlightPlan(doExport = true) {
    const depInput = document.getElementById('manualDep').value.trim().toUpperCase();
    const wptsInput = document.getElementById('manualWpts').value.trim().toUpperCase();
    const destInput = document.getElementById('manualDest').value.trim().toUpperCase();
    const cruiseAlt = parseInt(document.getElementById('manualCruiseAlt').value, 10) || 12000;

    const isEnManual = (typeof currentLang !== 'undefined' && currentLang === 'en');
    if (!depInput || !destInput) {
        const msg = isEnManual
            ? "Enter at least Departure and Destination airports."
            : "Inserisci almeno l'aeroporto di partenza e di arrivo.";
        if (typeof window.showAeroAlert === 'function') window.showAeroAlert(msg);
        else alert(msg);
        return;
    }

    let generatedPlan = [];
    const depRes = await resolveKnownOrOnlineCoords(depInput);
    const depApt = findAirport(depInput);
    generatedPlan.push({
        ident: depInput,
        name: depRes ? depRes.name : "Aeroporto di Partenza",
        lat: depRes ? depRes.lat : null,
        lon: depRes ? depRes.lon : null,
        alt_ft: depApt ? (depApt.elev || 0) : (depRes?.elev || 0),
        type: "DEP",
        metar: depRes ? depRes.metar : ""
    });

    if (wptsInput) {
        const tokens = wptsInput.split(/[\s,]+/).filter(Boolean);
        for (const token of tokens) {
            const wptRes = await resolveKnownOrOnlineCoords(token);
            const userWp = userWaypoints.find(w => w.ident === token);
            generatedPlan.push({
                ident: token,
                name: wptRes ? wptRes.name : "Waypoint Rotta",
                lat: wptRes ? wptRes.lat : null,
                lon: wptRes ? wptRes.lon : null,
                alt_ft: userWp ? userWp.alt_ft : cruiseAlt,
                type: "WPT"
            });
        }
    }

    const destRes = await resolveKnownOrOnlineCoords(destInput);
    const destApt = findAirport(destInput);
    generatedPlan.push({
        ident: destInput,
        name: destRes ? destRes.name : "Aeroporto di Arrivo",
        lat: destRes ? destRes.lat : null,
        lon: destRes ? destRes.lon : null,
        alt_ft: destApt ? (destApt.elev || 0) : (destRes?.elev || 0),
        type: "DEST",
        metar: destRes ? destRes.metar : ""
    });

    if (generatedPlan[0].lat === null || generatedPlan[generatedPlan.length - 1].lat === null) {
        const msg = isEnManual
            ? "Coordinates not found for the entered Departure or Destination airport."
            : "Coordinate non trovate per l'aeroporto di partenza o di arrivo inserito.";
        if (typeof window.showAeroAlert === 'function') window.showAeroAlert(msg);
        else alert(msg);
        return;
    }

    flightPlan = applyClimbDescentProfile(generatedPlan, cruiseAlt);
    currentAlternate = null;
    closeCreateFplModal();
    updateFlightPlanUI(null, true);

    if (doExport) await exportCurrentFlightPlan();
}

async function clearFlightPlanUI() {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const msg = isEn
        ? "Are you sure you want to delete the current flight plan and clear the map?"
        : "Sei sicuro di voler eliminare il piano di volo corrente e ripulire la mappa?";
    const title = isEn ? "🗑️ CLEAR FLIGHT PLAN" : "🗑️ ELIMINA PIANO DI VOLO";
    const confirmed = (typeof window.showAeroConfirm === 'function')
        ? await window.showAeroConfirm(msg, title, true)
        : confirm(msg);
    if (confirmed) {
        flightPlan = [];
        currentAlternate = null;
        clearMapRoutes();
        if (typeof IFR_PROC !== 'undefined') IFR_PROC.clearAll(map);
        document.getElementById('fplContainer').innerHTML = '';
        document.getElementById('vnavPath').setAttribute('d', 'M0,50 L1000,50 Z');

        const tp = document.getElementById('terrainPath');
        if (tp) tp.setAttribute('d', 'M0,50 L1000,50 Z');

        document.getElementById('vnavText').textContent = translations[currentLang].noFpl.toUpperCase();
        updateHoverSync(null);
        renderUserWaypointsUI();
        if (typeof updateTopOfDescentOverlay === 'function') updateTopOfDescentOverlay();
        if (window.pywebview && window.pywebview.api && window.pywebview.api.clear_flight_plan) {
            await window.pywebview.api.clear_flight_plan();
        }
    }
}

// --- PARSING E IMPORTAZIONE FILE .PLN XML ---
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

    const desMap = { "LEFT": "L", "RIGHT": "R", "CENTER": "C" };
    const extractBlockRwy = (parentNode) => {
        if (!parentNode) return "";
        const num = parentNode.getElementsByTagName("RunwayNumberFP")[0]?.textContent?.trim() || "";
        const des = parentNode.getElementsByTagName("RunwayDesignatorFP")[0]?.textContent?.trim() || "";
        if (!num) return "";
        return num.padStart(2, '0') + (desMap[des.toUpperCase()] || "");
    };

    const depDetailsNode = xmlDoc.getElementsByTagName("DepartureDetails")[0] || null;
    const arrDetailsNode = xmlDoc.getElementsByTagName("ArrivalDetails")[0] || null;
    const apprDetailsNode = xmlDoc.getElementsByTagName("ApproachDetails")[0] || null;

    const globalDepRwy = extractBlockRwy(depDetailsNode);
    const globalSidName = depDetailsNode?.getElementsByTagName("DepartureFP")[0]?.textContent?.trim() || "";
    const globalStarName = arrDetailsNode?.getElementsByTagName("ArrivalFP")[0]?.textContent?.trim() || "";
    const globalArrRwy = extractBlockRwy(apprDetailsNode) || extractBlockRwy(arrDetailsNode);
    const globalApprType = apprDetailsNode?.getElementsByTagName("ApproachTypeFP")[0]?.textContent?.trim() || "";

    const parsedWaypoints = [];
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
            rwy: globalDepRwy,
            proc_type: "SID",
            proc_name: globalSidName || (globalDepRwy ? `RWY ${globalDepRwy}` : "DEP"),
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
        if (identNodes.length > 0 && identNodes[0].textContent) code = identNodes[0].textContent.trim();
        else if (wp.getAttribute("id")) code = wp.getAttribute("id").trim();
        if (!code || code === "TIMECRUIS" || code === "TIMEDSCNT" || code === "TIMECLIMB") return;

        let wpLat = null, wpLon = null, wpName = "Waypoint Navlog";
        const worldPtNodes = wp.getElementsByTagName("WorldPoint");
        if (worldPtNodes.length > 0 && worldPtNodes[0].textContent) {
            const p = worldPtNodes[0].textContent.split(",");
            if (p.length >= 2) { wpLat = parseFloat(p[0]); wpLon = parseFloat(p[1]); }
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
                if (wpLat === null || isNaN(wpLat)) { wpLat = dms.lat; wpLon = dms.lon; }
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

        let procType = "ENR", procName = "";
        const depFp = wp.getElementsByTagName("DepartureFP")[0]?.textContent?.trim();
        const arrFp = wp.getElementsByTagName("ArrivalFP")[0]?.textContent?.trim();
        const apprFp = wp.getElementsByTagName("ApproachTypeFP")[0]?.textContent?.trim();
        const airwayFp = wp.getElementsByTagName("Airway")[0]?.textContent?.trim();
        const rwyNumFp = wp.getElementsByTagName("RunwayNumberFP")[0]?.textContent?.trim();
        const rwyDesFp = wp.getElementsByTagName("RunwayDesignatorFP")[0]?.textContent?.trim();

        // Estrazione vincoli di quota e velocità nativi MSFS 2024 / Navblue
        const altRestNode = wp.getElementsByTagName("AltitudeRestrictionFP")[0]?.textContent?.trim();
        const altRestTypeNode = wp.getElementsByTagName("AltitudeRestrictionTypeFP")[0]?.textContent?.trim() || "";
        const speedNode = wp.getElementsByTagName("SpeedFP")[0]?.textContent?.trim();
        
        let altRestriction = altRestNode ? parseInt(altRestNode, 10) : null;
        let speedRestriction = speedNode ? parseInt(speedNode, 10) : null;
        let altRestType = "+";
        if (altRestTypeNode.includes("BELOW") || altRestTypeNode === "-") altRestType = "-";
        else if (altRestTypeNode.includes("AT") || altRestTypeNode === "=") altRestType = "at";
        else if (altRestTypeNode.includes("BETWEEN")) altRestType = "B";

        let wpRwy = "";
        if (rwyNumFp) {
            const desMap = { "LEFT": "L", "RIGHT": "R", "CENTER": "C" };
            wpRwy = rwyNumFp + (desMap[(rwyDesFp || "").toUpperCase()] || "");
        }

        if (depFp) { procType = "SID"; procName = depFp; }
        else if (apprFp) { procType = "APPR"; procName = wpRwy ? `${apprFp} RWY ${wpRwy}` : apprFp; }
        else if (arrFp) { procType = "STAR"; procName = arrFp; }
        else if (airwayFp) { procType = "ENR"; procName = airwayFp; }

        if (parsedWaypoints.length === 0 || parsedWaypoints[parsedWaypoints.length - 1].ident !== code) {
            parsedWaypoints.push({
                ident: code, name: wpName, lat: wpLat, lon: wpLon,
                alt_ft: altFt, type: "WPT", rwy: wpRwy,
                proc_type: procType, proc_name: procName || procType,
                alt_restriction: altRestriction,
                alt_restriction_type: altRestType,
                speed_restriction: speedRestriction
            });
        } else if (parsedWaypoints.length === 1 && parsedWaypoints[0].ident === code && parsedWaypoints[0].lat === null) {
            parsedWaypoints[0].lat = wpLat;
            parsedWaypoints[0].lon = wpLon;
        }
    });

    if (parsedWaypoints.length >= 2) {
        if (globalSidName && parsedWaypoints[1].proc_type === "ENR") {
            parsedWaypoints[1].proc_type = "SID";
            parsedWaypoints[1].proc_name = globalSidName;
        }
        if (globalStarName) {
            const lastWpt = parsedWaypoints[parsedWaypoints.length - 1];
            if (lastWpt.type === "WPT") {
                lastWpt.proc_type = "STAR";
                lastWpt.proc_name = globalStarName;
            }
        }
    }

    const destNodes = xmlDoc.getElementsByTagName("DestinationID");
    if (destNodes.length > 0 && destNodes[0].textContent) {
        const destCode = destNodes[0].textContent.trim();
        const resolved = resolveKnownCoords(destCode);
        const apt = findAirport(destCode);
        const apprLabel = globalApprType
            ? (globalArrRwy ? `${globalApprType} RWY ${globalArrRwy}` : globalApprType)
            : (globalArrRwy ? `APPR RWY ${globalArrRwy}` : "APPR");

        if (parsedWaypoints.length === 0 || parsedWaypoints[parsedWaypoints.length - 1].ident !== destCode) {
            parsedWaypoints.push({
                ident: destCode,
                name: resolved ? resolved.name : "Aeroporto di Arrivo",
                lat: resolved ? resolved.lat : null,
                lon: resolved ? resolved.lon : null,
                alt_ft: apt ? (apt.elev || 0) : 0,
                type: "DEST",
                rwy: globalArrRwy,
                proc_type: "APPR",
                proc_name: apprLabel,
                metar: resolved ? resolved.metar : ""
            });
        } else {
            const lastDest = parsedWaypoints[parsedWaypoints.length - 1];
            lastDest.type = "DEST";
            lastDest.alt_ft = apt ? (apt.elev || 0) : 0;
            if (globalArrRwy) lastDest.rwy = globalArrRwy;
            lastDest.proc_type = "APPR";
            lastDest.proc_name = apprLabel;
            if (resolved) {
                lastDest.lat = resolved.lat;
                lastDest.lon = resolved.lon;
                lastDest.name = resolved.name;
                lastDest.metar = resolved.metar;
            }
        }
    }

    return parsedWaypoints;
}

async function processAndRenderPlnXml(xmlText) {
    let parsed = parsePlnXmlString(xmlText);
    if (!parsed || parsed.length === 0) {
        const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
        const msg = isEn
            ? "No waypoints found in the selected .pln file."
            : "Nessun waypoint trovato nel file .pln selezionato.";
        if (typeof window.showAeroAlert === 'function') window.showAeroAlert(msg);
        else alert(msg);
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

// --- INTEGRAZIONE SIMBRIEF, PROTEZIONE PILOT ID & RICERCA RAPIDA ---
let simbriefIdLocked = true;

function setSimbriefIdLocked(locked) {
    simbriefIdLocked = Boolean(locked);
    const input = document.getElementById('simbriefIdInput');
    const lockBtn = document.getElementById('btnLockSimbriefId');
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

    if (input) {
        input.readOnly = simbriefIdLocked;
        input.style.cursor = simbriefIdLocked ? 'not-allowed' : 'text';
        input.style.opacity = simbriefIdLocked ? '0.75' : '1';
        input.style.borderColor = simbriefIdLocked ? 'rgba(239, 68, 68, 0.45)' : 'rgba(16, 185, 129, 0.75)';
        if (!simbriefIdLocked) {
            input.focus();
            input.select();
        } else {
            input.blur();
        }
    }

    if (lockBtn) {
        if (simbriefIdLocked) {
            lockBtn.style.background = 'rgba(239, 68, 68, 0.22)';
            lockBtn.style.borderColor = '#ef4444';
            lockBtn.style.color = '#f87171';
            lockBtn.title = isEn
                ? 'Pilot ID locked (click key to unlock editing)'
                : 'Pilot ID protetto (clicca sulla chiave per sbloccare la digitazione)';
        } else {
            lockBtn.style.background = 'rgba(16, 185, 129, 0.24)';
            lockBtn.style.borderColor = '#10b981';
            lockBtn.style.color = '#34d399';
            lockBtn.title = isEn
                ? 'Editing unlocked (click key to save and lock)'
                : 'Digitazione abilitata (clicca sulla chiave per salvare e bloccare)';
        }
    }
}

async function toggleSimbriefIdLock() {
    const input = document.getElementById('simbriefIdInput');
    if (simbriefIdLocked) {
        setSimbriefIdLocked(false);
    } else {
        setSimbriefIdLocked(true);
        if (input) {
            await saveSimbriefId(input.value);
        }
    }
}

function ensureSimbriefLockUI() {
    const input = document.getElementById('simbriefIdInput');
    if (!input || !input.parentNode) return;

    // Recupero di sicurezza da localStorage se il campo è ancora vuoto
    if (!input.value) {
        try {
            const savedLocal = localStorage.getItem('aeroglass_simbrief_id');
            if (savedLocal) {
                input.value = savedLocal;
                setSimbriefCompactMode(true);
            }
        } catch (e) {}
    }

    if (!document.getElementById('btnLockSimbriefId')) {
        const btn = document.createElement('button');
        btn.id = 'btnLockSimbriefId';
        btn.type = 'button';
        btn.innerHTML = '🔑';
        btn.style.cssText = 'flex:0 0 auto; width:26px; height:26px; padding:0; margin-left:4px; border-radius:6px; border:1px solid #ef4444; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:12px; transition:all 0.2s ease;';
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSimbriefIdLock();
        };
        input.parentNode.insertBefore(btn, input.nextSibling);

        // Salvataggio automatico sia premendo Invio che uscendo dal campo
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveSimbriefId(input.value);
            }
        });
        input.addEventListener('change', () => saveSimbriefId(input.value));
        input.addEventListener('blur', () => {
            if (!simbriefIdLocked) saveSimbriefId(input.value);
        });
    }
    setSimbriefIdLocked(simbriefIdLocked);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(ensureSimbriefLockUI, 100));
} else {
    setTimeout(ensureSimbriefLockUI, 100);
}

function setSimbriefCompactMode(isCompact) {
    ensureSimbriefLockUI();
    const setupBox = document.getElementById('simbriefSetupBox');
    const compactBtn = document.getElementById('simbriefCompactBtn');
    const editIdBtn = document.getElementById('simbriefEditIdBtn');
    if (!setupBox || !compactBtn || !editIdBtn) return;
    if (isCompact) {
        setupBox.style.display = 'none';
        compactBtn.style.display = 'inline-flex';
        editIdBtn.style.display = 'inline-flex';
        setSimbriefIdLocked(true);
    } else {
        setupBox.style.display = 'flex';
        compactBtn.style.display = 'none';
        editIdBtn.style.display = 'none';
    }
}

function showSimbriefBox() {
    setSimbriefCompactMode(false);
    ensureSimbriefLockUI();
    setSimbriefIdLocked(false);
}

async function saveSimbriefId(val) {
    const cleanId = (val || '').trim();
    if (!cleanId) return;

    // 1. Salvataggio istantaneo in localStorage
    try { localStorage.setItem('aeroglass_simbrief_id', cleanId); } catch (e) {}

    // 2. Salvataggio permanente in SQLite
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_simbrief_id) {
        try { await window.pywebview.api.save_simbrief_id(cleanId); } catch (e) {}
    }
    setSimbriefIdLocked(true);
    setSimbriefCompactMode(true);
}

async function fetchSimbriefPlan() {
    if (window.pywebview && window.pywebview.api) {
        const inp = document.getElementById('simbriefIdInput');
        let val = inp ? inp.value.trim() : '';
        if (!val) {
            try { val = localStorage.getItem('aeroglass_simbrief_id') || ''; } catch(e) {}
            if (val && inp) inp.value = val;
        }
        if (val) await saveSimbriefId(val);

        const res = await window.pywebview.api.fetch_simbrief_plan();
        if (res.success && res.flight_plan) {
            flightPlan = res.flight_plan;
            updateFlightPlanUI(res.alternate, true);
            setSimbriefIdLocked(true);
            setSimbriefCompactMode(true);
        } else {
            setSimbriefCompactMode(false);
            const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
            const msg = (isEn ? "SimBrief Error: " : "Errore SimBrief: ") + (res.error || (isEn ? "Invalid ID" : "ID non valido"));
            if (typeof window.showAeroAlert === 'function') window.showAeroAlert(msg);
            else alert(msg);
        }
    }
}

let _omniSearchDebounce = null;

function filterAirports(query, immediate = false) {
    if (_omniSearchDebounce) {
        clearTimeout(_omniSearchDebounce);
        _omniSearchDebounce = null;
    }

    const q = String(query || '').toUpperCase().trim();
    if (q.length < 2) return;

    // Durante la digitazione non salta su prefissi parziali (es. "LI" o "LIC" -> LICJ):
    // attende almeno 4 caratteri (ICAO completo o nome) oppure la pressione di Invio
    if (!immediate && q.length < 4) return;

    const runSearch = () => {
        if (typeof searchAndCenterAirport === 'function') {
            searchAndCenterAirport(q);
            return;
        }
        const exactApt = airportsData.find(a => a.icao && a.icao.toUpperCase() === q);
        if (exactApt) {
            setFollowState(0);
            map.flyTo([exactApt.lat, exactApt.lon], 13);
            return;
        }
        const exactVor = vorsData.find(v => v.ident && v.ident.toUpperCase() === q);
        if (exactVor) {
            setFollowState(0);
            map.flyTo([exactVor.lat, exactVor.lon], 11);
        }
    };

    if (immediate) {
        runSearch();
    } else {
        _omniSearchDebounce = setTimeout(runSearch, 450);
    }
}

// ==============================================================================
// MODULO ANALITICO PROCEDURE IFR (HOLDING, ARCHI DME, VECTORS & VINCOLI)
// ==============================================================================

const IFR_PROC = {
    holdingLayers: new Map(),
    dmeLayers: [],
    vectorLayers: [],

    offsetCoord(lat, lon, distanceNm, bearingDeg) {
        const R = 3440.065;
        const rad = (deg) => deg * (Math.PI / 180);
        const deg = (rad) => rad * (180 / Math.PI);

        const latRad = rad(lat);
        const lonRad = rad(lon);
        const brgRad = rad(bearingDeg);
        const distRad = distanceNm / R;

        const newLat = Math.asin(
            Math.sin(latRad) * Math.cos(distRad) +
            Math.cos(latRad) * Math.sin(distRad) * Math.cos(brgRad)
        );
        const newLon = lonRad + Math.atan2(
            Math.sin(brgRad) * Math.sin(distRad) * Math.cos(latRad),
            Math.cos(distRad) - Math.sin(latRad) * Math.sin(newLat)
        );

        return [deg(newLat), deg(newLon)];
    },

    generateHoldingPoints(fixLat, fixLon, inboundCourse, turnRight = true, legNm = 4.0, radiusNm = 0.85) {
        const points = [];
        const turnDir = turnRight ? 1 : -1;
        const outboundCourse = (inboundCourse + 180) % 360;

        const center1Bearing = (inboundCourse + turnDir * 90 + 360) % 360;
        const center1 = this.offsetCoord(fixLat, fixLon, radiusNm, center1Bearing);

        const startAng1 = (inboundCourse - turnDir * 90 + 360) % 360;
        const steps = 16;
        for (let i = 0; i <= steps; i++) {
            const curAng = (startAng1 + turnDir * (180 * (i / steps)) + 360) % 360;
            points.push(this.offsetCoord(center1[0], center1[1], radiusNm, curAng));
        }

        const endArc1 = points[points.length - 1];
        const startArc2 = this.offsetCoord(endArc1[0], endArc1[1], legNm, outboundCourse);
        points.push(startArc2);

        const center2Bearing = (outboundCourse + turnDir * 90 + 360) % 360;
        const center2 = this.offsetCoord(startArc2[0], startArc2[1], radiusNm, center2Bearing);

        const startAng2 = (outboundCourse - turnDir * 90 + 360) % 360;
        for (let i = 1; i <= steps; i++) {
            const curAng = (startAng2 + turnDir * (180 * (i / steps)) + 360) % 360;
            points.push(this.offsetCoord(center2[0], center2[1], radiusNm, curAng));
        }

        points.push([fixLat, fixLon]);
        return points;
    },

    generateDmeArcPoints(vorLat, vorLon, radiusNm, fromRadial, toRadial, clockwise = true) {
        const pts = [];
        let r1 = fromRadial;
        let r2 = toRadial;
        if (clockwise && r2 < r1) r2 += 360;
        if (!clockwise && r2 > r1) r2 -= 360;

        const delta = r2 - r1;
        const steps = Math.max(12, Math.abs(Math.round(delta / 4)));

        for (let i = 0; i <= steps; i++) {
            const curRadial = (r1 + delta * (i / steps) + 360) % 360;
            pts.push(this.offsetCoord(vorLat, vorLon, radiusNm, curRadial));
        }
        return pts;
    },

    drawHolding(mapObj, fixIdent, lat, lon, inbound = 0, turnRight = true, altConstraint = "", speedConstraint = "", legNm = 4.0, radiusNm = 0.85, speedUsed = 160) {
        if (!mapObj) return;
        this.clearHolding(mapObj, fixIdent);

        const pts = this.generateHoldingPoints(lat, lon, inbound, turnRight, legNm, radiusNm);
        const group = L.featureGroup();

        L.polyline(pts, {
            color: '#d946ef',
            weight: 2.5,
            dashArray: '6, 6',
            opacity: 0.95
        }).addTo(group);

        const midPoint = pts[Math.floor(pts.length / 2)];
        let badgeHtml = `<strong style="font-size:16.5px;letter-spacing:0.5px;color:#fdf4ff;">HOLD ${fixIdent}</strong><br><span style="font-size:14.5px;">INB: ${String(Math.round(inbound)).padStart(3,'0')}° • ${turnRight ? 'R' : 'L'}</span>`;
        if (altConstraint) badgeHtml += `<br><span style="color:#38bdf8;font-weight:700;font-size:15px;">ALT: ${altConstraint}</span>`;
        badgeHtml += `<br><span style="color:#fbbf24;font-weight:700;font-size:15px;">SPD: ${Math.round(speedUsed)} KT</span>`;
        badgeHtml += `<br><span style="color:#cbd5e1;font-size:12.5px;opacity:0.9;">R: ${radiusNm.toFixed(2)} NM | LEG: ${legNm.toFixed(1)} NM</span>`;

        L.marker(midPoint, {
            icon: L.divIcon({
                className: '',
                iconSize: null,
                html: `<div style="display:inline-block;width:max-content;background:rgba(15,23,42,0.96);border:2.5px solid #d946ef;color:#fdf4ff;font-size:15.5px;font-family:Consolas,monospace;padding:8px 14px;border-radius:8px;white-space:nowrap;box-shadow:0 6px 22px rgba(0,0,0,0.85), 0 0 12px rgba(217,70,239,0.45);line-height:1.48;pointer-events:none;">${badgeHtml}</div>`
            })
        }).addTo(group);

        group.addTo(mapObj);
        this.holdingLayers.set(fixIdent, group);
    },

    clearHolding(mapObj, fixIdent) {
        if (this.holdingLayers.has(fixIdent)) {
            const g = this.holdingLayers.get(fixIdent);
            if (mapObj && g) mapObj.removeLayer(g);
            this.holdingLayers.delete(fixIdent);
        }
    },

    clearAll(mapObj) {
        if (!mapObj) return;
        this.holdingLayers.forEach(g => mapObj.removeLayer(g));
        this.holdingLayers.clear();
        this.dmeLayers.forEach(l => mapObj.removeLayer(l));
        this.dmeLayers = [];
        this.vectorLayers.forEach(l => mapObj.removeLayer(l));
        this.vectorLayers = [];
    }
};

function formatIfrConstraints(altDesc, altVal, spdVal) {
    let altStr = "";
    let spdStr = "";

    if (altVal && altVal > 0) {
        const fl = altVal >= 10000 ? `FL${Math.round(altVal / 100)}` : `${altVal}ft`;
        if (altDesc === "+" || altDesc === "at_or_above") altStr = `${fl}+`;
        else if (altDesc === "-" || altDesc === "at_or_below") altStr = `${fl}-`;
        else altStr = `AT ${fl}`;
    }

    if (spdVal && spdVal > 0) {
        spdStr = `MAX ${spdVal}KT`;
    }

    return { altStr, spdStr };
}

window.toggleWaypointHolding = function(ident, index) {
    if (typeof IFR_PROC === 'undefined' || !flightPlan || !flightPlan[index]) return;
    const wp = flightPlan[index];
    const btn = document.getElementById(`btnHold_${index}`);

    if (IFR_PROC.holdingLayers.has(ident)) {
        IFR_PROC.clearHolding(map, ident);
        if (btn) {
            btn.style.background = 'rgba(56,189,248,0.12)';
            btn.style.border = '1px solid rgba(56,189,248,0.35)';
            btn.style.color = '#7dd3fc';
            btn.style.boxShadow = 'none';
            btn.title = 'Attiva circuito di attesa (Holding)';
        }
    } else {
        const prevWp = index > 0 ? flightPlan[index - 1] : wp;
        const inb = (index > 0 && prevWp.lat !== null)
            ? calculateBearing(prevWp.lat, prevWp.lon, wp.lat, wp.lon)
            : 0;
        const altConstraint = wp.alt_ft ? `${wp.alt_ft}ft` : "";
        const spdConstraint = wp.speed_restriction ? `MAX ${wp.speed_restriction}KT` : "";

        const tel = window.lastTelemetry || {};
        const liveGs = (tel.connected && tel.gs_kt && Number(tel.gs_kt) >= 45) ? Number(tel.gs_kt) : null;
        const targetSpd = wp.speed_restriction || liveGs || 150;

        const calcRadius = Math.max(0.65, Math.min(2.4, targetSpd / (60 * Math.PI)));
        const legMinutes = (wp.alt_ft && wp.alt_ft > 14000) ? 1.5 : 1.0;
        const calcLeg = Math.max(2.0, (targetSpd / 60) * legMinutes);

        IFR_PROC.drawHolding(map, ident, wp.lat, wp.lon, inb, true, altConstraint, spdConstraint, calcLeg, calcRadius, targetSpd);
        if (btn) {
            btn.style.background = 'rgba(217,70,239,0.3)';
            btn.style.border = '1px solid #d946ef';
            btn.style.color = '#fdf4ff';
            btn.style.boxShadow = '0 0 6px rgba(217,70,239,0.45)';
            btn.title = 'Rimuovi circuito di attesa (Holding)';
        }
    }

    if (map) map.closePopup();
};