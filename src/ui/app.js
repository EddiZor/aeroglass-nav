// --- GESTIONE LINGUA INTERFACCIA ---
function checkSystemLanguage() {
    const sysLang = navigator.language || navigator.userLanguage || '';
    const isItalianSystem = sysLang.toLowerCase().startsWith('it');
    const langBtn = document.getElementById('btnLangSelect');
    if (langBtn) {
        if (isItalianSystem) {
            langBtn.style.display = 'inline-flex';
            currentLang = 'it';
        } else {
            langBtn.style.display = 'none';
            currentLang = 'en';
        }
    }
    applyCurrentLanguageUI();
}

function applyCurrentLanguageUI() {
    const langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.innerText = currentLang.toUpperCase();
    const t = translations[currentLang];

    const searchInput = document.getElementById('omniSearch');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;

    const fplTitleEl = document.getElementById('fplSectionTitle');
    if (fplTitleEl) fplTitleEl.innerText = t.activeFpl.toUpperCase();

    const btnCreate = document.getElementById('btnCreateFpl');
    if (btnCreate) btnCreate.innerHTML = `➕ ${t.btnCreate}`;

    const btnImport = document.getElementById('btnImportPln');
    if (btnImport) btnImport.innerHTML = `📁 ${t.btnImport}`;

    const btnExport = document.getElementById('btnExportPln');
    if (btnExport) btnExport.innerHTML = `💾 ${t.btnExport}`;

    const btnReload = document.getElementById('simbriefCompactBtn');
    if (btnReload) btnReload.innerHTML = `✈️ ${t.btnReload}`;

    const lblFilters = document.getElementById('lblFilters');
    if (lblFilters) lblFilters.innerText = t.btnFilters;

    const vnavText = document.getElementById('vnavText');
    if (vnavText) {
        if (!flightPlan || flightPlan.length === 0) {
            vnavText.textContent = t.noFpl.toUpperCase();
        } else {
            const maxAlt = Math.max(...flightPlan.map(w => Number(w.alt_ft) || 5000), 5000);
            vnavText.textContent = `VNAV MULTI-STEP (MAX ALT: ${maxAlt.toLocaleString()} FT)`;
        }
    }

    const btnFollow = document.getElementById('btnFollowAcft');
    if (btnFollow) {
        if (followState === 0) btnFollow.innerText = t.btnFollowFree;
        else if (followState === 1) btnFollow.innerText = t.btnFollowNorth;
        else if (followState === 2) btnFollow.innerText = t.btnFollowTrack;
    }

    const btnNavaids = document.getElementById('btnToggleNavaids');
    if (btnNavaids) btnNavaids.innerText = showNavaids ? t.btnNavaids : t.btnNavaidsOff;

    const lblReduce = document.getElementById('lblReduceExpand');
    if (lblReduce) lblReduce.innerText = t.btnReduce;
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'it' : 'en';
    applyCurrentLanguageUI();
}

// --- GESTIONE SIDEBAR RIDIMENSIONABILE E CASSETTO VNAV ---
const sidebarPanel = document.getElementById('sidebarPanel');
const sidebarResizer = document.getElementById('sidebarResizer');
let isResizingSidebar = false;

if (sidebarResizer && sidebarPanel) {
    sidebarResizer.addEventListener('mousedown', function(e) {
        isResizingSidebar = true;
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
            document.body.style.cursor = '';
        }
    });
}

function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const sidebar = document.getElementById('sidebarPanel');
    const arrow = document.getElementById('sidebarArrow');
    const label = document.getElementById('sidebarLabel');
    if (!sidebar) return;
    if (sidebarOpen) {
        sidebar.classList.remove('collapsed');
        if (arrow) arrow.innerText = '◀';
        if (label) label.style.display = 'none';
    } else {
        sidebar.classList.add('collapsed');
        if (arrow) arrow.innerText = '▶';
        if (label) label.style.display = 'block';
    }
}

function toggleDrawer() {
    drawerOpen = !drawerOpen;
    const drawer = document.getElementById('elevationDrawer');
    const sidebar = document.getElementById('sidebarPanel');
    const infoBar = document.getElementById('flightInfoBar');
    const arrow = document.getElementById('drawerArrow');
    if (!drawer || !sidebar) return;
    if (drawerOpen) {
        drawer.classList.remove('collapsed');
        sidebar.style.bottom = '134px';
        if (infoBar) infoBar.style.bottom = '134px';
        if (arrow) arrow.innerText = '▼';
    } else {
        drawer.classList.add('collapsed');
        sidebar.style.bottom = '56px';
        if (infoBar) infoBar.style.bottom = '56px';
        if (arrow) arrow.innerText = '▲';
    }
}

// --- DRAG & DROP FILE .PLN ---
const dropOverlay = document.getElementById('dropZoneOverlay');
window.addEventListener('dragenter', (e) => { e.preventDefault(); if (dropOverlay) dropOverlay.style.display = 'flex'; });
window.addEventListener('dragover', (e) => { e.preventDefault(); });
if (dropOverlay) {
    dropOverlay.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
            dropOverlay.style.display = 'none';
        }
    });
    dropOverlay.addEventListener('dragover', (e) => { e.preventDefault(); });
}
window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dropOverlay) dropOverlay.style.display = 'none';
    const files = e.dataTransfer ? e.dataTransfer.files : null;
    if (files && files.length > 0) {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try { await processAndRenderPlnXml(event.target.result); }
            catch (err) { alert("Formato XML non valido: " + err.message); }
        };
        reader.readAsText(files[0]);
    }
});

// --- AVVIO APPLICAZIONE ---
async function initApp() {
    if (initialized || !window.pywebview || !window.pywebview.api) return;
    initialized = true;
    checkSystemLanguage();
    map.invalidateSize();

    renderNavAids(vorsData, ilsData);
    updateFlightInfoBar(41.8003, 12.2389);

    await window.pywebview.api.connect_sim();
    const nav = await window.pywebview.api.get_navdata();
    if (nav) {
        if (nav.vors && nav.vors.length > 0) vorsData = nav.vors;
        if (nav.ils && nav.ils.length > 0) ilsData = nav.ils;
        renderNavAids(vorsData, ilsData);

        if (nav.simbrief_userid) {
            document.getElementById('simbriefIdInput').value = nav.simbrief_userid;
            setSimbriefCompactMode(true);
        }
    }

    await loadUserWaypoints();

    pollTelemetry();
    setInterval(pollTelemetry, 1000);
}

window.addEventListener('resize', () => { if (map) map.invalidateSize(); });
window.addEventListener('pywebviewready', initApp);
setTimeout(initApp, 150);