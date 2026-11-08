# ✈️ AeroGlass Nav v0.5.2 — User Manual / Manuale Utente

---

## 🇬🇧 ENGLISH INSTRUCTIONS

### 🌟 Overview
**AeroGlass Nav** is a lightweight, glassmorphism-styled Flight Planner and Moving Map utility for **Microsoft Flight Simulator (MSFS 2020 & MSFS 2024)** developed by **EddiZor**. It combines real-time asynchronous SimConnect telemetry, SimBrief OFP integration, manual flight plan creation, `.pln` import/export, and an interactive VNAV altitude profile.

### 📡 Live SimConnect Telemetry & Demo Mode
* **🔄 Automatic Detection:** The app runs an asynchronous background thread with lazy loading that connects automatically to MSFS without freezing or slowing down the interface at startup.
* **🟢 LIVE Mode:** When a flight is loaded in MSFS, the top status dot turns green and displays your aircraft name, altitude (`ALT`), ground speed (`GS`), magnetic heading (`HDG`), and live aircraft position on the map.
* **🟡 DEMO Mode:** When MSFS is closed or in the main menu, the app stays in `DEMO` mode (amber dot) and removes the aircraft icon from the map until an active flight starts.

### ➕ Creating & Exporting Flight Plans (.PLN)
* **➕ Create Button:** Click `➕ Create` in the top-left sidebar to open the manual route builder modal.
* **🧭 Route Input:** Enter the **Departure ICAO** (e.g., `LIPD` or `LIRF`), optional **Intermediate Waypoints** separated by spaces or commas (e.g., `RON VIL BOL`), **Destination ICAO** (e.g., `LIPZ` or `LITY`), and **Cruise Altitude (FT)**.
* **🗺️ Show on Map:** Click **Show on Map** to plot the route and generate the VNAV climb (TOC) and descent (TOD) profile immediately.
* **💾 Create & Save .PLN:** Click `💾 Create & Save .PLN` in the modal (or the `💾 .pln` button in the sidebar at any time) to export the active flight plan in standard MSFS `.pln` XML format directly into your Windows **Downloads** folder (e.g., `Downloads\LIPD-LIPZ.pln`).

### 📁 Importing Flight Plans (SimBrief & .PLN)
* **✈️ SimBrief Integration:** Enter your SimBrief Pilot ID or Username in the setup box and click `✈️ SimBrief`. Your ID is saved automatically in `config.json`, and the bar switches to compact mode (`✈️ SimBrief` to reload and `⚙️` to edit your ID).
* **📁 Local .PLN Import:** Click `📁 .pln` in the sidebar to browse and open any MSFS `.pln` or `.xml` flight plan file from your computer.
* **🖱️ Drag & Drop:** Drag any `.pln` file from Windows Explorer and drop it directly onto the map window to load the route and VNAV profile on the fly.
* **🗑️ Clear Route:** Click `🗑️` to wipe the active flight plan and reset the map and VNAV chart.

### 📈 Interactive VNAV Profile & Waypoint List
* **🎯 Active Waypoint Tracking:** During flight, the sidebar highlights the next active waypoint in green, scrolls automatically, and updates distances in nautical miles (`+NM` ahead, `-NM` passed).
* **✏️ Custom Altitudes:** Click the purple altitude badge (`ft`) on any waypoint card or map popup to set a new target altitude and recalculate the VNAV profile.
* **🔍 Bidirectional Hover Sync:** Move your mouse over the bottom VNAV chart or along the magenta route line on the map to inspect the current leg, interpolated altitude, and distance in real time.
* **▼ Collapsible & Resizable Panels:** Use the `◀` button on the sidebar edge (which also supports horizontal drag-resizing) and the `▼ [ Reduce / Expand ]` toggle on the VNAV header to maximize map space.

### 🗺️ Top Toolbar & Map Controls
* **⚙️ Filters & SID/STAR:** Opens the layer menu to toggle route waypoints and radio navigation aids (`VOR / ILS`) on or off.
* **📡 VOR / ILS:** Quickly toggles interactive `❖ VOR` and `📡 ILS` markers on the map (click any badge to view frequency, course, and glide slope altitude).
* **🎯 Follow Acft / ✋ Free Map:** Locks the camera onto your aircraft during flight; panning the map manually switches automatically to `✋ Free Map` mode.
* **🌐 Language Switcher (`IT` / `EN`):** Switches the entire interface between Italian and English at any time.
* **🎨 Map Style Selector:** Choose between 5 aeronautical and topographic layers (`IFR Dark Cockpit`, `VFR Topo`, `Low IFR Dark`, `High IFR Light`, `Satellite Imagery`).
* **🌤️ Decoded METAR:** Departure, destination, and alternate airports display parsed weather pills for wind (`💨`), temperature (`🌡️`), and altimeter setting (`📊`).
* **⏱️ Flight Info Bar:** Located above the VNAV drawer on the bottom right, showing current date, `UTC` time, local system time (`SYS`), and live aircraft coordinates (`LAT` / `LON`).

### 🚀 Running & Building the Application
1. **📦 Standalone Executable:** Run `dist\AeroGlassNav.exe` directly without installing Python.
2. **💻 Run from Source:** Activate the virtual environment and run `py main.py`.
3. **🛠️ Compile with PyInstaller:** Run `pyinstaller build.spec` to package the application, custom icons (`assets/icons/AeroGlass-icon.ico`), and native SimConnect libraries into a single executable.

---

## 🇮🇹 ISTRUZIONI IN ITALIANO

### 🌟 Panoramica
**AeroGlass Nav** è un'applicazione leggera di Flight Planning e Moving Map in stile *glassmorphism* per **Microsoft Flight Simulator (MSFS 2020 & MSFS 2024)** sviluppata da **EddiZor**. Integra telemetria asincrona SimConnect in tempo reale, scaricamento piani di volo da SimBrief, creazione manuale ed esportazione di file `.pln` e profilo altimetrico VNAV interattivo.

### 📡 Telemetria Live SimConnect & Modalità Demo
* **🔄 Rilevamento Automatico:** L'applicazione utilizza un thread in background con caricamento differito (*lazy loading*) che si collega automaticamente a MSFS senza mai bloccare o rallentare l'apertura della finestra.
* **🟢 Modalità LIVE:** Quando un volo è caricato nel simulatore, l'indicatore in alto diventa verde (`LIVE`) mostrando modello dell'aereo, quota (`ALT`), velocità al suolo (`GS`), prua (`HDG`) e icona dell'aereo orientata sulla mappa.
* **🟡 Modalità DEMO:** Quando MSFS è chiuso o si trova nel menu principale, l'app rimane in modalità `DEMO` (pallino ambra) nascondendo l'icona dell'aereo fino all'avvio effettivo del volo.

### ➕ Creazione Manuale & Esportazione Piani di Volo (.PLN)
* **➕ Pulsante Crea:** Clicca su `➕ Crea` nella barra laterale sinistra per aprire la finestra di composizione manuale del piano di volo.
* **🧭 Inserimento Dati:** Digita l'**Aeroporto di Partenza (ICAO)** (es. `LIPD` o `LIRF`), gli eventuali **Waypoint Intermedi** separati da spazio o virgola (es. `RON VIL BOL`), l'**Aeroporto di Arrivo (ICAO)** (es. `LIPZ` o `LITY`) e la **Quota di Crociera (FT)**.
* **🗺️ Mostra su Mappa:** Clicca su **Mostra su Mappa** per tracciare subito la rotta e calcolare automaticamente le rampe di salita (TOC) e discesa (TOD) nel grafico VNAV.
* **💾 Crea & Salva .PLN:** Clicca su `💾 Crea & Salva .PLN` nella finestra modale (oppure sul pulsante `💾 .pln` nella sidebar in qualsiasi momento) per salvare il piano di volo attivo in formato standard MSFS `.pln` direttamente nella cartella **Download** di Windows (es. `Downloads\LIPD-LIPZ.pln`).

### 📁 Importazione Piani di Volo (SimBrief & .PLN)
* **✈️ Integrazione SimBrief:** Inserisci il tuo Pilot ID o Username di SimBrief nell'apposito campo e clicca su `✈️ SimBrief`. L'ID viene salvato automaticamente nel file `config.json` e la barra passa in modalità compatta (`✈️ SimBrief` per ricaricare e `⚙️` per cambiare ID).
* **📁 Importazione File .PLN:** Clicca su `📁 .pln` nella sidebar per selezionare e caricare un file `.pln` o `.xml` dal computer.
* **🖱️ Drag & Drop:** Trascina un file `.pln` da Esplora File e rilascialo direttamente sulla mappa per caricare all'istante rotta e profilo altimetrico.
* **🗑️ Pulisci Rotta:** Clicca su `🗑️` per cancellare il piano di volo attivo e ripulire mappa e grafico VNAV.

### 📈 Profilo Altimetrico VNAV & Lista Waypoint
* **🎯 Tracciamento Waypoint Attivo:** Durante il volo, la sidebar evidenzia in verde il prossimo waypoint attivo, scorre automaticamente la lista e aggiorna le distanze in miglia nautiche (`+NM` davanti, `-NM` superato).
* **✏️ Modifica Quote al Volo:** Clicca sul badge viola dell'altitudine (`ft`) nella scheda di un waypoint o nel popup sulla mappa per modificarne la quota target e aggiornare il grafico VNAV.
* **🔍 Sincronizzazione Bidirezionale Mappa-VNAV:** Passa il cursore sul grafico VNAV in basso o lungo la linea di rotta sulla mappa per visualizzare tratta attiva, quota interpolata e distanza progressiva.
* **▼ Pannelli Riduci / Espandi e Ridimensionamento:** Usa la linguetta `◀` sul bordo della sidebar (ridimensionabile anche trascinando il bordo destro) e il comando `▼ [ Riduci / Espandi ]` sulla barra VNAV per ampliare la visuale della mappa.

### 🗺️ Barra Strumenti Superiore & Controlli Mappa
* **⚙️ Filtri & SID/STAR:** Apre e chiude il menu livelli per mostrare o nascondere i waypoint della rotta e le radioassistenze (`VOR / ILS`).
* **📡 VOR / ILS:** Attiva o disattiva rapidamente i badge interattivi `❖ VOR` e `📡 ILS` sulla mappa (clicca su ciascuna icona per leggere frequenza, prua e quota di intercettazione glide).
* **🎯 Segui Aereo / ✋ Mappa Libera:** Mantiene la mappa centrata sull'aereo durante il volo; spostando manualmente la visuale con il mouse si passa automaticamente in modalità `✋ Mappa Libera`.
* **🌐 Selettore Lingua (`IT` / `EN`):** Commuta istantaneamente tutte le etichette dell'interfaccia tra Italiano e Inglese.
* **🎨 Stili Mappa:** Seleziona fra 5 stili cartografici (`IFR Dark Cockpit`, `VFR Topo`, `Low IFR Dark`, `High IFR Light`, `Satellite Imagery`).
* **🌤️ METAR Decodificato:** Gli aeroporti di partenza, arrivo e alternato mostrano i badge meteo estratti dal METAR con vento (`💨`), temperatura (`🌡️`) e QNH (`📊`).
* **⏱️ Barra Info Volo:** Posizionata in basso a destra sopra il cassetto VNAV, mostra data corrente, orario `UTC`, orario di sistema (`SYS`) e coordinate live dell'aereo (`LAT` / `LON`).

### 🚀 Avvio e Compilazione dell'Applicazione
1. **📦 Eseguibile Standalone:** Avvia direttamente `dist\AeroGlassNav.exe` senza necessità di avere Python installato.
2. **💻 Avvio da Codice Sorgente:** Con l'ambiente virtuale attivo, esegui `py main.py` dal terminale.
3. **🛠️ Compilazione con PyInstaller:** Esegui `pyinstaller build.spec` per generare l'eseguibile completo di icona personalizzata (`assets/icons/AeroGlass-icon.ico`) e librerie native SimConnect.