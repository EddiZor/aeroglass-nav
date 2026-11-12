// --- FUNZIONI GEOMETRICHE DI ROTTA (DISTANZA & RILEVAMENTO) ---
function calcGreatCircleNm(lat1, lon1, lat2, lon2) {
    const R = 3440.065;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearingDeg(lat1, lon1, lat2, lon2) {
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dLam = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLam) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
    const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    return Math.round(brng);
}

function formatMinutesToHhMm(totalMinutes) {
    if (!isFinite(totalMinutes) || totalMinutes <= 0) return "00:00";
    const rounded = Math.round(totalMinutes);
    const hh = Math.floor(rounded / 60);
    const mm = rounded % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// --- CALCOLATORE CARBURANTE & PERFORMANCE + TABELLA OPERATIVA NAVLOG ---
const AIRCRAFT_PERF_PRESETS = {
    pioneer400: { name: "Alpi Pioneer 400", cruiseKt: 130, burnGph: 5.5, capGal: 26.4, taxiGal: 0.6, kgPerGal: 2.72, climbFpm: 1000 },
    mb339:      { name: "Aermacchi MB-339A/PAN", cruiseKt: 360, burnGph: 235.0, capGal: 479.0, taxiGal: 18.0, kgPerGal: 3.03, climbFpm: 5500 },
    c172:       { name: "Cessna 172S Skyhawk", cruiseKt: 115, burnGph: 8.6, capGal: 56.0, taxiGal: 1.1, kgPerGal: 2.72, climbFpm: 700 },
    da62:       { name: "Diamond DA62", cruiseKt: 175, burnGph: 14.8, capGal: 86.0, taxiGal: 1.5, kgPerGal: 3.03, climbFpm: 1200 },
    a320:       { name: "Airbus A320neo", cruiseKt: 450, burnGph: 820.0, capGal: 6260.0, taxiGal: 65.0, kgPerGal: 3.03, climbFpm: 2200 },
    a350:       { name: "iniBuilds Airbus A350-900", cruiseKt: 485, burnGph: 1900.0, capGal: 37000.0, taxiGal: 140.0, kgPerGal: 3.03, climbFpm: 2400 },
    custom:     { name: "⚙️ Personalizzato (Custom)", cruiseKt: 150, burnGph: 12.0, capGal: 60.0, taxiGal: 1.5, kgPerGal: 2.80, climbFpm: 1000 }
};

let fuelPerfConfig = {
    preset: "pioneer400",
    cruiseKt: 130,
    burnGph: 5.5,
    capGal: 26.4,
    taxiGal: 0.6,
    kgPerGal: 2.72,
    windKt: 0,
    reserveMin: 45,
    contingencyPct: 5,
    fobGal: 26.4
};

try {
    const savedFp = localStorage.getItem('aeroglass_fuel_perf');
    if (savedFp) fuelPerfConfig = { ...fuelPerfConfig, ...JSON.parse(savedFp) };
} catch (e) {}

function ensureNavlogAndFuelUI() {
    const pillsGroup = document.querySelector('.top-pills-group');
    if (pillsGroup && !document.getElementById('btnNavlogTop')) {
        const logbookBtn = document.getElementById('btnLogbook');

        const navlogBtn = document.createElement('button');
        navlogBtn.id = 'btnNavlogTop';
        navlogBtn.className = 'top-btn';
        navlogBtn.onclick = openNavlogModal;
        navlogBtn.style.borderColor = 'rgba(52, 211, 153, 0.45)';
        navlogBtn.innerHTML = '📋 <span id="lblNavlogBtn">NavLog</span>';

        const fuelBtn = document.createElement('button');
        fuelBtn.id = 'btnFuelPerfTop';
        fuelBtn.className = 'top-btn';
        fuelBtn.onclick = openFuelPerfModal;
        fuelBtn.style.borderColor = 'rgba(251, 191, 36, 0.45)';
        fuelBtn.innerHTML = '⛽ <span id="lblFuelBtn">Fuel & Perf</span>';

        if (logbookBtn && logbookBtn.parentNode === pillsGroup) {
            pillsGroup.insertBefore(navlogBtn, logbookBtn.nextSibling);
            pillsGroup.insertBefore(fuelBtn, navlogBtn.nextSibling);
        } else {
            pillsGroup.appendChild(navlogBtn);
            pillsGroup.appendChild(fuelBtn);
        }
    }

    if (!document.getElementById('navlogModal')) {
        const navModal = document.createElement('div');
        navModal.id = 'navlogModal';
        navModal.className = 'custom-modal';
        navModal.style.display = 'none';
        navModal.innerHTML = `
            <div class="modal-content glass-panel" style="width: 780px; max-width: 95vw;">
                <div class="modal-header">
                    <span style="font-weight: 700; color: var(--emerald);">📋 NAVIGATION LOG (TABELLA DI MARCIA & STIME VOLO)</span>
                    <span style="cursor: pointer; color: var(--text-muted); font-size: 16px;" onclick="closeNavlogModal()">✕</span>
                </div>
                <div id="navlogSummaryBar" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; background: rgba(9,13,22,0.65); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(56,189,248,0.2); text-align: center;">
                    <div><div style="font-size:9.5px;color:var(--text-muted);">TRATTA</div><div id="nlSumRoute" style="font-size:13px;font-weight:700;color:var(--cyan);">--- ➔ ---</div></div>
                    <div><div style="font-size:9.5px;color:var(--text-muted);">DISTANZA TOT</div><div id="nlSumDist" style="font-size:13px;font-weight:700;color:#f8fafc;">0.0 NM</div></div>
                    <div><div style="font-size:9.5px;color:var(--text-muted);">GS EFFETTIVA</div><div id="nlSumGs" style="font-size:13px;font-weight:700;color:var(--amber);">130 kt</div></div>
                    <div><div style="font-size:9.5px;color:var(--text-muted);">TEMPO TOT (ETE)</div><div id="nlSumEte" style="font-size:13px;font-weight:700;color:var(--emerald);">00:00</div></div>
                    <div><div style="font-size:9.5px;color:var(--text-muted);">TRIP FUEL STIMATO</div><div id="nlSumFuel" style="font-size:13px;font-weight:700;color:#f43f5e;">0.0 Gal</div></div>
                </div>
                <div class="fpl-list" style="max-height: 340px; min-height: 180px; overflow-y: auto; border: 1px solid rgba(148,163,184,0.16); border-radius: 8px;">
                    <table class="navlog-table">
                        <thead>
                            <tr>
                                <th>#</th><th>IDENT</th><th>VIA / PROC</th><th>ALT (ft)</th><th>HDG</th>
                                <th>LEG (NM)</th><th>REM (NM)</th><th>ETE</th><th>ETA (UTC)</th><th>FUEL (Gal / kg)</th><th>EFOB (Gal)</th>
                            </tr>
                        </thead>
                        <tbody id="navlogTableBody"></tbody>
                    </table>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 4px;">
                    <span style="font-size: 11px; color: var(--text-muted);">💡 Clicca su una riga per centrare il Waypoint sulla mappa.</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-amber" style="flex:0 0 auto; padding: 6px 12px;" onclick="closeNavlogModal(); openFuelPerfModal();">⛽ Parametri Velivolo</button>
                        <button id="btnCopyNavlog" class="btn btn-cyan" style="flex:0 0 auto; padding: 6px 12px;" onclick="copyNavlogText()">📋 Copia Testo</button>
                        <button class="btn btn-emerald" style="flex:0 0 auto; padding: 6px 12px;" onclick="exportNavlogCsv()">💾 Esporta CSV</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(navModal);
    }

    if (!document.getElementById('fuelPerfModal')) {
        const fpModal = document.createElement('div');
        fpModal.id = 'fuelPerfModal';
        fpModal.className = 'custom-modal';
        fpModal.style.display = 'none';
        fpModal.innerHTML = `
            <div class="modal-content glass-panel" style="width: 540px; max-width: 95vw;">
                <div class="modal-header">
                    <span style="font-weight: 700; color: var(--amber);">⛽ CALCOLATORE CARBURANTE & PERFORMANCE</span>
                    <span style="cursor: pointer; color: var(--text-muted); font-size: 16px;" onclick="closeFuelPerfModal()">✕</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <select id="fpPresetSelect" class="glass-input" style="flex: 1; font-weight: 600;" onchange="onFuelPresetChange(this.value)">
                        <option value="pioneer400">🛩️ Alpi Pioneer 400 (130 kt • 5.5 GPH)</option>
                        <option value="mb339">✈️ Aermacchi MB-339A/PAN (360 kt • 235 GPH / ~710 kg/h)</option>
                        <option value="c172">🛩️ Cessna 172S Skyhawk (115 kt • 8.6 GPH)</option>
                        <option value="da62">🛩️ Diamond DA62 Twin (175 kt • 14.8 GPH)</option>
                        <option value="a320">🛫 Airbus A320neo (450 kt • 820 GPH / ~2.5 t/h)</option>
                        <option value="a350">🛫 iniBuilds Airbus A350-900 (485 kt • 1900 GPH)</option>
                        <option value="custom">⚙️ Personalizzato (Custom)</option>
                    </select>
                    <button class="btn btn-cyan" style="flex: 0 0 auto; padding: 6px 10px;" onclick="syncFuelPerfFromSim()">🔄 Auto da MSFS</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: rgba(30,41,59,0.45); padding: 9px; border-radius: 8px; border: 1px solid rgba(148,163,184,0.16);">
                    <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">TAS / Crociera (kt)</label><input type="number" id="fpCruiseKt" class="glass-input" style="width:100%;" min="40" max="900" oninput="onFuelInputModified()"></div>
                    <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Consumo (Gal/h)</label><input type="number" id="fpBurnGph" class="glass-input" style="width:100%;" step="0.5" min="1" max="8000" oninput="onFuelInputModified()"></div>
                    <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Vento (+Coda / -Front kt)</label><input type="number" id="fpWindKt" class="glass-input" style="width:100%;" step="5" min="-150" max="150" oninput="onFuelInputModified()"></div>
                    <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Riserva Finale (min)</label><input type="number" id="fpReserveMin" class="glass-input" style="width:100%;" step="5" min="15" max="120" oninput="onFuelInputModified()"></div>
                    <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Contingency (%)</label><input type="number" id="fpContPct" class="glass-input" style="width:100%;" step="1" min="0" max="30" oninput="onFuelInputModified()"></div>
                    <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Carburante a Bordo (Gal)</label><input type="number" id="fpFobGal" class="glass-input" style="width:100%;border-color:rgba(56,189,248,0.45);" step="1" min="0" max="60000" oninput="onFuelInputModified()"></div>
                </div>
                <div id="fpStatusBanner" style="padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-align: center; border: 1px solid rgba(52,211,153,0.45); background: rgba(6,78,59,0.35); color: var(--emerald);">🟢 CARBURANTE OK</div>
                <div class="fuel-grid-box">
                    <div class="fuel-stat-card"><span style="font-size:9.5px;color:var(--text-muted);">TAXI + SALITA</span><span id="fpOutTaxi" style="font-size:13px;font-weight:700;color:#f8fafc;">0.0 Gal</span><span id="fpOutTaxiSub" style="font-size:10px;color:var(--text-muted);">0 kg • 0 L</span></div>
                    <div class="fuel-stat-card"><span style="font-size:9.5px;color:var(--text-muted);">TRIP FUEL (ROTTA)</span><span id="fpOutTrip" style="font-size:13px;font-weight:700;color:var(--cyan);">0.0 Gal</span><span id="fpOutTripSub" style="font-size:10px;color:var(--text-muted);">0 kg • 0 L</span></div>
                    <div class="fuel-stat-card"><span style="font-size:9.5px;color:var(--text-muted);">CONTINGENCY + RISERVA</span><span id="fpOutRes" style="font-size:13px;font-weight:700;color:var(--amber);">0.0 Gal</span><span id="fpOutResSub" style="font-size:10px;color:var(--text-muted);">0 kg • 0 L</span></div>
                    <div class="fuel-stat-card" style="border-color:rgba(52,211,153,0.4);background:rgba(6,78,59,0.22);"><span style="font-size:9.5px;color:var(--emerald);font-weight:700;">BLOCK FUEL RICHIESTO</span><span id="fpOutBlock" style="font-size:14px;font-weight:800;color:var(--emerald);">0.0 Gal</span><span id="fpOutBlockSub" style="font-size:10.5px;color:#cbd5e1;font-weight:600;">0 kg • 0 L</span></div>
                    <div class="fuel-stat-card"><span style="font-size:9.5px;color:var(--text-muted);">STIMA ALL'ATTERRAGGIO (EFOB)</span><span id="fpOutEfob" style="font-size:13px;font-weight:700;color:#38bdf8;">0.0 Gal</span><span id="fpOutEfobSub" style="font-size:10px;color:var(--text-muted);">0 kg • 0 L</span></div>
                    <div class="fuel-stat-card"><span style="font-size:9.5px;color:var(--text-muted);">AUTONOMIA MAX (FOB)</span><span id="fpOutEndurance" style="font-size:13px;font-weight:700;color:#f8fafc;">00:00</span><span id="fpOutRangeSub" style="font-size:10px;color:var(--text-muted);">Range: 0 NM</span></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span id="fpRouteDistInfo" style="font-size: 11px; color: var(--text-muted);">Distanza Piano di Volo: 0.0 NM</span>
                    <button class="btn btn-emerald" style="flex: 0 0 auto; padding: 6px 14px;" onclick="closeFuelPerfModal(); openNavlogModal();">📋 Vedi Tabella NavLog</button>
                </div>
            </div>
        `;
        document.body.appendChild(fpModal);
    }
}

function saveFuelPerfSettings() {
    try { localStorage.setItem('aeroglass_fuel_perf', JSON.stringify(fuelPerfConfig)); } catch (e) {}
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_setting) {
        window.pywebview.api.save_setting('fuel_perf_config', JSON.stringify(fuelPerfConfig)).catch(() => {});
    }
}

function computeRouteAndFuelSummary() {
    const presetObj = AIRCRAFT_PERF_PRESETS[fuelPerfConfig.preset] || AIRCRAFT_PERF_PRESETS.pioneer400;
    const tasKt = Math.max(35, Number(fuelPerfConfig.cruiseKt) || presetObj.cruiseKt);
    const windKt = Number(fuelPerfConfig.windKt) || 0;
    const effectiveGsKt = Math.max(30, tasKt + windKt);
    const burnGph = Math.max(0.5, Number(fuelPerfConfig.burnGph) || presetObj.burnGph);
    const kgPerGal = Number(fuelPerfConfig.kgPerGal) || presetObj.kgPerGal || 2.8;
    const taxiGal = Number(fuelPerfConfig.taxiGal) ?? presetObj.taxiGal ?? 1.0;
    const reserveMin = Math.max(0, Number(fuelPerfConfig.reserveMin) ?? 45);
    const contPct = Math.max(0, Number(fuelPerfConfig.contingencyPct) ?? 5);
    const fobGal = Math.max(0, Number(fuelPerfConfig.fobGal) || 0);
    const capGal = Number(fuelPerfConfig.capGal) || presetObj.capGal || 100;

    const legs = [];
    let totalDistNm = 0;

    if (typeof flightPlan !== 'undefined' && Array.isArray(flightPlan) && flightPlan.length >= 2) {
        for (let i = 0; i < flightPlan.length; i++) {
            const wp = flightPlan[i];
            let legDist = 0, brng = 0;
            if (i > 0) {
                const prev = flightPlan[i - 1];
                legDist = calcGreatCircleNm(Number(prev.lat), Number(prev.lon), Number(wp.lat), Number(wp.lon));
                brng = calcBearingDeg(Number(prev.lat), Number(prev.lon), Number(wp.lat), Number(wp.lon));
                totalDistNm += legDist;
            }
            legs.push({
                index: i, ident: wp.ident || `WP${i}`, name: wp.name || '',
                proc: wp.proc_name || wp.proc_type || (i === 0 ? 'DEP' : (i === flightPlan.length - 1 ? 'ARR' : 'DCT')),
                alt_ft: Number(wp.alt_ft) || 0, lat: Number(wp.lat), lon: Number(wp.lon),
                legNm: legDist, cumNm: totalDistNm, hdg: brng
            });
        }
    }

    const nowUtcMs = Date.now();
    let cumMinutes = 0, cumFuelGal = taxiGal;

    for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        leg.remNm = Math.max(0, totalDistNm - leg.cumNm);
        if (i === 0) {
            leg.eteMin = 0;
            leg.legFuelGal = taxiGal;
        } else {
            leg.eteMin = (leg.legNm / effectiveGsKt) * 60.0;
            leg.legFuelGal = (leg.eteMin / 60.0) * burnGph;
            cumMinutes += leg.eteMin;
            cumFuelGal += leg.legFuelGal;
        }
        leg.cumMin = cumMinutes;
        leg.legFuelKg = leg.legFuelGal * kgPerGal;
        leg.efobGal = Math.max(0, fobGal - cumFuelGal);
        const etaDate = new Date(nowUtcMs + cumMinutes * 60000);
        leg.etaUtc = `${String(etaDate.getUTCHours()).padStart(2, '0')}:${String(etaDate.getUTCMinutes()).padStart(2, '0')}Z`;
    }

    const maxAlt = legs.length > 0 ? Math.max(...legs.map(l => l.alt_ft)) : 0;
    const climbBonusGal = (maxAlt / 10000.0) * (burnGph * 0.06);
    const taxiAndClimbGal = taxiGal + climbBonusGal;
    const tripFuelGal = (totalDistNm / effectiveGsKt) * burnGph;
    const contingencyGal = tripFuelGal * (contPct / 100.0);
    const reserveGal = (reserveMin / 60.0) * burnGph;
    const blockFuelGal = taxiAndClimbGal + tripFuelGal + contingencyGal + reserveGal;
    const efobLandingGal = fobGal - (taxiAndClimbGal + tripFuelGal);
    const enduranceHours = Math.max(0, (fobGal - taxiGal)) / burnGph;
    const maxRangeNm = enduranceHours * effectiveGsKt;

    return {
        legs, totalDistNm, effectiveGsKt, burnGph, kgPerGal, fobGal, capGal,
        totalEteMin: cumMinutes, taxiAndClimbGal, tripFuelGal,
        resAndContGal: contingencyGal + reserveGal, reserveGal, blockFuelGal,
        efobLandingGal, enduranceMin: enduranceHours * 60.0, maxRangeNm
    };
}

function populateFuelModalInputs() {
    const sel = document.getElementById('fpPresetSelect');
    if (sel) sel.value = fuelPerfConfig.preset || 'pioneer400';
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('fpCruiseKt', fuelPerfConfig.cruiseKt);
    setVal('fpBurnGph', fuelPerfConfig.burnGph);
    setVal('fpWindKt', fuelPerfConfig.windKt);
    setVal('fpReserveMin', fuelPerfConfig.reserveMin);
    setVal('fpContPct', fuelPerfConfig.contingencyPct);
    setVal('fpFobGal', Number(fuelPerfConfig.fobGal || 0).toFixed(1));
}

function onFuelPresetChange(presetKey) {
    const p = AIRCRAFT_PERF_PRESETS[presetKey] || AIRCRAFT_PERF_PRESETS.pioneer400;
    fuelPerfConfig.preset = presetKey;
    fuelPerfConfig.cruiseKt = p.cruiseKt;
    fuelPerfConfig.burnGph = p.burnGph;
    fuelPerfConfig.capGal = p.capGal;
    fuelPerfConfig.taxiGal = p.taxiGal;
    fuelPerfConfig.kgPerGal = p.kgPerGal;
    fuelPerfConfig.fobGal = p.capGal;
    populateFuelModalInputs();
    recalculateFuelAndPerfUI();
    if (!window._demoTourActive) saveFuelPerfSettings();
}

function onFuelInputModified() {
    fuelPerfConfig.cruiseKt = parseFloat(document.getElementById('fpCruiseKt')?.value) || 120;
    fuelPerfConfig.burnGph = parseFloat(document.getElementById('fpBurnGph')?.value) || 8.0;
    fuelPerfConfig.windKt = parseFloat(document.getElementById('fpWindKt')?.value) || 0;
    fuelPerfConfig.reserveMin = parseFloat(document.getElementById('fpReserveMin')?.value) || 45;
    fuelPerfConfig.contingencyPct = parseFloat(document.getElementById('fpContPct')?.value) || 5;
    fuelPerfConfig.fobGal = parseFloat(document.getElementById('fpFobGal')?.value) || 0;
    recalculateFuelAndPerfUI();
    if (!window._demoTourActive) saveFuelPerfSettings();
}

async function syncFuelPerfFromSim() {
    let acftName = (document.getElementById('valAcft')?.innerText || '').toUpperCase();
    let liveFuelGal = null;
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_telemetry) {
        try {
            const data = await window.pywebview.api.get_telemetry();
            if (data) {
                if (data.aircraft) acftName = String(data.aircraft).toUpperCase();
                if (data.fuel_gal !== undefined && data.fuel_gal !== null) liveFuelGal = Number(data.fuel_gal);
            }
        } catch (e) {}
    }

    if (acftName.includes('339')) onFuelPresetChange('mb339');
    else if (acftName.includes('PIONEER') || acftName.includes('SAVANNAH') || acftName.includes('ULM')) onFuelPresetChange('pioneer400');
    else if (acftName.includes('172') || acftName.includes('CESSNA')) onFuelPresetChange('c172');
    else if (acftName.includes('DA62') || acftName.includes('DIAMOND')) onFuelPresetChange('da62');
    else if (acftName.includes('350')) onFuelPresetChange('a350');
    else if (acftName.includes('320') || acftName.includes('321') || acftName.includes('737')) onFuelPresetChange('a320');

    if (liveFuelGal !== null && liveFuelGal > 0) {
        fuelPerfConfig.fobGal = Number(liveFuelGal.toFixed(1));
        populateFuelModalInputs();
        recalculateFuelAndPerfUI();
        saveFuelPerfSettings();
    }
}

function recalculateFuelAndPerfUI() {
    const sum = computeRouteAndFuelSummary();
    const fmt = (gal) => {
        const kg = Math.round(gal * sum.kgPerGal);
        const lit = Math.round(gal * 3.78541);
        return { main: `${gal.toFixed(1)} Gal`, sub: `${kg.toLocaleString()} kg • ${lit.toLocaleString()} L` };
    };
    const setCard = (idMain, idSub, galVal) => {
        const f = fmt(galVal);
        const mEl = document.getElementById(idMain), sEl = document.getElementById(idSub);
        if (mEl) mEl.innerText = f.main;
        if (sEl) sEl.innerText = f.sub;
    };

    setCard('fpOutTaxi', 'fpOutTaxiSub', sum.taxiAndClimbGal);
    setCard('fpOutTrip', 'fpOutTripSub', sum.tripFuelGal);
    setCard('fpOutRes', 'fpOutResSub', sum.resAndContGal);
    setCard('fpOutBlock', 'fpOutBlockSub', sum.blockFuelGal);
    setCard('fpOutEfob', 'fpOutEfobSub', Math.max(0, sum.efobLandingGal));

    const endEl = document.getElementById('fpOutEndurance');
    const rngEl = document.getElementById('fpOutRangeSub');
    if (endEl) endEl.innerText = formatMinutesToHhMm(sum.enduranceMin);
    if (rngEl) rngEl.innerText = `Range: ${sum.maxRangeNm.toFixed(0)} NM (@ ${sum.effectiveGsKt} kt)`;

    const distInfo = document.getElementById('fpRouteDistInfo');
    if (distInfo) distInfo.innerText = `Rotta attiva: ${sum.totalDistNm.toFixed(1)} NM • ETE: ${formatMinutesToHhMm(sum.totalEteMin)}`;

    const banner = document.getElementById('fpStatusBanner');
    if (banner) {
        if (sum.totalDistNm < 1) {
            banner.style.background = 'rgba(30,41,59,0.6)';
            banner.style.borderColor = 'rgba(148,163,184,0.3)';
            banner.style.color = '#cbd5e1';
            banner.innerText = 'ℹ️ Carica o crea un Piano di Volo per calcolare il Trip Fuel';
        } else if (sum.fobGal >= sum.blockFuelGal) {
            const extraGal = sum.fobGal - sum.blockFuelGal;
            banner.style.background = 'rgba(6,78,59,0.4)';
            banner.style.borderColor = 'rgba(52,211,153,0.55)';
            banner.style.color = '#34d399';
            banner.innerText = `🟢 CARBURANTE OK: Margine extra di +${extraGal.toFixed(1)} Gal (+${Math.round(extraGal * sum.kgPerGal)} kg) oltre la riserva`;
        } else if (sum.fobGal >= (sum.taxiAndClimbGal + sum.tripFuelGal + sum.reserveGal * 0.5)) {
            const deficit = sum.blockFuelGal - sum.fobGal;
            banner.style.background = 'rgba(120,53,15,0.45)';
            banner.style.borderColor = 'rgba(251,191,36,0.65)';
            banner.style.color = '#fbbf24';
            banner.innerText = `🟡 ATTENZIONE: Riserva parzialmente intaccata (-${deficit.toFixed(1)} Gal rispetto al Block Fuel)`;
        } else {
            const missing = sum.blockFuelGal - sum.fobGal;
            banner.style.background = 'rgba(127,29,29,0.5)';
            banner.style.borderColor = 'rgba(244,63,94,0.65)';
            banner.style.color = '#f43f5e';
            banner.innerText = `🔴 CARBURANTE INSUFFICIENTE: Mancano ${missing.toFixed(1)} Gal (${Math.round(missing * sum.kgPerGal)} kg) per il Block Fuel!`;
        }
    }
}

function openFuelPerfModal() {
    ensureNavlogAndFuelUI();
    populateFuelModalInputs();
    recalculateFuelAndPerfUI();
    const modal = document.getElementById('fuelPerfModal');
    if (modal) modal.style.display = 'flex';
}

function closeFuelPerfModal() {
    const modal = document.getElementById('fuelPerfModal');
    if (modal) modal.style.display = 'none';
}

function renderNavlogTable() {
    ensureNavlogAndFuelUI();
    const sum = computeRouteAndFuelSummary();
    const tbody = document.getElementById('navlogTableBody');
    if (!tbody) return;

    const depIdent = sum.legs.length > 0 ? sum.legs[0].ident : '---';
    const destIdent = sum.legs.length > 1 ? sum.legs[sum.legs.length - 1].ident : '---';
    const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.innerText = t; };

    setTxt('nlSumRoute', `${depIdent} ➔ ${destIdent}`);
    setTxt('nlSumDist', `${sum.totalDistNm.toFixed(1)} NM`);
    setTxt('nlSumGs', `${sum.effectiveGsKt} kt`);
    setTxt('nlSumEte', formatMinutesToHhMm(sum.totalEteMin));
    setTxt('nlSumFuel', `${sum.tripFuelGal.toFixed(1)} Gal (${Math.round(sum.tripFuelGal * sum.kgPerGal)} kg)`);

    if (sum.legs.length < 2) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--text-muted);">Nessun Piano di Volo attivo. Importa da SimBrief, carica un file .pln o clicca su ➕ Crea.</td></tr>`;
        return;
    }

    let activeLegIdx = -1;
    const simDot = document.getElementById('simDot');
    if ((simDot && simDot.classList.contains('live')) || window._demoTourActive) {
        if (typeof lastAcftLatLng !== 'undefined' && lastAcftLatLng && typeof calculateRouteProgress === 'function') {
            const prog = calculateRouteProgress(lastAcftLatLng.lat, lastAcftLatLng.lng);
            if (prog && prog.legIndex !== undefined) activeLegIdx = prog.legIndex + 1;
        }
    }

    tbody.innerHTML = sum.legs.map((leg, idx) => {
        const isActive = (idx === activeLegIdx);
        const procBadgeColor = leg.proc.includes('SID') ? '#34d399'
            : (leg.proc.includes('STAR') ? '#fbbf24'
            : (leg.proc.includes('APPR') ? '#38bdf8' : '#c084fc'));

        return `
            <tr class="navlog-row ${isActive ? 'active-leg-row' : ''}" onclick="focusNavlogWaypoint(${leg.lat}, ${leg.lon})">
                <td style="color:var(--text-muted);">${idx + 1}</td>
                <td style="font-weight:700;color:${idx === 0 ? '#34d399' : (idx === sum.legs.length - 1 ? '#38bdf8' : '#f8fafc')};">${isActive ? '✈️ ' : ''}${leg.ident}</td>
                <td><span style="color:${procBadgeColor};font-weight:700;font-size:10.5px;">${leg.proc}</span></td>
                <td style="color:#38bdf8;font-weight:600;">${leg.alt_ft.toLocaleString()}</td>
                <td>${idx === 0 ? '---' : `${String(leg.hdg).padStart(3, '0')}°`}</td>
                <td style="font-weight:600;">${idx === 0 ? '0.0' : leg.legNm.toFixed(1)}</td>
                <td style="color:var(--text-muted);">${leg.remNm.toFixed(1)}</td>
                <td style="color:var(--emerald);">${idx === 0 ? '---' : formatMinutesToHhMm(leg.eteMin)}</td>
                <td>${leg.etaUtc}</td>
                <td>${leg.legFuelGal.toFixed(1)} <span style="color:var(--text-muted);font-size:10px;">(${Math.round(leg.legFuelKg)}kg)</span></td>
                <td style="font-weight:700;color:${leg.efobGal > sum.reserveGal ? '#34d399' : '#f43f5e'};">${leg.efobGal.toFixed(1)}</td>
            </tr>
        `;
    }).join('');
}

function focusNavlogWaypoint(lat, lon) {
    if (typeof map !== 'undefined' && map) {
        closeNavlogModal();
        if (typeof setFollowState === 'function') setFollowState(0);
        map.flyTo([lat, lon], Math.max(map.getZoom(), 10), { duration: 0.8 });
    }
}

function openNavlogModal() {
    ensureNavlogAndFuelUI();
    renderNavlogTable();
    const modal = document.getElementById('navlogModal');
    if (modal) modal.style.display = 'flex';
}

function closeNavlogModal() {
    const modal = document.getElementById('navlogModal');
    if (modal) modal.style.display = 'none';
}

async function copyNavlogText() {
    const sum = computeRouteAndFuelSummary();
    if (sum.legs.length < 2) return;
    const lines = [
        `AEROGLASS NAV - NAVIGATION LOG (${sum.legs[0].ident} -> ${sum.legs[sum.legs.length - 1].ident})`,
        `DIST: ${sum.totalDistNm.toFixed(1)} NM | GS: ${sum.effectiveGsKt} kt | ETE: ${formatMinutesToHhMm(sum.totalEteMin)} | BLOCK FUEL: ${sum.blockFuelGal.toFixed(1)} Gal (${Math.round(sum.blockFuelGal * sum.kgPerGal)} kg)`,
        `------------------------------------------------------------------------------------------`,
        `#   IDENT   VIA       ALT(ft)  HDG   LEG(NM)  REM(NM)  ETE    ETA(UTC)  FUEL(Gal)  EFOB(Gal)`
    ];
    sum.legs.forEach((l, i) => {
        lines.push(
            `${String(i + 1).padEnd(3)} ${l.ident.padEnd(7)} ${String(l.proc).slice(0, 8).padEnd(9)} ${String(l.alt_ft).padStart(7)}  ${i === 0 ? '---' : String(l.hdg).padStart(3, '0') + '°'}  ${l.legNm.toFixed(1).padStart(7)}  ${l.remNm.toFixed(1).padStart(7)}  ${formatMinutesToHhMm(l.eteMin).padEnd(6)} ${l.etaUtc.padEnd(9)} ${l.legFuelGal.toFixed(1).padStart(9)}  ${l.efobGal.toFixed(1).padStart(8)}`
        );
    });
    try {
        await navigator.clipboard.writeText(lines.join('\n'));
        const btn = document.getElementById('btnCopyNavlog');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✅ Copiato!';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        }
    } catch (e) {}
}

function exportNavlogCsv() {
    const sum = computeRouteAndFuelSummary();
    if (sum.legs.length < 2) return;
    const rows = [['SEQ', 'IDENT', 'VIA_PROC', 'ALT_FT', 'HDG_DEG', 'LEG_NM', 'REM_NM', 'ETE', 'ETA_UTC', 'LEG_FUEL_GAL', 'LEG_FUEL_KG', 'EFOB_GAL']];
    sum.legs.forEach((l, i) => {
        rows.push([
            i + 1, l.ident, `"${l.proc}"`, l.alt_ft, i === 0 ? 0 : l.hdg,
            l.legNm.toFixed(1), l.remNm.toFixed(1), formatMinutesToHhMm(l.eteMin),
            l.etaUtc, l.legFuelGal.toFixed(1), Math.round(l.legFuelKg), l.efobGal.toFixed(1)
        ]);
    });
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NavLog_${sum.legs[0].ident}_${sum.legs[sum.legs.length - 1].ident}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}