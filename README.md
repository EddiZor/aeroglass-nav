# AeroGlass-Nav ✈️🗺️

🌐 **[🇮🇹 Italiano](#-italiano) | [🇬🇧 English](#-english)**

---

## 🇮🇹 Italiano

**AeroGlass-Nav** è un avanzato sistema EFB (Electronic Flight Bag), Flight Planner e Moving Map open-source progettato specificamente per Microsoft Flight Simulator (MSFS 2020 / MSFS 2024). Sviluppato con un'architettura ibrida Python (`pywebview` + backend Flask/HTTP + connessione nativa SimConnect) e frontend cartografico Leaflet, offre un'esperienza di navigazione fluida, reattiva ed ergonomica sia su monitor PC che su tablet Android via Wi-Fi.

---

### 🌟 Caratteristiche Principali

#### 1. 🗺️ Moving Map Dinamica, Ground Map e Cartografia Multi-Layer
* **Layer Mappe Multipli:** Selezione rapida tra modalità *IFR*, *VFR*, temi *Giorno/Notte (Dark Cockpit)*, *Foto Satellitari* e mappa *Rilievi (Terrain)*.
* **Ground Map Aeroportuale Vettoriale:** Visualizzazione automatica ad alto dettaglio del layout di terra degli aeroporti con piste, raccordi (taxiway con etichette), linee di guida gialle e piazzole di parcheggio numerate.
* **Layer VOR / ILS & Filtri:** Visualizzazione interattiva di oltre 42.000 aeroporti mondiali da database SQLite locale, radioassistenze, frequenze e coni di avvicinamento ILS configurabili tramite il pannello filtri.
* **Telemetria SimConnect in Tempo Reale:** Tracciamento live dell'aeromobile (`ACFT`, `ALT`, `GS`, `HDG`) con modalità *Segui Aereo* o *Mappa Libera* e bussola dinamica integrata.

#### 2. ✈️ Pianificazione Volo Avanzata, Procedure & NavLog
* **Import / Export `.PLN` & Invia a MSFS:** Supporto al caricamento/salvataggio nativo dei file `.pln` (anche via drag & drop) e invio diretto del piano di volo attivo al simulatore tramite il pulsante **`Invia a MSFS`**.
* **Procedure Strumentali (SID / STAR / APPR):** Gestione delle procedure di partenza, arrivo e avvicinamento con indicazione delle piste in uso e vincoli di quota.
* **Integrazione SimBrief:** Sincronizzazione immediata dell'ultimo OFP generato tramite il proprio User ID SimBrief.
* **Waypoints Utente (Custom):** Creazione, salvataggio nel database SQLite locale e posizionamento di waypoint personalizzati (con ID, quota e coordinate) tramite acquisizione diretta con un click sulla mappa.
* **NavLog, Fuel & Logbook:** Tabella di marcia dettagliata (prua, distanze, ETE/ETA), calcolatore di carburante (*Block Fuel* e riserve regolamentari EASA/FAA) e **Logbook** di bordo integrato per registrare i voli effettuati.

#### 3. 📉 Profilo VNAV Multi-Step, ToD e Scansione Nuvole
* **Profilo Altimetrico Verticale Multi-Step:** Grafico interattivo in tempo reale dell'elevazione del terreno e della rotta con calcolo automatico delle discese a gradini e del **Top of Descent (ToD)**.
* **Meteo Live (WX) & Scan Nuvole in Quota:** Decodifica METAR in tempo reale (vento, temperatura, QNH mostrati direttamente sulle schede aeroporto) e selettore di quota (`AUTO` basato sull'aereo o livelli fissi `FL050` – `FL300`) per visualizzare le celle nuvolose direttamente sul profilo VNAV e sulla mappa.

#### 4. 🌐 Traffico Online (VATSIM / IVAO) & Radar ATC
* **Radar Postazioni ATC:** Visualizzazione dei cerchi di copertura per torri (`TWR`), avvicinamenti (`APP`) e centri di controllo (`CTR`) con opacità e raggio configurabili.
* **Traffico Piloti Live:** Monitoraggio in tempo reale dei piloti connessi sulle reti online con vettori di rotta, quota e Ground Speed.

#### 5. 📝 Scratchpad EFB, Note & Righello Tattico
* **ATC Clearance Pad & Note:** Blocco note rapido per annotare Squawk, QNH, altitudini, vettori radar e frequenze d'ascolto con switch rapido tra i canali radio.
* **Canvas Disegno a Mano Libera:** Lavagna grafica ideale per appunti veloci in volo con supporto a penne colorate e gomma.
* **Righello Tattico di Misura:** Strumento per misurare distanze in miglia nautiche (`NM`), prua magnetica/vera e tempo stimato `ETE` (attivabile dal pulsante `Righello` o con click destro sulla mappa).

#### 6. 🌍 Interfaccia Multilingua (IT / EN) e Accessibilità
* **Switch Lingua Istantaneo:** Interfaccia utente completamente localizzata in **Italiano** e **Inglese** selezionabile con un click dalla barra superiore.
* **Ergonomia Desktop & Touch:** Testi selezionabili, orologio doppio `UTC` / `SYS`, coordinate cursore live e controlli ottimizzati sia per l'uso con mouse che su schermi touch.

---

### 📱 Connessione Tablet EFB via Wi-Fi

AeroGlass-Nav integra un server HTTP multithreaded locale. Per utilizzare un tablet o un secondo dispositivo come EFB esterno:
1. Clicca sul pulsante **`EFB`** nella barra superiore per visualizzare il **QR Code** e l'indirizzo IP locale (es. `192.168.x.x:8339`).
2. Inquadra il QR Code con la fotocamera del tablet (connesso alla stessa rete Wi-Fi del PC).
3. Entrambi i dispositivi si sincronizzeranno in tempo reale su rotta, mappa di terra, meteo e telemetria dell'aereo.

---

### 🚀 Installazione e Avvio

1. **Clona il repository:**
   ```bash
   git clone https://github.com/tuo-username/aeroglass-nav.git
   cd aeroglass-nav
   ```
2. **Installa le dipendenze Python:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Avvia l'applicazione:**
   ```bash
   python main.py
   ```

---

### ⌨️ Scorciatoie e Interazione
* **`F1`**: Avvia il Tour Guidato Dimostrativo (Demo Mode).
* **`Ctrl + Z`**: Annulla l'ultima modifica sulla rotta.
* **`Click Destro su Mappa`**: Avvia il righello di misurazione rapida.
* **`Ctrl + C / Ctrl + V`**: Pienamente abilitati in tutti i pannelli e nello Scratchpad.

---
---

## 🇬🇧 English

**AeroGlass-Nav** is an advanced open-source EFB (Electronic Flight Bag), Flight Planner, and Moving Map system specifically designed for Microsoft Flight Simulator (MSFS 2020 / MSFS 2024). Built on a hybrid Python architecture (`pywebview` + Flask/HTTP backend + native SimConnect bridge) and a Leaflet mapping frontend, it delivers a smooth, responsive, and ergonomic navigation experience both on PC monitors and on Android/iOS tablets over Wi-Fi.

---

### 🌟 Key Features

#### 1. 🗺️ Dynamic Moving Map, Ground Map & Multi-Layer Cartography
* **Multiple Map Layers:** Quick switching between *IFR*, *VFR*, *Day/Night (Dark Cockpit)* themes, *Satellite Imagery*, and *Relief (Terrain)* maps.
* **Vector Airport Ground Map:** High-detail automatic rendering of airport ground layouts featuring runways, labeled taxiways, yellow taxilanes, holding points, and numbered parking stands.
* **VOR / ILS Layers & Filters:** Interactive display of over 42,000 worldwide airports from a local SQLite database, navaids, frequencies, and customizable ILS approach cones.
* **Real-Time SimConnect Telemetry:** Live aircraft tracking (`ACFT`, `ALT`, `GS`, `HDG`) with *Follow Aircraft* or *Free Map* modes and an integrated dynamic compass rose.

#### 2. ✈️ Advanced Flight Planning, Procedures & NavLog
* **`.PLN` Import / Export & Send to MSFS:** Native loading and saving of `.pln` flight plan files (including drag & drop) plus direct route injection into the simulator via the **`Send to MSFS`** button.
* **Instrument Procedures (SID / STAR / APPR):** Full support for departure, arrival, and approach procedures with active runway badges and altitude constraints.
* **SimBrief Integration:** Instant synchronization of your latest OFP using your SimBrief User ID.
* **Custom User Waypoints:** Create, store in local SQLite, and place custom waypoints (with ID, altitude, and coordinates) by clicking directly on the map.
* **NavLog, Fuel & Logbook:** Detailed navigation log (heading, distances, ETE/ETA), fuel calculator (*Block Fuel* and EASA/FAA regulatory reserves), and a built-in flight **Logbook** to record your flights.

#### 3. 📉 Multi-Step VNAV Profile, ToD & Cloud Scanner
* **Multi-Step Vertical Profile:** Real-time interactive terrain and route elevation graph featuring step-descent planning and automatic **Top of Descent (ToD)** calculation.
* **Live Weather (WX) & Altitude Cloud Scan:** Real-time METAR decoding (wind, temperature, and QNH displayed directly on airport cards) and an altitude cloud selector (`AUTO` synced to aircraft altitude or fixed flight levels `FL050` – `FL300`) rendered on both the VNAV profile and the map.

#### 4. 🌐 Online Traffic (VATSIM / IVAO) & ATC Radar
* **ATC Station Radar:** Coverage circles for Towers (`TWR`), Approach (`APP`), and Control Centers (`CTR`) with adjustable range and opacity.
* **Live Pilot Traffic:** Real-time monitoring of nearby connected pilots with heading vectors, altitude, and Ground Speed.

#### 5. 📝 EFB Scratchpad, Notes & Tactical Ruler
* **ATC Clearance Pad & Notes:** Quick notepad to jot down Squawk codes, QNH, altitudes, radar vectors, and radio frequencies with instant frequency standby swapping.
* **Freehand Drawing Canvas:** Built-in drawing pad for quick in-flight notes with colored pens and eraser tools.
* **Tactical Measurement Ruler:** Measure distances in nautical miles (`NM`), magnetic/true heading, and estimated time enroute (`ETE`) via the toolbar button or by right-clicking anywhere on the map.

#### 6. 🌍 Multilingual UI (IT / EN) & Accessibility
* **Instant Language Switch:** Fully localized user interface in **Italian** and **English**, switchable on the fly from the top toolbar.
* **Desktop & Touch Ergonomics:** Selectable text, dual `UTC` / `SYS` clocks, live cursor coordinates, and controls optimized for both mouse and touchscreen devices.

---

### 📱 Tablet EFB Connection via Wi-Fi

AeroGlass-Nav includes a built-in multithreaded local HTTP server. To use an external tablet as a wireless EFB:
1. Click the **`EFB`** button in the top toolbar to display the **QR Code** and local IP address (e.g., `192.168.x.x:8339`).
2. Scan the QR Code with your tablet's camera (connected to the same Wi-Fi network as your PC).
3. Both devices will synchronize in real time across flight plan, ground map, weather, and aircraft telemetry.

---

### 🚀 Installation & Launch

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/aeroglass-nav.git
   cd aeroglass-nav
   ```
2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Run the application:**
   ```bash
   python main.py
   ```

---

### ⌨️ Shortcuts & Interaction
* **`F1`**: Launch the Interactive Guided Tour (Demo Mode).
* **`Ctrl + Z`**: Undo the last route modification.
* **`Right-Click on Map`**: Activate the quick measurement ruler.
* **`Ctrl + C / Ctrl + V`**: Fully enabled across all panels and the Scratchpad.