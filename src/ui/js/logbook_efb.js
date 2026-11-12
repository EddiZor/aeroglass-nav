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

async function refreshEfbBadgeFromBackend() {
    if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.get_efb_info) return;
    try {
        const res = await window.pywebview.api.get_efb_info();
        if (res && res.success) {
            updateEfbTopBarBadge(res);
        }
    } catch (e) {}
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

    if (!document.getElementById('efbChromeHintBox')) {
        const contentBox = modal.querySelector('.modal-content');
        if (contentBox) {
            const hint = document.createElement('div');
            hint.id = 'efbChromeHintBox';
            hint.style.cssText = 'font-size:10px;color:#cbd5e1;text-align:left;background:rgba(56,189,248,0.08);border-left:3px solid #38bdf8;padding:6px 8px;border-radius:4px;margin-top:4px;';
            hint.innerHTML = '🔓 <strong>Primo accesso su Chrome Tablet:</strong> se appare l\'avviso di connessione HTTP locale, tocca <strong>"Continua sul sito"</strong> (oppure usa <em>Menu ⋮ &gt; Aggiungi a schermata Home</em> per aprirlo a tutto schermo).';
            contentBox.appendChild(hint);
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
    if (!window.pywebview || !window.pywebview.api || (typeof rubberBandState !== 'undefined' && rubberBandState) || window._touchRbActive || window._demoTourActive) return;
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