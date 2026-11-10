// --- GESTIONE WAYPOINT UTENTE (CUSTOM) ---
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

// --- RENDERING PIANO DI VOLO ATTIVO E PROFILO SALITA/DISCESA ---
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

    const coords = [];
    const altitutes = [];

    flightPlan.forEach((wp, index) => {
        const apt = findAirport(wp.ident);
        const isEndpoint = (index === 0 || index === flightPlan.length - 1 || wp.type === 'DEP' || wp.type === 'DEST' || wp.type === 'APT');
        const rawMetar = wp.metar || (apt ? apt.metar : '');
        const wx = isEndpoint ? parseMetarInfo(rawMetar) : null;
        const altVal = Number(wp.alt_ft) || 0;
        altitutes.push(altVal > 0 ? altVal : 5000);

        let legDistNm = "0.0";
        if (index > 0 && flightPlan[index - 1].lat !== null && wp.lat !== null) {
            const prevLatLng = L.latLng(flightPlan[index - 1].lat, flightPlan[index - 1].lon);
            const currLatLng = L.latLng(wp.lat, wp.lon);
            const distMeters = prevLatLng.distanceTo(currLatLng);
            legDistNm = (distMeters / 1852).toFixed(1);
        }

        if (wp.lat !== undefined && wp.lat !== null && wp.lon !== undefined && wp.lon !== null) {
            coords.push([wp.lat, wp.lon]);

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

        let deleteBtnHtml = '';
        if (!isEndpoint) {
            deleteBtnHtml = `<button class="btn btn-danger" style="padding:1px 5px; font-size:10px; margin-top:3px; align-self:flex-end;" title="Rimuovi dalla rotta" onclick="event.stopPropagation(); removeWaypointFromRoute(${index})">✕</button>`;
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
                '<span class="wpt-dist" id="wptDist_' + index + '">' + (index === 0 ? '0.0 NM' : `+${legDistNm} NM`) + '</span>' +
                '<span style="font-size:10px;color:var(--text-muted);">' + (apt && apt.rwy ? ('RWY ' + apt.rwy) : (wp.type || 'WPT')) + '</span>' +
                deleteBtnHtml + 
            '</div>';
        container.appendChild(div);
    });

    if (coords.length > 1) {
        routeLine = L.polyline(coords, { color: '#e879f9', weight: 2.5, dashArray: '6, 4' }).addTo(map);
        if (fitMap) {
            setFollowState(0);
            const padX = (window.innerWidth * 0.35) + 60;
            const padY = (window.innerHeight * 0.35) + 60;
            map.fitBounds(routeLine.getBounds(), {
                paddingTopLeft: [padX, padY],
                paddingBottomRight: [padX, padY]
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
}

function removeWaypointFromRoute(index) {
    if (!flightPlan || index <= 0 || index >= flightPlan.length - 1) {
        return; 
    }
    flightPlan.splice(index, 1);
    
    const maxCruise = Math.max(...flightPlan.map(w => Number(w.alt_ft) || 0));
    flightPlan = applyClimbDescentProfile(flightPlan, maxCruise);
    
    updateFlightPlanUI(currentAlternate, false);
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
        
        const tp = document.getElementById('terrainPath');
        if (tp) tp.setAttribute('d', 'M0,50 L1000,50 Z');
        
        document.getElementById('vnavText').textContent = translations[currentLang].noFpl.toUpperCase();
        updateHoverSync(null);
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