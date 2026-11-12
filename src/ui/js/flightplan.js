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

    if (existingIdx >= 0) {
        userWaypoints[existingIdx] = wpObj;
    } else {
        userWaypoints.push(wpObj);
    }

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

    // Mostra nella lista superiore solo i waypoint utente non ancora inseriti nel Piano di Volo Attivo
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
        alert("Crea o importa prima un piano di volo attivo.");
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
    const R = 3440.065; // Raggio terrestre in Miglia Nautiche
    const d = distNm / R;
    const brng = brngDeg * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

function enrichProceduresProfile(waypoints) {
    if (!waypoints || waypoints.length < 2) return waypoints;
    const lastIdx = waypoints.length - 1;
    const hasExplicitProc = waypoints.some((w, i) => i > 0 && i < lastIdx && (w.proc_type === 'SID' || w.proc_type === 'STAR' || w.proc_type === 'APPR'));

    if (!hasExplicitProc && waypoints.length >= 3) {
        // Assegna automaticamente SID al primo tratto di salita e STAR/APPR agli ultimi tratti
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

    // Cerca eventuale ILS corrispondente all'aeroporto/pista di arrivo, altrimenti usa l'ultimo leg
    const apt = findAirport(dest.ident);
    const destRwy = dest.rwy || (apt && apt.rwy ? apt.rwy.split('/')[0] : '');
    const matchedIls = (ilsData || []).find(i =>
        (destRwy && i.rwy === destRwy && L.latLng(dest.lat, dest.lon).distanceTo(L.latLng(i.lat, i.lon)) < 15000) ||
        L.latLng(dest.lat, dest.lon).distanceTo(L.latLng(i.lat, i.lon)) < 8000
    );

    const finalCourse = matchedIls ? Number(matchedIls.course) : calculateBearing(prev.lat, prev.lon, dest.lat, dest.lon);
    const reciprocal = (finalCourse + 180) % 360;

    // Disegna il cono di avvicinamento strumentale (8.5 NM dalla soglia pista)
    const tip = [dest.lat, dest.lon];
    const leftWing = destPointNm(dest.lat, dest.lon, (reciprocal - 4.5 + 360) % 360, 8.0);
    const centerNotch = destPointNm(dest.lat, dest.lon, reciprocal, 6.8);
    const rightWing = destPointNm(dest.lat, dest.lon, (reciprocal + 4.5) % 360, 8.0);
    const extCenterline = destPointNm(dest.lat, dest.lon, reciprocal, 10.5);

    const apprGroup = L.layerGroup();

    const conePoly = L.polygon([tip, leftWing, centerNotch, rightWing], {
        color: '#38bdf8',
        weight: 1.8,
        fillColor: '#38bdf8',
        fillOpacity: 0.22
    });

    const centerLine = L.polyline([tip, extCenterline], {
        color: '#38bdf8',
        weight: 1.5,
        dashArray: '4, 4'
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
    let detectedSid = "---";
    let detectedStar = "---";
    let detectedAppr = "---";

    flightPlan.forEach((wp, index) => {
        const apt = findAirport(wp.ident);
        const isEndpoint = (index === 0 || index === flightPlan.length - 1 || wp.type === 'DEP' || wp.type === 'DEST' || wp.type === 'APT');
        const rawMetar = wp.metar || (apt ? apt.metar : '');
        const wx = isEndpoint ? parseMetarInfo(rawMetar) : null;
        const altVal = Number(wp.alt_ft) || 0;
        altitutes.push(altVal > 0 ? altVal : 5000);

        if (wp.proc_type === 'SID' && wp.proc_name && index > 0 && detectedSid === "---") {
            detectedSid = wp.proc_name;
        }
        if (wp.proc_type === 'STAR' && wp.proc_name && detectedStar === "---") {
            detectedStar = wp.proc_name;
        }
        if (index === flightPlan.length - 1) {
            const rwyStr = wp.rwy || (apt && apt.rwy ? apt.rwy : '');
            detectedAppr = wp.proc_name || (rwyStr ? `RWY ${rwyStr}` : 'VISUAL / VNAV');
        }

        let legDistNm = "0.0";
        if (index > 0 && flightPlan[index - 1].lat !== null && wp.lat !== null) {
            const prevLatLng = L.latLng(flightPlan[index - 1].lat, flightPlan[index - 1].lon);
            const currLatLng = L.latLng(wp.lat, wp.lon);
            const distMeters = prevLatLng.distanceTo(currLatLng);
            legDistNm = (distMeters / 1852).toFixed(1);
        }

        const procColor = wp.proc_type === 'SID' ? '#34d399'
                        : wp.proc_type === 'STAR' ? '#fbbf24'
                        : wp.proc_type === 'APPR' ? '#38bdf8'
                        : '#e879f9';

        if (wp.lat !== undefined && wp.lat !== null && wp.lon !== undefined && wp.lon !== null) {
            coords.push([wp.lat, wp.lon]);

            const marker = L.circleMarker([wp.lat, wp.lon], {
                radius: isEndpoint ? 5.5 : 4.2,
                color: showSidStar ? procColor : '#38bdf8',
                fillColor: isEndpoint ? '#34d399' : (showSidStar ? procColor : '#0284c7'),
                fillOpacity: 0.9,
                weight: 1.5
            }).addTo(map);

            let popupHtml =
                '<div style="font-weight:700;font-size:13px;color:' + procColor + ';">' + wp.ident +
                (wp.proc_name ? ' <span style="font-size:10px;opacity:0.85;">[' + wp.proc_name + ']</span>' : '') + '</div>' +
                '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Altitudine: <span style="color:#e879f9;cursor:pointer;text-decoration:underline;font-weight:600;" onclick="editWaypointAlt(' + index + ', ' + altVal + ')">' + altVal + ' ft ✏️</span></div>';

            if (wx) {
                popupHtml +=
                    '<div style="font-size:13px;font-weight:600;color:#34d399;font-family:monospace;border-top:1px solid rgba(148,163,184,0.2);padding-top:4px;margin-top:4px;">' +
                    '💨 ' + wx.wind + ' &nbsp;|&nbsp; 🌡️ ' + wx.temp + ' &nbsp;|&nbsp; 📊 ' + wx.qnh +
                    '</div>';
            }

            marker.bindPopup(popupHtml);
            if (!isEndpoint && typeof startRouteRubberBand === 'function') {
                marker.on('mousedown', (ev) => {
                    if (ev.originalEvent && ev.originalEvent.button === 0) {
                        startRouteRubberBand('move', index, ev.latlng, ev.originalEvent);
                    }
                });
            }
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

        let procBadgeHtml = '';
        if (!isEndpoint && wp.proc_type && (wp.proc_type === 'SID' || wp.proc_type === 'STAR' || wp.proc_type === 'APPR')) {
            const badgeBg = wp.proc_type === 'SID' ? 'rgba(52,211,153,0.18)' : (wp.proc_type === 'STAR' ? 'rgba(251,191,36,0.18)' : 'rgba(56,189,248,0.18)');
            const badgeCol = wp.proc_type === 'SID' ? 'var(--emerald)' : (wp.proc_type === 'STAR' ? 'var(--amber)' : 'var(--cyan)');
            const badgeLabel = wp.proc_name && wp.proc_name !== wp.proc_type ? `${wp.proc_type}: ${wp.proc_name}` : wp.proc_type;
            procBadgeHtml = `<span style="font-size:9px;background:${badgeBg};color:${badgeCol};padding:1px 5px;border-radius:3px;font-weight:700;">${badgeLabel}</span>`;
        } else if (!isEndpoint && wp.proc_name && wp.proc_name !== 'ENR') {
            procBadgeHtml = `<span style="font-size:9px;background:rgba(232,121,249,0.15);color:var(--purple);padding:1px 5px;border-radius:3px;font-weight:700;">${wp.proc_name}</span>`;
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

        let deleteBtnHtml = '';
        if (!isEndpoint) {
            deleteBtnHtml = `<button class="btn btn-danger" style="padding:1px 5px; font-size:10px; margin-top:3px; align-self:flex-end;" title="Rimuovi dalla rotta" onclick="event.stopPropagation(); removeWaypointFromRoute(${index})">✕</button>`;
        }

        const rwyLabel = wp.rwy ? ('RWY ' + wp.rwy) : (apt && apt.rwy ? ('RWY ' + apt.rwy) : (wp.type || 'WPT'));

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
                '<span class="wpt-dist" id="wptDist_' + index + '">' + (index === 0 ? '0.0 NM' : `+${legDistNm} NM`) + '</span>' +
                '<span style="font-size:10px;color:var(--text-muted);">' + rwyLabel + '</span>' +
                deleteBtnHtml + 
            '</div>';
        container.appendChild(div);
    });

    // Aggiorna il riepilogo nel menu Filtri & SID/STAR
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
            const p1 = flightPlan[i];
            const p2 = flightPlan[i + 1];
            if (p1.lat === null || p2.lat === null) continue;

            let segType = p2.proc_type || 'ENR';
            if (i === flightPlan.length - 2) segType = 'APPR';

            const segColor = !showSidStar ? '#e879f9'
                           : segType === 'SID' ? '#34d399'
                           : segType === 'STAR' ? '#fbbf24'
                           : segType === 'APPR' ? '#38bdf8'
                           : '#e879f9';

            const segDash = (showSidStar && (segType === 'SID' || segType === 'STAR')) ? '5, 5' : null;
            const segLine = L.polyline([[p1.lat, p1.lon], [p2.lat, p2.lon]], {
                color: segColor,
                weight: 3.2,
                opacity: 0.92,
                dashArray: segDash
            }).addTo(map);

            // Fascia interattiva invisibile (16px) per agganciare comodamente il segmento col mouse (Rubber Banding)
            const hitLine = L.polyline([[p1.lat, p1.lon], [p2.lat, p2.lon]], {
                color: '#000',
                weight: 16,
                opacity: 0.01
            }).addTo(map);

            const segLabel = p2.proc_name || segType;
            hitLine.bindTooltip(`${p1.ident} ➔ ${p2.ident} (${segLabel}) • Trascina per aggiungere WP`, { sticky: true, className: 'vnav-route-tooltip' });

            hitLine.on('mousedown', (ev) => {
                if (ev.originalEvent && ev.originalEvent.button === 0 && typeof startRouteRubberBand === 'function') {
                    startRouteRubberBand('insert', i, ev.latlng, ev.originalEvent);
                }
            });

            routeSegmentLines.push(segLine);
            routeSegmentLines.push(hitLine);
        }

        drawApproachFeather(flightPlan);

        if (fitMap) {
            setFollowState(0);
            // Compensa l'oversize 170vw x 170vh (-35vw, -35vh) di #map e centra la rotta nell'85% dell'area libera visibile
            const vw = window.innerWidth || 1280;
            const vh = window.innerHeight || 720;
            const offX = Math.round(vw * 0.35);
            const offY = Math.round(vh * 0.35);

            const sidebarEl = document.getElementById('sidebarPanel');
            const leftUi = (sidebarOpen && sidebarEl) ? (sidebarEl.offsetWidth + 28) : 28;
            const rightUi = 28;
            const topUi = 64;
            const bottomUi = drawerOpen ? 142 : 52;

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
            radius: 4,
            color: '#38bdf8',
            fillColor: '#38bdf8',
            fillOpacity: 0.6,
            weight: 1
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
    if (!flightPlan || index <= 0 || index >= flightPlan.length - 1) {
        return; 
    }
    pushFlightPlanUndoState();
    flightPlan.splice(index, 1);
    
    const maxCruise = Math.max(...flightPlan.map(w => Number(w.alt_ft) || 0));
    flightPlan = applyClimbDescentProfile(flightPlan, maxCruise);
    
    updateFlightPlanUI(currentAlternate, false);
}

async function editWaypointAlt(index, currentAlt) {
    const newAlt = prompt("Inserisci la quota target in piedi (ft) per questo waypoint:", currentAlt);
    if (newAlt !== null && !isNaN(newAlt)) {
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

// --- CREAZIONE MANUALE, EXPORT ED ELIMINAZIONE PIANO DI VOLO ---
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

async function resolveKnownOrOnlineCoords(ident) {
    let res = resolveKnownCoords(ident);
    if (res && res.lat !== null && res.lon !== null) return res;

    if (window.pywebview && window.pywebview.api && window.pywebview.api.resolve_icao) {
        try {
            const apiRes = await window.pywebview.api.resolve_icao(ident);
            if (apiRes && apiRes.success && apiRes.lat !== null && apiRes.lon !== null) {
                if (apiRes.is_airport && !findAirport(ident)) {
                    airportsData.push({
                        icao: ident,
                        name: apiRes.name || ident,
                        lat: apiRes.lat,
                        lon: apiRes.lon,
                        elev: apiRes.elev || 0,
                        rwy: "",
                        metar: apiRes.metar || ""
                    });
                }
                return {
                    lat: apiRes.lat,
                    lon: apiRes.lon,
                    name: apiRes.name || ident,
                    elev: apiRes.elev || 0,
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

    if (!depInput || !destInput) {
        alert("Inserisci almeno l'aeroporto di partenza e di arrivo.");
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
        
        const tp = document.getElementById('terrainPath');
        if (tp) tp.setAttribute('d', 'M0,50 L1000,50 Z');
        
        document.getElementById('vnavText').textContent = translations[currentLang].noFpl.toUpperCase();
        updateHoverSync(null);
        renderUserWaypointsUI();
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

        // Estrazione procedure SID / STAR / Approach e Piste dal formato .PLN (Little Navmap / MSFS)
        let procType = "ENR";
        let procName = "";
        const depFp = wp.getElementsByTagName("DepartureFP")[0]?.textContent?.trim();
        const arrFp = wp.getElementsByTagName("ArrivalFP")[0]?.textContent?.trim();
        const apprFp = wp.getElementsByTagName("ApproachTypeFP")[0]?.textContent?.trim();
        const airwayFp = wp.getElementsByTagName("Airway")[0]?.textContent?.trim();
        const rwyNumFp = wp.getElementsByTagName("RunwayNumberFP")[0]?.textContent?.trim();
        const rwyDesFp = wp.getElementsByTagName("RunwayDesignatorFP")[0]?.textContent?.trim();

        let wpRwy = "";
        if (rwyNumFp) {
            const desMap = { "LEFT": "L", "RIGHT": "R", "CENTER": "C" };
            wpRwy = rwyNumFp + (desMap[(rwyDesFp || "").toUpperCase()] || "");
        }

        if (depFp) {
            procType = "SID";
            procName = depFp;
        } else if (apprFp) {
            procType = "APPR";
            procName = wpRwy ? `${apprFp} RWY ${wpRwy}` : apprFp;
        } else if (arrFp) {
            procType = "STAR";
            procName = arrFp;
        } else if (airwayFp) {
            procType = "ENR";
            procName = airwayFp;
        }

        if (parsedWaypoints.length === 0 || parsedWaypoints[parsedWaypoints.length - 1].ident !== code) {
            parsedWaypoints.push({
                ident: code,
                name: wpName,
                lat: wpLat,
                lon: wpLon,
                alt_ft: altFt,
                type: "WPT",
                rwy: wpRwy,
                proc_type: procType,
                proc_name: procName || procType
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

// --- INTEGRAZIONE SIMBRIEF & RICERCA RAPIDA ---
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

async function saveSimbriefId(val) {
    const cleanId = (val || '').trim();
    if (!cleanId) return;

    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_simbrief_id) {
        try {
            await window.pywebview.api.save_simbrief_id(cleanId);
        } catch (e) {}
    }
    setSimbriefCompactMode(true);
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

// --- GESTIONE STORICO VOLI & FUEL LOG (SQLITE) ---
function calculateTotalFlightPlanDistanceNm() {
    if (!flightPlan || flightPlan.length < 2) return 0.0;
    let totalMeters = 0;
    for (let i = 0; i < flightPlan.length - 1; i++) {
        if (flightPlan[i].lat !== null && flightPlan[i + 1].lat !== null) {
            totalMeters += L.latLng(flightPlan[i].lat, flightPlan[i].lon).distanceTo(L.latLng(flightPlan[i + 1].lat, flightPlan[i + 1].lon));
        }
    }
    return Number((totalMeters / 1852).toFixed(1));
}

async function openFlightHistoryModal() {
    const modal = document.getElementById('flightHistoryModal');
    if (!modal) return;

    // Precompila i campi con i dati del volo attivo e della telemetria
    const acftText = document.getElementById('valAcft')?.innerText || 'MSFS 2024';
    const acftInput = document.getElementById('histAcft');
    const depInput = document.getElementById('histDep');
    const destInput = document.getElementById('histDest');
    const distInput = document.getElementById('histDist');
    const fuelInput = document.getElementById('histFuel');

    if (acftInput) acftInput.value = acftText.replace('(DEMO)', '').trim();
    if (flightPlan && flightPlan.length >= 2) {
        if (depInput) depInput.value = flightPlan[0].ident || '';
        if (destInput) destInput.value = flightPlan[flightPlan.length - 1].ident || '';
        if (distInput) distInput.value = calculateTotalFlightPlanDistanceNm();
    }
    if (fuelInput) {
        fuelInput.value = window._sessionFuelUsedGal !== undefined ? window._sessionFuelUsedGal : 0.0;
    }

    modal.style.display = 'flex';
    await loadAndRenderFlightHistory();
}

function closeFlightHistoryModal() {
    const modal = document.getElementById('flightHistoryModal');
    if (modal) modal.style.display = 'none';
}

async function loadAndRenderFlightHistory() {
    const container = document.getElementById('flightHistoryContainer');
    if (!container) return;
    container.innerHTML = '';

    let history = [];
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_flight_history) {
        try {
            const res = await window.pywebview.api.get_flight_history();
            if (res && res.success && Array.isArray(res.history)) {
                history = res.history;
            }
        } catch (e) {}
    }

    let totalDist = 0;
    let totalFuel = 0;

    if (history.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:24px; color:var(--text-muted); font-size:12px;">Nessun volo registrato nel database SQLite.</div>';
    } else {
        history.forEach(item => {
            const dist = Number(item.distance_nm) || 0;
            const fuel = Number(item.fuel_used_gal) || 0;
            totalDist += dist;
            totalFuel += fuel;

            const div = document.createElement('div');
            div.className = 'wpt-card';
            div.style.cssText = 'cursor: default; padding: 7px 10px;';
            div.innerHTML = `
                <div style="min-width:0; flex:1;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="wpt-icao" style="color:var(--cyan); font-size:13px;">${item.departure} ➔ ${item.destination}</span>
                        <span style="font-size:11px; color:var(--emerald); font-weight:600;">✈️ ${item.aircraft || 'MSFS 2024'}</span>
                    </div>
                    <div class="wpt-name" style="font-family:Consolas,monospace; font-size:10.5px;">🕒 ${item.date}</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                    <span class="wpt-dist" style="font-size:11.5px; font-weight:700;">${dist.toFixed(1)} NM</span>
                    <span class="wpt-alt" style="cursor:default; color:var(--amber); background:rgba(251,191,36,0.14);">${fuel.toFixed(1)} GAL</span>
                    <button class="btn btn-danger" style="padding:2px 6px; font-size:10px; flex:0 0 auto;" title="Elimina volo" onclick="deleteFlightHistoryItem(${item.id})">✕</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    const totFlightsEl = document.getElementById('histTotalFlights');
    const totDistEl = document.getElementById('histTotalDist');
    const totFuelEl = document.getElementById('histTotalFuel');
    if (totFlightsEl) totFlightsEl.innerText = history.length;
    if (totDistEl) totDistEl.innerText = `${totalDist.toFixed(1)} NM`;
    if (totFuelEl) totFuelEl.innerText = `${totalFuel.toFixed(1)} GAL`;
}

async function saveFlightRecordFromModal() {
    const acft = (document.getElementById('histAcft')?.value || 'MSFS 2024').trim();
    const dep = (document.getElementById('histDep')?.value || '').trim().toUpperCase();
    const dest = (document.getElementById('histDest')?.value || '').trim().toUpperCase();
    const dist = parseFloat(document.getElementById('histDist')?.value || '0') || 0.0;
    const fuel = parseFloat(document.getElementById('histFuel')?.value || '0') || 0.0;

    if (!dep || !dest) {
        alert("Inserisci gli aeroporti di partenza (DEP) e arrivo (ARR).");
        return;
    }

    if (window.pywebview && window.pywebview.api && window.pywebview.api.add_flight_record) {
        const res = await window.pywebview.api.add_flight_record(acft, dep, dest, dist, fuel);
        if (res && res.success) {
            await loadAndRenderFlightHistory();
        }
    }
}

async function deleteFlightHistoryItem(id) {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.delete_flight_record) {
        await window.pywebview.api.delete_flight_record(id);
        await loadAndRenderFlightHistory();
    }
}

async function autoLogCompletedFlight(aircraftName, acftLat, acftLon) {
    if (!flightPlan || flightPlan.length < 2) return;
    const dep = flightPlan[0].ident;
    const destWp = flightPlan[flightPlan.length - 1];
    if (!destWp || destWp.lat === null || destWp.lon === null) return;

    // Verifica che l'atterraggio sia avvenuto entro 6 NM dall'aeroporto di destinazione
    const distToDestNm = L.latLng(acftLat, acftLon).distanceTo(L.latLng(destWp.lat, destWp.lon)) / 1852;
    if (distToDestNm <= 6.0 && window.pywebview && window.pywebview.api && window.pywebview.api.add_flight_record) {
        const totalNm = calculateTotalFlightPlanDistanceNm();
        const fuelUsed = window._sessionFuelUsedGal || 0.0;
        await window.pywebview.api.add_flight_record(aircraftName || 'MSFS 2024', dep, destWp.ident, totalNm, fuelUsed);
        window._sessionStartFuelGal = null;
        window._sessionFuelUsedGal = 0.0;
    }
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
    if (!window.pywebview || !window.pywebview.api || rubberBandState) return;
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