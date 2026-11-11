// --- SAGOME SVG REALISTICHE PER CATEGORIA DI VELIVOLO ---
function getAircraftSvgIcon(aircraftName) {
    const name = (aircraftName || "").toUpperCase();

    // 1. Elicotteri
    if (
        name.includes('HELO') || name.includes('HELI') || name.includes('CABRI') ||
        name.includes('GUIMBAL') || name.includes('G2') || name.includes('BELL') ||
        name.includes('407') || name.includes('206') || name.includes('UH-1') ||
        name.includes('H125') || name.includes('H135') || name.includes('H145') ||
        name.includes('H160') || name.includes('H225') || name.includes('AS350') ||
        name.includes('EC135') || name.includes('EC145') || name.includes('ROBINSON') ||
        name.includes('R22') || name.includes('R44') || name.includes('R66') ||
        name.includes('AW109') || name.includes('AW139') || name.includes('AGUSTA') ||
        name.includes('CH47') || name.includes('CH-47') || name.includes('CHINOOK') ||
        name.includes('SIKORSKY') || name.includes('S-76') || name.includes('MD500') ||
        name.includes('ROTOR') || name.includes('COWAN') || name.includes('AIRLAND')
    ) {
        return `<svg viewBox="0 0 24 24" width="34" height="34" fill="#38bdf8">
            <path d="M12 3.5 C13.5 3.5 14.5 5.2 14.5 7.8 C14.5 9.8 13.6 11.4 12.7 12.2 L12.5 18.2 L15.2 19.2 L15.2 20.5 L12.4 20.0 L12 21.5 L11.6 20.0 L8.8 20.5 L8.8 19.2 L11.5 18.2 L11.3 12.2 C10.4 11.4 9.5 9.8 9.5 7.8 C9.5 5.2 10.5 3.5 12 3.5 Z"/>
            <line x1="3" y1="8.5" x2="21" y2="8.5" stroke="#38bdf8" stroke-width="1.6" stroke-linecap="round"/>
            <line x1="12" y1="1.2" x2="12" y2="16.0" stroke="#38bdf8" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="12" cy="8.5" r="1.6" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>
        </svg>`;
    }

    // 2. Jet Militari / Addestratori (es. MB-339, F-18, F-16, Hawk, Eurofighter, Tornado, M-346)
    if (
        name.includes('MB-339') || name.includes('MB339') || name.includes('339') ||
        name.includes('M-346') || name.includes('M346') || name.includes('F-18') ||
        name.includes('FA-18') || name.includes('F16') || name.includes('F-16') ||
        name.includes('F-14') || name.includes('F-15') || name.includes('F-22') ||
        name.includes('F-35') || name.includes('HAWK') || name.includes('FIGHTER') ||
        name.includes('EUROFIGHTER') || name.includes('TYPHOON') || name.includes('TORNADO') ||
        name.includes('HARRIER') || name.includes('MIRAGE') || name.includes('GRIPEN') ||
        name.includes('ALBATROS') || name.includes('L-39') || name.includes('G-91')
    ) {
        return `<svg viewBox="0 0 24 24" width="32" height="32" fill="#38bdf8">
            <path d="M12 1.2 C12.5 1.2 13.1 3.2 13.3 5.8 L13.5 9.2 L21.5 13.2 L21.5 15.0 L13.4 13.6 L13.2 17.8 L16.8 20.0 L16.8 21.4 L12.7 20.3 L12 22.2 L11.3 20.3 L7.2 21.4 L7.2 20.0 L10.8 17.8 L10.6 13.6 L2.5 15.0 L2.5 13.2 L10.5 9.2 L10.7 5.8 C10.9 3.2 11.5 1.2 12 1.2 Z"/>
            <rect x="1.7" y="12.0" width="1.1" height="4.2" rx="0.5" fill="#38bdf8"/>
            <rect x="21.2" y="12.0" width="1.1" height="4.2" rx="0.5" fill="#38bdf8"/>
        </svg>`;
    }

    // 3. Business Jet (Citation, CJ4, Longitude, Learjet, Phenom, Vision Jet, HondaJet)
    if (
        name.includes('CITATION') || name.includes('CJ4') || name.includes('LONGITUDE') ||
        name.includes('LEAR') || name.includes('PHENOM') || name.includes('GULFSTREAM') ||
        name.includes('FALCON') || name.includes('HONDA') || name.includes('VISION JET') ||
        name.includes('SF50') || name.includes('CHALLENGER') || name.includes('GLOBAL')
    ) {
        return `<svg viewBox="0 0 24 24" width="32" height="32" fill="#38bdf8">
            <path d="M12 1.5 C12.6 1.5 13.1 3.8 13.1 6.5 L13.1 10.5 L21.5 15.2 L21.5 16.5 L13.1 14.2 L13.0 18.8 L16.5 20.8 L16.5 22.0 L12 20.8 L7.5 22.0 L7.5 20.8 L11.0 18.8 L10.9 14.2 L2.5 16.5 L2.5 15.2 L10.9 10.5 L10.9 6.5 C10.9 3.8 11.4 1.5 12 1.5 Z"/>
        </svg>`;
    }

    // 4. Aviazione Generale / Elica / Ultraleggeri (Pioneer 400, Cessna, Savannah, Gabriel, Piper, Bonanza, TBM)
    if (
        name.includes('PIONEER') || name.includes('CESSNA') || name.includes('172') ||
        name.includes('152') || name.includes('182') || name.includes('208') ||
        name.includes('SAVANNAH') || name.includes('ICP') || name.includes('GABRIEL') ||
        name.includes('BONANZA') || name.includes('BARON') || name.includes('PIPER') ||
        name.includes('PA-28') || name.includes('DA40') || name.includes('DA62') ||
        name.includes('DIAMOND') || name.includes('TBM') || name.includes('PC-12') ||
        name.includes('PC12') || name.includes('CUB') || name.includes('XCUB') ||
        name.includes('ROBIN') || name.includes('DR400') || name.includes('VL-3') ||
        name.includes('SR22') || name.includes('CIRRUS') || name.includes('TECNAM') ||
        name.includes('SIAI') || name.includes('SF260') || name.includes('CAP10')
    ) {
        return `<svg viewBox="0 0 24 24" width="32" height="32" fill="#38bdf8">
            <path d="M9.2 2.0 h5.6 v0.9 h-5.6 z"/>
            <path d="M12 2.5 C12.7 2.5 13.2 4.0 13.2 6.0 L13.2 8.2 L22 9.2 L22 11.6 L13.1 11.2 L12.8 17.8 L16.5 19.2 L16.5 20.8 L12.5 20.2 L12 21.8 L11.5 20.2 L7.5 20.8 L7.5 19.2 L11.2 17.8 L10.9 11.2 L2 11.6 L2 9.2 L10.8 8.2 L10.8 6.0 C10.8 4.0 11.3 2.5 12 2.5 Z"/>
        </svg>`;
    }

    // 5. Default: Airliner Commerciale (A320, A321, A330, A350, B737, B747, B777, B787, ATR)
    return `<svg viewBox="0 0 24 24" width="30" height="30" fill="#38bdf8">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>`;
}

// --- BARRA INFORMAZIONI ORARIO E COORDINATE ---
function updateFlightInfoBar(lat, lon) {
    const now = new Date();
    const dateEl = document.getElementById('infoDate');
    const utcEl = document.getElementById('infoUtc');
    const sysEl = document.getElementById('infoSys');
    const coordsEl = document.getElementById('infoCoords');

    if (dateEl) dateEl.innerText = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    if (utcEl) utcEl.innerText = `UTC: ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}`;
    if (sysEl) sysEl.innerText = `SYS: ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    if (coordsEl && lat !== undefined && lon !== undefined) {
        coordsEl.innerText = `LAT: ${Number(lat).toFixed(5)} LON: ${Number(lon).toFixed(5)}`;
    }
}

// --- POLLING TELEMETRIA SIMCONNECT ---
async function pollTelemetry() {
    updateFlightInfoBar();
    if (!window.pywebview || !window.pywebview.api) return;
    try {
        const data = await window.pywebview.api.get_telemetry();
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
                const acftName = data.aircraft || "MSFS 2024";

                if (!aircraftMarker || lastRenderedAcftKey !== acftName) {
                    lastRenderedAcftKey = acftName;
                    const svgContent = getAircraftSvgIcon(acftName);
                    const dynamicIcon = L.divIcon({
                        className: '',
                        html: `<div id="acftSvg" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;transform-origin:center center;transition:transform 0.25s linear;filter:drop-shadow(0 0 10px #38bdf8) drop-shadow(0 0 20px #38bdf8);transform:rotate(${mapHeading}deg);">${svgContent}</div>`,
                        iconSize: [36, 36],
                        iconAnchor: [18, 18]
                    });

                    if (!aircraftMarker) {
                        aircraftMarker = L.marker(newLatLng, { icon: dynamicIcon, zIndexOffset: 1000 }).addTo(map);
                    } else {
                        aircraftMarker.setLatLng(newLatLng);
                        aircraftMarker.setIcon(dynamicIcon);
                    }
                } else {
                    aircraftMarker.setLatLng(newLatLng);
                    const svgEl = document.getElementById('acftSvg');
                    if (svgEl) svgEl.style.transform = `rotate(${mapHeading}deg)`;
                }

            if (followState !== 0) {
                    map.panTo(newLatLng, { animate: true, duration: 0.5 });
                }

                // Rotazione dinamica per Track Up
                const mapEl = document.getElementById('map');
                if (followState === 2 && mapEl) {
                    mapEl.style.transition = 'transform 0.25s linear';
                    // Lo scale(1.45) serve a nascondere i bordi neri mentre la mappa quadrata ruota
                    mapEl.style.transform = `scale(1.45) rotate(${-mapHeading}deg)`;
                }

            } else if (aircraftMarker) {
                map.removeLayer(aircraftMarker);
                aircraftMarker = null;
                lastRenderedAcftKey = null;
            }
            updateFlightInfoBar(data.lat, data.lon);

            const acftLine = document.getElementById('acftVnavLine');
            if (data.connected && acftLine && flightPlan && flightPlan.length >= 2) {
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

            // Tracciamento automatico carburante usato e auto-registrazione volo all'atterraggio
            if (data.connected) {
                if (data.fuel_gal !== undefined && data.fuel_gal !== null) {
                    if (window._sessionStartFuelGal === undefined || window._sessionStartFuelGal === null || data.fuel_gal > window._sessionStartFuelGal) {
                        window._sessionStartFuelGal = data.fuel_gal;
                    }
                    window._sessionFuelUsedGal = Math.max(0, Number((window._sessionStartFuelGal - data.fuel_gal).toFixed(1)));
                }

                if (data.on_ground === false && (data.gs_num || 0) > 40) {
                    window._wasAirborneInSession = true;
                } else if (window._wasAirborneInSession && data.on_ground === true && (data.gs_num || 0) < 25) {
                    window._wasAirborneInSession = false;
                    if (typeof autoLogCompletedFlight === 'function') {
                        autoLogCompletedFlight(data.aircraft, data.lat, data.lon);
                    }
                }
            }
        }
    } catch (err) {}
}