// ============================================================================
// 🎓 AEROGLASS-NAV — TOUR GUIDATO INTERATTIVO BILINGUE IT / EN (demo.js)
// ============================================================================

window._demoTourActive = false;
let _demoStepIndex = 0;
let _demoAutoTimer = null;
let _demoAutoPlay = true;
const DEMO_AUTO_INTERVAL_MS = 9000;

function isDemoEnglish() {
    if (typeof window._demoLang === 'string') return window._demoLang === 'en';
    if (typeof currentLang !== 'undefined') return currentLang === 'en';
    if (typeof window.currentLang !== 'undefined') return window.currentLang === 'en';
    const langBtn = document.getElementById('btnLangSelect');
    if (langBtn && langBtn.textContent && langBtn.textContent.toUpperCase().includes('EN')) return true;
    return localStorage.getItem('aeroglass_lang') === 'en';
}

function toggleDemoLanguage() {
    const nextLang = isDemoEnglish() ? 'it' : 'en';
    window._demoLang = nextLang;
    if (typeof toggleLanguage === 'function') {
        try { toggleLanguage(); } catch (e) {}
    } else {
        if (typeof currentLang !== 'undefined') currentLang = nextLang;
        window.currentLang = nextLang;
        localStorage.setItem('aeroglass_lang', nextLang);
    }
    renderCurrentDemoStep();
}

function getDemoSteps() {
    const isEn = isDemoEnglish();

    if (isEn) {
        return [
            {
                target: null,
                badge: "WELCOME • v0.7.2",
                title: "✈️ Welcome to AeroGlass-Nav",
                body: `
                    <p><b>AeroGlass-Nav</b> is your tactical Flight Planner & Moving Map in <b>Dark Cockpit</b> style for Microsoft Flight Simulator 2024.</p>
                    <div class="demo-feature-grid">
                        <div>🌍 <b>40,000+ World Airports</b> (SQLite + Ground Charts)</div>
                        <div>🌐 <b>Live VATSIM & IVAO</b> (Nearby Traffic & ATC Radar)</div>
                        <div>📝 <b>EFB Scratchpad & Measure</b> (C.R.A.F.T. Pad & Ruler)</div>
                        <div>📉 <b>Multi-Step VNAV & ToD</b> (Terrain & Cloud Scanner)</div>
                    </div>
                    <p class="demo-tip">💡 Use <b>← / →</b> arrows to navigate, <b>Space</b> for auto-play, <b>🌐 IT/EN</b> to switch language, or <b>Esc / F1</b> to exit.</p>
                `
            },
            {
                target: "#sidebarPanel",
                badge: "STEP 1 • FLIGHT PLANNING",
                title: "🗺️ Flight Plan, SimBrief, .PLN & MSFS Sync",
                body: `
                    <p>Manage your entire route from the collapsible side panel:</p>
                    <ul>
                        <li><b>✈️ SimBrief OFP:</b> Download your latest flight plan with cruise altitudes, winds and METARs in one click.</li>
                        <li><b>📂 Import / Export .PLN & Send to MSFS:</b> Load or drag-and-drop MSFS <code>.pln</code> files, or push the active route directly to the simulator.</li>
                        <li><b>🖐️ Rubber Banding & Custom Waypoints:</b> Drag any leg on the map or save custom user waypoints in SQLite.</li>
                    </ul>
                `
            },
            {
                target: "#omniSearch",
                badge: "STEP 2 • QUICK SEARCH",
                title: "🔍 Instant ICAO Search & Map Centering",
                body: `
                    <p>Type any <b>ICAO code</b> (e.g. <code>LIPZ</code>, <code>LIRQ</code>, <code>LIKL</code>), VOR or airport name and press <b>Enter</b>:</p>
                    <ul>
                        <li>The map smoothly flies to the airport at tactical zoom.</li>
                        <li>Opens the live <b>METAR card</b> with <b>Recommended Runway</b> (headwind/crosswind) and clickable radio frequencies.</li>
                    </ul>
                `
            },
            {
                target: "#btnToggleGroundMap",
                badge: "STEP 3 • WORLD AIRPORTS & GROUND MAP",
                title: "🛫 Progressive Declutter (LOD), Runways & Stands",
                body: `
                    <p>The map automatically adapts airport density to your zoom level to keep the chart clean:</p>
                    <ul>
                        <li><b>Continental Zoom (&lt; 8):</b> Shows major hubs as discrete radar dots (hover to reveal ICAO).</li>
                        <li><b>Regional & VFR Zoom (&ge; 9.5):</b> Reveals medium airports and VFR airfields.</li>
                        <li><b>Ground Map (&ge; 13.5):</b> Dynamically renders runway thresholds, surfaces, taxiways, and apron parking stands (including detailed layouts for <code>LIPZ</code>, <code>LIKL</code>, <code>LIPD</code>, <code>LITY</code>)!</li>
                    </ul>
                `
            },
            {
                target: "#btnToggleWeather",
                badge: "STEP 4 • LIVE WEATHER",
                title: "💨 Route Wind Vectors & METAR Pills",
                body: `
                    <p>Activate <b>WX / Meteo</b> to monitor real-time atmospheric conditions along your flight plan:</p>
                    <ul>
                        <li><b>Wind Badges:</b> Displays wind direction/speed and automatic <b>Headwind (HW)</b>, <b>Tailwind (TW)</b> or <b>Crosswind (XW)</b> components.</li>
                        <li><b>Flight Categories:</b> Color-coded dots (<b style="color:#2ea043;">VFR</b>, <b style="color:#00d2ff;">MVFR</b>, <b style="color:#f85149;">IFR</b>, <b style="color:#e040fb;">LIFR</b>) on visible airports.</li>
                    </ul>
                `
            },
            {
                target: "#btnToggleNetwork",
                badge: "STEP 5 • ONLINE NETWORKS",
                title: "🌐 VATSIM & IVAO Live Traffic + ATC",
                body: `
                    <p>Click <b>🌐 Online</b> to cycle between <b>OFF</b>, <b>ON (Both)</b>, <b>IVAO</b>, and <b>VATSIM</b> (auto-refreshed every 60 seconds):</p>
                    <ul>
                        <li><b>Active ATC Stations:</b> Displays online <b>🗼 TWR</b>, <b>📡 APP</b>, and <b>🕸️ CTR</b> radar centers with coverage rings and radio frequencies.</li>
                        <li><b>One-Click Tuning:</b> Click any ATC badge on the map to copy its frequency directly into your EFB Scratchpad!</li>
                        <li><b>Nearby Aircraft:</b> Shows live pilots around your position with altitude, ground speed, and distance in NM.</li>
                    </ul>
                `
            },
            {
                target: "#btnAtcRadarCfg",
                badge: "STEP 6 • RADAR CALIBRATION",
                title: "🎚️ Real-Time ATC Coverage Sliders",
                body: `
                    <p>Click the <b>🎚️</b> button (or right-click <b>🌐 Online</b>) to customize the radar overlay at 60 FPS:</p>
                    <ul>
                        <li><b>⭕ ATC Circle Radius (0%–250%):</b> Scale TWR/APP/CTR rings or set to 0% to show badges only.</li>
                        <li><b>🔆 Coverage Opacity:</b> Adjust ring transparency over the base chart.</li>
                        <li><b>✈️ Nearby Aircraft Range (20–300 NM)</b> & individual <b>TWR / APP / CTR</b> filters.</li>
                    </ul>
                `,
                onEnter: () => {
                    if (typeof ensureAtcRadarPopoverDOM === 'function') ensureAtcRadarPopoverDOM();
                    const pop = document.getElementById('aeroAtcRadarPopover');
                    const btn = document.getElementById('btnAtcRadarCfg');
                    if (pop && btn) {
                        const rect = btn.getBoundingClientRect();
                        pop.style.left = Math.max(160, Math.min(window.innerWidth - 170, rect.left + rect.width / 2)) + 'px';
                        pop.style.top = (rect.bottom + 8) + 'px';
                        pop.style.display = 'flex';
                    }
                },
                onLeave: () => {
                    const pop = document.getElementById('aeroAtcRadarPopover');
                    if (pop) pop.style.display = 'none';
                }
            },
            {
                target: "#btnToggleScratchpad",
                badge: "STEP 7 • ELECTRONIC FLIGHT BAG",
                title: "📝 EFB Scratchpad: ATC Pad, Draw & Freq",
                body: `
                    <p>Your cockpit kneeboard for ATC clearances and notes:</p>
                    <ul>
                        <li><b>📋 ATC PAD:</b> Quick fields for <code>SQUAWK</code>, <code>QNH</code>, <code>ALT/FL</code>, <code>HDG</code>, <code>SPEED</code>, and <code>NEXT FREQ</code>, plus <b>🔄 SIM</b> sync.</li>
                        <li><b>✏️ DRAW:</b> Freehand canvas with multi-color pen and eraser.</li>
                        <li><b>📻 FREQ:</b> Automatically lists nearby online <b>VATSIM/IVAO controllers</b>, VORs, ILS, and emergency frequencies.</li>
                    </ul>
                `,
                onEnter: () => {
                    if (typeof toggleScratchpad === 'function') toggleScratchpad(true);
                },
                onLeave: () => {
                    if (typeof toggleScratchpad === 'function') toggleScratchpad(false);
                }
            },
            {
                target: "#btnToggleMeasure",
                badge: "STEP 8 • TACTICAL RULER",
                title: "📏 Distance, Heading & ETE Measure Tool",
                body: `
                    <p>Measure any leg on the fly using the <b>📏 Measure</b> button or simply by <b>Right-Clicking</b> anywhere on the map:</p>
                    <ul>
                        <li>Shows <b>Distance (NM & km)</b>, <b>Magnetic & True Bearing (°M / °T)</b>, and real-time <b>ETE</b> based on your Ground Speed.</li>
                        <li>Click the badge or press <b>Esc</b> to clear the measurement.</li>
                    </ul>
                `
            },
            {
                target: "#btnNavlogTop",
                badge: "STEP 9 • LOGS & PERFORMANCE",
                title: "📋 NavLog, Fuel Calculator & SQLite Logbook",
                body: `
                    <p>Complete flight preparation and post-flight tracking tools:</p>
                    <ul>
                        <li><b>📋 NavLog:</b> Printable route table with magnetic tracks, distances, ETE/ETA, and progressive fuel burn.</li>
                        <li><b>⛽ Fuel & Perf:</b> Customize TAS, fuel flow, taxi, contingency, and reserve fuel.</li>
                        <li><b>📒 Logbook:</b> Automatically records your flights upon landing in the local SQLite database.</li>
                    </ul>
                `
            },
            {
                target: "#elevationDrawer",
                badge: "STEP 10 • VNAV & CLOUDS",
                title: "📉 Multi-Step VNAV, ToD & Cloud Scanner",
                body: `
                    <p>The bottom drawer displays your vertical profile against real terrain elevation:</p>
                    <ul>
                        <li><b>Top of Descent (ToD):</b> Calculates the exact descent point and required vertical speed (fpm) for a 3° glidepath.</li>
                        <li><b>☁️ CLOUDS Scanner:</b> Select <code>AUTO (ACFT)</code> or <code>FL050–FL300</code> to project METAR cloud layers onto the map and VNAV chart, with live <b>IMC</b> alerts.</li>
                    </ul>
                `
            },
            {
                target: "#aeroCompassWidget",
                badge: "STEP 11 • ERGONOMICS & EFB WI-FI",
                title: "🧭 Compass Rose, Orientation & Tablet Wi-Fi",
                body: `
                    <p>Tailor the interface to any cockpit setup or external device:</p>
                    <ul>
                        <li><b>🧭 Compass Rose & Map Mode:</b> Switch between <b>Free Map / North-Up / Track-Up</b>; click the compass anytime to reset <b>North-Up (360°)</b>.</li>
                        <li><b>🌐 Language (IT / EN):</b> Switch the entire interface and guided tour language between Italian and English at any time.</li>
                        <li><b>📱 EFB Wi-Fi:</b> Click the top EFB badge to scan the QR Code and open AeroGlass-Nav live on your iPad or Android tablet!</li>
                    </ul>
                `
            },
            {
                target: "#mapStyleSelect",
                badge: "STEP 12 • PRO MAP LAYERS & FILTERS",
                title: "🗺️ IFR, VFR, MAP, SAT, Day/Night, Relief & Navaids",
                body: `
                    <p>Multi-layer aeronautical cartographic engine:</p>
                    <ul>
                        <li><b>🗺️ 4 Map Models:</b> Switch instantly between <b>IFR</b>, <b>VFR</b>, <b>MAP</b>, and <b>SAT</b> views with <b>☀️ Day / 🌙 Night</b> lighting and <b>⛰️ Relief</b> hillshading.</li>
                        <li><b>📡 VOR/ILS & ⚙️ Filters:</b> Toggle radio navaids, approach cones, and customize visible map layers on the fly.</li>
                        <li><b>✈️ Send to MSFS:</b> Push your active route directly to the simulator avionics in one click.</li>
                    </ul>
                `
            }
        ];
    }

    return [
        {
            target: null,
            badge: "BENVENUTO • v0.7.2",
            title: "✈️ Benvenuto in AeroGlass-Nav",
            body: `
                <p><b>AeroGlass-Nav</b> è il tuo Flight Planner & Moving Map tattico in stile <b>Dark Cockpit</b> progettato per Microsoft Flight Simulator 2024.</p>
                <div class="demo-feature-grid">
                    <div>🌍 <b>40.000+ Aeroporti Mondiali</b> (SQLite + Ground Map)</div>
                    <div>🌐 <b>Traffico & ATC VATSIM/IVAO</b> (TWR, APP, CTR & Frequenze)</div>
                    <div>📝 <b>Scratchpad EFB & Righello</b> (Note ATC, Disegno & ETE)</div>
                    <div>📉 <b>Profilo VNAV & Cloud Scan</b> (Terreno, ToD e Nuvole)</div>
                </div>
                <p class="demo-tip">💡 Usa le frecce <b>← / →</b> per scorrere i passaggi, <b>Spazio</b> per lo scorrimento automatico, <b>🌐 IT/EN</b> per cambiare lingua o <b>Esc / F1</b> per chiudere.</p>
            `
        },
        {
            target: "#sidebarPanel",
            badge: "PASSO 1 • PIANIFICAZIONE VOLO",
            title: "🗺️ Piano di Volo, SimBrief, File .PLN & Sync MSFS",
            body: `
                <p>Dal pannello laterale sinistro gestisci l'intera rotta e i Waypoint:</p>
                <ul>
                    <li><b>✈️ SimBrief OFP:</b> Scarica con un clic l'ultimo piano di volo generato su SimBrief completo di quote, venti e METAR.</li>
                    <li><b>📂 Importa / Esporta .PLN & Invia a MSFS:</b> Carica o trascina (Drag & Drop) file <code>.pln</code> sulla mappa, oppure invia la rotta direttamente al simulatore.</li>
                    <li><b>➕ Waypoints Utente:</b> Sezione dedicata per salvare punti VFR personalizzati nel database SQLite o catturarli con un clic sulla mappa.</li>
                </ul>
            `
        },
        {
            target: "#omniSearch",
            badge: "PASSO 2 • RICERCA ISTANTANEA",
            title: "🔍 Ricerca Rapida ICAO & Centratura Mappa",
            body: `
                <p>Digita qualsiasi codice <b>ICAO</b> (es. <code>LIPZ</code>, <code>LIRQ</code>, <code>LIKL</code>, <code>LITY</code>), un VOR o il nome di una città e premi <b>Invio</b>:</p>
                <ul>
                    <li>La mappa si centra automaticamente sullo scalo con zoom ravvicinato.</li>
                    <li>Si apre subito la scheda <b>METAR live</b> con il calcolo della <b>Pista Consigliata</b> in base al vento, lunghezze piste e frequenze radio cliccabili.</li>
                </ul>
            `
        },
        {
            target: "#btnToggleGroundMap",
            badge: "PASSO 3 • AEROPORTI MONDIALI & GROUND MAP",
            title: "🛫 Declutter Intelligente (LOD), Piste & Piazzole",
            body: `
                <p>Il motore cartografico regola automaticamente i dettagli in base al livello di zoom per mantenere la mappa sempre pulita:</p>
                <ul>
                    <li><b>Zoom Continentale (&lt; 8):</b> Mostra solo i grandi scali come discreti pallini radar (passa il mouse per leggere il codice ICAO).</li>
                    <li><b>Zoom Regionale e VFR (&ge; 9.5):</b> Rivela progressivamente gli aeroporti medi e le aviosuperfici VFR.</li>
                    <li><b>Ground Map (&ge; 13.5):</b> Disegna in tempo reale le piste orientate con testate, vie di rullaggio (taxiway) e piazzole di parcheggio (stand) per gli aeroporti supportati (inclusi <code>LIPZ</code>, <code>LIKL</code>, <code>LIPD</code>, <code>LITY</code>).</li>
                </ul>
            `
        },
        {
            target: "#btnToggleWeather",
            badge: "PASSO 4 • METEO E VENTI IN ROTTA",
            title: "💨 Vettori Vento & Bollettini METAR",
            body: `
                <p>Attivando <b>💨 WX / Meteo</b> visualizzi la situazione atmosferica lungo il piano di volo:</p>
                <ul>
                    <li><b>Badge Vento in Quota:</b> Mostrano direzione/intensità del vento e calcolano la componente di <b>Vento Contrario (HW)</b>, <b>Vento in Coda (TW)</b> o <b>Traverso (XW)</b>.</li>
                    <li><b>Categorie di Volo:</b> Indicatori luminosi (<b style="color:#2ea043;">VFR</b>, <b style="color:#00d2ff;">MVFR</b>, <b style="color:#f85149;">IFR</b>, <b style="color:#e040fb;">LIFR</b>) sugli aeroporti in vista.</li>
                </ul>
            `
        },
        {
            target: "#btnToggleNetwork",
            badge: "PASSO 5 • RETI DI VOLO ONLINE",
            title: "🌐 Traffico Live VATSIM / IVAO & Copertura ATC",
            body: `
                <p>Clicca sul selettore di rete per ciclare tra <b>OFF</b>, <b>ON (Entrambi)</b>, <b>IVAO</b> e <b>VATSIM</b> (aggiornamento asincrono ogni 60 secondi):</p>
                <ul>
                    <li><b>Controllori ATC Online:</b> Visualizza sulla mappa Torri (<b>🗼 TWR</b> in verde), Avvicinamenti (<b>📡 APP</b> in ciano) e Centri Radar (<b>🕸️ CTR</b> in viola) con cerchi di copertura e frequenza radio.</li>
                    <li><b>Sintonia Rapida:</b> Clicca su qualsiasi badge ATC per inviare la frequenza direttamente alla casella <code>NEXT FREQ</code> dello Scratchpad EFB!</li>
                    <li><b>Aerei Vicini:</b> Mostra il traffico nelle immediate vicinanze con quota, Ground Speed e distanza in NM.</li>
                </ul>
            `
        },
        {
            target: "#btnAtcRadarCfg",
            badge: "PASSO 6 • CALIBRAZIONE RADAR",
            title: "🎚️ Slider Raggio, Opacità & Filtri ATC",
            body: `
                <p>Clicca sul pulsante <b>🎚️</b> per aprire il pannello di calibrazione istantanea a 60 FPS:</p>
                <ul>
                    <li><b>⭕ Raggio Cerchi ATC (0%–250%):</b> Allarga o riduci gli anelli di copertura (a <code>0%</code> nasconde i cerchi lasciando solo i badge).</li>
                    <li><b>🔆 Opacità Copertura:</b> Regola la trasparenza dei cerchi sulla mappa.</li>
                    <li><b>✈️ Raggio Aerei Vicini (20–300 NM)</b> e pulsanti per attivare/disattivare singolarmente <b>🗼 TWR</b>, <b>📡 APP</b> e <b>🕸️ CTR</b>.</li>
                </ul>
            `,
            onEnter: () => {
                if (typeof ensureAtcRadarPopoverDOM === 'function') ensureAtcRadarPopoverDOM();
                const pop = document.getElementById('aeroAtcRadarPopover');
                const btn = document.getElementById('btnAtcRadarCfg');
                if (pop && btn) {
                    const rect = btn.getBoundingClientRect();
                    pop.style.left = Math.max(160, Math.min(window.innerWidth - 170, rect.left + rect.width / 2)) + 'px';
                    pop.style.top = (rect.bottom + 8) + 'px';
                    pop.style.display = 'flex';
                }
            },
            onLeave: () => {
                const pop = document.getElementById('aeroAtcRadarPopover');
                if (pop) pop.style.display = 'none';
            }
        },
        {
            target: "#btnToggleScratchpad",
            badge: "PASSO 7 • BLOCCO NOTE DI BORDO",
            title: "📝 Scratchpad EFB: Clearance ATC, Disegno & Freq",
            body: `
                <p>Il tuo cosciale elettronico sempre a portata di clic:</p>
                <ul>
                    <li><b>📋 ATC PAD:</b> Campi rapidi per <code>SQUAWK</code>, <code>QNH</code>, <code>ALT/FL</code>, <code>HDG</code>, <code>SPEED</code> e <code>NEXT FREQ</code>, con pulsante <b>🔄 SIM</b> per copiare QNH e quota dal simulatore.</li>
                    <li><b>✏️ DISEGNO:</b> Lavagna grafica a mano libera con 4 colori e gomma per schizzi di rullaggio o holding.</li>
                    <li><b>📻 FREQ:</b> Elenca automaticamente in cima i <b>controllori ATC online più vicini</b>, oltre a UNICOM, emergenza, VOR e ILS.</li>
                </ul>
            `,
            onEnter: () => {
                if (typeof toggleScratchpad === 'function') toggleScratchpad(true);
            },
            onLeave: () => {
                if (typeof toggleScratchpad === 'function') toggleScratchpad(false);
            }
        },
        {
            target: "#btnToggleMeasure",
            badge: "PASSO 8 • MISURAZIONE RAPIDA",
            title: "📏 Righello Tattico (Distanza, Prua & ETE)",
            body: `
                <p>Attiva il pulsante <b>📏 Righello</b> oppure usa direttamente il <b>Clic Destro del mouse</b> su due punti qualsiasi della mappa:</p>
                <ul>
                    <li>Calcola all'istante <b>Distanza (NM e km)</b>, <b>Prua Magnetica e Vera (°M / °T)</b> e il <b>tempo di volo stimato (ETE)</b> alla tua Ground Speed attuale.</li>
                    <li>Clicca sul badge giallo o premi <b>Esc</b> per rimuovere il righello.</li>
                </ul>
            `
        },
        {
            target: "#btnNavlogTop",
            badge: "PASSO 9 • STRUMENTI DI VOLO",
            title: "📋 NavLog, Calcolatore Fuel & Logbook SQLite",
            body: `
                <p>Pianificazione pesi/carburante e archivio storico dei tuoi voli:</p>
                <ul>
                    <li><b>📋 NavLog:</b> Tabella di marcia completa con prue, distanze parziali/totali, tempi ETE/ETA e consumo progressivo.</li>
                    <li><b>⛽ Fuel & Perf:</b> Calcola Block Fuel, Trip Fuel, contingenza e riserve in base a TAS e consumo orario del tuo aereo.</li>
                    <li><b>📒 Logbook:</b> Registra automaticamente ogni volo all'atterraggio nel database SQLite locale.</li>
                </ul>
            `
        },
        {
            target: "#elevationDrawer",
            badge: "PASSO 10 • PROFILO VERTICALE & NUVOLE",
            title: "📉 Profilo VNAV, Top of Descent & Cloud Scanner",
            body: `
                <p>Il cassetto inferiore mostra la sezione verticale della rotta rispetto al profilo altimetrico del terreno:</p>
                <ul>
                    <li><b>Top of Descent (ToD):</b> Calcola e posiziona sulla rotta e sul grafico il punto esatto di inizio discesa (sentiero 3°) e il rateo verticale richiesto (fpm).</li>
                    <li><b>☁️ CLOUDS Scanner:</b> Seleziona <code>AUTO (ACFT)</code> o <code>FL050–FL300</code> per proiettare gli strati nuvolosi METAR sulla mappa e sul grafico VNAV, con avviso <b>IMC</b> quando voli dentro le nubi.</li>
                </ul>
            `
        },
        {
            target: "#aeroCompassWidget",
            badge: "PASSO 11 • BUSSOLA, ORIENTAMENTO & TABLET WI-FI",
            title: "🧭 Rosa dei Venti, Orientamento Mappa & EFB Wi-Fi",
            body: `
                <p>Controllo totale dell'orientamento mappa e utilizzo multi-schermo:</p>
                <ul>
                    <li><b>🧭 Rosa dei Venti & Orientamento:</b> Scegli tra <b>Mappa Libera / Nord Su / Aereo Su (Track-Up)</b>; clicca la bussola in qualsiasi momento per riallineare il <b>Nord in Alto (360°)</b>.</li>
                    <li><b>🌐 Lingua (IT / EN):</b> Commuta istantaneamente tutta l'interfaccia e il tour guidato tra Italiano e Inglese.</li>
                    <li><b>📱 EFB Wi-Fi:</b> Clicca sul pulsante EFB per mostrare il <b>QR Code</b> e usare AeroGlass-Nav in diretta sul tuo iPad o tablet Android!</li>
                </ul>
            `
        },
        {
            target: "#mapStyleSelect",
            badge: "PASSO 12 • SISTEMA MAPPE PRO & FILTRI",
            title: "🗺️ IFR, VFR, MAP, SAT, Giorno/Notte, Rilievi & VOR/ILS",
            body: `
                <p>Motore cartografico aeronautico multi-layer:</p>
                <ul>
                    <li><b>🗺️ 4 Viste Dedicate:</b> Seleziona al volo tra <b>IFR</b>, <b>VFR</b>, <b>MAP</b> e <b>SAT</b> con illuminazione <b>☀️ Giorno / 🌙 Notte</b> e livello <b>⛰️ Rilievi</b> (Hillshading).</li>
                    <li><b>📡 VOR/ILS & ⚙️ Filtri:</b> Visualizza radioassistenze, coni di avvicinamento ILS e filtra gli elementi visibili sulla carta.</li>
                    <li><b>✈️ Invia a MSFS:</b> Trasmetti il piano di volo attivo direttamente all'avionica del simulatore con un solo clic.</li>
                </ul>
            `
        }
    ];
}

function ensureDemoTourDOM() {
    if (!document.getElementById('aeroDemoTourStyles')) {
        const st = document.createElement('style');
        st.id = 'aeroDemoTourStyles';
        st.textContent = `
            #aeroDemoSpotlight {
                position: fixed;
                z-index: 9990;
                pointer-events: none;
                border: 2.5px solid #00d2ff;
                border-radius: 10px;
                box-shadow: 0 0 0 9999px rgba(4, 7, 13, 0.68), 0 0 24px rgba(0, 210, 255, 0.85), inset 0 0 12px rgba(0, 210, 255, 0.35);
                transition: all 0.28s cubic-bezier(0.22, 1, 0.36, 1);
                display: none;
            }
            #aeroDemoCard {
                position: fixed;
                z-index: 9995;
                width: min(540px, calc(100vw - 32px));
                background: rgba(13, 18, 28, 0.97);
                border: 1.5px solid rgba(0, 210, 255, 0.55);
                border-radius: 14px;
                padding: 20px 22px 18px 22px;
                color: #f1f5f9;
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                box-shadow: 0 18px 48px rgba(0, 0, 0, 0.88), 0 0 28px rgba(0, 210, 255, 0.22);
                backdrop-filter: blur(16px);
                display: none;
                flex-direction: column;
                gap: 12px;
                transition: top 0.25s ease, left 0.25s ease;
            }
            .demo-header-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .demo-step-badge {
                background: rgba(0, 210, 255, 0.16);
                border: 1px solid rgba(0, 210, 255, 0.45);
                color: #38bdf8;
                font-family: Consolas, monospace;
                font-size: 11px;
                font-weight: 800;
                padding: 3px 9px;
                border-radius: 6px;
                letter-spacing: 0.6px;
            }
            .demo-close-btn {
                background: rgba(248, 81, 73, 0.14);
                border: 1px solid rgba(248, 81, 73, 0.4);
                color: #f85149;
                font-size: 12px;
                font-weight: 700;
                padding: 3px 9px;
                border-radius: 6px;
                cursor: pointer;
            }
            .demo-close-btn:hover {
                background: rgba(248, 81, 73, 0.28);
            }
            .demo-title {
                font-size: 19px;
                font-weight: 800;
                color: #ffffff;
                margin: 0;
                letter-spacing: 0.2px;
            }
            .demo-body {
                font-size: 14.5px;
                line-height: 1.58;
                color: #cbd5e1;
            }
            .demo-body p {
                margin: 0 0 8px 0;
            }
            .demo-body ul {
                margin: 6px 0 4px 0;
                padding-left: 20px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .demo-body li {
                color: #e2e8f0;
            }
            .demo-body code {
                background: rgba(0, 210, 255, 0.14);
                border: 1px solid rgba(0, 210, 255, 0.3);
                color: #38bdf8;
                font-family: Consolas, monospace;
                font-size: 13px;
                padding: 1px 5px;
                border-radius: 4px;
            }
            .demo-feature-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin: 10px 0;
            }
            .demo-feature-grid > div {
                background: rgba(30, 41, 59, 0.65);
                border: 1px solid rgba(148, 163, 184, 0.22);
                border-radius: 8px;
                padding: 8px 10px;
                font-size: 12.5px;
                color: #f8fafc;
            }
            .demo-tip {
                margin-top: 8px !important;
                background: rgba(52, 211, 153, 0.12);
                border-left: 3px solid #34d399;
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 12.5px;
                color: #a7f3d0;
            }
            .demo-dots-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding-top: 2px;
            }
            .demo-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: rgba(148, 163, 184, 0.35);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .demo-dot.active {
                width: 22px;
                border-radius: 5px;
                background: #00d2ff;
                box-shadow: 0 0 8px rgba(0, 210, 255, 0.8);
            }
            .demo-footer-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                border-top: 1px solid rgba(148, 163, 184, 0.2);
                padding-top: 12px;
                margin-top: 2px;
            }
            .demo-nav-btn {
                background: rgba(30, 41, 59, 0.85);
                border: 1px solid rgba(148, 163, 184, 0.35);
                color: #e2e8f0;
                font-size: 13px;
                font-weight: 700;
                padding: 7px 14px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .demo-nav-btn:hover {
                border-color: #00d2ff;
                color: #ffffff;
            }
            .demo-nav-btn.primary {
                background: linear-gradient(135deg, #0284c7, #00d2ff);
                border-color: #38bdf8;
                color: #090d13;
                font-weight: 800;
            }
            .demo-nav-btn.primary:hover {
                filter: brightness(1.1);
            }
        `;
        document.head.appendChild(st);
    }

    if (!document.getElementById('aeroDemoSpotlight')) {
        const spot = document.createElement('div');
        spot.id = 'aeroDemoSpotlight';
        document.body.appendChild(spot);
    }

    if (!document.getElementById('aeroDemoCard')) {
        const card = document.createElement('div');
        card.id = 'aeroDemoCard';
        card.innerHTML = `
            <div class="demo-header-row">
                <span class="demo-step-badge" id="demoStepBadge">PASSO 1 / 13</span>
                <div style="display:flex;gap:6px;">
                    <button class="demo-nav-btn" id="btnDemoLang" style="padding:3px 9px;font-size:11.5px;" onclick="toggleDemoLanguage()" title="Switch Language IT / EN">🌐 EN</button>
                    <button class="demo-nav-btn" id="btnDemoAutoPlay" style="padding:3px 9px;font-size:11.5px;" onclick="toggleDemoAutoPlay()">▶ Auto</button>
                    <button class="demo-close-btn" onclick="stopDemoTour()">✕ ESC</button>
                </div>
            </div>
            <h3 class="demo-title" id="demoStepTitle">Titolo</h3>
            <div class="demo-body" id="demoStepBody"></div>
            <div class="demo-dots-row" id="demoStepDots"></div>
            <div class="demo-footer-row">
                <button class="demo-nav-btn" id="btnDemoPrev" onclick="prevDemoStep()">◀ Indietro</button>
                <span id="demoStepCounter" style="font-family:Consolas,monospace;font-size:12px;color:#94a3b8;">1 / 13</span>
                <button class="demo-nav-btn primary" id="btnDemoNext" onclick="nextDemoStep()">Avanti ▶</button>
            </div>
        `;
        document.body.appendChild(card);
    }
}

function runLeaveHook(idx) {
    const steps = getDemoSteps();
    const st = steps[idx];
    if (st && typeof st.onLeave === 'function') {
        try { st.onLeave(); } catch (e) {}
    }
}

function renderCurrentDemoStep() {
    ensureDemoTourDOM();
    const steps = getDemoSteps();
    if (_demoStepIndex < 0) _demoStepIndex = 0;
    if (_demoStepIndex >= steps.length) {
        stopDemoTour();
        return;
    }

    const step = steps[_demoStepIndex];
    const isEn = isDemoEnglish();

    if (typeof step.onEnter === 'function') {
        try { step.onEnter(); } catch (e) {}
    }

    const badgeEl = document.getElementById('demoStepBadge');
    const titleEl = document.getElementById('demoStepTitle');
    const bodyEl = document.getElementById('demoStepBody');
    const dotsEl = document.getElementById('demoStepDots');
    const counterEl = document.getElementById('demoStepCounter');
    const prevBtn = document.getElementById('btnDemoPrev');
    const nextBtn = document.getElementById('btnDemoNext');
    const autoBtn = document.getElementById('btnDemoAutoPlay');
    const langBtn = document.getElementById('btnDemoLang');

    if (langBtn) langBtn.textContent = isEn ? '🌐 IT' : '🌐 EN';
    if (badgeEl) badgeEl.textContent = step.badge || `STEP ${_demoStepIndex + 1}`;
    if (titleEl) titleEl.innerHTML = step.title || '';
    if (bodyEl) bodyEl.innerHTML = step.body || '';
    if (counterEl) counterEl.textContent = `${_demoStepIndex + 1} / ${steps.length}`;

    if (prevBtn) {
        prevBtn.style.visibility = _demoStepIndex === 0 ? 'hidden' : 'visible';
        prevBtn.textContent = isEn ? '◀ Back' : '◀ Indietro';
    }
    if (nextBtn) {
        const isLast = (_demoStepIndex === steps.length - 1);
        nextBtn.textContent = isLast ? (isEn ? '✔ Finish' : '✔ Concludi') : (isEn ? 'Next ▶' : 'Avanti ▶');
    }
    if (autoBtn) {
        autoBtn.textContent = _demoAutoPlay ? '⏸ Pause' : '▶ Auto';
        autoBtn.style.borderColor = _demoAutoPlay ? '#34d399' : '';
        autoBtn.style.color = _demoAutoPlay ? '#34d399' : '';
    }

    if (dotsEl) {
        dotsEl.innerHTML = steps.map((_, i) =>
            `<span class="demo-dot ${i === _demoStepIndex ? 'active' : ''}" onclick="jumpToDemoStep(${i})" title="Step ${i + 1}"></span>`
        ).join('');
    }

    positionSpotlightAndCard(step.target);
}

function positionSpotlightAndCard(selector) {
    const spot = document.getElementById('aeroDemoSpotlight');
    const card = document.getElementById('aeroDemoCard');
    if (!spot || !card) return;

    card.style.display = 'flex';
    const targetEl = selector ? document.querySelector(selector) : null;

    if (!targetEl) {
        spot.style.display = 'flex';
        spot.style.left = '50%';
        spot.style.top = '50%';
        spot.style.width = '0px';
        spot.style.height = '0px';

        const cRect = card.getBoundingClientRect();
        card.style.left = Math.max(16, (window.innerWidth - cRect.width) / 2) + 'px';
        card.style.top = Math.max(24, (window.innerHeight - cRect.height) / 2) + 'px';
        return;
    }

    const r = targetEl.getBoundingClientRect();
    const pad = 6;
    spot.style.display = 'block';
    spot.style.left = Math.max(2, r.left - pad) + 'px';
    spot.style.top = Math.max(2, r.top - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';

    const cRect = card.getBoundingClientRect();
    const margin = 18;
    let left = (window.innerWidth - cRect.width) / 2;
    let top = (window.innerHeight - cRect.height) / 2;

    if (r.width > window.innerWidth * 0.5 && r.top > window.innerHeight * 0.6) {
        top = Math.max(60, r.top - cRect.height - margin);
    } else if (r.height > window.innerHeight * 0.5 && r.left < 350) {
        left = Math.min(window.innerWidth - cRect.width - 20, r.right + margin);
        top = Math.max(64, (window.innerHeight - cRect.height) / 2);
    } else if (r.top < 110) {
        top = Math.min(window.innerHeight - cRect.height - 28, Math.max(r.bottom + 24, window.innerHeight * 0.44));
        left = Math.max(20, Math.min(window.innerWidth - cRect.width - 20, r.left + r.width / 2 - cRect.width / 2));
    }

    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
}

function startDemoAutoTimer() {
    if (_demoAutoTimer) {
        clearInterval(_demoAutoTimer);
        _demoAutoTimer = null;
    }
    if (_demoAutoPlay) {
        _demoAutoTimer = setInterval(() => {
            if (!window._demoTourActive) {
                clearInterval(_demoAutoTimer);
                _demoAutoTimer = null;
                return;
            }
            nextDemoStep(true);
        }, DEMO_AUTO_INTERVAL_MS);
    }
}

function startDemoTour(startIndex = 0) {
    ensureDemoTourDOM();
    if (window._demoTourActive) {
        runLeaveHook(_demoStepIndex);
    }
    window._demoTourActive = true;
    _demoStepIndex = typeof startIndex === 'number' ? startIndex : 0;
    _demoAutoPlay = true;

    const tipBox = document.getElementById('aeroFloatingTooltip');
    if (tipBox) tipBox.classList.remove('visible');

    startDemoAutoTimer();
    renderCurrentDemoStep();
}

function stopDemoTour() {
    if (window._demoTourActive) {
        runLeaveHook(_demoStepIndex);
    }
    window._demoTourActive = false;
    _demoAutoPlay = false;
    if (_demoAutoTimer) {
        clearInterval(_demoAutoTimer);
        _demoAutoTimer = null;
    }
    const spot = document.getElementById('aeroDemoSpotlight');
    const card = document.getElementById('aeroDemoCard');
    if (spot) spot.style.display = 'none';
    if (card) card.style.display = 'none';
}

function toggleDemoTour() {
    if (window._demoTourActive) {
        stopDemoTour();
    } else {
        startDemoTour(0);
    }
}

function nextDemoStep(fromAutoTimer = false) {
    const steps = getDemoSteps();
    runLeaveHook(_demoStepIndex);
    if (_demoStepIndex >= steps.length - 1) {
        if (_demoAutoPlay) {
            _demoStepIndex = 0;
            if (!fromAutoTimer) startDemoAutoTimer();
            renderCurrentDemoStep();
            return;
        }
        stopDemoTour();
        return;
    }
    _demoStepIndex++;
    if (!fromAutoTimer && _demoAutoPlay) startDemoAutoTimer();
    renderCurrentDemoStep();
}

function prevDemoStep() {
    if (_demoStepIndex <= 0) return;
    runLeaveHook(_demoStepIndex);
    _demoStepIndex--;
    renderCurrentDemoStep();
}

function jumpToDemoStep(idx) {
    runLeaveHook(_demoStepIndex);
    _demoStepIndex = idx;
    renderCurrentDemoStep();
}

function toggleDemoAutoPlay() {
    _demoAutoPlay = !_demoAutoPlay;
    if (_demoAutoTimer) {
        clearInterval(_demoAutoTimer);
        _demoAutoTimer = null;
    }
    if (_demoAutoPlay) {
        _demoAutoTimer = setInterval(() => {
            if (!window._demoTourActive) {
                clearInterval(_demoAutoTimer);
                _demoAutoTimer = null;
                return;
            }
            nextDemoStep();
        }, DEMO_AUTO_INTERVAL_MS);
    }
    renderCurrentDemoStep();
}

function initDemoKeyboardShortcuts() {
    if (window._demoShortcutsInitialized) return;
    window._demoShortcutsInitialized = true;

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            toggleDemoTour();
            return;
        }
        if (!window._demoTourActive) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            stopDemoTour();
        } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            nextDemoStep();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevDemoStep();
        } else if (e.key === ' ') {
            e.preventDefault();
            toggleDemoAutoPlay();
        }
    });

    window.addEventListener('resize', () => {
        if (window._demoTourActive) {
            const steps = getDemoSteps();
            const st = steps[_demoStepIndex];
            if (st) positionSpotlightAndCard(st.target);
        }
    });
}

// ============================================================================
// ⚡ AUTOMATISMO DI ESECUZIONE ALL'AVVIO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initDemoKeyboardShortcuts();
});

// Esporta tutte le funzioni e gli alias globali per compatibilità con index.html e app.js
window.startDemoTour = startDemoTour;
window.stopDemoTour = stopDemoTour;
window.toggleDemoTour = toggleDemoTour;
window.nextDemoStep = nextDemoStep;
window.prevDemoStep = prevDemoStep;
window.jumpToDemoStep = jumpToDemoStep;
window.toggleDemoAutoPlay = toggleDemoAutoPlay;
window.initDemoKeyboardShortcuts = initDemoKeyboardShortcuts;
window.startDemo = startDemoTour;
window.toggleDemo = toggleDemoTour;
window.toggleDemoLanguage = toggleDemoLanguage;
window.renderCurrentDemoStep = renderCurrentDemoStep;