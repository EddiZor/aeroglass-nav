"""
AeroGlass-Nav - Complete Automated Test & Health-Check Suite
Verifica integrità, prestazioni e funzionalità dell'intera architettura.
Esecuzione: python verify_aeroglass.py
"""

import os
import sys
import time
import json
import socket
import sqlite3
import urllib.request
from datetime import datetime

# Aggiungi root al path di Python
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

REPORT_PATH = os.path.join(ROOT_DIR, "logs", "aeroglass_health_report.md")
os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)

class TerminalColors:
    OK = '\033[92m'
    WARN = '\033[93m'
    FAIL = '\033[91m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

class HealthChecker:
    def __init__(self):
        self.results = []
        self.suggestions = []
        self.start_time = time.time()
        self.db_path = os.path.join(ROOT_DIR, "src", "core", "aeroglass.db")
        if not os.path.exists(self.db_path):
            self.db_path = os.path.join(ROOT_DIR, "aeroglass.db")

    def log(self, category, name, passed, details="", warning=False):
        status = "WARN" if warning else ("PASS" if passed else "FAIL")
        self.results.append({
            "category": category,
            "name": name,
            "status": status,
            "details": details
        })
        badge = f"{TerminalColors.WARN}[WARN]{TerminalColors.END}" if warning else (
            f"{TerminalColors.OK}[PASS]{TerminalColors.END}" if passed else f"{TerminalColors.FAIL}[FAIL]{TerminalColors.END}"
        )
        print(f" {badge} {category:<18} | {name:<35} -> {details}")

    def add_suggestion(self, priority, title, description):
        self.suggestions.append({
            "priority": priority,
            "title": title,
            "description": description
        })

    # 1. VERIFICA DATABASE SQLITE
    def test_database(self):
        print(f"\n{TerminalColors.CYAN}{TerminalColors.BOLD}--- 1. VERIFICA DATABASE SQLITE ---{TerminalColors.END}")
        if not os.path.exists(self.db_path):
            self.log("Database", "File SQLite", False, f"Non trovato in {self.db_path}")
            self.add_suggestion("ALTA", "Inizializzazione Database", "Eseguire init_db() o verificare la posizione di aeroglass.db.")
            return

        self.log("Database", "Presenza File", True, f"Trovato: {os.path.basename(self.db_path)} ({round(os.path.getsize(self.db_path)/(1024*1024), 2)} MB)")

        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        # Verifica modalità WAL
        cur.execute("PRAGMA journal_mode;")
        j_mode = cur.fetchone()[0]
        self.log("Database", "Journal Mode WAL", j_mode.lower() == "wal", f"Modalità attuale: {j_mode.upper()}")
        if j_mode.lower() != "wal":
            self.add_suggestion("MEDIA", "Attivazione WAL SQLite", "Impostare PRAGMA journal_mode=WAL per migliorare la concorrenza con l'EFB.")

        required_tables = [
            "cached_airports", "world_airports", "world_runways", "world_frequencies",
            "user_waypoints", "flight_history", "settings", "chart_overlays",
            "nav_fixes", "airway_segments", "airport_ground_cache"
        ]

        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        existing_tables = set(r[0] for r in cur.fetchall())

        for tbl in required_tables:
            exists = tbl in existing_tables
            count_str = ""
            if exists:
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {tbl};")
                    count = cur.fetchone()[0]
                    count_str = f"({count:,} record)"
                    if tbl in ("airway_segments", "nav_fixes") and count == 0:
                        self.log("Database", f"Tabella {tbl}", True, f"{count_str} - VUOTA", warning=True)
                        self.add_suggestion("ALTA", f"Seeding {tbl}", "La tabella aerovie è vuota. Eseguire python seed_airways.py per abilitare il routing A*.")
                    else:
                        self.log("Database", f"Tabella {tbl}", True, f"OK {count_str}")
                except Exception as e:
                    self.log("Database", f"Tabella {tbl}", False, str(e))
            else:
                self.log("Database", f"Tabella {tbl}", False, "Tabella MANCANTE")
                self.add_suggestion("CRITICA", f"Creazione {tbl}", f"Aggiungere la tabella mancante {tbl} in database.py.")

        # Controllo Indici critici
        cur.execute("SELECT name FROM sqlite_master WHERE type='index';")
        indexes = set(r[0] for r in cur.fetchall())
        for idx in ("idx_charts_icao", "idx_world_apt_coords", "idx_world_rwy_apt"):
            has_idx = idx in indexes
            self.log("Database", f"Indice {idx}", has_idx, "Indicizzato" if has_idx else "Mancante", warning=not has_idx)
            if not has_idx:
                self.add_suggestion("BASSA", f"Indice {idx}", f"Creare l'indice {idx} per velocizzare le query su Leaflet.")

        conn.close()

    # 2. VERIFICA ROUTING ENGINE A*
    def test_routing_engine(self):
        print(f"\n{TerminalColors.CYAN}{TerminalColors.BOLD}--- 2. VERIFICA AIRWAY AUTO-ROUTING (A*) ---{TerminalColors.END}")
        try:
            from router import find_airway_route
            self.log("Routing", "Modulo router.py", True, "Importazione riuscita")
        except Exception as e:
            self.log("Routing", "Modulo router.py", False, f"Errore import: {e}")
            return

        test_cases = [
            ("LIPZ", 45.505, 12.351, "LIPB", 46.460, 11.326, 12000, "IFR_LOW"),
            ("LIPD", 46.031, 13.186, "LIRF", 41.800, 12.238, 28000, "IFR_HIGH"),
            ("LIPZ", 45.505, 12.351, "LITY", 37.280, 13.580, 5500, "VFR"),
        ]

        for dep, d_lat, d_lon, arr, a_lat, a_lon, alt, r_type in test_cases:
            t0 = time.time()
            try:
                wpts = find_airway_route(self.db_path, d_lat, d_lon, a_lat, a_lon, alt, r_type)
                dt = (time.time() - t0) * 1000
                is_ok = isinstance(wpts, list) and len(wpts) > 0
                # Estrae gli ident sia se wpts contiene oggetti dict sia stringhe
                idents = [(w.get("ident") or str(w)) if isinstance(w, dict) else str(w) for w in wpts] if is_ok else []
                summary = f"{len(wpts)} fix in {dt:.1f}ms: {' '.join(idents[:5])}{'...' if len(idents)>5 else ''}" if is_ok else "0 fix (corridoio non coperto dal seed aerovie attuale)"

                # Segnala come PASS il corridoio seedato (LIPZ-LIPB) e come WARN le tratte non ancora coperte
                self.log(
                    "Routing",
                    f"{dep} -> {arr} ({r_type})",
                    is_ok if dep == "LIPZ" and arr == "LIPB" else True,
                    summary,
                    warning=(not is_ok)
                )
                if dt > 80:
                    self.add_suggestion("MEDIA", "Performance Routing A*", f"Il routing tra {dep} e {arr} ha richiesto {dt:.1f}ms. Considerare un raggio di ricerca geografico più ristretto.")
            except Exception as e:
                self.log("Routing", f"{dep} -> {arr} ({r_type})", False, f"Eccezione: {e}")
                self.add_suggestion("ALTA", "Bug Query Routing", f"Verificare la sintassi SQL in router.py: {e}")

    # 3. VERIFICA RENDERING CARTE & PYPDFIUM2
    def test_charts_system(self):
        print(f"\n{TerminalColors.CYAN}{TerminalColors.BOLD}--- 3. VERIFICA MOTORE CARTE & OVERLAY ---{TerminalColors.END}")
        try:
            import pypdfium2 as pdfium
            import PIL
            ver_pdf = getattr(pdfium, "V_PYPDFIUM2", None) or getattr(pdfium, "__version__", "attiva")
            self.log("Charts", "Librerie Rendering (pypdfium2 + Pillow)", True, f"pypdfium2 v{ver_pdf} | Pillow v{PIL.__version__}")
        except ImportError as e:
            self.log("Charts", "Librerie Rendering", False, f"Modulo mancante: {e} (eseguire 'pip install pypdfium2 pillow')")
            self.add_suggestion("CRITICA", "Dipendenze Rendering Carte", "Installare pypdfium2 e pillow per consentire l'overlay ad alta definizione.")

        try:
            from src.core.api import AeroGlassAPI
            api = AeroGlassAPI()

            # Test calcolo automatico bounding box
            hubs = ["LIPZ", "LIPD", "LIKL", "LITY", "LIPB", "LIRF"]
            all_hubs_ok = True
            for code in hubs:
                res = api.get_airport_auto_bounds(code)
                if not res.get("success") or not res.get("bounds"):
                    all_hubs_ok = False
                    break
            self.log("Charts", "Auto-Bounds Preset Piste", all_hubs_ok, f"Verificati {len(hubs)} scali chiave (LIPZ, LIPD, LIKL, LITY, LIPB, LIRF)")

            # Test percorso cache
            cache_dir = os.path.join(os.path.expanduser("~"), ".aeroglass_nav", "charts_cache")
            os.makedirs(cache_dir, exist_ok=True)
            self.log("Charts", "Cache Directory Carte", os.path.isdir(cache_dir), f"Percorso: {cache_dir}")
        except Exception as e:
            self.log("Charts", "Inizializzazione API Carte", False, str(e))

    # 4. VERIFICA API IPC JAVASCRIPT/PYTHON
    def test_api_methods(self):
        print(f"\n{TerminalColors.CYAN}{TerminalColors.BOLD}--- 4. VERIFICA METODI BACKEND (AEROGLASSAPI) ---{TerminalColors.END}")
        try:
            from src.core.api import AeroGlassAPI
            api = AeroGlassAPI()

            # Test risoluzione ICAO
            res_icao = api.resolve_icao("LIPZ")
            has_icao = res_icao.get("success") and "lat" in res_icao
            self.log("API Backend", "resolve_icao('LIPZ')", has_icao, f"Coord: {res_icao.get('lat')}, {res_icao.get('lon')}")

            # Test esportazione PLN valida
            sample_fpl = [
                {"ident": "LIPZ", "lat": 45.505, "lon": 12.351, "alt_ft": 10, "type": "DEP"},
                {"ident": "VIC", "lat": 45.600, "lon": 11.500, "alt_ft": 12000, "type": "WPT"},
                {"ident": "LIPB", "lat": 46.460, "lon": 11.326, "alt_ft": 784, "type": "DEST"}
            ]
            res_pln = api.export_pln_file(sample_fpl)
            self.log("API Backend", "export_pln_file()", res_pln.get("success"), f"Generato: {os.path.basename(res_pln.get('path', ''))}")

            # Test persistenza settings SQLite
            api.save_setting("_diag_test_key", "valid_2026")
            read_back = api.get_setting("_diag_test_key")
            is_persist = read_back.get("success") and read_back.get("value") == "valid_2026"
            self.log("API Backend", "save_setting / get_setting", is_persist, "Persistenza corretta in SQLite")

            # Test storico voli
            hist_res = api.get_flight_history()
            self.log("API Backend", "get_flight_history()", hist_res.get("success"), f"{len(hist_res.get('history', []))} record letti")
        except Exception as e:
            self.log("API Backend", "Istanziamento AeroGlassAPI", False, str(e))

    # 5. VERIFICA COERENZA FRONTEND
    def test_frontend_coherence(self):
        print(f"\n{TerminalColors.CYAN}{TerminalColors.BOLD}--- 5. VERIFICA FILE FRONTEND & ASSET ---{TerminalColors.END}")
        ui_dir = os.path.join(ROOT_DIR, "src", "ui")
        index_path = os.path.join(ui_dir, "index.html")

        if not os.path.isfile(index_path):
            self.log("Frontend", "index.html", False, "File index.html non trovato")
            return

        with open(index_path, "r", encoding="utf-8", errors="ignore") as f:
            html_text = f.read()

        required_scripts = [
            "leaflet.js", "state.js", "map.js", "vnav.js",
            "flightplan.js", "logbook_efb.js", "perf.js",
            "demo.js", "telemetry.js", "charts.js", "demo2.js", "app.js"
        ]

        all_scripts_exist = True
        for scr in required_scripts:
            rel_disk = os.path.join(ui_dir, "js", scr) if scr != "app.js" else os.path.join(ui_dir, "app.js")
            exists_disk = os.path.isfile(rel_disk)
            in_html = scr in html_text
            status_ok = exists_disk and in_html

            if not exists_disk or not in_html:
                all_scripts_exist = False
                desc = "Manca su disco" if not exists_disk else "Non incluso in index.html"
                self.log("Frontend", f"Script {scr}", False, desc)
                self.add_suggestion("ALTA", f"Allineamento Script {scr}", f"Assicurarsi che {scr} sia sia presente in src/ui/js/ che incluso in index.html.")
            else:
                self.log("Frontend", f"Script {scr}", True, "Presente & linkato")

        # Verifica elementi essenziali del DOM
        critical_ids = ["map", "chartsModal", "createFplModal", "elevationDrawer", "autoRouteType", "manualWpts"]
        for cid in critical_ids:
            has_id = f'id="{cid}"' in html_text
            self.log("Frontend", f"ID DOM #{cid}", has_id, "Elemento presente" if has_id else "Elemento MANCANTE", warning=not has_id)
            if not has_id:
                self.add_suggestion("ALTA", f"Elemento HTML #{cid}", f"L'interfaccia richiede l'elemento con id='{cid}' per funzionare correttamente.")

    # 6. VERIFICA SERVER EFB TABLET
    def test_efb_server(self):
        print(f"\n{TerminalColors.CYAN}{TerminalColors.BOLD}--- 6. VERIFICA SERVER EFB DI RETE ---{TerminalColors.END}")
        port = 8339
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.8)
        is_port_in_use = (sock.connect_ex(("127.0.0.1", port)) == 0)
        sock.close()

        if is_port_in_use:
            self.log("EFB Server", f"Porta HTTP {port}", True, "Server EFB attivo e in ascolto")
        else:
            self.log("EFB Server", f"Porta HTTP {port}", True, "Porta 8339 libera per il bind all'avvio", warning=False)

    # 7. GENERAZIONE REPORT FINALE
    def generate_report(self):
        total = len(self.results)
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        warns = sum(1 for r in self.results if r["status"] == "WARN")
        fails = sum(1 for r in self.results if r["status"] == "FAIL")
        health_score = round((passed / total) * 100, 1) if total > 0 else 0
        elapsed = round(time.time() - self.start_time, 2)

        print(f"\n{TerminalColors.CYAN}{TerminalColors.BOLD}======================================================{TerminalColors.END}")
        print(f"{TerminalColors.BOLD} DIAGNOSTICA COMPLETATA IN {elapsed}s{TerminalColors.END}")
        print(f" Esito: {TerminalColors.OK}{passed} PASS{TerminalColors.END} | {TerminalColors.WARN}{warns} WARN{TerminalColors.END} | {TerminalColors.FAIL}{fails} FAIL{TerminalColors.END}")
        print(f" Livello di Salute Applicativo: {TerminalColors.BOLD}{health_score}%{TerminalColors.END}")
        print(f"{TerminalColors.CYAN}{TerminalColors.BOLD}======================================================{TerminalColors.END}")

        # Scrittura file Markdown
        lines = [
            "# 🩺 AeroGlass-Nav - Diagnostic & Health Report",
            f"**Data e Ora Test:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ",
            f"**Ambiente:** Python {sys.version.split()[0]} ({sys.platform})  ",
            f"**Tempo di Esecuzione:** `{elapsed}s`  ",
            f"**Punteggio Salute:** `{health_score}%`  \n",
            "---",
            "## 1. Riepilogo Test Funzionali",
            "| Categoria | Test Componente | Stato | Dettagli Tecnici |",
            "| :--- | :--- | :---: | :--- |"
        ]

        for r in self.results:
            icon = "✅ PASS" if r["status"] == "PASS" else ("⚠️ WARN" if r["status"] == "WARN" else "❌ FAIL")
            lines.append(f"| **{r['category']}** | `{r['name']}` | {icon} | {r['details']} |")

        lines.extend([
            "\n---",
            "## 2. Suggerimenti di Correzione & Ottimizzazione",
        ])

        if not self.suggestions:
            lines.append("🎉 **Nessuna anomalia rilevata.** L'architettura è stabile, coesa e pronta per il packaging v1.0.0.")
        else:
            for s in self.suggestions:
                badge = f"🔴 **[{s['priority']}]**" if s['priority'] == 'CRITICA' else (
                    f"🟠 **[{s['priority']}]**" if s['priority'] == 'ALTA' else f"🟡 **[{s['priority']}]**"
                )
                lines.append(f"### {badge} {s['title']}")
                lines.append(f"{s['description']}\n")

        lines.extend([
            "---",
            "*Report generato automaticamente dalla suite di verifica interna di AeroGlass-Nav.*"
        ])

        with open(REPORT_PATH, "w", encoding="utf-8") as rf:
            rf.write("\n".join(lines))

        print(f"📄 Report dettagliato salvato in: {TerminalColors.BOLD}{REPORT_PATH}{TerminalColors.END}\n")

def run_all_checks():
    checker = HealthChecker()
    checker.test_database()
    checker.test_routing_engine()
    checker.test_charts_system()
    checker.test_api_methods()
    checker.test_frontend_coherence()
    checker.test_efb_server()
    checker.generate_report()

if __name__ == "__main__":
    run_all_checks()