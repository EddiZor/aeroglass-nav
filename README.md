# AeroGlass-Nav ✈️🗺️

**AeroGlass-Nav** è un avanzato sistema EFB (Electronic Flight Bag) e Moving Map open-source progettato specificamente per Microsoft Flight Simulator (MSFS 2020 / MSFS 2024). Sviluppato con un'architettura ibrida Python (`pywebview` + backend Flask/HTTP) e frontend Leaflet, offre un'esperienza di navigazione fluida, reattiva ed ergonomica sia su monitor PC che su tablet Android via Wi-Fi.

---

## 🌟 Caratteristiche Principali

### 1. 🤖 Orwill – Co-Pilota Virtuale & Dispatcher Intelligente
Orwill è il cuore euristico locale di AeroGlass-Nav (alimentato in Python senza richiedere chiavi API esterne a pagamento):
* **Parser Aeronautico ICAO:** Estrae automaticamente codici ICAO (es. `LIPZ`, `LIRF`) da frasi colloquiali per interrogare in tempo reale i bollettini METAR ufficiali.
* **Dizionario Aeronautico Integrato:** Spiega istantaneamente concetti e spazi aerei complessi come **ATZ**, **CTR**, **TMA**, **FIR**, codici **Squawk** d'emergenza (7500, 7600, 7700) e velocità caratteristiche ($V_1, V_R, V_2, V_{REF}$).
* **Integrazione Smart con Gemini Web:** Se una domanda esula dal dizionario euristico locale, Orwill apre automaticamente il browser predefinito su **Gemini Free** e copia la domanda negli appunti di sistema (pronta per essere incollata con `Ctrl + V`).
* **Accessibilità Totale:** Testi interamente selezionabili (`user-select: text`), font ingranditi a `16px` per una perfetta leggibilità su tablet e supporto completo alla copia/incolla.

### 2. 🗺️ Moving Map Dinamica e Cartografia Multi-Layer
* **Layer Mappe Multipli:** Selezione rapida tra *IFR Dark Cockpit*, *VFR Topo*, *Low/High IFR* e *Satellite Imagery*.
* **Layer VOR / ILS:** Visualizzazione interattiva di radioassistenze, frequenze e coni di avvicinamento sulla mappa.
* **Aeroporti Mondiali & Ground Chart:** Bounding box dinamico per il caricamento di oltre 42.000 aeroporti mondiali da database SQLite e layout aeroportuale locale (piste, taxiway e parcheggi stand).

### 3. ✈️ Gestione Piani di Volo & NavLog
* **Import / Export .PLN:** Supporto al drag & drop nativo o caricamento file di piano di volo di MSFS.
* **Integrazione SimBrief:** Sincronizzazione automatica dell'ultimo OFP tramite User ID SimBrief.
* **Waypoints Utente (Custom):** Creazione, salvataggio in SQLite e posizionamento di waypoint personalizzati tramite click diretto sulla mappa.
* **NavLog & Fuel & Performance:** Tabella di marcia dettagliata (prua, distanze, ETE/ETA) e calcolatore di carburante (Block Fuel e riserve EASA/FAA).

### 4. 📉 Profilo VNAV, ToD e Copertura Nuvole
* **Profilo Altimetrico Verticale:** Grafico in tempo reale del terreno e della rotta con calcolo automatico del **Top of Descent (ToD)**.
* **Scan Nuvole in Quota:** Selettore di quota (Auto basato sulla telemetria o livelli di volo fissi FL050 - FL300) per visualizzare le celle nuvolose derivate dai METAR direttamente sul profilo VNAV e sulla mappa.

### 5. 🌐 Traffico Online (VATSIM / IVAO) & Radar ATC
* **Radar Postazioni ATC:** Visualizzazione cerchi di copertura per torri (`TWR`), approach (`APP`) e centri di controllo (`CTR`) con opacità e raggio configurabili.
* **Traffico Piloti:** Monitoraggio in tempo reale dei piloti connessi nelle vicinanze con vettori di rotta, quota e Ground Speed.

### 6. 📝 Scratchpad EFB & Righello Tattico
* **ATC Clearance Pad:** Blocco note rapido per annotare Squawk, QNH, altitudini, vettori radar e frequenze d'ascolto con invio immediato al prossimo canale radio.
* **Canvas Disegno a Mano Libera:** Ideale per appunti veloci in volo con supporto a penne colorate e gomma.
* **Righello di Misura:** Strumento tattico per misurare distanze in NM, prua magnetica/vera e tempo ETE (attivabile via pulsante o click destro sulla mappa).

---

## 📱 Connessione Tablet EFB via Wi-Fi

AeroGlass-Nav integra un server HTTP multithreaded locale. Per utilizzare il tablet Android come EFB:
1. Clicca sul pulsante **`📱 EFB Wi-Fi`** nella barra superiore per visualizzare il **QR Code** e l'indirizzo IP locale (es. `192.168.x.x:8339`).
2. Inquadra il QR Code con la fotocamera del tablet (connesso alla stessa rete Wi-Fi del PC).
3. Entrambi i dispositivi si sincronizzeranno in tempo reale su rotta, telemetria e assistente Orwill.

---

## 🚀 Installazione e Avvio

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

## ⌨️ Scorciatoie e Interazione
* **`F1`**: Avvia il Tour Guidato Dimostrativo (Demo Mode).
* **`Ctrl + Z`**: Annulla l'ultima modifica sulla rotta.
* **`Click Destro su Mappa`**: Avvia il righello di misurazione rapida.
* **`Ctrl + C / Ctrl + V`**: Pienamente abilitati in tutti i pannelli, inclusa la chat di Orwill e lo Scratchpad.