// ==============================================================================
// AEROGLASS-NAV - DEMO AUTOMATICA v1.0.0 BILINGUE (Tasto F2)
// Sequenza completa: Auto-Route -> Hold IFR -> Filtri Mappa -> Carte AIP -> EFB
// Supporto cambio lingua live IT / EN in corso di esecuzione (Pulsante o tasto L)
// ==============================================================================

let isDemo2Running = false;
let demo2AbortController = false;
let demo2Lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang.toLowerCase() : 'it';
let currentDemoStepKey = "prologue";

const DEMO2_TEXTS = {
    it: {
        prologue_title: "AEROGLASS-NAV v1.0.0",
        prologue_sub: "Inizializzazione Tour Funzionalità Completo",
        phase1_title: "1/5 • AIRWAY AUTO-ROUTING (SQLITE A*)",
        phase1_sub: "Calcolo ottimale della rotta su aerovie IFR Low da LIPZ a LIPB",
        phase2_title: "2/5 • PROCEDURE STRUMENTALI, HOLDING (+50%) & VNAV",
        phase2_sub: "Attivazione circuito d'attesa IFR e profilo altimetrico multistrato",
        phase3_title: "3/5 • CARTOGRAFIA & PROFILI FILTRI MAPPA",
        phase3_sub: "Regolazione real-time di luminosità, contrasto e saturazione",
        phase4_title: "4/5 • CARTE DI PROCEDURA & OVERLAY GEOREFERENZIATO",
        phase4_sub: "Consultazione documenti AIP/ENAV con allineamento geometrico Leaflet",
        phase5_title: "5/5 • EFB TABLET (QR CODE) & STORICO VOLI SQLITE",
        phase5_sub: "Sincronizzazione in cabina via Wi-Fi e registro consumi carburante",
        conclusion_title: "AEROGLASS-NAV v1.0.0",
        conclusion_sub: "Tutte le funzioni sono pronte e collegate al simulatore!",
        toast_start: "🎬 Avvio Demo Automatica v1.0.0 (F2: stop • L: lingua)",
        toast_stop: "⏹️ Demo automatica interrotta",
        btn_lang: "🌐 LINGUA: IT"
    },
    en: {
        prologue_title: "AEROGLASS-NAV v1.0.0",
        prologue_sub: "Full Feature Tour Initialization",
        phase1_title: "1/5 • AIRWAY AUTO-ROUTING (SQLITE A*)",
        phase1_sub: "Optimal airway route calculation on IFR Low from LIPZ to LIPB",
        phase2_title: "2/5 • INSTRUMENT PROCEDURES, HOLDING (+50%) & VNAV",
        phase2_sub: "IFR holding pattern activation and multilayer elevation profile",
        phase3_title: "3/5 • CARTOGRAPHY & MAP FILTER PROFILES",
        phase3_sub: "Real-time adjustment of brightness, contrast, and saturation",
        phase4_title: "4/5 • PROCEDURE CHARTS & GEOREFERENCED OVERLAY",
        phase4_sub: "AIP/ENAV document viewing with Leaflet geometric alignment",
        phase5_title: "5/5 • EFB TABLET (QR CODE) & SQLITE FLIGHT LOGBOOK",
        phase5_sub: "Cockpit Wi-Fi sync and fuel consumption flight log",
        conclusion_title: "AEROGLASS-NAV v1.0.0",
        conclusion_sub: "All features are ready and connected to the simulator!",
        toast_start: "🎬 Starting Automatic Demo v1.0.0 (F2: stop • L: language)",
        toast_stop: "⏹️ Automatic demo stopped",
        btn_lang: "🌐 LANG: EN"
    }
};

const demoSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function updateDemoCaptionUI() {
    const box = document.getElementById("demo2CaptionBanner");
    if (!box) return;

    const texts = DEMO2_TEXTS[demo2Lang] || DEMO2_TEXTS.it;
    const title = texts[`${currentDemoStepKey}_title`] || "";
    const sub = texts[`${currentDemoStepKey}_sub`] || "";

    const titleEl = document.getElementById("demo2CapTitle");
    const subEl = document.getElementById("demo2CapSub");
    const btnLang = document.getElementById("btnDemo2Lang");

    if (titleEl) titleEl.innerText = title;
    if (subEl) subEl.innerText = sub;
    if (btnLang) btnLang.innerText = texts.btn_lang;
}

function showDemoCaption(stepKey) {
    currentDemoStepKey = stepKey;
    let box = document.getElementById("demo2CaptionBanner");
    if (!box) {
        box = document.createElement("div");
        box.id = "demo2CaptionBanner";
        box.style.cssText = `
            position: fixed;
            top: 55px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(9, 13, 22, 0.94);
            border: 1.5px solid var(--cyan, #38bdf8);
            box-shadow: 0 4px 30px rgba(0, 210, 255, 0.4);
            color: #f8fafc;
            padding: 8px 18px;
            border-radius: 20px;
            z-index: 10000;
            font-family: Consolas, -apple-system, sans-serif;
            transition: opacity 0.3s ease, transform 0.3s ease;
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            gap: 16px;
            pointer-events: auto;
        `;
        box.innerHTML = `
            <div style="text-align: center; min-width: 380px;">
                <div id="demo2CapTitle" style="font-size: 13px; font-weight: 800; color: var(--cyan, #38bdf8); letter-spacing: 0.8px;"></div>
                <div id="demo2CapSub" style="font-size: 11px; color: #94a3b8; margin-top: 3px;"></div>
            </div>
            <button id="btnDemo2Lang" onclick="toggleDemo2Language(event)" title="Cambia lingua al volo / Switch language on the fly (Tasto L)" style="
                background: rgba(56, 189, 248, 0.15);
                border: 1px solid var(--cyan, #38bdf8);
                color: var(--cyan, #38bdf8);
                font-size: 10px;
                font-weight: 700;
                padding: 4px 10px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            ">
                🌐 LINGUA: IT
            </button>
        `;
        document.body.appendChild(box);
    }

    updateDemoCaptionUI();
    box.style.display = "flex";
    box.style.opacity = "1";
    box.style.transform = "translateX(-50%) translateY(0)";
}

function hideDemoCaption() {
    const box = document.getElementById("demo2CaptionBanner");
    if (box) {
        box.style.opacity = "0";
        box.style.transform = "translateX(-50%) translateY(-10px)";
        setTimeout(() => { if (box) box.style.display = "none"; }, 350);
    }
}

function toggleDemo2Language(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    demo2Lang = (demo2Lang === 'it') ? 'en' : 'it';
    updateDemoCaptionUI();

    if (typeof currentLang !== 'undefined' && currentLang !== demo2Lang && typeof toggleLanguage === 'function') {
        toggleLanguage();
    }
}

async function startDemo2() {
    if (isDemo2Running) {
        demo2AbortController = true;
        isDemo2Running = false;
        hideDemoCaption();
        const texts = DEMO2_TEXTS[demo2Lang] || DEMO2_TEXTS.it;
        if (typeof showAeroNavToast === 'function') showAeroNavToast(texts.toast_stop);
        return;
    }

    isDemo2Running = true;
    demo2AbortController = false;

    const texts = DEMO2_TEXTS[demo2Lang] || DEMO2_TEXTS.it;
    if (typeof showAeroNavToast === 'function') {
        showAeroNavToast(texts.toast_start);
    }

    try {
        // --- PROLOGO ---
        showDemoCaption("prologue");
        await demoSleep(2200);
        if (demo2AbortController) return;

        // --- FASE 1: PIANIFICAZIONE & AIRWAY AUTO-ROUTING ---
        showDemoCaption("phase1");
        if (typeof openCreateFplModal === 'function') openCreateFplModal();
        await demoSleep(1000);
        if (demo2AbortController) return;

        const depInp = document.getElementById("manualDep");
        const destInp = document.getElementById("manualDest");
        const typeSel = document.getElementById("autoRouteType");
        const altInp = document.getElementById("manualCruiseAlt");

        if (depInp) depInp.value = "LIPZ";
        if (destInp) destInp.value = "LIPB";
        if (typeSel) {
            typeSel.value = "IFR_LOW";
            if (typeof onAutoRouteTypeChange === 'function') onAutoRouteTypeChange("IFR_LOW");
        }
        if (altInp) altInp.value = "12000";
        await demoSleep(1200);
        if (demo2AbortController) return;

        if (typeof generateAutoAirwayRoute === 'function') {
            await generateAutoAirwayRoute();
        }
        await demoSleep(2400);
        if (demo2AbortController) return;

        if (typeof buildAndExportManualFlightPlan === 'function') {
            buildAndExportManualFlightPlan(false);
        }
        await demoSleep(2000);
        if (demo2AbortController) return;

        // --- FASE 2: INTERATTIVITÀ, HOLDING PATTERN & VNAV ---
        showDemoCaption("phase2");
        if (typeof map !== 'undefined' && typeof flightPlan !== 'undefined' && flightPlan.length > 2) {
            const mid = flightPlan[Math.floor(flightPlan.length / 2)];
            map.flyTo([mid.lat, mid.lon], 9, { duration: 1.5 });
        }
        await demoSleep(1800);
        if (demo2AbortController) return;

        const holdButtons = document.querySelectorAll("button[onclick*='Hold'], .fpl-card button");
        if (holdButtons.length > 0) {
            holdButtons[0].click();
        }
        await demoSleep(2500);
        if (demo2AbortController) return;

        const vnavDrawer = document.getElementById("elevationDrawer");
        if (vnavDrawer && !vnavDrawer.classList.contains("open") && typeof toggleDrawer === 'function') {
            toggleDrawer();
        }
        await demoSleep(2000);
        if (demo2AbortController) return;

        // --- FASE 3: TARATURA FILTRI MAPPA GIORNO / NOTTE ---
        showDemoCaption("phase3");
        if (typeof toggleMapLighting === 'function') toggleMapLighting();
        await demoSleep(1500);
        if (demo2AbortController) return;

        if (typeof toggleFilterCalibrator === 'function') toggleFilterCalibrator();
        await demoSleep(1000);
        if (demo2AbortController) return;

        const sBright = document.getElementById("sliderBrightness");
        const sContrast = document.getElementById("sliderContrast");
        if (sBright && typeof applyInteractiveFilters === 'function') {
            sBright.value = "0.90";
            applyInteractiveFilters();
        }
        await demoSleep(1200);
        if (sContrast && typeof applyInteractiveFilters === 'function') {
            sContrast.value = "1.45";
            applyInteractiveFilters();
        }
        await demoSleep(1500);
        if (demo2AbortController) return;

        if (typeof toggleFilterCalibrator === 'function') toggleFilterCalibrator();
        if (typeof toggleMapLighting === 'function') toggleMapLighting();
        await demoSleep(1200);
        if (demo2AbortController) return;

        // --- FASE 4: VISUALIZZATORE CARTE & OVERLAY MAPPA ---
        showDemoCaption("phase4");
        if (typeof openChartsManagerModal === 'function') openChartsManagerModal();
        await demoSleep(2000);
        if (demo2AbortController) return;

        const chartItems = document.querySelectorAll("#chartsListContainer .wpt-card");
        if (chartItems.length > 0) {
            chartItems[0].click();
            await demoSleep(1800);
            if (typeof toggleSelectedChartMapOverlay === 'function') {
                toggleSelectedChartMapOverlay();
                await demoSleep(2500);
                if (typeof toggleSelectedChartMapOverlay === 'function') {
                    toggleSelectedChartMapOverlay();
                }
            }
        } else {
            await demoSleep(1500);
            if (typeof closeChartsModal === 'function') closeChartsModal();
        }
        if (demo2AbortController) return;

        // --- FASE 5: EFB TABLET WI-FI & LOGBOOK ---
        showDemoCaption("phase5");
        if (typeof openEfbNetworkModal === 'function') openEfbNetworkModal();
        await demoSleep(2400);
        if (demo2AbortController) return;

        if (typeof closeEfbNetworkModal === 'function') closeEfbNetworkModal();
        await demoSleep(600);
        if (demo2AbortController) return;

        if (typeof openFlightHistoryModal === 'function') openFlightHistoryModal();
        await demoSleep(2400);
        if (demo2AbortController) return;

        if (typeof closeFlightHistoryModal === 'function') closeFlightHistoryModal();
        await demoSleep(800);

        // --- CONCLUSIONE ---
        showDemoCaption("conclusion");
        if (typeof map !== 'undefined' && typeof flightPlan !== 'undefined' && flightPlan.length > 0) {
            const b = L.latLngBounds(flightPlan.map(w => [w.lat, w.lon]));
            map.flyToBounds(b, { padding: [50, 50], duration: 1.5 });
        }
        await demoSleep(3500);
    } catch (err) {
        console.error("[Demo2] Errore esecuzione:", err);
    } finally {
        isDemo2Running = false;
        demo2AbortController = false;
        hideDemoCaption();
    }
}

// Ascolto tasti globali: F2 (Avvio/Stop), Esc (Stop), L (Cambio Lingua Live)
window.addEventListener("keydown", (e) => {
    if (e.key === "F2") {
        e.preventDefault();
        startDemo2();
    } else if (e.key === "Escape" && isDemo2Running) {
        e.preventDefault();
        startDemo2();
    } else if ((e.key === "l" || e.key === "L") && isDemo2Running) {
        e.preventDefault();
        toggleDemo2Language();
    }
});

// Esportazione globale su window
window.startDemo2 = startDemo2;
window.toggleDemo2Language = toggleDemo2Language;
window.showDemoCaption = showDemoCaption;
window.hideDemoCaption = hideDemoCaption;