# AeroGlass-Nav ✈️🗺️

🌐 **[🇬🇧 English](#-english) | [🇮🇹 Italiano](#-italiano)**

> ⚠️ **Aviation Disclaimer:** AeroGlass-Nav is designed exclusively for flight simulation (Microsoft Flight Simulator 2020 / MSFS 2024). It must never be used for real-world navigation or flight planning. / *Sviluppato esclusivamente per la simulazione di volo (MSFS 2020 / MSFS 2024); non utilizzare per la navigazione reale.*

---

## 🇬🇧 English

**AeroGlass-Nav** is a standalone **Dark Cockpit** EFB (Electronic Flight Bag), Flight Planner, and Moving Map application specifically built for **Microsoft Flight Simulator 2024** (and compatible with MSFS 2020). Built on a hybrid Python architecture (`pywebview`, multithreaded EFB HTTP server, `SQLite`, and native `SimConnect` telemetry) with a `Leaflet` cartographic frontend, it provides a smooth, responsive navigation experience both on your desktop flight sim setup and on tablets over Wi-Fi.

---

### 🌟 Key Features

#### 1. 🗺️ Dynamic Moving Map, Ground Map & Visual Search Centering
* **Multiple Map Layers:** Fast switching across *Dark Cockpit*, *IFR*, *VFR*, *Open Flight Maps*, *Satellite*, and *Relief (Terrain)* views, complete with live filter calibration profiles (brightness, contrast, saturation).
* **Quick Search with Visual Centering:** Instant search across **48,000+ world airports**, cities, and navaids in the local SQLite database (with `Enter` confirmation), centering the target airfield within the visible map area (compensating for sidebar and VNAV drawer) and opening the quick METAR popup.
* **Real Airport Ground Map:** High-detail ground layouts (runways, labeled taxiways, taxilanes, and parking stands) sourced from cache/MSFS/OSM, paired with zoom-based decluttering (LOD).
* **VOR / ILS & Navaids Layer:** Zoom-filtered display of VOR, VOR-DME, VORTAC, TACAN, NDB, and ILS approach cones with frequencies and associated details.
* **Real-Time SimConnect Telemetry:** Live aircraft tracking (`ACFT`, `ALT`, `GS`, `HDG`) with *Free Map*, *North Up*, and *Track Up* modes via an integrated compass rose.

#### 2. ✈️ Flight Planning, Analytical IFR Procedures & NavLog
* **Airway Auto-Routing & `.PLN`:** Automated airway routing (`router.py`), `.pln` import/export (including drag & drop), and direct route transfer to the aircraft avionics via **`Send to MSFS`**.
* **Instrument Procedures & Analytical Holds:** Support for `SID`, `STAR`, and `APPR` procedures with altitude/speed constraints, DME arcs, radar vectors, and speed/altitude-adaptive **Holding patterns**.
* **SimBrief Integration & Custom Waypoints:** One-click OFP import via SimBrief ID and SQLite-backed custom waypoints (including direct map coordinate picking).
* **NavLog, Fuel & SQLite Logbook:** Operational leg table, fuel planner (*Block Fuel* and reserves), and a built-in SQLite **Logbook** to review or manage completed flights.

#### 3. 📉 Multi-Step VNAV Profile, ToD & Cloud Scanner
* **Vertical Profile & Top of Descent:** Interactive terrain and flight-plan elevation chart with automatic **Top of Descent (ToD)** calculation and recommended descent rate.
* **Live Weather (WX) & Cloud Scanner:** Real-time METAR decoding (wind, temperature, QNH, flight category, and recommended runway) plus altitude cloud slicing (`AUTO` or `FL050` – `FL300`) with `IMC` indicators.

#### 4. 🌐 Online Traffic (IVAO / VATSIM), Metadata & Airline / VA Filter
* **Online Pilots, Aircraft Type, Operator & Route:** Asynchronous IVAO and VATSIM traffic fetch with ICAO aircraft type detection, airline/operator lookup (from SQLite `world_airlines` / `world_aircraft_types` or `OPR/` tags), `DEP ➔ ARR` routes, and **category SVG silhouettes** (`heavy`, `jet`, `turboprop`, `ga`, `mil`, `heli`).
* **Virtual Airline (VA) Filter & Highlighting:** Radar calibration popover (`🎚️`) supporting comma-separated callsign prefixes or operator keywords, **Highlight** or **VA-Only** mode, **Global VA Range**, custom highlight color, live flight counter, and SQLite persistence.
* **ATC Radar & Quick Tuning:** Online `TWR`, `APP`, and `CTR` coverage display with adjustable radius and opacity, plus one-click VHF frequency transfer to the Scratchpad.

#### 5. 📝 EFB Scratchpad, Tactical Ruler & Bilingual Glossary
* **EFB Scratchpad:** Quick pad for `SQUAWK`, `QNH`, `ALT/FL`, `HDG`, `SPEED`, and `NEXT FREQ` (with telemetry sync), freehand drawing canvas, and nearby frequencies list.
* **Tactical Ruler:** Measure distance (`NM` / `km`), bearing, and estimated `ETE` via the toolbar button or right-clicking on the map.
* **Bilingual Glossary (`IT` / `EN`):** Alphabetical reference page opened in your system browser with instant filtering and synchronized language selection.

#### 6. 🌍 First-Launch Localization & Unified SQLite Database
* **First-Launch Language Selection:** On the very first launch, the app starts in **English (`en`)** and displays an AeroGlass-styled modal asking whether to keep English or switch to **Italian (`it`)**, saving the choice to SQLite (`app_language`) and keeping the UI, tours (`F1` / `F2`), and glossary aligned.
* **Unified SQLite Database (`aeroglass.db`):** Single source of truth for airports, runways, frequencies, navaids, airlines, aircraft categories, ground layout cache, settings, and logbook, with non-destructive user-profile synchronization (`~/.aeroglass_nav/aeroglass.db`) in packaged builds.

---

### 📱 Tablet EFB Connection via Wi-Fi

AeroGlass-Nav runs a local multithreaded HTTP server so you can use a tablet or second device as a wireless EFB:
1. Click the **`EFB`** button in the top bar to display the **QR Code** and local IP/port URL (e.g., `192.168.x.x:8339`).
2. Scan the QR Code or open the URL on a tablet connected to the same local network.
3. Flight plan, map, weather, online traffic, and aircraft telemetry stay synchronized in real time.

---

### 🚀 Installation, Launch & Build

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/EddiZor/aeroglass-nav.git](https://github.com/EddiZor/aeroglass-nav.git)
   cd aeroglass-nav
Install Python dependencies:

Bash
pip install -r requirements.txt
Run in development mode:

Bash
python main.py
Build executable with PyInstaller (optional):

Bash
pyinstaller --clean -y build.spec
⌨️ Shortcuts & Interaction
F1: Start / stop the bilingual Interactive Guided Tour (demo.js).

F2: Start / stop the Automatic Demo (demo2.js) — press L while running to switch language on the fly.

Esc: Stop an active demo or cancel an in-progress measurement.

Ctrl + Z: Undo the last route change.

Right-Click on Map: Start the quick measurement ruler.

🇮🇹 Italiano
AeroGlass-Nav è un sistema EFB (Electronic Flight Bag), Flight Planner e Moving Map standalone in stile Dark Cockpit, progettato specificamente per Microsoft Flight Simulator 2024 (e compatibile con MSFS 2020). Realizzato con un'architettura ibrida Python (pywebview, server HTTP multithread per EFB, SQLite e bridge SimConnect) e frontend cartografico Leaflet, offre un'esperienza fluida e reattiva sia sul monitor del PC di volo sia su tablet via Wi-Fi.

🌟 Caratteristiche Principali
1. 🗺️ Moving Map Dinamica, Ground Map & Ricerca Rapida
Layer Cartografici Multipli: Passaggio rapido tra viste Dark Cockpit, IFR, VFR, Open Flight Maps, Foto Satellitari e Rilievi (Terrain), con profili di calibrazione filtri (luminosità, contrasto, saturazione) in tempo reale.

Ricerca Rapida con Centraggio Visivo: Ricerca istantanea su oltre 48.000 aeroporti mondiali, città e radioassistenze nel database SQLite locale (con conferma tramite Invio), centrando lo scalo nell'area visibile della finestra (compensando sidebar e cassetto VNAV) e aprendo la scheda METAR rapida.

Ground Map Aeroportuale Reale: Visualizzazione ad alto dettaglio del layout di terra (piste, taxiway con identificativi, raccordi e piazzole di parcheggio) estratta da cache/MSFS/OSM, con decluttering automatico per livello di zoom (LOD).

Layer VOR / ILS & Radioassistenze: Visualizzazione filtrabile per zoom di VOR, VOR-DME, VORTAC, TACAN, NDB e coni ILS con frequenze e dati associati.

Telemetria SimConnect in Tempo Reale: Tracciamento live dell'aeromobile (ACFT, ALT, GS, HDG) con modalità Mappa Libera, Nord Su e Track Up tramite rosa dei venti integrata.

2. ✈️ Pianificazione Volo, Procedure IFR Analitiche & NavLog
Airway Auto-Routing & .PLN: Calcolo automatico di rotta su aerovie (router.py), importazione/esportazione file .pln (anche con drag & drop) e invio diretto del piano di volo attivo al simulatore tramite Invia a MSFS.

Procedure Strumentali & Holding Analitiche: Supporto a SID, STAR e APPR con vincoli di quota/velocità, archi DME, vettori radar e attivazione rapida di Holding pattern adattive calcolate su velocità e quota.

Integrazione SimBrief & Waypoint Utente: Importazione rapida dell'ultimo OFP tramite SimBrief ID e gestione di waypoint personalizzati salvati in SQLite (anche con acquisizione coordinate direttamente dalla mappa).

NavLog, Fuel & Logbook SQLite: Tabella operativa di rotta, calcolatore carburante (Block Fuel e riserve) e Logbook su SQLite per consultare o gestire lo storico dei voli.

3. 📉 Profilo VNAV Multi-Step, ToD & Scansione Nuvole
Profilo Verticale & Top of Descent: Grafico altimetrico interattivo del terreno e della rotta con calcolo del Top of Descent (ToD) e rateo di discesa consigliato.

Meteo Live (WX) & Cloud Scanner: Decodifica METAR (vento, temperatura, QNH, categoria di volo e pista consigliata) e scansione strati nuvolosi in quota (AUTO o livelli FL050 – FL300) con indicatori IMC.

4. 🌐 Traffico Online (IVAO / VATSIM), Metadati & Filtro Compagnia / VA
Piloti Online, Tipo Aereo, Operatore & Tratta: Recupero asincrono del traffico IVAO e VATSIM con riconoscimento di tipo ICAO, compagnia/operatore (da tabelle SQLite world_airlines / world_aircraft_types o tag OPR/), tratta DEP ➔ ARR e sagome SVG differenziate per categoria (heavy, jet, turboprop, ga, mil, heli).

Filtro & Evidenziazione Compagnie Virtuali (VA): Pannello di calibrazione radar (🎚️) con ricerca per prefissi callsign o operatore (separati da virgola), modalità Evidenzia o Solo VA, Raggio Globale VA, colore personalizzabile, contatore live e impostazioni persistenti in SQLite.

Radar ATC & Sintonia Rapida: Visualizzazione stazioni TWR, APP e CTR con raggio e opacità regolabili e invio rapido della frequenza VHF allo Scratchpad.

5. 📝 Scratchpad EFB, Righello Tattico & Glossario Bilingue
Scratchpad EFB: Blocco note con campi SQUAWK, QNH, ALT/FL, HDG, SPEED e NEXT FREQ (sincronizzabili con la telemetria), canvas a mano libera e elenco frequenze vicine.

Righello Tattico: Misurazione di distanza (NM / km), prua e ETE stimato tramite pulsante o click destro su mappa.

Glossario Bilingue (IT / EN): Guida alfabetica interattiva apribile nel browser di sistema con ricerca istantanea e cambio lingua sincronizzato.

6. 🌍 Localizzazione al Primo Avvio & Database Unificato
Scelta Lingua al Primo Avvio: Al primo avvio assoluto l'applicazione parte in inglese (en) mostrando una finestrina modale in stile AeroGlass per scegliere se mantenere l'inglese o passare all'italiano (it), salvando la preferenza in SQLite (app_language) e allineando app, tour (F1 / F2) e glossario.

Database SQLite Centralizzato (aeroglass.db): Archiviazione centralizzata di aeroporti, piste, frequenze, radioassistenze, compagnie aeree, categorie aeromobili, cache dei layout di terra, impostazioni e logbook, con copia e sincronizzazione non distruttiva nel profilo utente (~/.aeroglass_nav/aeroglass.db) per le build distribuite.

📱 Connessione Tablet EFB via Wi-Fi
AeroGlass-Nav include un server HTTP locale multithread per usare un tablet o un secondo schermo come EFB:

Clicca sul pulsante EFB nella barra superiore per visualizzare QR Code e indirizzo IP/porta locale (es. 192.168.x.x:8339).

Scansiona il QR Code o apri l'URL dal tablet collegato alla stessa rete locale.

Rotta, mappa, meteo, traffico online e telemetria restano sincronizzati in tempo reale.

🚀 Installazione, Avvio e Build
Clona il repository:

Bash
git clone [https://github.com/EddiZor/aeroglass-nav.git](https://github.com/EddiZor/aeroglass-nav.git)
cd aeroglass-nav
Installa le dipendenze Python:

Bash
pip install -r requirements.txt
Avvia in modalità sviluppo:

Bash
python main.py
Compila l'eseguibile con PyInstaller (opzionale):

Bash
pyinstaller --clean -y build.spec
⌨️ Scorciatoie e Interazione
F1: Avvia / chiude il Tour Guidato Interattivo bilingue (demo.js).

F2: Avvia / interrompe la Demo Automatica (demo2.js) — premi L durante la demo per cambiare lingua al volo.

Esc: Chiude la demo attiva o annulla una misurazione in corso.

Ctrl + Z: Annulla l'ultima modifica sulla rotta.

Click Destro su Mappa: Avvia il righello di misurazione rapida.