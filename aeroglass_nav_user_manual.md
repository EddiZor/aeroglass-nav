✈️ AeroGlass Nav v0.5.3 — User Manual / Manuale Utente

🇬🇧 ENGLISH INSTRUCTIONS

☀️ Overview

AeroGlass Nav is a lightweight, glassmorphism-styled Flight Planner and Moving Map utility for Microsoft Flight Simulator (MSFS 2020 & MSFS 2024) developed by EddiZor. It combines real-time asynchronous SimConnect telemetry, SimBrief OFP integration, manual flight plan creation, .pln import/export, dynamic aircraft vector silhouettes, and an interactive VNAV altitude profile.

🟢 Live SimConnect Telemetry & Demo Mode

🔄 Automatic Detection: The app runs an asynchronous background thread with lazy loading that connects automatically to MSFS without freezing or slowing down the interface at startup.

🟢 LIVE Mode: When a flight is loaded in MSFS, the top status dot turns green and displays your aircraft name (supporting long names up to 42 characters), altitude (ALT), ground speed (GS), magnetic heading (HDG), and live aircraft position on the map with category-specific vector silhouettes (Airliners, Military Jets, General Aviation, and Helicopters).

🟡 DEMO Mode: When MSFS is closed or in the main menu, the app stays in DEMO mode (amber dot) and removes the aircraft icon from the map until an active flight starts.

➕ Creating & Exporting Flight Plans (.PLN)

➕ Create Button: Click + Create in the top-left sidebar to open the manual route builder modal.

✍️ Route Input: Enter the Departure ICAO (e.g., LIPZ or LIRF), optional Intermediate Waypoints separated by spaces or commas (e.g., RON VIL BOL), Destination ICAO (e.g., LIPX or LITY), and Cruise Altitude (FT).

🗺️ Show on Map: Click Show on Map to plot the route and generate the VNAV climb (TOC) and descent (TOD) profile immediately.

💾 Create & Save .PLN: Click Create & Save .PLN in the modal (or the 💾 .pln button in the sidebar at any time) to export the active flight plan in standard MSFS .pln XML format directly into your Windows Downloads folder (e.g., Downloads\LIPD-LIPZ.pln).

📂 Importing Flight Plans (SimBrief & .PLN)

✈️ SimBrief Integration: Enter your SimBrief Pilot ID or Username in the setup box and click ✈️ SimBrief. Your ID is saved automatically in config.json, and the bar switches to compact mode (✈️ SimBrief to reload and ⚙️ to edit your ID).

📁 Local .PLN Import: Click 📁 .pln in the sidebar to browse and open any MSFS .pln or .xml flight plan file from your computer.

📥 Drag & Drop: Drag any .pln file from Windows Explorer and drop it directly onto the map window to load the route and VNAV profile on the fly.

🗑️ Clear Route: Click 🗑️ to wipe the active flight plan and reset the map and VNAV chart.

📈 Interactive VNAV Profile & Waypoint List

📊 Multi-Step VNAV Drawer: The bottom drawer displays a multi-step altitude profile. Hovering your mouse over the VNAV chart or along the route line on the map activates a synchronized cursor showing precise leg information, altitude, and distance in NM.

📍 Waypoint List & Wx: Each waypoint card in the sidebar displays its ICAO identifier, name, elevation, live METAR badges (Wind, Temp, QNH) for endpoints, and live distance tracking from your aircraft position.

✏️ Altitude Editing: Click on any waypoint altitude (e.g., 12000 ft) to edit its target altitude dynamically.

🇮🇹 ISTRUZIONI IN ITALIANO

☀️ Panoramica

AeroGlass Nav è un leggero Flight Planner e Moving Map in stile glassmorphism per Microsoft Flight Simulator (MSFS 2020 & MSFS 2024) sviluppato da EddiZor. Combina telemetria SimConnect asincrona in tempo reale, integrazione SimBrief OFP, creazione manuale di piani di volo, importazione/esportazione .pln, sagome vettoriali dinamiche in base al velivolo e un profilo altimetrico VNAV interattivo.

🟢 Telemetria Live SimConnect & Modalità Demo

🔄 Rilevamento Automatico: L'app esegue un thread di background asincrono che si connette automaticamente a MSFS senza bloccare o rallentare l'interfaccia all'avvio.

🟢 Modalità LIVE: Quando un volo viene caricato in MSFS, il pallino di stato in alto diventa verde e mostra il nome del velivolo (fino a 42 caratteri), quota (ALT), velocità su suolo (GS), prua magnetica (HDG) e posizione live sulla mappa con icone vettoriali dedicate (Airliner, Jet Militari, Aviazione Generale ed Elicotteri).

🟡 Modalità DEMO: Quando MSFS è chiuso o nel menu principale, l'app resta in modalità DEMO (pallino ambra) e rimuove l'icona dell'aereo dalla mappa finché non inizia un volo attivo.

➕ Creazione ed Esportazione Piani di Volo (.PLN)

➕ Pulsante Crea: Clicca + Crea nella sidebar in alto a sinistra per aprire il modale di costruzione rotta.

✍️ Inserimento Rotta: Inserisci ICAO Partenza (es. LIPZ o LIRF), Waypoint Intermedi opzionali separati da spazi o virgole (es. RON VIL BOL), ICAO Arrivo (es. LIPX o LITY) e Quota di Crociera (FT).

🗺️ Mostra su Mappa: Clicca per tracciare la rotta e generare istantaneamente il profilo di salita (TOC) e discesa (TOD) VNAV.

💾 Crea e Salva .PLN: Clicca nel modale (o sul pulsante 💾 .pln nella sidebar) per esportare il piano di volo attivo in formato XML standard MSFS .pln direttamente nella cartella Download di Windows (es. Downloads\LIPD-LIPZ.pln).

📂 Importazione Piani di Volo (SimBrief & .PLN)

✈️ Integrazione SimBrief: Inserisci il tuo ID Pilota o Username SimBrief nell'apposita casella e clicca ✈️ SimBrief. Il tuo ID viene salvato in automatico in config.json e la barra passa in modalità compatta (✈️ SimBrief per ricaricare e ⚙️ per modificarlo).

📁 Import Locale .PLN: Clicca 📁 .pln nella sidebar per sfogliare e aprire qualsiasi file piano di volo MSFS .pln o .xml dal computer.

📥 Drag & Drop: Trascina qualsiasi file .pln da Esplora File e rilascialo direttamente sulla finestra della mappa per caricare rotta e profilo VNAV al volo.

🗑️ Pulisci Rotta: Clicca 🗑️ per cancellare il piano di volo attivo e ripristinare mappa e grafico VNAV.

📈 Profilo VNAV Interattivo & Lista Waypoints

📊 Cassetto VNAV Multi-Step: Il cassetto inferiore mostra il profilo altimetrico multi-step. Passando il mouse sopra il grafico VNAV o lungo la linea di rotta sulla mappa si attiva un cursore sincronizzato che mostra le informazioni di tratta, quota e distanza in NM.

📍 Lista Waypoints & Wx: Ogni scheda waypoint nella sidebar mostra identificativo ICAO, nome, altitudine, badge METAR live (Vento, Temp, QNH) per gli aeroporti e tracciamento dinamico della distanza dall'aereo.

✏️ Modifica Quota: Clicca su qualsiasi altitudine dei waypoint (es. 12000 ft) per modificarne la quota target in tempo reale.