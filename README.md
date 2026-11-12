✈️ AeroGlass Nav - Flight Planner & Moving Map (v0.6.0)

AeroGlass Nav è un'applicazione desktop leggera di pianificazione volo e Moving Map in stile Dark Cockpit per Microsoft Flight Simulator 2024, sviluppata in Python (pywebview, SimConnect, SQLite3) e Leaflet.js.

Progettata per offrire la chiarezza visiva di Navigraph Charts e la praticità operativa di Little Navmap in un'unica interfaccia fluida, senza appesantire i frame rate del simulatore e perfetta anche per monitor secondari dedicati alla telemetria.

🌟 Caratteristiche Principali (v0.6.0)

🗄️ Persistenza Nativa SQLite (aeroglass.db):
Archiviazione automatica in ~/.aeroglass_nav/aeroglass.db di impostazioni, SimBrief User ID, Piano di Volo attivo, Waypoint Utente, Storico Voli e cache degli aeroporti ICAO risolti online (nessuna dipendenza da file .json esterni).

📡 Telemetria Live SimConnect & Sagome Velivoli Dinamiche:
Connessione automatica a MSFS 2024 con riconoscimento automatico della categoria aeromobile e icona vettoriale SVG dedicata (Jet Militari/Addestratori es. MB-339, Aviazione Generale/Ultraleggeri es. Pioneer 400, Elicotteri, Business Jet, Airliner).

🧭 Modalità Mappa Intelligenti & 5 Stili Cartografici:
Passaggio rapido tra Mappa Libera, Follow (North Up) e Follow (Track Up) con rotazione dinamica della bussola mappa. Cinque layer cartografici integrati: IFR Dark Cockpit, VFR Topo, Low IFR Dark, High IFR Light e Satellite Imagery.

🛬 Procedure SID, STAR & Cono di Avvicinamento (ILS / RNAV):
Codifica cromatica automatica dei segmenti di rotta (SID in verde smeraldo, Enroute in magenta, STAR in ambra, Approach in ciano) e disegno geometrico del cono strumentale di allineamento pista (8 NM dalla soglia) con frequenze e prua finale.

🤏 Waypoint Utente Rapidi, "Rubber Banding" & Undo (Ctrl+Z):

Creazione di waypoint personalizzati tramite modulo laterale, selezione su mappa o Click Destro diretto sulla carta (con opzione "Salva & Inserisci in Rotta").

Rubber Banding: modifica elastica della rotta trascinando col mouse qualsiasi segmento della linea di volo o waypoint intermedio, con aggancio magnetico (🧲 SNAP) ad aeroporti, VOR e fix vicini.

Ripristino Traccia (↩️ Ripristina / Ctrl+Z): storico multi-livello per annullare qualsiasi modifica alla traccia o alle quote.

⛰️ Profilo Altimetrico VNAV Multi-Step & Orografia Reale:
Cassetto inferiore a scomparsa con profilo di salita/discesa, elevazione reale del terreno (DEM/SRTM via Open-Meteo), linea di posizione aereo in tempo reale e puntatore sincronizzato tra grafico VNAV e mappa.

✈️ Integrazione SimBrief, File .PLN & Risoluzione ICAO Globale:
Importazione diretta dell'ultimo OFP da SimBrief, caricamento/esportazione di file .pln (anche via Drag & Drop sulla finestra) e generatore manuale di rotte con risoluzione online di qualsiasi aeroporto ICAO mondiale e badge METAR in tempo reale (vento, temperatura, QNH).

📒 Logbook & Fuel Log Automatico:
Monitoraggio del consumo carburante tramite SimConnect (FUEL_TOTAL_QUANTITY) e registrazione automatica del volo nel database SQLite all'atterraggio sull'aeroporto di destinazione, con riepilogo totale di ore/voli, miglia nautiche e galloni consumati.

🪟 Integrazione Nativa Windows 11:
Barra del titolo nativa colorata in stile AeroGlass Dark tramite API dwmapi, protezione Single-Instance tramite Mutex Win32 e adattamento automatico delle proporzioni su configurazioni multi-monitor.

🛠️ Requisiti e Installazione

Prerequisiti

Sistema Operativo: Windows 10 / Windows 11 (64-bit)

Python: 3.10 o superiore

Simulatore: Microsoft Flight Simulator 2024 (oppure MSFS 2020)

Avvio da Codice Sorgente

Clona il repository:

git clone https://github.com/EddiZor/aeroglass-nav.git
cd aeroglass-nav


Installa le dipendenze:

pip install -r requirements.txt


Avvia l'applicazione:

python main.py


📁 Struttura della Directory

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
        ├── app.js               # Inizializzazione UI, temi, tooltip, resize sidebar e drag & drop
        └── js/
            ├── state.js         # Stato globale, sorgenti tile, database statici e spazi aerei
            ├── map.js           # Gestione Leaflet, Navaids, Spazi Aerei e Rubber Banding (Mouse/Touch)
            ├── flightplan.js    # Gestione FPL, SID/STAR, Cono ILS, User WP, Undo e PLN parser
            ├── vnav.js          # Calcolo profilo VNAV, terreno Open-Meteo, hover sync e ToD 3°
            ├── logbook_efb.js   # Gestione storico voli SQLite, auto-log atterraggio e server EFB Wi-Fi
            ├── perf.js          # Calcolatore carburante, prestazioni velivolo e tabella NavLog CSV
            ├── demo.js          # Tour guidato interattivo LIRF -> EGLL (Tasto F1)
            └── telemetry.js     # Aggiornamento indicatori live, sagome SVG e gestione tracce


📖 Manuale Utente - AeroGlass Nav

Il manuale utente completo e dettagliato di tutte le funzionalità, dei comandi e delle modalità operative è consultabile all'interno del file aeroglass_nav_user_manual.md.

👤 Autore

Sviluppato da EddiZor (SKYSIM PILOT Community)