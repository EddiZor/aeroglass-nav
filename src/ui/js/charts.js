// ==============================================================================
// MODULO GESTIONE CARTE AEROPORTUALI & OVERLAY GEOREFERENZIATO (AIP/ENAV/IFR)
// ==============================================================================

let currentAirportCharts = [];
let activeSelectedChart = null;
let activeMapOverlayLayer = null;
let cornerPickingMode = null; // 'NW' oppure 'SE'
let tempCalibBounds = { nw: null, se: null };
let activeChartDataUrl = null;

function openChartsManagerModal() {
    const modal = document.getElementById('chartsModal');
    if (!modal) {
        console.error("[Charts] Elemento #chartsModal non presente nel DOM");
        return;
    }
    modal.style.display = 'flex';

    const icaoInput = document.getElementById('chartIcaoInput');
    if (icaoInput && !icaoInput.value) {
        if (typeof flightPlan !== 'undefined' && Array.isArray(flightPlan) && flightPlan.length > 0) {
            icaoInput.value = flightPlan[flightPlan.length - 1].ident || flightPlan[0].ident || 'LIPZ';
        } else {
            icaoInput.value = 'LIPZ';
        }
    }
    loadCurrentAirportCharts();
}

function closeChartsModal() {
    const modal = document.getElementById('chartsModal');
    if (modal) modal.style.display = 'none';
    if (cornerPickingMode) cancelCornerPick();
}

async function loadCurrentAirportCharts() {
    const icaoInput = document.getElementById('chartIcaoInput');
    const icao = (icaoInput?.value || '').trim().toUpperCase();
    if (!icao) return;

    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_airport_charts) {
        try {
            const res = await window.pywebview.api.get_airport_charts(icao);
            if (res && res.success) {
                currentAirportCharts = res.charts || [];
                renderChartsListUI();
            }
        } catch (e) {
            console.error("[Charts] Errore caricamento lista carte:", e);
        }
    }
}

function renderChartsListUI() {
    const container = document.getElementById('chartsListContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!currentAirportCharts || currentAirportCharts.length === 0) {
        container.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 20px 8px;">Nessuna carta registrata per questo aeroporto.<br>Clicca su <b>➕ Importa Carta</b>.</div>';
        return;
    }

    currentAirportCharts.forEach(c => {
        const item = document.createElement('div');
        item.className = 'wpt-card';
        item.style.cssText = 'padding: 6px 8px; margin-bottom: 4px; display: flex; flex-direction: column; gap: 3px; cursor: pointer;';
        if (activeSelectedChart && activeSelectedChart.id === c.id) {
            item.style.borderColor = 'var(--cyan)';
            item.style.background = 'rgba(56,189,248,0.12)';
        }

        const icon = c.is_pdf ? '📄' : '🗺️';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b style="font-size:11.5px; color:#f8fafc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 190px;">${icon} ${c.name}</b>
                <span style="font-size:9px; background:rgba(56,189,248,0.2); color:var(--cyan); padding:1px 4px; border-radius:3px;">${c.chart_type}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                <span style="font-size:9.5px; color:${c.bounds_json ? 'var(--emerald)' : 'var(--text-muted)'};">${c.bounds_json ? '✅ Georeferenziata' : (c.is_pdf ? 'Lettura PDF' : '⚠️ Non calibrata')}</span>
                <button class="btn btn-danger" style="padding:1px 4px; font-size:9px;" onclick="event.stopPropagation(); deleteChartRecord(${c.id})">✕</button>
            </div>
        `;

        item.onclick = () => selectChartForDisplay(c);
        container.appendChild(item);
    });
}

async function selectChartForDisplay(chart) {
    activeSelectedChart = chart;
    renderChartsListUI();

    const placeholder = document.getElementById('chartViewerPlaceholder');
    const frame = document.getElementById('chartViewerFrame');
    const img = document.getElementById('chartViewerImage');
    const calibBox = document.getElementById('geoCalibrationBox');
    const opacitySlider = document.getElementById('chartOpacitySlider');

    if (placeholder) placeholder.style.display = 'none';
    if (calibBox) calibBox.style.display = 'block';
    if (opacitySlider) opacitySlider.value = chart.opacity || 0.75;

    if (chart.bounds_json) {
        try {
            const b = JSON.parse(chart.bounds_json);
            tempCalibBounds = { nw: b[0], se: b[1] };
        } catch (e) {
            tempCalibBounds = { nw: null, se: null };
        }
    } else {
        tempCalibBounds = { nw: null, se: null };
    }

    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_chart_content) {
        try {
            const res = await window.pywebview.api.get_chart_content(chart.file_path);
            if (res && res.success && res.data_url) {
                activeChartDataUrl = res.data_url;
                if (chart.is_pdf) {
                    if (img) { img.style.display = 'none'; img.src = ''; }
                    if (frame) {
                        frame.style.display = 'block';
                        frame.src = res.data_url;
                    }
                } else {
                    if (frame) { frame.style.display = 'none'; frame.src = ''; }
                    if (img) {
                        img.style.display = 'block';
                        img.src = res.data_url;
                    }
                }
            } else {
                alert("Errore apertura documento cartina: " + (res?.error || "Percorso non accessibile"));
            }
        } catch (e) {
            console.error("[Charts] Errore get_chart_content:", e);
        }
    }
}

async function promptImportChart() {
    const icaoInput = document.getElementById('chartIcaoInput');
    const icao = (icaoInput?.value || '').trim().toUpperCase();
    if (!icao) {
        alert("Inserisci prima il codice ICAO dell'aeroporto.");
        return;
    }

    if (window.pywebview && window.pywebview.api && window.pywebview.api.open_chart_file) {
        try {
            const fileRes = await window.pywebview.api.open_chart_file();
            if (fileRes && fileRes.success) {
                const chartName = prompt("Inserisci il nome per questa carta (es. IAC ILS RWY 04R o SID CHI):", fileRes.name);
                if (!chartName) return;

                const chartType = fileRes.is_pdf ? "AIP_PDF" : "GEO_MAP";

                let defaultBoundsJson = null;
                const apt = (typeof findAirport === 'function') ? findAirport(icao) : null;
                if (apt && apt.lat && apt.lon && !fileRes.is_pdf) {
                    const b = [
                        [Number((apt.lat + 0.04).toFixed(5)), Number((apt.lon - 0.06).toFixed(5))],
                        [Number((apt.lat - 0.04).toFixed(5)), Number((apt.lon + 0.06).toFixed(5))]
                    ];
                    defaultBoundsJson = JSON.stringify(b);
                }

                await window.pywebview.api.save_chart_overlay(
                    icao,
                    chartName,
                    chartType,
                    fileRes.path,
                    fileRes.is_pdf,
                    defaultBoundsJson,
                    0.75
                );

                await loadCurrentAirportCharts();
            }
        } catch (e) {
            console.error("[Charts] Errore import carta:", e);
        }
    }
}

async function deleteChartRecord(chartId) {
    if (!confirm("Rimuovere questa cartina dall'elenco?")) return;
    if (window.pywebview && window.pywebview.api && window.pywebview.api.delete_chart_overlay) {
        try {
            await window.pywebview.api.delete_chart_overlay(chartId);
            if (activeSelectedChart && activeSelectedChart.id === chartId) {
                activeSelectedChart = null;
                activeChartDataUrl = null;
                if (activeMapOverlayLayer && typeof map !== 'undefined') {
                    map.removeLayer(activeMapOverlayLayer);
                    activeMapOverlayLayer = null;
                }
                const frame = document.getElementById('chartViewerFrame');
                const img = document.getElementById('chartViewerImage');
                const placeholder = document.getElementById('chartViewerPlaceholder');
                if (frame) { frame.style.display = 'none'; frame.src = ''; }
                if (img) { img.style.display = 'none'; img.src = ''; }
                if (placeholder) placeholder.style.display = 'flex';
            }
            await loadCurrentAirportCharts();
        } catch (e) {
            console.error("[Charts] Errore eliminazione carta:", e);
        }
    }
}

async function applyAutoRunwayBounds() {
    if (!activeSelectedChart) return;
    const icao = activeSelectedChart.icao;
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_airport_auto_bounds) {
        try {
            const res = await window.pywebview.api.get_airport_auto_bounds(icao);
            if (res && res.success && res.bounds) {
                tempCalibBounds = { nw: res.bounds[0], se: res.bounds[1] };
                if (activeMapOverlayLayer) {
                    activeMapOverlayLayer.setBounds(res.bounds);
                }
                if (typeof showAeroNavToast === 'function') {
                    showAeroNavToast(`🎯 Bounding box allineato su <b>${icao}</b> (${res.source})`);
                }
            } else {
                alert("Non sono state trovate piste geometriche per " + icao);
            }
        } catch (e) {
            console.error("[Charts] Errore auto-bounds:", e);
        }
    }
}

async function toggleSelectedChartMapOverlay() {
    if (!activeSelectedChart) {
        alert("Seleziona prima una cartina dall'elenco a sinistra.");
        return;
    }

    if (activeMapOverlayLayer && typeof map !== 'undefined') {
        map.removeLayer(activeMapOverlayLayer);
        activeMapOverlayLayer = null;
        const btn = document.getElementById('btnToggleGeoOverlay');
        if (btn) btn.innerText = "🗺️ Proietta su Mappa";
        return;
    }

    let renderSrc = activeChartDataUrl;

    if (activeSelectedChart.is_pdf) {
        if (typeof showAeroNavToast === 'function') {
            showAeroNavToast("⏳ Conversione pagina PDF in overlay alta definizione...");
        }
        if (window.pywebview && window.pywebview.api && window.pywebview.api.render_pdf_to_overlay_image) {
            try {
                const convRes = await window.pywebview.api.render_pdf_to_overlay_image(activeSelectedChart.file_path, 0, 200);
                if (convRes && convRes.success && convRes.data_url) {
                    renderSrc = convRes.data_url;
                } else {
                    alert("Errore conversione PDF: " + (convRes?.error || "Operazione fallita"));
                    return;
                }
            } catch (err) {
                alert("Errore chiamata render PDF: " + err);
                return;
            }
        }
    }

    if (!renderSrc) {
        renderSrc = 'file:///' + activeSelectedChart.file_path.replace(/\\/g, '/');
    }

    let bounds = null;
    if (tempCalibBounds.nw && tempCalibBounds.se) {
        bounds = [tempCalibBounds.nw, tempCalibBounds.se];
    } else if (activeSelectedChart.bounds_json) {
        try { bounds = JSON.parse(activeSelectedChart.bounds_json); } catch (e) {}
    }

    if (!bounds || bounds.length < 2) {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.get_airport_auto_bounds) {
            try {
                const autoRes = await window.pywebview.api.get_airport_auto_bounds(activeSelectedChart.icao);
                if (autoRes && autoRes.success && autoRes.bounds) {
                    bounds = autoRes.bounds;
                    tempCalibBounds = { nw: bounds[0], se: bounds[1] };
                }
            } catch (e) {}
        }
    }

    if (!bounds || bounds.length < 2) {
        if (typeof map !== 'undefined') {
            const center = map.getCenter();
            bounds = [
                [center.lat + 0.02, center.lng - 0.03],
                [center.lat - 0.02, center.lng + 0.03]
            ];
        } else {
            bounds = [[45.5, 12.3], [45.4, 12.4]];
        }
    }

    const opacity = activeSelectedChart.opacity || 0.75;

    if (typeof L !== 'undefined' && typeof map !== 'undefined') {
        activeMapOverlayLayer = L.imageOverlay(renderSrc, bounds, {
            opacity: opacity,
            interactive: false
        }).addTo(map);

        map.fitBounds(bounds);
    }

    closeChartsModal();
    const btn = document.getElementById('btnToggleGeoOverlay');
    if (btn) btn.innerText = "❌ Rimuovi Overlay Mappa";

    if (typeof showAeroNavToast === 'function') {
        showAeroNavToast(`🗺️ Overlay attivo: <b>${activeSelectedChart.name}</b> (${Math.round(opacity * 100)}% opacità)`);
    }
}

function updateActiveChartOpacity(val) {
    const op = parseFloat(val);
    if (activeMapOverlayLayer) {
        activeMapOverlayLayer.setOpacity(op);
    }
    if (activeSelectedChart) {
        activeSelectedChart.opacity = op;
    }
}

function startCornerPick(corner) {
    cornerPickingMode = corner;
    closeChartsModal();
    if (typeof showAeroNavToast === 'function') {
        showAeroNavToast(`📍 Clicca sulla mappa l'angolo <b>${corner === 'NW' ? 'Nord-Ovest (Top-Left)' : 'Sud-Est (Bottom-Right)'}</b> della cartina`);
    }

    const onMapClick = (e) => {
        const lat = Number(e.latlng.lat.toFixed(5));
        const lon = Number(e.latlng.lng.toFixed(5));

        if (cornerPickingMode === 'NW') tempCalibBounds.nw = [lat, lon];
        else if (cornerPickingMode === 'SE') tempCalibBounds.se = [lat, lon];

        if (typeof map !== 'undefined') {
            map.off('click', onMapClick);
        }
        cornerPickingMode = null;
        openChartsManagerModal();

        if (tempCalibBounds.nw && tempCalibBounds.se && activeMapOverlayLayer) {
            activeMapOverlayLayer.setBounds([tempCalibBounds.nw, tempCalibBounds.se]);
        }
    };

    if (typeof map !== 'undefined') {
        map.once('click', onMapClick);
    }
}

function cancelCornerPick() {
    cornerPickingMode = null;
}

async function saveCurrentChartCalibration() {
    if (!activeSelectedChart || !tempCalibBounds.nw || !tempCalibBounds.se) {
        alert("Definisci prima entrambi gli angoli (NW e SE) cliccando sulla mappa o con Auto-Allinea.");
        return;
    }

    const boundsJson = JSON.stringify([tempCalibBounds.nw, tempCalibBounds.se]);
    const opacitySlider = document.getElementById('chartOpacitySlider');
    const opacity = opacitySlider ? parseFloat(opacitySlider.value) : 0.75;

    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_chart_overlay) {
        try {
            await window.pywebview.api.save_chart_overlay(
                activeSelectedChart.icao,
                activeSelectedChart.name,
                activeSelectedChart.chart_type,
                activeSelectedChart.file_path,
                activeSelectedChart.is_pdf,
                boundsJson,
                opacity
            );
            activeSelectedChart.bounds_json = boundsJson;
            activeSelectedChart.opacity = opacity;
            alert("✅ Calibrazione cartina salvata con successo in SQLite!");
            await loadCurrentAirportCharts();
        } catch (e) {
            console.error("[Charts] Errore salvataggio calibrazione:", e);
        }
    }
}

// Esportazione esplicita su window
window.openChartsManagerModal = openChartsManagerModal;
window.closeChartsModal = closeChartsModal;
window.loadCurrentAirportCharts = loadCurrentAirportCharts;
window.promptImportChart = promptImportChart;
window.toggleSelectedChartMapOverlay = toggleSelectedChartMapOverlay;
window.updateActiveChartOpacity = updateActiveChartOpacity;
window.startCornerPick = startCornerPick;
window.applyAutoRunwayBounds = applyAutoRunwayBounds;
window.saveCurrentChartCalibration = saveCurrentChartCalibration;
window.deleteChartRecord = deleteChartRecord;