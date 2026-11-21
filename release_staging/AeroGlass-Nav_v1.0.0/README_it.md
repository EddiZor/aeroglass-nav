# AeroGlass-Nav ✈️🗺️

## 🇮🇹 Italiano

**AeroGlass-Nav** è un sistema EFB (Electronic Flight Bag), Flight Planner e Moving Map standalone in stile **Dark Cockpit**, progettato specificamente per **Microsoft Flight Simulator 2024** (e compatibile con MSFS 2020). Realizzato con un'architettura ibrida Python (`pywebview`, server HTTP multithread per EFB, `SQLite` e bridge `SimConnect`) e frontend cartografico `Leaflet`, offre un'esperienza fluida e reattiva sia sul monitor del PC di volo sia su tablet via Wi-Fi.

---

### 🌟 Caratteristiche Principali

#### 1. 🗺️ Moving Map Dinamica, Ground Map & Ricerca Rapida

* **Layer Cartografici Multipli:** Passaggio rapido tra viste *Dark Cockpit*, *IFR*, *VFR*, *Open Flight Maps*, *Foto Satellitari* e *Rilievi (Terrain)*, con profili di calibrazione filtri (luminosità, contrasto, saturazione) in tempo reale.
* **Ricerca Rapida con Centraggio Visivo:** Ricerca istantanea su oltre **48.000 aeroporti mondiali**, città e radioassistenze nel database SQLite locale (con conferma tramite `Invio`), centrando lo scalo nell'area visibile della finestra (compensando sidebar e cassetto VNAV) e aprendo la scheda flottante Aeroporto / METAR.
* **Ground Map Aeroportuale Reale:** Visualizzazione ad alto dettaglio del layout di terra (piste in larghezza metrica reale, taxiway con identificativi, raccordi e piazzole di parcheggio) estratta da cache/MSFS/OSM, con decluttering automatico per livello di zoom (LOD).
* **Layer VOR / ILS & Radioassistenze:** Visualizzazione filtrabile per zoom di VOR, VOR-DME, VORTAC, TACAN, NDB e coni ILS con frequenze e dati associati.
* **Telemetria SimConnect in Tempo Reale:** Tracciamento live dell'aeromobile (`ACFT`, `ALT`, `GS`, `HDG`) con modalità *Mappa Libera*, *Nord Su* e *Track Up* tramite rosa dei venti integrata.

#### 2. ✈️ Pianificazione Volo, Procedure IFR Analitiche & NavLog

* **Airway Auto-Routing & `.PLN`:** Calcolo automatico di rotta su aerovie (`router.py`), importazione/esportazione file `.pln` (anche con drag & drop) e invio diretto del piano di volo attivo al simulatore tramite **`Invia a MSFS`**.
* **Procedure Strumentali & Holding Analitiche:** Supporto a `SID`, `STAR` e `APPR` con vincoli di quota/velocità, archi DME, vettori radar e attivazione rapida di **Holding pattern** adattive calcolate su velocità e quota.
* **Integrazione SimBrief & Waypoint Utente:** Importazione rapida dell'ultimo OFP tramite SimBrief ID e gestione di waypoint personalizzati salvati in SQLite (anche con acquisizione coordinate direttamente dalla mappa).
* **NavLog, Fuel & Logbook SQLite:** Tabella operativa di rotta, calcolatore carburante (*Block Fuel* e riserve) e **Logbook** su SQLite per consultare o gestire lo storico dei voli.

#### 3. 📉 Profilo VNAV Multi-Step, ToD & Scansione Nuvole

* **Profilo Verticale & Top of Descent:** Grafico altimetrico interattivo del terreno e della rotta con calcolo del **Top of Descent (ToD)** e rateo di discesa consigliato.
* **Meteo Live (WX) & Cloud Scanner:** Decodifica METAR (vento, temperatura, QNH, categoria di volo e pista consigliata) e scansione strati nuvolosi in quota (`AUTO` o livelli `FL050` – `FL300`) con indicatori `IMC`.

#### 4. 🌐 Traffico Online (IVAO / VATSIM), Metadati & Filtro Compagnia / VA

* **Piloti Online, Tipo Aereo, Operatore & Tratta:** Recupero asincrono del traffico IVAO e VATSIM con riconoscimento di tipo ICAO, compagnia/operatore (da tabelle SQLite `world_airlines` / `world_aircraft_types` o tag `OPR/`), tratta `DEP ➔ ARR` e **sagome SVG differenziate** per categoria (`heavy`, `jet`, `turboprop`, `ga`, `mil`, `heli`).
* **Filtro & Evidenziazione Compagnie Virtuali (VA):** Pannello di calibrazione radar (`🎚️`) con ricerca per prefissi callsign o operatore (separati da virgola), modalità **Evidenzia** o **Solo VA**, **Raggio Globale VA**, colore personalizzabile, contatore live e impostazioni persistenti in SQLite.
* **Radar ATC & Sintonia Rapida:** Visualizzazione stazioni `TWR`, `APP` e `CTR` con raggio e opacità regolabili e invio rapido della frequenza VHF allo Scratchpad.

#### 5. 📝 Scratchpad EFB, Righello Tattico & Glossario Bilingue

* **Scratchpad EFB:** Blocco note con campi `SQUAWK`, `QNH`, `ALT/FL`, `HDG`, `SPEED` e `NEXT FREQ` (sincronizzabili con la telemetria), canvas a mano libera e elenco frequenze vicine.
* **Righello Tattico:** Misurazione di distanza (`NM` / `km`), prua e `ETE` stimato tramite pulsante o click destro su mappa.
* **Glossario Bilingue (`IT` / `EN`):** Guida alfabetica interattiva apribile nel browser di sistema con ricerca istantanea e cambio lingua sincronizzato.

#### 6. 🌍 Localizzazione al Primo Avvio & Database Unificato

* **Scelta Lingua al Primo Avvio:** Al primo avvio assoluto l'applicazione parte in **inglese (`en`)** mostrando una finestrina modale in stile AeroGlass per scegliere se mantenere l'inglese o passare all'**italiano (`it`)**, salvando la preferenza in SQLite (`app_language`) e allineando app, tour (`F1` / `F2`) e glossario.
* **Database SQLite Centralizzato (`aeroglass.db`):** Archiviazione centralizzata di aeroporti, piste, frequenze, radioassistenze, compagnie aeree, categorie aeromobili, cache dei layout di terra, impostazioni e logbook, con copia e sincronizzazione non distruttiva nel profilo utente (`~/.aeroglass_nav/aeroglass.db`) per le build distribuite.

---

### 📱 Connessione Tablet EFB via Wi-Fi

AeroGlass-Nav include un server HTTP locale multithread per usare un tablet o un secondo schermo come EFB:

1. Clicca sul pulsante **`EFB`** nella barra superiore per visualizzare **QR Code** e indirizzo IP/porta locale (es. `192.168.x.x:8339`).
2. Scansiona il QR Code o apri l'URL dal tablet collegato alla stessa rete locale.
3. Rotta, mappa, meteo, traffico online e telemetria restano sincronizzati in tempo reale.

---

### 🚀 Installazione, Avvio e Build

1. **Clona il repository:**

   ```bash
   git clone [https://github.com/EddiZor/aeroglass-nav.git](https://github.com/EddiZor/aeroglass-nav.git)
   cd aeroglass-nav
   ```

2. **Installa le dipendenze Python:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Avvia in modalità sviluppo:**

   ```bash
   python main.py
   ```

4. **Compila l'eseguibile con PyInstaller (opzionale):**

   ```bash
   pyinstaller --clean -y build.spec
   ```

---

### ⌨️ Scorciatoie e Interazione

* **`F1`**: Avvia / chiude il Tour Guidato Interattivo bilingue (`demo.js`).
* **`F2`**: Avvia / interrompe la Demo Automatica (`demo2.js`) — premi **`L`** durante la demo per cambiare lingua al volo.
* **`Esc`**: Chiude la demo attiva o annulla una misurazione in corso.
* **`Ctrl + Z`**: Annulla l'ultima modifica sulla rotta.
* **`Click Destro su Mappa`**: Avvia il righello di misurazione rapida.
