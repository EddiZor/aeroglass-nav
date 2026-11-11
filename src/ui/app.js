// --- GESTIONE SIDEBAR FPL E CASSETTO VNAV ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarPanel');
    const arrow = document.getElementById('sidebarArrow');
    const label = document.getElementById('sidebarLabel');
    if (!sidebar) return;

    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('collapsed', !sidebarOpen);

    if (arrow) arrow.innerText = sidebarOpen ? '◀' : '▶';
    if (label) label.style.display = sidebarOpen ? 'none' : 'block';
}

function toggleDrawer() {
    const drawer = document.getElementById('elevationDrawer');
    const arrow = document.getElementById('drawerArrow');
    const infoBar = document.getElementById('bottomInfoBar');
    if (!drawer) return;

    drawerOpen = !drawerOpen;
    drawer.classList.toggle('collapsed', !drawerOpen);

    if (arrow) arrow.innerText = drawerOpen ? '▼' : '▲';
    if (infoBar) {
        infoBar.style.bottom = drawerOpen ? '134px' : '36px';
    }
}

// --- CAMBIO LINGUA IT / EN ---
function applyTranslations() {
    const t = translations[currentLang];
    if (!t) return;

    const langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.innerText = currentLang.toUpperCase();

    const omniSearch = document.getElementById('omniSearch');
    if (omniSearch) omniSearch.placeholder = t.searchPlaceholder;

    const fplTitle = document.getElementById('fplSectionTitle');
    if (fplTitle) fplTitle.innerText = t.activeFpl.toUpperCase();

    const lblFilters = document.getElementById('lblFilters');
    if (lblFilters) lblFilters.innerText = t.btnFilters;

    const lblReduce = document.getElementById('lblReduceExpand');
    if (lblReduce) lblReduce.innerText = t.btnReduce;

    const btnNavaids = document.getElementById('btnToggleNavaids');
    if (btnNavaids) btnNavaids.innerText = showNavaids ? t.btnNavaids : t.btnNavaidsOff;

    setFollowState(followState);

    const vnavText = document.getElementById('vnavText');
    if (vnavText && (!flightPlan || flightPlan.length === 0)) {
        vnavText.innerText = t.noFpl.toUpperCase();
    }
}

function toggleLanguage() {
    currentLang = (currentLang === 'it') ? 'en' : 'it';
    applyTranslations();
}

// --- RIDIMENSIONAMENTO LARGHEZZA SIDEBAR ---
function initSidebarResizer() {
    const sidebar = document.getElementById('sidebarPanel');
    const resizer = document.getElementById('sidebarResizer');
    if (!sidebar || !resizer) return;

    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        if (!sidebarOpen) return;
        isResizing = true;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = Math.max(260, Math.min(520, e.clientX - 16));
        sidebar.style.width = `${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
        }
    });
}

// --- DRAG & DROP FILE .PLN SULLA FINESTRA ---
function initDragAndDropPln() {
    const overlay = document.getElementById('dropZoneOverlay');
    if (!overlay) return;

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        overlay.style.display = 'flex';
    });

    overlay.addEventListener('dragleave', (e) => {
        e.preventDefault();
        overlay.style.display = 'none';
    });

    overlay.addEventListener('drop', (e) => {
        e.preventDefault();
        overlay.style.display = 'none';
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                if (ev.target?.result) {
                    await processAndRenderPlnXml(ev.target.result);
                }
            };
            reader.readAsText(files[0]);
        }
    });
}

// --- INIZIALIZZAZIONE APPLICAZIONE E DATI PYWEBVIEW ---
async function initAeroGlassApp() {
    if (initialized) return;
    initialized = true;

    updateFlightInfoBar(43.5, 12.0);
    setFollowState(followState);
    renderNavAids(vorsData, ilsData);
    updateMapScale();

    if (window.pywebview && window.pywebview.api) {
        try {
            if (window.pywebview.api.get_initial_data) {
                const initData = await window.pywebview.api.get_initial_data();
                if (initData) {
                    if (initData.airports && initData.airports.length > 0) {
                        airportsData = [...initData.airports, ...EXTRA_AIRPORTS];
                    }
                    if (initData.vors && initData.vors.length > 0) {
                        vorsData = initData.vors;
                    }
                    if (initData.ils && initData.ils.length > 0) {
                        ilsData = initData.ils;
                    }
    if (initData.simbrief_id) {
                    const sbInput = document.getElementById('simbriefIdInput');
                    if (sbInput) sbInput.value = initData.simbrief_id;
                    setSimbriefCompactMode(true);
                    }
                    if (initData.flight_plan && Array.isArray(initData.flight_plan) && initData.flight_plan.length > 0) {
                        flightPlan = initData.flight_plan;
                        updateFlightPlanUI(initData.alternate || null, true);
                    }
                    renderNavAids(vorsData, ilsData);
                }
            }
            await loadUserWaypoints(); 
        } catch (e) {}
    }

    setInterval(pollTelemetry, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    initSidebarResizer();
    initDragAndDropPln();
    updateFlightInfoBar(43.5, 12.0);

    // Aggiorna le coordinate al passaggio del mouse quando non connesso a MSFS
    if (typeof map !== 'undefined' && map) {
        map.on('mousemove', (e) => {
            const coordsEl = document.getElementById('infoCoords');
            if (coordsEl) {
                coordsEl.innerText = `LAT: ${e.latlng.lat.toFixed(5)} LON: ${e.latlng.lng.toFixed(5)}`;
            }
        });
    }

    window.addEventListener('click', (event) => {
        const createModal = document.getElementById('createFplModal');
        if (createModal && event.target === createModal) {
            closeCreateFplModal();
        }
        const histModal = document.getElementById('flightHistoryModal');
        if (histModal && event.target === histModal) {
            closeFlightHistoryModal();
        }
    });

    setTimeout(initAeroGlassApp, 300);
});

window.addEventListener('pywebviewready', initAeroGlassApp);