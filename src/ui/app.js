const map = L.map('map', { zoomControl: false }).setView([41.9, 12.5], 6);

const tileSources = {
    dark: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

let currentTileLayer = L.tileLayer(tileSources.dark, { maxZoom: 19 }).addTo(map);

function switchMapStyle(style) {
    const mapEl = document.getElementById('map');
    map.removeLayer(currentTileLayer);
    
    let url = tileSources.dark;
    if (tileSources[style]) {
        url = tileSources[style];
    }

    if (style === 'dark') {
        mapEl.classList.add('map-dark-filter');
    } else {
        mapEl.classList.remove('map-dark-filter');
    }

    currentTileLayer = L.tileLayer(url, { maxZoom: style === 'topo' ? 17 : 19 }).addTo(map);
}

let followAircraft = true;
let lastAcftLatLng = null;
let lastAcftHdgTrue = 0;

function setFollowState(state) {
    followAircraft = state;
    const btn = document.getElementById('btnFollowAcft');
    if (followAircraft) {
        btn.classList.add('active');
        btn.innerText = '🎯 Segui Aereo: ON';
        if (lastAcftLatLng) {
            map.panTo(lastAcftLatLng, { animate: true, duration: 0.4 });
        }
    } else {
        btn.classList.remove('active');
        btn.innerText = '✋ Mappa Libera';
    }
}

function toggleFollowAircraft() {
    setFollowState(!followAircraft);
}

map.on('dragstart', function() {
    if (followAircraft) {
        setFollowState(false);
    }
});

const sidebarPanel = document.getElementById('sidebarPanel');
const sidebarResizer = document.getElementById('sidebarResizer');
let isResizingSidebar = false;

sidebarResizer.addEventListener('mousedown', function(e) {
    isResizingSidebar = true;
    sidebarResizer.classList.add('resizing');
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
        sidebarResizer.classList.remove('resizing');
        document.body.style.cursor = '';
    }
});

function setSimbriefCompactMode(isCompact) {
    const setupBox = document.getElementById('simbriefSetupBox');
    const compactBtn = document.getElementById('simbriefCompactBtn');
    const editIdBtn = document.getElementById('simbriefEditIdBtn');
    if (isCompact) {
        setupBox.style.display = 'none';
        compactBtn.style.display = 'block';
        editIdBtn.style.display = 'block';
    } else {
        setupBox.style.display = 'flex';
        compactBtn.style.display = 'none';
        editIdBtn.style.display = 'none';
    }
}

function showSimbriefBox() {
    setSimbriefCompactMode(false);
    document.getElementById('simbriefIdInput').focus();
}

let drawerOpen = true;
function toggleDrawer() {
    drawerOpen = !drawerOpen;
    const drawer = document.getElementById('elevationDrawer');
    const sidebar = document.getElementById('sidebarPanel');
    if (drawerOpen) {
        drawer.style.height = '104px';
        sidebar.style.bottom = '130px';
    } else {
        drawer.style.height = '36px';
        sidebar.style.bottom = '60px';
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
    if (tempMatch) {
        const tVal = tempMatch[1].replace('M', '-');
        temp = `${ parseInt(tVal, 10) }°C`;
    }

    let qnh = '---';
    const qnhMatch = metarStr.match(/\bQ(\d{4})\b/);
    if (qnhMatch) {
        qnh = `${ parseInt(qnhMatch[1], 10) } mb`;
    } else {
        const altimMatch = metarStr.match(/\bA(\d{4})\b/);
        if (altimMatch) {
            const inHg = parseInt(altimMatch[1], 10) / 100.0;
            qnh = `${ Math.round(inHg * 33.8639) } mb`;
        }
    }

    if (wind === '---' && temp === '---' && qnh === '---') return null;
    return { wind, temp, qnh, raw: metarStr };
}

let airportsData = [];
let vorsData = [];
let ilsData = [];
let flightPlan = [];
let currentAlternate = null;
let routeLine = null;
let alternateLine = null;
let waypointMarkers = [];
let vorMarkers = [];
let ilsMarkers = [];
let alternateMarker = null;
let acftMarker = null;
let mouseRouteMarker = null;
let initialized = false;

const acftIcon = L.divIcon({
    className: '',
    html: '<div id="acftSvg" style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;transform-origin:center center;transition:transform 0.25s linear;filter:drop-shadow(0 0 6px #38bdf8);"><svg viewBox="0 0 24 24" width="24" height="24" fill="#38bdf8"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></div>',
    iconSize: [28, 28], iconAnchor: [14, 14]
});

const vorIcon = L.divIcon({
    className: '',
    html: '<div style="width:12px;height:12px;border:2px solid #38bdf8;background:rgba(15,23,42,0.9);transform:rotate(45deg);box-shadow:0 0 6px rgba(56,189,248,0.6);"></div>',
    iconSize: [12, 12], iconAnchor: [6, 6]
});

const ilsIcon = L.divIcon({
    className: '',
    html: '<div style="width:11px;height:11px;background:#e879f9;border:2px solid #0f172a;box-shadow:0 0 6px rgba(232,121,249,0.7);"></div>',
    iconSize: [11, 11], iconAnchor: [5, 5]
});

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
    if (vorMarkers && vorMarkers.length > 0) {
        vorMarkers.forEach(m => { if (m) map.removeLayer(m); });
    }
    vorMarkers = [];
    if (vors) {
        vors.forEach(vor => {
            if (vor.lat && vor.lon) {
                const marker = L.marker([vor.lat, vor.lon], { icon: vorIcon }).addTo(map);
                marker.bindPopup(
                    '<div style="font-weight:700;font-size:12px;color:#38bdf8;">VOR: ' + vor.ident + '</div>' +
                    '<div style="font-size:11px;color:#f8fafc;">' + vor.name + '</div>' +
                    '<div style="font-size:11px;font-family:monospace;color:#34d399;margin-top:2px;">FREQ: ' + vor.freq + ' MHz</div>'
                );
                vorMarkers.push(marker);
            }
        });
    }

    if (ilsMarkers && ilsMarkers.length > 0) {
        ilsMarkers.forEach(m => { if (m) map.removeLayer(m); });
    }
    ilsMarkers = [];
    if (ilsList) {
        ilsList.forEach(ils => {
            if (ils.lat && ils.lon) {
                const marker = L.marker([ils.lat, ils.lon], { icon: ilsIcon }).addTo(map);
                marker.bindPopup(
                    '<div style="font-weight:700;font-size:12px;color:#e879f9;">ILS ' + ils.rwy + ' (' + ils.ident + ')</div>' +
                    '<div style="font-size:11px;color:#f8fafc;margin-bottom:4px;">' + ils.name + '</div>' +
                    '<div style="font-size:11px;font-family:monospace;color:#38bdf8;">FREQ: ' + ils.freq + ' MHz</div>' +
                    '<div style="font-size:11px;font-family:monospace;color:#34d399;">COURSE: ' + ils.course + '°</div>' +
                    '<div style="font-size:11px;font-family:monospace;color:#fbbf24;">GLIDE ALT: ' + ils.gs_alt + '</div>'
                );
                ilsMarkers.push(marker);
            }
        });
    }
}

function updateFlightPlanUI(alternateData = undefined, fitMap = true) {
    if (alternateData !== undefined) {
        currentAlternate = alternateData;
    }
    const container = document.getElementById('fplContainer');
    container.innerHTML = '';
    
    clearMapRoutes();

    const coords = [];
    const altitutes = [];

    flightPlan.forEach((wp, index) => {
        const apt = airportsData.find(a => a.icao === wp.ident);
        const isEndpoint = (index === 0 || index === flightPlan.length - 1 || wp.type === 'DEP' || wp.type === 'DEST' || wp.type === 'APT');
        const rawMetar = wp.metar || (apt ? apt.metar : '');
        const wx = isEndpoint ? parseMetarInfo(rawMetar) : null;

        if (wp.lat && wp.lon) {
            coords.push([wp.lat, wp.lon]);
            altitutes.push(wp.alt_ft || 0);

            const marker = L.circleMarker([wp.lat, wp.lon], {
                radius: isEndpoint ? 5 : 4,
                color: '#38bdf8',
                fillColor: isEndpoint ? '#34d399' : '#0284c7',
                fillOpacity: 0.85,
                weight: 1.5
            }).addTo(map);

            let popupHtml =
                '<div style="font-weight:700;font-size:13px;color:#38bdf8;">' + wp.ident + '</div>' +
                '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Altitudine: <span style="color:#e879f9;cursor:pointer;text-decoration:underline;font-weight:600;" onclick="editWaypointAlt(' + index + ', ' + wp.alt_ft + ')">' + wp.alt_ft + ' ft ✏️</span></div>';
            
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
        if (wp.lat && wp.lon) {
            div.onclick = () => {
                setFollowState(false);
                map.flyTo([wp.lat, wp.lon], 11);
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
                '<div class="wpt-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (apt ? apt.name : (wp.name || 'Waypoint Navlog')) + '</div>' +
                wxBadgesHtml +
            '</div>' +
            '<div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0;">' +
                '<span class="wpt-alt" onclick="event.stopPropagation(); editWaypointAlt(' + index + ', ' + wp.alt_ft + ')">' + wp.alt_ft + ' ft</span>' +
                '<span class="wpt-dist" id="wptDist_' + index + '">--- NM</span>' +
                '<span style="font-size:10px;color:var(--text-muted);">' + (apt ? ('RWY ' + apt.rwy) : wp.type) + '</span>' +
            '</div>';
        container.appendChild(div);
    });

    if (coords.length > 1) {
        routeLine = L.polyline(coords, { color: '#e879f9', weight: 2, dashArray: '6, 4' }).addTo(map);
        if (fitMap && !followAircraft) {
            map.fitBounds(routeLine.getBounds(), { padding: [80, 80] });
        } else if (fitMap && !lastAcftLatLng) {
            map.fitBounds(routeLine.getBounds(), { padding: [80, 80] });
        }
    }

    if (currentAlternate && coords.length > 0) {
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

        const altApt = airportsData.find(a => a.icao === currentAlternate.ident);
        const altWx = parseMetarInfo(currentAlternate.metar || (altApt ? altApt.metar : ''));
        let altPopup = '<div style="font-weight:700;font-size:13px;color:#38bdf8;">Alternato: ' + currentAlternate.ident + '</div>';
        if (altWx) {
            altPopup += '<div style="font-size:10px;color:#34d399;font-family:monospace;margin-top:4px;">💨 ' + altWx.wind + ' | 🌡️ ' + altWx.temp + ' | 📊 ' + altWx.qnh + '</div>';
        }
        alternateMarker.bindPopup(altPopup);
    }

    renderVnavChart(altitutes);
}

async function editWaypointAlt(index, currentAlt) {
    const newAlt = prompt("Inserisci la quota target in piedi (ft) per questo waypoint:", currentAlt);
    if (newAlt !== null && !isNaN(newAlt)) {
        if (window.pywebview && window.pywebview.api) {
            const res = await window.pywebview.api.update_waypoint_altitude(index, newAlt);
            if (res.success) {
                flightPlan = res.flight_plan;
                updateFlightPlanUI(undefined, false);
            }
        }
    }
}

function renderVnavChart(alts) {
    const svgPath = document.getElementById('vnavPath');
    const svgText = document.getElementById('vnavText');
    if (!alts || alts.length === 0) return;

    const maxAlt = Math.max(...alts, 10000);
    const width = 1000;
    const height = 40;

    let pathD = `M0,50 `;
    alts.forEach((alt, i) => {
        const x = (i / (alts.length - 1)) * width;
        const y = height - (alt / maxAlt) * height + 5;
        pathD += `L${x},${y} `;
    });

    pathD += `L${width},50 Z`;
    if (svgPath) svgPath.setAttribute('d', pathD);
    if (svgText) svgText.textContent = `VNAV Multi-Step (Max Alt: ${maxAlt.toLocaleString()} ft)`;
}

function calculateRouteProgress(lat, lon) {
    if (!flightPlan || flightPlan.length < 2) return null;
    let totalDist = 0;
    let segDistances = [];
    
    for (let i = 0; i < flightPlan.length - 1; i++) {
        let p1 = L.latLng(flightPlan[i].lat, flightPlan[i].lon);
        let p2 = L.latLng(flightPlan[i+1].lat, flightPlan[i+1].lon);
        let d = p1.distanceTo(p2);
        segDistances.push(d);
        totalDist += d;
    }
    if (totalDist === 0) return 0;

    let minGlobalDist = Infinity;
    let bestFraction = 0;
    let accumulatedDist = 0;

    for (let i = 0; i < flightPlan.length - 1; i++) {
        let A = L.latLng(flightPlan[i].lat, flightPlan[i].lon);
        let B = L.latLng(flightPlan[i+1].lat, flightPlan[i+1].lon);
        let segLen = segDistances[i];
        
        let P = L.latLng(lat, lon);
        let t = getSegmentFraction(A, B, P);
        let clampedT = Math.max(0, Math.min(1, t));
        
        let latProj = A.lat + clampedT * (B.lat - A.lat);
        let lonProj = A.lng + clampedT * (B.lng - A.lng);
        let projPt = L.latLng(latProj, lonProj);
        let distToProj = P.distanceTo(projPt);

        if (distToProj < minGlobalDist) {
            minGlobalDist = distToProj;
            let distAlongSeg = clampedT * segLen;
            bestFraction = (accumulatedDist + distAlongSeg) / totalDist;
        }
        accumulatedDist += segLen;
    }
    return { fraction: Math.max(0, Math.min(1, bestFraction)), distanceToRoute: minGlobalDist };
}

function getSegmentFraction(A, B, P) {
    let dx = B.lng - A.lng;
    let dy = B.lat - A.lat;
    let lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;
    return ((P.lng - A.lng) * dx + (P.lat - A.lat) * dy) / lenSq;
}

map.on('mousemove', function(e) {
    const mouseLine = document.getElementById('mouseVnavLine');
    if (!flightPlan || flightPlan.length < 2) {
        mouseLine.style.display = 'none';
        return;
    }

    const res = calculateRouteProgress(e.latlng.lat, e.latlng.lng);
    if (res && res.distanceToRoute < 15000) {
        const xPos = res.fraction * 1000;
        mouseLine.setAttribute('x1', xPos);
        mouseLine.setAttribute('x2', xPos);
        mouseLine.style.display = 'block';
    } else {
        mouseLine.style.display = 'none';
    }
});

const svgContainer = document.querySelector('.elevation-canvas-container svg');
if (svgContainer) {
    svgContainer.addEventListener('mousemove', function(e) {
        if (!flightPlan || flightPlan.length < 2) return;
        
        const rect = svgContainer.getBoundingClientRect();
        const xClick = e.clientX - rect.left;
        const fraction = Math.max(0, Math.min(1, xClick / rect.width));
        
        const coordsAtFraction = getCoordsAlongRoute(fraction);
        if (coordsAtFraction) {
            if (!mouseRouteMarker) {
                mouseRouteMarker = L.circleMarker([coordsAtFraction.lat, coordsAtFraction.lon], {
                    radius: 6,
                    color: '#fbbf24',
                    fillColor: '#fbbf24',
                    fillOpacity: 0.9,
                    weight: 2
                }).addTo(map);
            } else {
                mouseRouteMarker.setLatLng([coordsAtFraction.lat, coordsAtFraction.lon]);
            }

            const mouseLine = document.getElementById('mouseVnavLine');
            mouseLine.setAttribute('x1', fraction * 1000);
            mouseLine.setAttribute('x2', fraction * 1000);
            mouseLine.style.display = 'block';
        }
    });

    svgContainer.addEventListener('mouseleave', function() {
        if (mouseRouteMarker) {
            map.removeLayer(mouseRouteMarker);
            mouseRouteMarker = null;
        }
        const mouseLine = document.getElementById('mouseVnavLine');
        if (mouseLine) mouseLine.style.display = 'none';
    });
}

function getCoordsAlongRoute(fraction) {
    if (!flightPlan || flightPlan.length < 2) return null;
    
    let totalDist = 0;
    let segDistances = [];
    for (let i = 0; i < flightPlan.length - 1; i++) {
        let p1 = L.latLng(flightPlan[i].lat, flightPlan[i].lon);
        let p2 = L.latLng(flightPlan[i+1].lat, flightPlan[i+1].lon);
        let d = p1.distanceTo(p2);
        segDistances.push(d);
        totalDist += d;
    }
    if (totalDist === 0) return null;

    let targetDist = fraction * totalDist;
    let accumulatedDist = 0;

    for (let i = 0; i < flightPlan.length - 1; i++) {
        let segLen = segDistances[i];
        if (accumulatedDist + segLen >= targetDist || i === flightPlan.length - 2) {
            let segFraction = segLen > 0 ? (targetDist - accumulatedDist) / segLen : 0;
            segFraction = Math.max(0, Math.min(1, segFraction));
            
            let lat1 = flightPlan[i].lat, lon1 = flightPlan[i].lon;
            let lat2 = flightPlan[i+1].lat, lon2 = flightPlan[i+1].lon;
            
            return {
                lat: lat1 + segFraction * (lat2 - lat1),
                lon: lon1 + segFraction * (lon2 - lon1)
            };
        }
        accumulatedDist += segLen;
    }
    return null;
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
        if (wp.lat && wp.lon) {
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

            let d = distMeters;
            if ((angleDiff < 90 || d < 5000) && d < minDistance) {
                minDistance = d;
                activeIdx = i;
            }
        }
    });

    if (minDistance === Infinity) {
        let closestDist = Infinity;
        flightPlan.forEach((wp, idx) => {
            if (wp.lat && wp.lon) {
                let d = L.latLng(acftLat, acftLon).distanceTo(L.latLng(wp.lat, wp.lon));
                if (d < closestDist) {
                    closestDist = d;
                    activeIdx = idx;
                }
            }
        });
    }

    const cards = document.querySelectorAll('.fpl-list .wpt-card');
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

async function addWaypoint(icao) {
    if (window.pywebview && window.pywebview.api) {
        flightPlan = await window.pywebview.api.add_to_flight_plan(icao);
        updateFlightPlanUI();
    }
}

async function importPlnFile() {
    if (window.pywebview && window.pywebview.api) {
        const res = await window.pywebview.api.load_pln_file();
        if (res.success) {
            flightPlan = res.flight_plan;
            updateFlightPlanUI(res.alternate);
        }
    }
}

async function saveSimbriefId(val) {
    if (window.pywebview && window.pywebview.api) {
        await window.pywebview.api.save_simbrief_id(val);
    }
}

async function fetchSimbriefPlan() {
    if (window.pywebview && window.pywebview.api) {
        const inputVal = document.getElementById('simbriefIdInput').value.trim();
        if (inputVal) {
            await window.pywebview.api.save_simbrief_id(inputVal);
        }
        const res = await window.pywebview.api.fetch_simbrief_plan();
        if (res.success && res.flight_plan && res.flight_plan.length > 0) {
            flightPlan = res.flight_plan;
            updateFlightPlanUI(res.alternate);
            setSimbriefCompactMode(true);
        } else {
            setSimbriefCompactMode(false);
            alert("Errore SimBrief: " + (res.error || "ID non valido o nessun volo attivo"));
        }
    }
}

function filterAirports(query) {
    const q = query.toUpperCase().trim();
    const found = airportsData.find(a => a.icao.includes(q) || a.name.toUpperCase().includes(q));
    if (found && q.length >= 3) {
        setFollowState(false);
        map.flyTo([found.lat, found.lon], 10);
    }
}

async function pollTelemetry() {
    if (!window.pywebview || !window.pywebview.api) return;
    const data = await window.pywebview.api.get_telemetry();
    document.getElementById('simStatus').innerText = data.mode;
    document.getElementById('simDot').className = 'status-dot' + (data.connected ? ' live' : '');
    document.getElementById('valAlt').innerText = data.alt_ft;
    document.getElementById('valGs').innerText = data.gs_kt;
    document.getElementById('valHdg').innerText = data.hdg_deg;
    document.getElementById('valAcft').innerText = data.aircraft || "MSFS 2024";

    const newLatLng = L.latLng(data.lat, data.lon);

    let mapHeading = (data.hdg_true !== undefined && data.hdg_true !== null) ? Number(data.hdg_true) : Number(data.hdg_deg);
    if (isNaN(mapHeading)) mapHeading = lastAcftHdgTrue;

    if (lastAcftLatLng && newLatLng.distanceTo(lastAcftLatLng) > 8 && mapHeading === 0) {
        mapHeading = calculateBearing(lastAcftLatLng.lat, lastAcftLatLng.lng, newLatLng.lat, newLatLng.lng);
    }
    lastAcftHdgTrue = mapHeading;
    lastAcftLatLng = newLatLng;

    if (!acftMarker) {
        acftMarker = L.marker(newLatLng, { icon: acftIcon }).addTo(map);
    } else {
        acftMarker.setLatLng(newLatLng);
    }

    const svgEl = document.getElementById('acftSvg');
    if (svgEl) {
        svgEl.style.transform = `rotate(${mapHeading}deg)`;
    }

    if (followAircraft) {
        map.panTo(newLatLng, { animate: true, duration: 0.5 });
    }

    const acftLine = document.getElementById('acftVnavLine');
    if (flightPlan && flightPlan.length >= 2) {
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
    } else {
        acftLine.style.display = 'none';
    }
}

async function initApp() {
    if (initialized || !window.pywebview || !window.pywebview.api) return;
    initialized = true;
    map.invalidateSize();
    await window.pywebview.api.connect_sim();
    const nav = await window.pywebview.api.get_navdata();
    airportsData = nav.airports;
    vorsData = nav.vors || [];
    ilsData = nav.ils || [];
    flightPlan = nav.flight_plan;

    renderNavAids(vorsData, ilsData);
    
    if (nav.simbrief_userid) {
        document.getElementById('simbriefIdInput').value = nav.simbrief_userid;
        if (flightPlan && flightPlan.length > 0) {
            setSimbriefCompactMode(true);
        } else {
            const res = await window.pywebview.api.fetch_simbrief_plan();
            if (res.success && res.flight_plan && res.flight_plan.length > 0) {
                flightPlan = res.flight_plan;
                nav.alternate = res.alternate;
                setSimbriefCompactMode(true);
            } else {
                setSimbriefCompactMode(false);
            }
        }
    } else {
        setSimbriefCompactMode(false);
    }

    updateFlightPlanUI(nav.alternate);
    pollTelemetry();
    setInterval(pollTelemetry, 1000);
}

window.addEventListener('pywebviewready', initApp);
setTimeout(initApp, 600);