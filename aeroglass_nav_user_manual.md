# ✈️ AeroGlass Nav — Flight Planner & Moving Map
*Versione 0.3.1 | by EddiZor*

Benvenuto nella documentazione ufficiale di **AeroGlass Nav**, l'applicazione desktop modulare progettata per offrire un'esperienza di navigazione e pianificazione di volo avanzata, pulita e in stile *Dark Cockpit*, perfettamente integrata con **MSFS 2024** e **SimBrief**.

---

## 🌟 Caratteristiche Principali

* 🎛️ **Interfaccia Dark Cockpit**: Design moderno e immersivo con effetto vetro sfocato (*Glassmorphism*), ottimizzato per sessioni notturne o in cabina di pilotaggio.
* 🗺️ **Cartografia Aeronautica Multi-Layer**: Selezione istantanea tra diverse viste cartografiche (IFR Dark Cockpit, VFR Aeronautical, Low IFR En-Route, High IFR En-Route, Topografica e Satellite).
* 📡 **Stazioni NAVAIDs Dedicate**: Visualizzazione interattiva sulla mappa di stazioni VOR e ILS con badge informativi dedicati e frequenze live.
* ✈️ **Integrazione SimBrief & MSFS**: Caricamento rapido del piano di volo attivo tramite ID SimBrief o importazione nativa di file `.pln` (MSFS 2020 e 2024).
* 📂 **Drag & Drop Intelligente**: Rilascia qualsiasi file `.pln` direttamente sulla mappa per caricare istantaneamente rotta, waypoint e quota di crociera.
* 📈 **Profilo Altitudinale VNAV Multi-Step**: Grafico interattivo dell'altitudine del piano di volo con tracciamento in tempo reale della posizione del velivolo e linea di discesa ToD (*Top of Descent*).
* 🛰️ **Telemetria Live via SimConnect**: Monitoraggio costante di altitudine, ground speed, heading, coordinate geografiche live e ora UTC/Sistema.

---

## 🚀 Istruzioni d'Uso

### 1. Avvio dell'Applicazione
* 💻 Apri il terminale nella cartella del progetto all'interno del tuo ambiente virtuale attivo (`.venv`).
* ▶️ Esegui il comando di avvio principale: `py main.py`.

### 2. Gestione del Piano di Volo
* 📂 **Importazione Manuale:** Clicca sul pulsante **"📂 Importa .pln"** nella barra laterale sinistra per selezionare un file di rotta salvato.
* 🎯 **Drag & Drop:** Trascina un file `.pln` da qualsiasi cartella del computer e rilascialo ovunque sulla mappa per caricarlo all'istante.
* ✈️ **Sincronizzazione SimBrief:** Inserisci il tuo **SimBrief User ID** nell'apposito campo e clicca **"✈️ SimBrief"** per importare l'OFP e i dati meteorologici aggiornati.
* 🗑️ **Pulizia Rotta:** Clicca sul pulsante rosso **"🗑️ Pulisci"** per rimuovere il piano di volo attivo, ripulire la mappa e azzerare il profilo VNAV (richiede conferma).

### 3. Configurazione della Mappa e dei Layer
* ⚙️ **Cambio Cartografia:** Utilizza il menu a tendina in alto a destra per alternare le viste *IFR Dark Cockpit*, *VFR*, *Low IFR*, *High IFR* o *Satellite*.
* 📡 **Filtri Navaids:** Clicca sul pulsante **"VOR / ILS: ON/OFF"** per attivare o nascondere le stazioni di terra sulla moving map.
* 🎯 **Centraggio Aereo:** Il pulsante **"Segui Aereo"** mantiene la mappa centrata sul velivolo in tempo reale; muovendo la mappa manualmente la modalità si disattiva in *Mappa Libera*.

### 4. Interazione con iWaypoint
* ✏️ **Modifica Quota:** Clicca sull'altitudine in piedi (*ft*) di qualsiasi waypoint nella colonna di sinistra o sui popup della mappa per modificarne la quota target in tempo reale.
* 🔍 **Ricerca Rapida:** Usa la barra di ricerca nella sidebar per cercare qualsiasi codice ICAO, VOR o aeroporto e centrare subito la mappa.

---
*Buon volo con AeroGlass Nav!*
