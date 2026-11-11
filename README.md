# ✈️ AeroGlass Nav - Flight Planner & Moving Map (v0.6.0)

**AeroGlass Nav** è un'applicazione desktop leggera di pianificazione volo e Moving Map in stile *Dark Cockpit* per **Microsoft Flight Simulator 2024**, sviluppata in Python (`pywebview`, `SimConnect`, `SQLite3`) e `Leaflet.js`.

Progettata per offrire la chiarezza visiva di *Navigraph Charts* e la praticità operativa di *Little Navmap* in un'unica interfaccia fluida, senza appesantire i frame rate del simulatore e perfetta anche per monitor secondari dedicati alla telemetria.

---

## 🌟 Caratteristiche Principali (v0.6.0)

* **🗄️ Persistenza Nativa SQLite (`aeroglass.db`):**
  Archiviazione automatica in `~/.aeroglass_nav/aeroglass.db` di impostazioni, SimBrief User ID, Piano di Volo attivo, Waypoint Utente, Storico Voli e cache degli aeroporti ICAO risolti online (nessuna dipendenza da file `.json` esterni).
* **📡 Telemetria Live SimConnect & Sagome Velivoli Dinamiche:**
  Connessione automatica a MSFS 2024 con riconoscimento automatico della categoria aeromobile e icona vettoriale SVG dedicata (Jet Militari/Addestratori es. *MB-339*, Aviazione Generale/Ultraleggeri es. *Pioneer 400*, Elicotteri, Business Jet, Airliner).
* **🧭 Modalità Mappa Intelligenti & 5 Stili Cartografici:**
  Passaggio rapido tra **Mappa Libera**, **Follow (North Up)** e **Follow (Track Up)** con rotazione dinamica della bussola mappa. Cinque layer cartografici integrati: *IFR Dark Cockpit*, *VFR Topo*, *Low IFR Dark*, *High IFR Light* e *Satellite Imagery*.
* **🛬 Procedure SID, STAR & Cono di Avvicinamento (ILS / RNAV):**
  Codifica cromatica automatica dei segmenti di rotta (**SID** in verde smeraldo, **Enroute** in magenta, **STAR** in ambra, **Approach** in ciano) e disegno geometrico del cono strumentale di allineamento pista (8 NM dalla soglia) con frequenze e prua finale.
* **🤏 Waypoint Utente Rapidi, "Rubber Banding" & Undo (`Ctrl+Z`):**
  * Creazione di waypoint personalizzati tramite modulo laterale, selezione su mappa o **Click Destro** diretto sulla carta (con opzione *"Salva & Inserisci in Rotta"*).
  * **Rubber Banding:** modifica elastica della rotta trascinando col mouse qualsiasi segmento della linea di volo o waypoint intermedio, con aggancio magnetico (**🧲 SNAP**) ad aeroporti, VOR e fix vicini.
  * **Ripristino Traccia (`↩️ Ripristina` / `Ctrl+Z`):** storico multi-livello per annullare qualsiasi modifica alla traccia o alle quote.
* **⛰️ Profilo Altimetrico VNAV Multi-Step & Orografia Reale:**
  Cassetto inferiore a scomparsa con profilo di salita/discesa, elevazione reale del terreno (DEM/SRTM via *Open-Meteo*), linea di posizione aereo in tempo reale e puntatore sincronizzato tra grafico VNAV e mappa.
* **✈️ Integrazione SimBrief, File `.PLN` & Risoluzione ICAO Globale:**
  Importazione diretta dell'ultimo OFP da **SimBrief**, caricamento/esportazione di file `.pln` (anche via **Drag & Drop** sulla finestra) e generatore manuale di rotte con risoluzione online di qualsiasi aeroporto ICAO mondiale e badge **METAR** in tempo reale (vento, temperatura, QNH).
* **📒 Logbook & Fuel Log Automatico:**
  Monitoraggio del consumo carburante tramite SimConnect (`FUEL_TOTAL_QUANTITY`) e registrazione automatica del volo nel database SQLite all'atterraggio sull'aeroporto di destinazione, con riepilogo totale di ore/voli, miglia nautiche e galloni consumati.
* **🪟 Integrazione Nativa Windows 11:**
  Barra del titolo nativa colorata in stile *AeroGlass Dark* tramite API `dwmapi`, protezione **Single-Instance** tramite Mutex Win32 e adattamento automatico delle proporzioni su configurazioni multi-monitor.

---

## 🛠️ Requisiti e Installazione

### Prerequisiti
* **Sistema Operativo:** Windows 10 / Windows 11 (64-bit)
* **Python:** 3.10 o superiore
* **Simulatore:** Microsoft Flight Simulator 2024 (oppure MSFS 2020)

### Avvio da Codice Sorgente
1. Clona il repository:
   ```powershell
   git clone [https://github.com/EddiZor/aeroglass-nav.git](https://github.com/EddiZor/aeroglass-nav.git)
   cd aeroglass-nav

   STRUTTURA DEL PROGETTO

   aeroglass-nav/
├── main.py                      # Entry point, Win32 Mutex, DWM Dark Titlebar e finestra pywebview
├── requirements.txt             # Dipendenze Python
├── build.spec                   # Configurazione PyInstaller per generazione eseguibile
└── src/
    ├── core/
    │   ├── api.py               # Ponte API Python <-> JS, SimBrief, PLN, ICAO resolver
    │   └── database.py          # Gestore SQLite3 (~/.aeroglass_nav/aeroglass.db)
    ├── simconnect/
    │   └── telemetry.py         # Thread di polling SimConnect (Posizione, Quote, HDG, Fuel)
    └── ui/
        ├── index.html           # Interfaccia principale AeroGlass
        ├── style.css            # Stili Glassmorphism e Dark Cockpit
        ├── app.js               # Inizializzazione UI, traduzioni IT/EN, Drag & Drop
        └── js/
            ├── state.js         # Stato globale, sorgenti tile, database statici e spazi aerei
            ├── map.js           # Gestione Leaflet, Navaids, Spazi Aerei e Rubber Banding
            ├── flightplan.js    # Gestione FPL, SID/STAR, Cono ILS, User WP, Undo e Logbook
            ├── vnav.js          # Calcolo profilo VNAV, terreno Open-Meteo e hover sync
            └── telemetry.js     # Aggiornamento indicatori live, sagome SVG e auto-log volo

---

**2. File `aeroglass_nav_user_manual.md` completo**

Apri **`aeroglass_nav_user_manual.md`** e sostituisci tutto il contenuto con il manuale utente aggiornato[cite: 2]:

```markdown
# 📖 Manuale Utente - AeroGlass Nav (v0.6.0)

Benvenuto in **AeroGlass Nav**, il sistema di pianificazione volo e Moving Map progettato per **Microsoft Flight Simulator 2024**.

---

## 1. Panoramica dell'Interfaccia

L'interfaccia di AeroGlass Nav è suddivisa in quattro aree principali:
1. **Barra Superiore di Controllo e Telemetria:**
   * **📒 Logbook:** Apre il registro storico dei voli e dei consumi carburante salvati su SQLite.
   * **⚙️ Filtri & SID/STAR:** Permette di mostrare/nascondere Waypoint di rotta, Radioassistenze (VOR/ILS), Transizioni SID/STAR, Cono di Avvicinamento (ILS/RNAV) e Spazi Aerei (TMA, CTR, Zone Restrittive), oltre a mostrare il riepilogo delle procedure attive.
   * **📡 VOR / ILS:** Attiva o disattiva rapidamente la visualizzazione delle radioassistenze sulla mappa.
   * **🎯 Segui Aereo (Ciclico a 3 stati):**
     * `✋ Mappa Libera`: Scorri ed esplora liberamente la carta.
     * `🎯 Segui (North Up)`: Centra automaticamente la mappa sull'aereo mantenendo il Nord in alto.
     * `🧭 Segui (Track Up)`: Centra la mappa sull'aereo e ruota dinamicamente la carta nella direzione di prua.
   * **🌐 IT / EN:** Commuta istantaneamente la lingua dell'interfaccia tra Italiano e Inglese.
   * **Selettore Stile Mappa:** Permette di scegliere tra *IFR Dark Cockpit*, *VFR Topo*, *Low IFR Dark*, *High IFR Light* e *Satellite Imagery*.
   * **Indicatore Stato e Telemetria:** Mostra lo stato di connessione (**DEMO** ambra / **LIVE** verde smeraldo), il modello dell'aeromobile (`ACFT`), l'altitudine (`ALT`), la Ground Speed (`GS`) e la prua magnetica (`HDG`).
2. **Sidebar Laterale Sinistra (Ridimensionabile e Collassabile):**
   * Contiene i comandi del piano di volo, l'integrazione SimBrief, la ricerca rapida, il gestore dei Waypoint Utente e la lista sequenziale del **Piano di Volo Attivo**.
   * Può essere allargata/ristretta trascinando il bordo destro o nascosta cliccando sulla linguetta `◀ / ▶`.
3. **Cassetto Inferiore VNAV (Profilo Altimetrico e Terreno):**
   * Visualizza il profilo verticale della rotta (in azzurro), l'orografia reale del terreno lungo il percorso (in ambra/marrone) e la linea verticale verde della posizione attuale dell'aeromobile.
4. **Barra Informazioni Inferiore Destra:**
   * Mostra la **Scala Grafica dinamica** in Miglia Nautiche (`NM`), la data corrente, l'orario `UTC`, l'orario di sistema (`SYS`) e le coordinate `LAT / LON` del cursore o dell'aeromobile.

---

## 2. Creazione e Caricamento di un Piano di Volo

AeroGlass Nav offre quattro modalità per caricare una rotta (che verrà automaticamente salvata nel database SQLite e inquadrata all'85% dell'area visibile):

### A. Importazione da SimBrief (`✈️ SimBrief`)
1. Inserisci il tuo **SimBrief User ID** numerico nel campo dedicato (viene salvato permanentemente nel database SQLite).
2. Premi **✈️ SimBrief**: l'app scaricherà l'ultimo OFP generato, estraendo aeroporti di partenza/arrivo, piste previste, waypoint, quote, procedure **SID/STAR**, aeroporto alternato e bollettini **METAR**.
3. Per cambiare ID in futuro, clicca sull'icona **⚙️** accanto al pulsante compatto SimBrief.

### B. Importazione ed Esportazione File `.PLN` (MSFS / Little Navmap)
* **Tramite pulsante:** Clicca su **📁 .pln** per aprire un file `.pln` dal tuo PC, oppure su **💾 .pln** per esportare la rotta corrente (inclusi eventuali waypoint personalizzati) direttamente nella cartella `Download` nel formato standard XML di MSFS.
* **Tramite Drag & Drop:** Trascina qualsiasi file `.pln` direttamente sopra la finestra di AeroGlass Nav per caricarlo istantaneamente.

### C. Creazione Manuale (`➕ Crea`)
1. Clicca su **➕ Crea** in alto a sinistra.
2. Inserisci il codice ICAO di partenza (es. `LIPZ`), eventuali waypoint intermedi separati da spazio (es. `WP1 RON`) e l'ICAO di destinazione (es. `EDDF`), oltre alla quota di crociera.
3. Se un aeroporto non è nel database di base, AeroGlass Nav ne risolverà automaticamente coordinate, elevazione e METAR tramite la rete *AviationWeather* e lo memorizzerà nella tabella `cached_airports` di SQLite.

---

## 3. Waypoint Utente, "Rubber Banding" e Ripristino Traccia (`Undo`)

### Creazione Waypoint Utente (Custom)
* **Dalla Sidebar:** Inserisci ID, Quota, Latitudine e Longitudine (oppure clicca su **📍 Mappa** per prelevare le coordinate con un clic sulla carta) e premi **➕ Aggiungi & Salva**.
* **Col Tasto Destro sulla Mappa:** Fai **Click Destro** in qualsiasi punto della mappa per aprire il popup rapido:
  * Premi **💾 Salva in Waypoints Utente** per archiviarlo nel database.
  * Premi **🚀 Salva & Inserisci in Rotta** per aggiungerlo immediatamente nel tratto più vicino del Piano di Volo Attivo.
* **Gestione Intelligente:** Quando aggiungi un Waypoint Utente al Piano di Volo Attivo (pulsante `➕`), questo si sposta nella lista inferiore della rotta attiva liberando spazio nella sezione superiore. Se lo rimuovi dalla rotta o svuoti il piano (`🗑️`), torna automaticamente visibile nell'elenco superiore.

### Modifica Elastica della Rotta ("Rubber Banding")
* **Aggiunta Waypoint trascinando la linea:** Posiziona il mouse su qualsiasi segmento della rotta attiva, tieni premuto il **tasto sinistro** e trascina:
  * Avvicinandoti a un Aeroporto, un VOR o un Waypoint esistente, l'elastico si aggancerà magneticamente (**🧲 SNAP** verde).
  * Rilasciando in un punto libero della mappa, verrà creato automaticamente un nuovo waypoint progressivo (`WP1`, `WP2`...) con quota interpolata e salvato su SQLite.
* **Spostamento di un Waypoint esistente:** Trascina col tasto sinistro qualsiasi cerchietto intermedio della rotta per riposizionarlo in tempo reale.

### Ripristino della Posizione Precedente (`↩️ Ripristina` / `Ctrl+Z`)
* Ogni modifica alla rotta (trascinamento elastico, inserimento, eliminazione waypoint o cambio quota) viene memorizzata nello storico *Undo*.
* Clicca sul pulsante **↩️ Ripristina** accanto a *PIANO DI VOLO ATTIVO* oppure premi **`Ctrl + Z`** sulla tastiera per riportare immediatamente la traccia alla posizione precedente.

---

## 4. Procedure SID, STAR e Cono di Avvicinamento

* **Segmenti di Rotta Colorati:**
  * 🟢 **Verde Smeraldo (Tratteggiato):** Procedura di uscita (**SID**).
  * 🟣 **Magenta:** Tratta di crociera / aerovie (**ENROUTE**).
  * 🟡 **Ambra (Tratteggiato):** Procedura di arrivo (**STAR**).
  * 🔵 **Ciano:** Tratto di avvicinamento finale (**APPROACH**).
* **Cono Strumentale (ILS / RNAV Feather):** Sulla pista di destinazione viene disegnato automaticamente il cono di allineamento finale (esteso a 8 NM dalla soglia pista). Cliccando sul cono vengono mostrati l'identificativo ILS/RNAV, la frequenza, la prua finale (`FINAL CRS`) e il sentiero di discesa (`GS`).

---

## 5. Logbook Storico Voli & Fuel Log (`📒 Logbook`)

* **Registrazione Automatica a Fine Volo:** Quando voli connesso a MSFS 2024 (**LIVE**), AeroGlass Nav monitora il carburante totale a bordo (`FUEL_TOTAL_QUANTITY`) e lo stato del carrello (`SIM_ON_GROUND`). Non appena atterri entro 6 NM dall'aeroporto di destinazione e rallenti sotto i 25 kt, il volo viene salvato automaticamente nel database SQLite.
* **Registrazione Manuale:** Aprendo **📒 Logbook** nella barra superiore, trovi i campi già precompilati con l'aereo attuale, gli aeroporti di partenza/arrivo, la distanza totale della rotta in NM e il carburante consumato nella sessione: premi **➕ Salva nel Logbook** per registrarlo manualmente in qualsiasi momento.

---

## 6. Dove vengono salvati i dati?

Tutti i dati persistenti sono racchiusi in un unico file SQLite locale:
* **Percorso Database:** `C:\Users\<TuoUtente>\.aeroglass_nav\aeroglass.db`
* **Esportazioni `.PLN`:** `C:\Users\<TuoUtente>\Downloads\<DEP>_<DEST>.pln`

👤 Autore
Sviluppato da EddiZor (SKYSIM PILOT Community)