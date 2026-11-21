// ============================================================================
// 🎓 AEROGLASS-NAV — TOUR GUIDATO INTERATTIVO BILINGUE IT / EN (demo.js)
// Versione: v1.0.0 (MSFS 2024 Edition)
// ============================================================================

window._demoTourActive = false;
let _demoStepIndex = 0;
let _demoAutoTimer = null;
let _demoAutoPlay = true;
const DEMO_AUTO_INTERVAL_MS = 9500;

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
                badge: "WELCOME • v1.0.0",
                title: "✈️ Welcome to AeroGlass-Nav",
                body: `
                    <p><b>AeroGlass-Nav</b> is your standalone, ultra-responsive Flight Planner & Moving Map in <b>Dark Cockpit</b> style, optimized for Microsoft Flight Simulator 2024.</p>
                    <div class="demo-feature-grid">
                        <div>🌧️ <b>Live Weather Radar</b> (RainViewer API & 60m Slider)</div>
                        <div>🔄 <b>Analytical IFR Procedures</b> (Dynamic Holds, DME Arcs & Vectors)</div>
                        <div>🌍 <b>48,000+ World Airports</b> (Local SQLite & Real Ground Layouts)</div>
                        <div>🌐 <b>VATSIM & IVAO + VA Filter</b> (Aircraft Types, Operators & Silhouettes)</div>
                        <div>📝 <b>EFB Scratchpad & Measure</b> (C.R.A.F.T. Pad & Tactical Ruler)</div>
                        <div>📖 <b>VNAV, Cloud Scan & Glossary</b> (ToD, METAR Clouds & IT/EN Reference)</div>
                    </div>
                    <p class="demo-tip">💡 Use <b>← / →</b> arrows to browse, <b>Space</b> for auto-play, <b>🌐 IT/EN</b> to switch language, or <b>Esc / F1</b> to exit at any time.</p>
                `
            },
            {
                target: "#sidebarPanel",
                badge: "STEP 1 • ROUTE & SIMBRIEF",
                title: "🗺️ Route Planning, SimBrief Lock & Holding Triggers",
                body: `
                    <p>Manage your complete navigation profile from the collapsible sidebar:</p>
                    <ul>
                        <li><b>🔑 SimBrief Pilot ID Protection:</b> Click the lock key to edit or protect your Pilot ID; import latest OFP flight plans with one click.</li>
                        <li><b>🔄 Fast HOLD Activation:</b> Click <code>🔄 HOLD</code> on any waypoint card to generate and project an analytical holding pattern onto the chart.</li>
                        <li><b>📊 Altitude & Speed Constraints:</b> Automatic detection of procedural limits (e.g. <code>FL100+</code>, <code>MAX 210KT</code>) shown alongside each fix.</li>
                        <li><b>📂 Import / Export .PLN & Send to MSFS:</b> Push routes directly into the aircraft avionics or save standardized XML flight plans.</li>
                    </ul>
                `
            },
            {
                target: "#omniSearch",
                badge: "STEP 2 • QUICK SEARCH",
                title: "🔍 Instant ICAO Search & Visual Centering",
                body: `
                    <p>Type any <b>ICAO code</b> (e.g. <code>LIPZ</code>, <code>LICB</code>, <code>LITY</code>, <code>LIKL</code>), VOR or city name and hit <b>Enter</b>:</p>
                    <ul>
                        <li>Searches <b>48,000+ SQLite airports</b> instantaneously and centers the airfield in the exact visible map area (compensating sidebar and VNAV drawer).</li>
                        <li>Opens the live <b>METAR popup</b> with <b>Recommended Runway</b> (headwind/crosswind components) and clickable ATC frequencies.</li>
                    </ul>
                `
            },
            {
                target: "#btnToggleRadar",
                badge: "STEP 3 • LIVE WEATHER RADAR",
                title: "🌧️ Live RainViewer Radar & Time Animation",
                body: `
                    <p>Toggle the <b>🌧️ Radar</b> button in the top bar to track real-time storms and precipitation:</p>
                    <ul>
                        <li><b>Live Doppler Composite:</b> Real-time rain and convective weather overlay refreshed every 10 minutes from open RainViewer APIs.</li>
                        <li><b>Floating Cockpit Timeline:</b> An interactive floating timebar appears at the bottom. Use the slider to scrub through the past 60 minutes or press <b>▶ Play</b> for smooth loop playback.</li>
                        <li><b>Native Zoom Adaptation:</b> Crisp tile rendering at all scales without server tile errors.</li>
                    </ul>
                `
            },
            {
                target: "#sidebarPanel",
                badge: "STEP 4 • ANALYTICAL IFR PROCEDURES",
                title: "🔄 Dynamic Holds, DME Arcs & Radar Vectors",
                body: `
                    <p>Full analytical geometry for complex terminal procedures (SID, STAR, IAP):</p>
                    <ul>
                        <li><b>Speed-Adaptive Holding Patterns:</b> Standard Rate-1 race tracks ($3^\\circ$/s) scaled to your aircraft's actual ground speed and altitude (1.0 min or 1.5 min legs).</li>
                        <li><b>High-Visibility Badges (+50%):</b> Clear magenta cockpit tags displaying Inbound course, turn direction, target speed, turn radius, and leg length in NM.</li>
                        <li><b>DME Arcs & Radar Vectors:</b> Renders circular DME arc segments (<code>⌒ ARC xx DME [VOR]</code>) and dashed amber ATC disconnect segments (<code>📡 ATC VECTORS</code>).</li>
                    </ul>
                `
            },
            {
                target: "#btnToggleGroundMap",
                badge: "STEP 5 • WORLD AIRPORTS & GROUND MAP",
                title: "🛫 Smart Declutter (LOD), Runways & Parking Stands",
                body: `
                    <p>The cartographic engine balances density and legibility across all zoom levels:</p>
                    <ul>
                        <li><b>Continental Zoom (&lt; 8):</b> Major hubs shown as discrete radar blips (hover to reveal ICAO).</li>
                        <li><b>Regional & VFR Zoom (&ge; 9.5):</b> Displays medium airports and sport airfields.</li>
                        <li><b>Ground Map (&ge; 13.5):</b> Detailed taxiways with authentic ICAO identifiers, runway surface markings, and parking stands (including custom models for <code>LIKL</code>, <code>LIPD</code>, <code>LITY</code>, and <code>LIPZ</code>).</li>
                    </ul>
                `
            },
            {
                target: "#btnToggleWeather",
                badge: "STEP 6 • ROUTE WINDS & METAR",
                title: "💨 Enroute Wind Vectors & Flight Categories",
                body: `
                    <p>Enable <b>💨 WX</b> to monitor in-flight atmospheric dynamics:</p>
                    <ul>
                        <li><b>Enroute Wind Badges:</b> Shows true wind direction/knots and auto-calculates <b>Headwind (HW)</b>, <b>Tailwind (TW)</b>, and <b>Crosswind (XW)</b>.</li>
                        <li><b>Flight Category Pills:</b> Color-coded airport status markers (<b style="color:#2ea043;">VFR</b>, <b style="color:#00d2ff;">MVFR</b>, <b style="color:#f85149;">IFR</b>, <b style="color:#e040fb;">LIFR</b>).</li>
                    </ul>
                `
            },
            {
                target: "#btnToggleNetwork",
                badge: "STEP 7 • ONLINE NETWORKS",
                title: "🌐 Live VATSIM & IVAO: Aircraft Types, Operators & ATC",
                body: `
                    <p>Cycle between <b>OFF</b>, <b>ON (Both)</b>, <b>IVAO</b>, and <b>VATSIM</b> (updated asynchronously every 60 seconds):</p>
                    <ul>
                        <li><b>Aircraft Type, Operator & Route:</b> Hover any pilot to see ICAO type, airline/operator (from SQLite DB or <code>OPR/</code>), and <code>DEP ➔ ARR</code> route.</li>
                        <li><b>Category SVG Silhouettes:</b> Distinct icons for Heavy, Jet, Turboprop, General Aviation, Military, and Helicopters.</li>
                        <li><b>Online ATC Stations:</b> Tower (<b>🗼 TWR</b>), Approach (<b>📡 APP</b>), and Radar Centers (<b>🕸️ CTR</b>) with one-click VHF tuning to Scratchpad.</li>
                    </ul>
                `
            },
            {
                target: "#btnAtcRadarCfg",
                badge: "STEP 8 • RADAR & VA FILTER",
                title: "🎚️ ATC Calibration & Virtual Airline (VA) Filter",
                body: `
                    <p>Click the <b>🎚️</b> slider button (or right-click <b>🌐 Online</b>) to tune ATC sectors and track your Virtual Airline:</p>
                    <ul>
                        <li><b>🏢 Airline / VA Filter:</b> Enter callsign prefixes or <code>OPR/</code> keywords (e.g. <code>ITY, RYR, IVV</code>) with <b>Highlight</b> or <b>VA-Only</b> mode, custom color, and live counter.</li>
                        <li><b>🌍 Global VA Range:</b> Track company flights across the entire visible map beyond the local traffic radius.</li>
                        <li><b>⭕ ATC Radius & Opacity:</b> Scale sector circles (<code>0%–250%</code>), adjust opacity, and toggle <b>TWR</b>, <b>APP</b>, and <b>CTR</b>.</li>
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
                badge: "STEP 9 • EFB SCRATCHPAD",
                title: "📝 Cockpit Kneeboard: C.R.A.F.T., Canvas & Frequencies",
                body: `
                    <p>Your tactical in-flight scratchpad:</p>
                    <ul>
                        <li><b>📋 ATC PAD:</b> Dedicated fields for <code>SQUAWK</code>, <code>QNH</code>, <code>ALT/FL</code>, <code>HDG</code>, <code>SPEED</code>, and <code>NEXT FREQ</code> with one-click <b>🔄 SIM</b> telemetry sync.</li>
                        <li><b>✏️ DRAW:</b> Freehand canvas with 4 pen colors and eraser for taxi diagrams and holding sketches.</li>
                        <li><b>📻 FREQ:</b> Automatically aggregates nearby online ATC stations, UNICOM (<code>122.800</code>), emergency (<code>121.500</code>), VORs, and ILS localizers.</li>
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
                badge: "STEP 10 • TACTICAL RULER",
                title: "📏 In-Flight Distance, Bearing & ETE Measuring",
                body: `
                    <p>Measure any segment on the chart using the <b>📏 Measure</b> tool or simply by <b>Right-Clicking</b> two points:</p>
                    <ul>
                        <li>Calculates <b>Distance (NM & km)</b>, <b>Magnetic & True Bearing (°M / °T)</b>, and real-time <b>ETE</b> based on current Ground Speed.</li>
                        <li>Click the measurement badge or press <b>Esc</b> to clear.</li>
                    </ul>
                `
            },
            {
                target: "#btnNavlogTop",
                badge: "STEP 11 • LOGS & PERFORMANCE",
                title: "📋 NavLog, Fuel Calculator & SQLite Logbook",
                body: `
                    <p>Comprehensive pre-flight planning and post-flight record keeping:</p>
                    <ul>
                        <li><b>📋 NavLog:</b> Printable operational flight plan table with magnetic tracks, waypoint distances, ETE/ETA, and progressive fuel consumption.</li>
                        <li><b>⛽ Fuel & Perf:</b> Computes Block Fuel, Trip Fuel, taxi, and regulatory reserves tailored to your aircraft TAS and burn rate.</li>
                        <li><b>📒 Logbook:</b> Automatically records flight hours, block times, and fuel burn into the local SQLite database upon touchdown.</li>
                    </ul>
                `
            },
            {
                target: "#elevationDrawer",
                badge: "STEP 12 • VNAV & CLOUD SCANNER",
                title: "📉 Vertical Navigation Profile, ToD & METAR Cloud Slices",
                body: `
                    <p>The bottom elevation drawer projects your vertical profile against high-resolution terrain:</p>
                    <ul>
                        <li><b>Top of Descent (ToD):</b> Dynamically determines the descent point and vertical speed (fpm) required for a clean 3° glidepath.</li>
                        <li><b>☁️ CLOUDS Scanner:</b> Select <code>AUTO (ACFT)</code> or flight levels from <code>FL050–FL300</code> to slice METAR cloud layers in real-time, complete with cockpit <b>IMC</b> warnings.</li>
                    </ul>
                `
            },
            {
                target: "#aeroCompassWidget",
                badge: "STEP 13 • ORIENTATION & TABLET EFB",
                title: "🧭 Compass Rose, Map Heading & Wi-Fi Tablet Mode",
                body: `
                    <p>Cockpit ergonomics and seamless secondary screen pairing:</p>
                    <ul>
                        <li><b>🧭 Compass Rose:</b> Toggle between <b>Free Map</b>, <b>North Up</b>, and <b>Track Up</b>; click the dial anytime to restore North Up (360°).</li>
                        <li><b>📱 EFB Wi-Fi:</b> Click the EFB pill in the top bar to display the local IP and QR Code. Open the app on your iPad or tablet with zero cables.</li>
                    </ul>
                `
            },
            {
                target: "#btnOpenGlossary",
                badge: "STEP 14 • FEATURE GLOSSARY",
                title: "📖 Alphabetical Bilingual Glossary (IT / EN)",
                body: `
                    <p>Click <b>📖 Glossary</b> in the top-right bar to open the standalone reference page in your system browser:</p>
                    <ul>
                        <li><b>A–Z Quick Index & Live Search:</b> Instantly filter every feature available in AeroGlass-Nav.</li>
                        <li><b>Bilingual IT / EN Switch:</b> Automatically opens in your active app language with one-click switching.</li>
                    </ul>
                `
            },
            {
                target: "#btnOpenCredits",
                badge: "STEP 15 • CREDITS & COMMUNITY",
                title: "ℹ️ About, Bilingual Credits & Community Links",
                body: `
                    <p>Access full documentation and project support from the top bar:</p>
                    <ul>
                        <li><b>ℹ️ Bilingual Credits:</b> Opens the official dialog in English or Italian with release notes and MIT Open Source terms.</li>
                        <li><b>✈️ Community Hub:</b> Direct links to the Flightsim.to addon page, Discord community server, and Buy Me a Coffee support link.</li>
                        <li><b>⚠️ Aviation Disclaimer:</b> Dedicated notice emphasizing flight simulation use only (MSFS 2024).</li>
                    </ul>
                `
            }
        ];
    }

    // --- VERSIONE ITALIANA (DEFAULT) ---
    return [
        {
            target: null,
            badge: "BENVENUTO • v1.0.0",
            title: "✈️ Benvenuto in AeroGlass-Nav",
            body: `
                <p><b>AeroGlass-Nav</b> è il tuo Flight Planner & Moving Map tattico in stile <b>Dark Cockpit</b>, autonomo, ultra-reattivo e sviluppato appositamente per Microsoft Flight Simulator 2024.</p>
                <div class="demo-feature-grid">
                    <div>🌧️ <b>Radar Meteo RainViewer</b> (Tile Live & Slider Temporale 60 min)</div>
                    <div>🔄 <b>Procedure IFR Analitiche</b> (Holding Dinamiche, Archi DME e Vettori)</div>
                    <div>🌍 <b>48.000+ Scali Mondiali</b> (SQLite Locale e Ground Map Reali)</div>
                    <div>🌐 <b>VATSIM / IVAO & Filtro VA</b> (Tipo Aereo, Operatore e Sagome SVG)</div>
                    <div>📝 <b>Scratchpad EFB & Righello</b> (Clearance ATC, Disegno & Calcolo ETE)</div>
                    <div>📖 <b>VNAV, Cloud Scan & Glossario</b> (ToD, Nuvole METAR e Guida IT/EN)</div>
                </div>
                <p class="demo-tip">💡 Usa le frecce <b>← / →</b> per scorrere i passaggi, <b>Spazio</b> per la riproduzione automatica, <b>🌐 IT/EN</b> per cambiare lingua o <b>Esc / F1</b> per chiudere.</p>
            `
        },
        {
            target: "#sidebarPanel",
            badge: "PASSO 1 • PIANIFICAZIONE & SIMBRIEF",
            title: "🗺️ Rotta, Protezione SimBrief & Attivazione Holding",
            body: `
                <p>Dal pannello laterale sinistro gestisci ogni dettaglio del piano di volo:</p>
                <ul>
                    <li><b>🔑 Protezione Pilot ID SimBrief:</b> Clicca sull'icona della chiave per sbloccare la modifica o proteggere il tuo ID; scarica l'ultimo OFP generato con un clic.</li>
                    <li><b>🔄 Pulsante Rapido HOLD:</b> Su ogni waypoint della rotta trovi il pulsante <code>🔄 HOLD</code> per calcolare e disegnare all'istante l'ippodromo d'attesa su mappa.</li>
                    <li><b>📊 Vincoli Altimetrici e Velocità:</b> Visualizzazione chiara dei vincoli di quota e velocità (es. <code>FL100+</code>, <code>MAX 210KT</code>) accanto a ciascun fix.</li>
                    <li><b>📂 Importa / Esporta .PLN & Invia a MSFS:</b> Trasmetti la rotta attiva direttamente all'avionica del velivolo nel simulatore o salva file standard XML.</li>
                </ul>
            `
        },
        {
            target: "#omniSearch",
            badge: "PASSO 2 • RICERCA ISTANTANEA",
            title: "🔍 Ricerca Rapida ICAO & Centraggio Visivo",
            body: `
                <p>Digita qualsiasi codice <b>ICAO</b> (es. <code>LIPZ</code>, <code>LICB</code>, <code>LITY</code>, <code>LIKL</code>), un VOR o una città e premi <b>Invio</b>:</p>
                <ul>
                    <li>Cerca istantaneamente tra oltre <b>48.000 aeroporti SQLite</b> e posiziona lo scalo esattamente al centro visivo della finestra (compensando sidebar e cassetto VNAV).</li>
                    <li>Apre subito la scheda <b>METAR live</b> con il calcolo della <b>Pista Consigliata</b> in base al vento, piste e frequenze radio cliccabili.</li>
                </ul>
            `
        },
        {
            target: "#btnToggleRadar",
            badge: "PASSO 3 • RADAR METEO LIVE",
            title: "🌧️ Radar Precipitazioni RainViewer & Timeline 60m",
            body: `
                <p>Attiva il pulsante <b>🌧️ Radar</b> nella barra superiore per visualizzare i fronti temporaleschi e le precipitazioni in tempo reale:</p>
                <ul>
                    <li><b>Radar Doppler Composito:</b> Layer pioggia e temporali globale aggiornato a cicli di 10 minuti tramite le API pubbliche di RainViewer.</li>
                    <li><b>Barra Temporale Flottante:</b> In basso compare una comoda barra dark cockpit. Usa lo slider per analizzare l'evoluzione degli ultimi 60 minuti o premi <b>▶ Play</b> per avviare l'animazione continua.</li>
                    <li><b>Ottimizzazione Zoom Nativo:</b> Visualizzazione sempre nitida a qualsiasi livello di ingrandimento senza errori di tessere non supportate.</li>
                </ul>
            `
        },
        {
            target: "#sidebarPanel",
            badge: "PASSO 4 • PROCEDURE IFR ANALITICHE",
            title: "🔄 Holding Dinamiche, Archi DME & Vettori Radar",
            body: `
                <p>Motore geometrico analitico per la corretta rappresentazione delle procedure terminali (SID, STAR, IAP):</p>
                <ul>
                    <li><b>Holding Pattern Adattive:</b> Ippodromi standard Rate-1 ($3^\\circ$/s) calcolati dinamicamente in base alla velocità reale (TAS/GS) e alla quota (1.0 min sotto FL140, 1.5 min sopra).</li>
                    <li><b>Badge Ingrandito (+50%):</b> Targhetta cockpit ad alto contrasto con rotta inbound, senso di virata, quota, velocità, raggio e lunghezza gamba in NM.</li>
                    <li><b>Archi DME e Vettori Radar:</b> Tracciamento circolare geodetico degli archi (<code>⌒ ARC xx DME [VOR]</code>) e linee tratteggiate in ambra per i tratti vettoriali ATC (<code>📡 ATC VECTORS</code>).</li>
                </ul>
            `
        },
        {
            target: "#btnToggleGroundMap",
            badge: "PASSO 5 • AEROPORTI MONDIALI & GROUND MAP",
            title: "🛫 Declutter Dinamico (LOD), Taxiway & Stand",
            body: `
                <p>La cartografia adatta automaticamente la densità di scali e dettagli al livello di zoom:</p>
                <ul>
                    <li><b>Zoom Panoramico (&lt; 8):</b> Mostra solo i grandi hub mondiali come discreti punti radar (passa il mouse per visualizzare il codice ICAO).</li>
                    <li><b>Zoom Regionale e VFR (&ge; 9.5):</b> Rivela progressivamente scali minori, campi di volo e aviosuperfici VFR.</li>
                    <li><b>Ground Map Aeroportuale (&ge; 13.5):</b> Disegna piste orientate con testate, raccordi taxiway con lettere ICAO ufficiali e piazzole di parcheggio (layout completi per <code>LIKL</code>, <code>LIPD</code>, <code>LITY</code>, <code>LIPZ</code>).</li>
                </ul>
            `
        },
        {
            target: "#btnToggleWeather",
            badge: "PASSO 6 • VENTI IN ROTTA & METAR",
            title: "💨 Vettori Vento & Categorie di Volo",
            body: `
                <p>Attiva <b>💨 WX</b> per monitorare i parametri atmosferici lungo la rotta:</p>
                <ul>
                    <li><b>Vettori Vento in Quota:</b> Mostrano freccia del flusso, prua/nodi e calcolano all'istante la componente di <b>Vento Contrario (HW)</b>, <b>Vento in Coda (TW)</b> o <b>Traverso (XW)</b>.</li>
                    <li><b>Pillole Categorie di Volo:</b> Indicatori colorati (<b style="color:#2ea043;">VFR</b>, <b style="color:#00d2ff;">MVFR</b>, <b style="color:#f85149;">IFR</b>, <b style="color:#e040fb;">LIFR</b>) sugli aeroporti visibili.</li>
                </ul>
            `
        },
        {
            target: "#btnToggleNetwork",
            badge: "PASSO 7 • RETI DI VOLO ONLINE",
            title: "🌐 Traffico VATSIM / IVAO: Tipo Aereo, Operatore & ATC",
            body: `
                <p>Cicla tra <b>OFF</b>, <b>ON (Entrambi)</b>, <b>IVAO</b> e <b>VATSIM</b> con aggiornamento automatico ogni 60 secondi:</p>
                <ul>
                    <li><b>Tipo Aereo, Operatore & Tratta:</b> Passa il mouse su qualsiasi pilota per vedere codice ICAO, compagnia (da DB SQLite o <code>OPR/</code>) e rotta <code>DEP ➔ ARR</code>.</li>
                    <li><b>Sagome SVG per Categoria:</b> Icone differenziate per Heavy, Jet, Turboprop, Aviazione Generale, Militari ed Elicotteri.</li>
                    <li><b>Postazioni ATC Connesse:</b> Torri (<b>🗼 TWR</b>), Avvicinamenti (<b>📡 APP</b>) e Centri Radar (<b>🕸️ CTR</b>) con invio rapido della frequenza VHF allo Scratchpad.</li>
                </ul>
            `
        },
        {
            target: "#btnAtcRadarCfg",
            badge: "PASSO 8 • RADAR & FILTRO VA",
            title: "🎚️ Calibrazione ATC & Filtro Compagnia Virtuale (VA)",
            body: `
                <p>Clicca sul pulsante <b>🎚️</b> (o fai clic destro su <b>🌐 Online</b>) per regolare il radar e tracciare la tua Compagnia Virtuale:</p>
                <ul>
                    <li><b>🏢 Filtro Compagnia / VA:</b> Inserisci prefissi callsign o parole chiave <code>OPR/</code> (es. <code>ITY, RYR, IVV</code>) con modalità <b>Evidenzia</b> o <b>Solo VA</b>, colore personalizzato e contatore live.</li>
                    <li><b>🌍 Raggio Globale VA:</b> Visualizza i voli della compagnia su tutta la mappa anche oltre il raggio locale.</li>
                    <li><b>⭕ Raggio & Opacità ATC:</b> Scala i cerchi (<code>0%–250%</code>), regola la trasparenza e filtra <b>TWR</b>, <b>APP</b> e <b>CTR</b>.</li>
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
            badge: "PASSO 9 • SCRATCHPAD EFB",
            title: "📝 Cosciale di Bordo: Clearance ATC, Disegno & Frequenze",
            body: `
                <p>Il tuo blocco note tattico sempre disponibile durante il volo:</p>
                <ul>
                    <li><b>📋 ATC PAD:</b> Campi rapidi per <code>SQUAWK</code>, <code>QNH</code>, <code>ALT/FL</code>, <code>HDG</code>, <code>SPEED</code> e <code>NEXT FREQ</code> con sincronizzazione istantanea <b>🔄 SIM</b> dei dati telemetrici.</li>
                    <li><b>✏️ DISEGNO:</b> Lavagna grafica a mano libera con 4 colori e gomma per appuntare istruzioni di rullaggio o schemi di attesa.</li>
                    <li><b>📻 FREQ:</b> Elenca in tempo reale le frequenze dei controllori online più vicini, UNICOM (<code>122.800</code>), emergenza (<code>121.500</code>), VOR e ILS.</li>
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
            badge: "PASSO 10 • RIGHELLO TATTICO",
            title: "📏 Distanza, Prua Magnetica/Vera & Calcolo ETE",
            body: `
                <p>Misura qualsiasi segmento sulla carta con il pulsante <b>📏 Righello</b> oppure facendo <b>Clic Destro</b> su due punti della mappa:</p>
                <ul>
                    <li>Calcola in tempo reale <b>Distanza (NM e km)</b>, <b>Prua Magnetica e Vera (°M / °T)</b> e il <b>tempo di volo stimato (ETE)</b> in base alla tua Ground Speed.</li>
                    <li>Clicca sul badge della misura o premi <b>Esc</b> per cancellare la linea.</li>
                </ul>
            `
        },
        {
            target: "#btnNavlogTop",
            badge: "PASSO 11 • STRUMENTI DI NAVIGAZIONE",
            title: "📋 NavLog, Calcolo Carburante & Logbook SQLite",
            body: `
                <p>Pianificazione operativa e storico completo dei tuoi voli:</p>
                <ul>
                    <li><b>📋 NavLog:</b> Tabella di navigazione stampabile con prue, distanze parziali, tempi stimati e consumo progressivo per ogni tratta.</li>
                    <li><b>⛽ Fuel & Perf:</b> Calcola Block Fuel, Trip Fuel, rullaggio, contingenza e riserve normative secondo le prestazioni del tuo aeromobile.</li>
                    <li><b>📒 Logbook:</b> Registra automaticamente ogni volo al momento dell'atterraggio nel database SQLite locale.</li>
                </ul>
            `
        },
        {
            target: "#elevationDrawer",
            badge: "PASSO 12 • PROFILO VNAV & CLOUD SCANNER",
            title: "📉 Profilo Altimetrico Verticale, ToD & Strati Nubi",
            body: `
                <p>Il cassetto altimetrico inferiore mostra la rotta rispetto all'orografia del terreno:</p>
                <ul>
                    <li><b>Top of Descent (ToD):</b> Calcola e visualizza sulla rotta e sul grafico il punto ottimale di inizio discesa (sentiero standard a 3°) e la velocità verticale (fpm) richiesta.</li>
                    <li><b>☁️ CLOUDS Scanner:</b> Seleziona <code>AUTO (ACFT)</code> o quote da <code>FL050–FL300</code> per sezionare gli strati nuvolosi METAR con avvisi luminosi <b>IMC</b> in cabina.</li>
                </ul>
            `
        },
        {
            target: "#aeroCompassWidget",
            badge: "PASSO 13 • ORIENTAMENTO & TABLET EFB",
            title: "🧭 Rosa dei Venti, Orientamento Mappa & EFB Wi-Fi",
            body: `
                <p>Ergonomia di cabina e sincronizzazione su secondo schermo:</p>
                <ul>
                    <li><b>🧭 Rosa dei Venti:</b> Alterna tra <b>Mappa Libera</b>, <b>Nord Su</b> e <b>Track Up</b>; clicca sulla bussola per ripristinare all'istante il Nord in alto (360°).</li>
                    <li><b>📱 EFB Wi-Fi:</b> Clicca sul pulsante EFB nella barra superiore per visualizzare indirizzo IP e QR Code: usa AeroGlass-Nav direttamente dal tuo tablet senza cavi né configurazioni.</li>
                </ul>
            `
        },
        {
            target: "#btnOpenGlossary",
            badge: "PASSO 14 • GLOSSARIO FUNZIONI",
            title: "📖 Glossario Alfabetico Bilingue (IT / EN)",
            body: `
                <p>Clicca su <b>📖 Glossario</b> in alto a destra per aprire nel browser di sistema la guida rapida a tutte le funzioni:</p>
                <ul>
                    <li><b>Indice A–Z & Ricerca Istantanea:</b> Filtra al volo qualsiasi strumento disponibile in AeroGlass-Nav.</li>
                    <li><b>Bilingue IT / EN:</b> Si apre direttamente nella lingua attiva dell'app con cambio lingua immediato.</li>
                </ul>
            `
        },
        {
            target: "#btnOpenCredits",
            badge: "PASSO 15 • CREDITI & COMMUNITY",
            title: "ℹ️ Finestra Credits Bilingue, Licenza & Link",
            body: `
                <p>Accedi alle informazioni ufficiali e al supporto del progetto:</p>
                <ul>
                    <li><b>ℹ️ Finestra Credits Bilingue:</b> Scheda modale con visualizzazione in inglese o italiano, note di rilascio v1.0.0 e licenza Open Source MIT.</li>
                    <li><b>✈️ Canali Community:</b> Collegamenti diretti alla pagina Flightsim.to, al server Discord dedicato e al link di supporto Buy Me a Coffee.</li>
                    <li><b>⚠️ Disclaimer Aeronautico:</b> Avvertenza ufficiale sull'utilizzo esclusivo in simulazione di volo (MSFS 2024).</li>
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
                <span class="demo-step-badge" id="demoStepBadge">PASSO 1 / 14</span>
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
                <span id="demoStepCounter" style="font-family:Consolas,monospace;font-size:12px;color:#94a3b8;">1 / 14</span>
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