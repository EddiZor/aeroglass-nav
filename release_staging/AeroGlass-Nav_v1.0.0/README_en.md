# AeroGlass-Nav ✈️🗺️

🌐 **[🇬🇧 English](#-english)**

> ⚠️ **Aviation Disclaimer:** AeroGlass-Nav is designed exclusively for flight simulation (Microsoft Flight Simulator 2020 / MSFS 2024). It must never be used for real-world navigation or flight planning. / *Sviluppato esclusivamente per la simulazione di volo (MSFS 2020 / MSFS 2024); non utilizzare per la navigazione reale.*

---

## 🇬🇧 English

**AeroGlass-Nav** is a standalone **Dark Cockpit** EFB (Electronic Flight Bag), Flight Planner, and Moving Map application specifically built for **Microsoft Flight Simulator 2024** (and compatible with MSFS 2020). Built on a hybrid Python architecture (`pywebview`, multithreaded EFB HTTP server, `SQLite`, and native `SimConnect` telemetry) with a `Leaflet` cartographic frontend, it provides a smooth, responsive navigation experience both on your desktop flight sim setup and on tablets over Wi-Fi.

---

### 🌟 Key Features

#### 1. 🗺️ Dynamic Moving Map, Ground Map & Visual Search Centering

* **Multiple Map Layers:** Fast switching across *Dark Cockpit*, *IFR*, *VFR*, *Open Flight Maps*, *Satellite*, and *Relief (Terrain)* views, complete with live filter calibration profiles (brightness, contrast, saturation).
* **Quick Search with Visual Centering:** Instant search across **48,000+ world airports**, cities, and navaids in the local SQLite database (with `Enter` confirmation), centering the target airfield within the visible map area (compensating for sidebar and VNAV drawer) and opening the floating Airport Info / METAR card.
* **Real Airport Ground Map:** High-detail ground layouts (runways in real metric width, labeled taxiways, taxilanes, and parking stands) sourced from cache/MSFS/OSM, paired with zoom-based decluttering (LOD).
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
   ```

2. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Run in development mode:**

   ```bash
   python main.py
   ```

4. **Build executable with PyInstaller (optional):**

   ```bash
   pyinstaller --clean -y build.spec
   ```

---

### ⌨️ Shortcuts & Interaction

* **`F1`**: Start / stop the bilingual Interactive Guided Tour (`demo.js`).
* **`F2`**: Start / stop the Automatic Demo (`demo2.js`) — press **`L`** while running to switch language on the fly.
* **`Esc`**: Stop an active demo or cancel an in-progress measurement.
* **`Ctrl + Z`**: Undo the last route change.
* **`Right-Click on Map`**: Start the quick measurement ruler.
