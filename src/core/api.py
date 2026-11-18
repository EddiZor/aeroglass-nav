import os
import sys
import json
import time
import socket
import threading
import mimetypes
import urllib.request
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import xml.etree.ElementTree as ET
from datetime import datetime
import webview
from src.core.database import init_db, get_connection

try:
    from src.simconnect.telemetry import TelemetryManager as SimTelemetry
except ImportError:
    try:
        from src.simconnect.telemetry import SimTelemetry
    except ImportError:
        SimTelemetry = None


class DummyTelemetry:
    """Fallback nel caso in cui il modulo telemetria non sia attivo o connesso."""
    def get_data(self):
        return {
            "connected": False,
            "mode": "DEMO",
            "aircraft": "MSFS 2024",
            "alt_ft": "--- ft",
            "gs_kt": "--- kt",
            "hdg_deg": "---°",
            "hdg_true": 0,
            "lat": None,
            "lon": None
        }

    def shutdown(self):
        pass


class AeroGlassAPI:
    def __init__(self):
        self._window = None
        self._db_lock = threading.Lock()
        # Inizializza il database SQLite (~/.aeroglass_nav/aeroglass.db)
        init_db()
        self._init_ground_cache_table()
        if SimTelemetry is not None:
            try:
                self._telemetry = SimTelemetry()
            except Exception:
                self._telemetry = DummyTelemetry()
        else:
            self._telemetry = DummyTelemetry()
        self.flight_plan = []
        self._last_saved_fpl_sig = ""
        self._fpl_ts = time.time()
        self.efb_ip = self._detect_local_ip()
        self._ip_last_check = time.time()
        self.efb_port = 8339
        self._httpd = None
        self._migrate_legacy_files()
        # Avvia automaticamente il server HTTP EFB in background
        self.start_efb_server(self._get_default_ui_dir())

    def _init_ground_cache_table(self):
        """Crea la tabella di cache SQLite per i layout di terra se non esiste."""
        try:
            with self._db_lock:
                with get_connection() as conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS airport_ground_cache (
                            icao TEXT PRIMARY KEY,
                            layout_json TEXT,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    conn.commit()
        except Exception:
            pass

    def _get_default_ui_dir(self):
        if hasattr(sys, "_MEIPASS"):
            return os.path.join(sys._MEIPASS, "src", "ui")
        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ui"))

    def _migrate_legacy_files(self):
        """Migra eventuali vecchi file JSON locali in SQLite se presenti."""
        pass

    def _detect_local_ip(self):
        """Rileva l'indirizzo IP locale del PC sulla rete LAN/Wi-Fi."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.settimeout(0.5)
                s.connect(("8.8.8.8", 80))
                return s.getsockname()[0]
        except Exception:
            try:
                return socket.gethostbyname(socket.gethostname())
            except Exception:
                return "127.0.0.1"

    def start_efb_server(self, ui_root_dir=None):
        """Avvia il server HTTP multithread per il Tablet EFB sulla porta configurata (default 8339)."""
        if self._httpd is not None:
            return
        if not ui_root_dir:
            ui_root_dir = self._get_default_ui_dir()

        port_res = self.get_setting("efb_port")
        pref_port = 8339
        if port_res.get("success") and port_res.get("value"):
            try:
                val = int(port_res["value"])
                if 1024 <= val <= 65535 and val != 8080:
                    pref_port = val
            except Exception:
                pref_port = 8339

        api_ref = self
        ui_dir = os.path.abspath(ui_root_dir)

        class EfbRequestHandler(BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                pass

            def do_GET(self):
                parsed_path = urllib.parse.unquote(self.path.split("?", 1)[0])
                if parsed_path in ("", "/"):
                    parsed_path = "/index.html"

                rel_path = parsed_path.lstrip("/").replace("/", os.sep)
                full_path = os.path.abspath(os.path.join(ui_dir, rel_path))

                if not full_path.startswith(ui_dir) or not os.path.isfile(full_path):
                    self.send_response(404)
                    self.end_headers()
                    return

                mime_type, _ = mimetypes.guess_type(full_path)
                if not mime_type:
                    if full_path.endswith(".js"):
                        mime_type = "application/javascript; charset=utf-8"
                    elif full_path.endswith(".css"):
                        mime_type = "text/css; charset=utf-8"
                    else:
                        mime_type = "application/octet-stream"

                try:
                    with open(full_path, "rb") as f:
                        content = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", mime_type)
                    self.send_header("Cache-Control", "no-cache")
                    self.send_header("Content-Length", str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                except Exception:
                    self.send_response(500)
                    self.end_headers()

            def do_POST(self):
                if not self.path.startswith("/api/"):
                    self.send_response(404)
                    self.end_headers()
                    return

                method_name = self.path[5:].split("?", 1)[0].strip()
                if not method_name or method_name.startswith("_") or not hasattr(api_ref, method_name):
                    self.send_response(403)
                    self.end_headers()
                    return

                try:
                    length = int(self.headers.get("Content-Length", 0))
                    raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                    payload = json.loads(raw_body) if raw_body else {}
                    args = payload.get("args", [])

                    func = getattr(api_ref, method_name)
                    result = func(*args)

                    resp_bytes = json.dumps({"result": result}).encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Content-Length", str(len(resp_bytes)))
                    self.end_headers()
                    self.wfile.write(resp_bytes)
                except Exception as e:
                    err_bytes = json.dumps({"result": {"success": False, "error": str(e)}}).encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Content-Length", str(len(err_bytes)))
                    self.end_headers()
                    self.wfile.write(err_bytes)

        for candidate in range(pref_port, pref_port + 30):
            if candidate == 8080:
                continue
            try:
                server = ThreadingHTTPServer(("0.0.0.0", candidate), EfbRequestHandler)
                self.efb_port = candidate
                self._httpd = server
                threading.Thread(target=server.serve_forever, daemon=True).start()
                break
            except OSError:
                continue

    def get_efb_info(self):
        now = time.time()
        if (now - self._ip_last_check) > 30.0 or not self.efb_ip:
            self._ip_last_check = now
            self.efb_ip = self._detect_local_ip()
        url = f"http://{self.efb_ip}:{self.efb_port}"
        return {
            "success": True,
            "ip": self.efb_ip,
            "port": self.efb_port,
            "url": url
        }

    def set_efb_port(self, new_port):
        try:
            p = int(new_port)
            if p < 1024 or p > 65535 or p == 8080:
                return {"success": False, "error": "Inserisci una porta compresa tra 1024 e 65535 (diversa da 8080)."}
            self.save_setting("efb_port", str(p))
            return {"success": True, "port": p}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_initial_data(self):
        simbrief_res = self.get_setting("simbrief_id")
        simbrief_id = simbrief_res.get("value") if simbrief_res.get("success") else ""

        fpl_res = self.get_setting("active_flight_plan")
        saved_fpl = []
        if fpl_res.get("success") and fpl_res.get("value"):
            try:
                saved_fpl = json.loads(fpl_res["value"])
            except Exception:
                saved_fpl = []

        alt_res = self.get_setting("active_alternate")
        saved_alt = None
        if alt_res.get("success") and alt_res.get("value"):
            try:
                saved_alt = json.loads(alt_res["value"])
            except Exception:
                saved_alt = None

        airports = []
        try:
            with self._db_lock:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT icao, name, lat, lon, elev, rwy, metar FROM cached_airports")
                    airports = [dict(row) for row in cursor.fetchall()]
        except Exception:
            airports = []

        self.flight_plan = saved_fpl
        self._last_saved_fpl_sig = json.dumps({"fpl": saved_fpl, "alt": saved_alt}, sort_keys=True)

        return {
            "airports": airports,
            "vors": [],
            "ils": [],
            "simbrief_id": simbrief_id or "",
            "flight_plan": saved_fpl,
            "alternate": saved_alt,
            "fpl_ts": self._fpl_ts,
            "efb_info": self.get_efb_info()
        }

    def resolve_icao(self, ident):
        code = str(ident or "").strip().upper()
        if not code:
            return {"success": False}

        result = None

        try:
            with self._db_lock:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT icao, name, lat, lon, elev, rwy, metar FROM cached_airports WHERE icao = ?", (code,))
                    row = cursor.fetchone()
                    if row:
                        result = {
                            "success": True,
                            "icao": row["icao"],
                            "name": row["name"],
                            "lat": float(row["lat"]),
                            "lon": float(row["lon"]),
                            "elev": int(row["elev"] or 0),
                            "metar": row["metar"] or "",
                            "is_airport": True
                        }
                    else:
                        cursor.execute("SELECT icao, name, lat, lon, elev_ft FROM world_airports WHERE icao = ?", (code,))
                        w_row = cursor.fetchone()
                        if w_row:
                            result = {
                                "success": True,
                                "icao": w_row["icao"],
                                "name": w_row["name"],
                                "lat": float(w_row["lat"]),
                                "lon": float(w_row["lon"]),
                                "elev": int(w_row["elev_ft"] or 0),
                                "metar": "",
                                "is_airport": True
                            }
        except Exception:
            pass

        hub_airports = {
            "EDDF": {"name": "Frankfurt Main", "lat": 50.0333, "lon": 8.5706, "elev": 364},
            "EDDM": {"name": "Munich Franz Josef Strauss", "lat": 48.3538, "lon": 11.7861, "elev": 1487},
            "EDDB": {"name": "Berlin Brandenburg", "lat": 52.3622, "lon": 13.5007, "elev": 157},
            "EDDL": {"name": "Dusseldorf", "lat": 51.2895, "lon": 6.7668, "elev": 147},
            "EDDH": {"name": "Hamburg", "lat": 53.6304, "lon": 9.9882, "elev": 53},
            "EDDS": {"name": "Stuttgart", "lat": 48.6899, "lon": 9.2220, "elev": 1276},
            "LOWW": {"name": "Wien Schwechat", "lat": 48.1103, "lon": 16.5697, "elev": 600},
            "LOWI": {"name": "Innsbruck Kranebitten", "lat": 47.2602, "lon": 11.3439, "elev": 1906},
            "LOWS": {"name": "Salzburg", "lat": 47.7933, "lon": 13.0043, "elev": 1411},
            "LSZH": {"name": "Zurich Kloten", "lat": 47.4581, "lon": 8.5481, "elev": 1417},
            "LSGG": {"name": "Geneve Cointrin", "lat": 46.2381, "lon": 6.1089, "elev": 1411},
            "LSZA": {"name": "Lugano Agno", "lat": 46.0043, "lon": 8.9106, "elev": 915},
            "LFPG": {"name": "Paris Charles de Gaulle", "lat": 49.0097, "lon": 2.5478, "elev": 392},
            "LFPO": {"name": "Paris Orly", "lat": 48.7233, "lon": 2.3794, "elev": 291},
            "LFMN": {"name": "Nice Cote d'Azur", "lat": 43.6584, "lon": 7.2159, "elev": 12},
            "EGLL": {"name": "London Heathrow", "lat": 51.4700, "lon": -0.4543, "elev": 83},
            "EGKK": {"name": "London Gatwick", "lat": 51.1481, "lon": -0.1903, "elev": 202},
            "EHAM": {"name": "Amsterdam Schiphol", "lat": 52.3086, "lon": 4.7639, "elev": -11},
            "LEMD": {"name": "Madrid Barajas", "lat": 40.4719, "lon": -3.5626, "elev": 1998},
            "LEBL": {"name": "Barcelona El Prat", "lat": 41.2971, "lon": 2.0785, "elev": 12},
            "LGAV": {"name": "Athens Eleftherios Venizelos", "lat": 37.9364, "lon": 23.9445, "elev": 308},
            "LDSP": {"name": "Split Resnik", "lat": 43.5389, "lon": 16.2980, "elev": 79},
            "LDDU": {"name": "Dubrovnik Cilipi", "lat": 42.5614, "lon": 18.2682, "elev": 525},
            "LMML": {"name": "Malta Luqa", "lat": 35.8575, "lon": 14.4775, "elev": 300}
        }

        if not result and code in hub_airports:
            h = hub_airports[code]
            result = {
                "success": True,
                "icao": code,
                "name": h["name"],
                "lat": h["lat"],
                "lon": h["lon"],
                "elev": h["elev"],
                "metar": "",
                "is_airport": True
            }

        try:
            url = f"https://aviationweather.gov/api/data/metar?ids={code}&format=json"
            req = urllib.request.Request(url, headers={"User-Agent": "AeroGlassNav/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if isinstance(data, list) and len(data) > 0:
                item = data[0]
                lat = item.get("lat")
                lon = item.get("lon")
                if lat is not None and lon is not None:
                    elev_m = item.get("elev") or 0
                    result = {
                        "success": True,
                        "icao": code,
                        "name": item.get("name", result["name"] if result else code),
                        "lat": float(lat),
                        "lon": float(lon),
                        "elev": int(round(float(elev_m) * 3.28084)),
                        "metar": item.get("rawOb", ""),
                        "is_airport": True
                    }
        except Exception:
            pass

        if not result:
            try:
                url_apt = f"https://aviationweather.gov/api/data/airport?ids={code}&format=json"
                req_apt = urllib.request.Request(url_apt, headers={"User-Agent": "AeroGlassNav/1.0"})
                with urllib.request.urlopen(req_apt, timeout=5) as resp:
                    apt_data = json.loads(resp.read().decode("utf-8"))
                if isinstance(apt_data, list) and len(apt_data) > 0:
                    item = apt_data[0]
                    lat = item.get("lat")
                    lon = item.get("lon")
                    if lat is not None and lon is not None:
                        elev_m = item.get("elev") or 0
                        result = {
                            "success": True,
                            "icao": code,
                            "name": item.get("name", code),
                            "lat": float(lat),
                            "lon": float(lon),
                            "elev": int(round(float(elev_m) * 3.28084)),
                            "metar": "",
                            "is_airport": True
                        }
            except Exception:
                pass

        if result:
            try:
                with self._db_lock:
                    with get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT OR REPLACE INTO cached_airports (icao, name, lat, lon, elev, rwy, metar)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (
                            result["icao"],
                            result["name"],
                            float(result["lat"]),
                            float(result["lon"]),
                            int(result["elev"]),
                            "",
                            result.get("metar", "")
                        ))
                        conn.commit()
            except Exception:
                pass
            return result

        return {"success": False}

    def get_setting(self, key):
        try:
            with self._db_lock:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
                    row = cursor.fetchone()
                    return {"success": True, "value": row["value"] if row else None}
        except Exception as e:
            return {"success": False, "value": None, "error": str(e)}

    def save_setting(self, key, value):
        try:
            with self._db_lock:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                        (key, str(value).strip())
                    )
                    conn.commit()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def ask_orwill(self, prompt, telemetry=None, flight_plan=None):
        import re
        q = (prompt or "").strip().lower()
        q_raw = (prompt or "").strip()
        telemetry = telemetry or {}
        flight_plan = flight_plan or []

        alt = telemetry.get('alt_ft', 0)
        gs = telemetry.get('gs_kt', 0)
        qnh = telemetry.get('qnh_mb', 1013)

        if not q:
            return {
                "success": True, 
                "answer": "**Orwill Dispatcher (Pronto)**\n\nCome posso assisterti nella pianificazione o nel monitoraggio del volo?"
            }

        words = q_raw.split()
        target_icao = None
        for w in words:
            clean_w = re.sub(r'[^a-zA-Z]', '', w).upper()
            if len(clean_w) == 4 and clean_w[0] in ('L', 'K', 'E', 'ED', 'LF', 'LS', 'LE', 'U', 'Z', 'Y', 'W', 'N', 'S'):
                target_icao = clean_w
                break

        if not target_icao:
            match_icao = re.search(r'\b([a-zA-Z]{4})\b', q_raw)
            if match_icao and ('metar' in q or 'tempo' in q or 'aeroporto' in q or 'meteo' in q or 'arrivo' in q):
                target_icao = match_icao.group(1).upper()

        if target_icao or 'metar' in q or 'tempo' in q or 'meteo' in q:
            if not target_icao:
                if flight_plan:
                    target_icao = flight_plan[-1].get('ident', 'LIPZ')
                else:
                    target_icao = 'LIPZ'

            res_apt = self.resolve_icao(target_icao)
            if res_apt and res_apt.get("success"):
                name = res_apt.get("name", target_icao)
                elev = res_apt.get("elev", 0)
                metar = res_apt.get("metar", "Nessun bollettino METAR attivo o disponibile al momento.")
                lat = res_apt.get("lat")
                lon = res_apt.get("lon")
                
                return {
                    "success": True,
                    "answer": f"### 🌦️ METAR Briefing: `{target_icao}` - {name}\n\n* **Elevazione:** `{elev} ft` | **Coord:** `{lat}, {lon}`\n\n```text\n{metar}\n```\n\n**Stato:** Bollettino ufficiale aggiornato in tempo reale."
                }
            else:
                return {
                    "success": True,
                    "answer": f"### ⚠️ Avviso Dispatcher\n\nNon sono riuscito a interrogare il server meteo per il codice `{target_icao}`. Verifica che sia un ICAO valido."
                }

        if any(k in q for k in ['atz', 'ctr', 'tma', 'fir', 'spazio aereo', 'classi di spazio']):
            if 'atz' in q:
                return {"success": True, "answer": "### 🛂 ATZ (Aerodrome Traffic Zone)\n\nUn'**ATZ** (Zona di Traffico Aeroportuale) è uno spazio aereo di dimensioni definite stabilito attorno a un aerodromo per la protezione del traffico aereo locale.\n\n* **Finalità:** Regolare e proteggere le fasi di decollo, atterraggio e circuito di traffico.\n* **Servizi:** All'interno di un'ATZ le comunicazioni radio sono obbligatorie e il traffico è regolato dall'ente di controllo locale (Torre, AFISO o Radio).\n* **Spazio Aereo:** Solitamente classificato come spazio aereo controllato o non controllato (AFISO/INFO) a seconda dello scalo."}
            elif 'ctr' in q:
                return {"success": True, "answer": "### 🛡️ CTR (Control Zone)\n\nUna **CTR** (Zona di Controllo) è uno spazio aereo controllato che si estende dalla superficie terrestre fino a un limite superiore specificato, attorno a uno o più aeroporti principali.\n\n* **Scopo:** Proteggere i voli arrivati o partenti in Instrument Flight Rules (IFR) e VFR autorizzati.\n* **Procedure:** Richiede autorizzazione preventiva e contatto radio continuo con l'Approach (APP) o la Torre (TWR)."}
            elif 'tma' in q:
                return {"success": True, "answer": "### 🌐 TMA (Terminal Control Area)\n\nUna **TMA** (Area di Controllo Terminale) è uno spazio aereo controllato stabilito alla congiunzione di una o più rotte ATS in vicinanza di aeroporti principali.\n\n* **Struttura:** Ha tipicamente la forma di gradoni a quote crescenti man mano che ci si allontana dall'aeroporto.\n* **Regole:** Regola il traffico in salita iniziale e discesa/avvicinamento finale verso i grandi scali."}
            elif 'fir' in q:
                return {"success": True, "answer": "### 🗺️ FIR (Flight Information Region)\n\nGrande regione di informazioni volo che copre lo spazio aereo superiore e inferiore di uno Stato, gestita da un ACC (Area Control Center)."}
            else:
                return {"success": True, "answer": "### 🛩️ Spazi Aerei\n\nGli spazi aerei si dividono in Controllati (Classi A, B, C, D, E) e Non Controllati (Classi F, G). Richiedono differenti livelli di autorizzazione e separazione."}

        elif any(k in q for k in ['squawk', '7500', '7600', '7700', 'emergenza', 'guasto radio', 'dirottamento']):
            if '7500' in q or 'dirottamento' in q or 'ilecita' in q:
                return {"success": True, "answer": "### 🚨 SQUAWK 7500 (Unlawful Interference)\n\n**Attenzione:** Dirottamento o interferenza illecita a bordo. Non rispondere via radio se compromette la sicurezza; inserisci discretamente il codice sul transponder."}
            elif '7600' in q or 'guasto radio' in q or 'perdita radio' in q:
                return {"success": True, "answer": "### 📻 SQUAWK 7600 (Lost Communications)\n\n* **Procedura VFR:** Mantenere il VMC, atterrare al primo aeroporto idoneo e osservare i segnali luminosi dalla torre.\n* **Procedura IFR:** Seguire l'ultima rotta assegnata, livello e velocità previsti dal piano di volo per 20 minuti, poi procedere secondo STAR/Approccio."}
            elif '7700' in q or 'emergenza' in q:
                return {"success": True, "answer": "### ⚠️ SQUAWK 7700 (General Emergency)\n\nCodice di emergenza generale. Avvisa immediatamente l'ente ATC competente, applica la checklist di emergenza dell'aeromobile e valuta il dirottamento sul campo più vicino."}
            else:
                return {"success": True, "answer": "### 🎛️ Codici Transponder Principali\n\n* **7000:** Volo VFR generale (Europa)\n* **1000:** Volo IFR generale (o transizione)\n* **7500:** Dirottamento\n* **7600:** Guasto Radio\n* **7700:** Emergenza Generale"}

        elif any(k in q for k in ['holding', 'attesa', 'circuiti', 'sid', 'star', 'ils', 'rnav', 'avvicinamento']):
            if 'holding' in q or 'attesa' in q:
                return {"success": True, "answer": "### 🔄 Circuiti d'Attesa (Holding)\n\n* **Ingresso:** Può essere a *Parallel* (parallelo), *Teardrop* (a goccia) o *Direct* (diretto) in base al settore di arrivo rispetto all'asse.\n* **Timing:** Standard 1 minuto in outbound (sotto i 14,000 ft) o 1.5 minuti (sopra i 14,000 ft). Virate standard a destra (standard rate, 3°/sec)."}
            elif 'ils' in q or 'avvicinamento' in q:
                return {"success": True, "answer": "### 📡 Avvicinamento ILS (Instrument Landing System)\n\nComposto da:\n* **Localizer (LLC):** Guida laterale (asse pista).\n* **Glide Slope (GS):** Guida verticale (sentiero standard 3.0°).\n* **Marker / DME / Fix:** Riferimenti di distanza per stabilire le quote minime (DA/DH)."}
            else:
                return {"success": True, "answer": "### 🧭 Procedure Strumentali\n\n* **SID:** Standard Instrument Departure (normalizza la salita dall'aeroporto alla rotta en-route).\n* **STAR:** Standard Terminal Arrival Route (connette la rotta en-route all'inizio dell'avvicinamento strumentale)."}

        elif any(k in q for k in ['v1', 'vr', 'v2', 'vref', 'stallo', 'velocità', 'vs']):
            return {
                "success": True,
                "answer": "### ✈️ Velocità Caratteristiche (V-Speeds)\n\n* **V1:** Decision Speed. Oltre questa velocità non si può più interrompere il decollo in sicurezza.\n* **VR:** Rotation Speed. Velocità alla quale si aziona il comando a picchiare/cabrare per sollevare il muso.\n* **V2:** Takeoff Safety Speed. Velocità da mantenere in salita con un motore in avaria.\n* **VREF:** Reference Landing Speed. Velocità di riferimento al passaggio sulla soglia pista (solitamente 1.3 volte la velocità di stallo in configurazione landing)."
            }

        elif 'qnh' in q or 'altimetro' in q or 'pressione' in q:
            return {
                "success": True, 
                "answer": f"### 📊 Report Altimetrico & Barometro\n\n* **QNH Rilevato (Sim):** `{qnh} hPa`\n* **Quota Barometrica:** `{alt} ft`\n\n**Raccomandazione Operativa:**\n* Imposta il QNH attuale sui subscale del barometro del tuo aeromobile.\n* Sotto la Transition Altitude usa il QNH locale; sopra la Transition Level passa a `STANDARD (1013.2 hPa)`."
            }

        elif 'discesa' in q or 'tod' in q or 'top of descent' in q or 'quota' in q:
            return {
                "success": True, 
                "answer": f"### 📉 Profilo di Volo & VNAV (Orwill)\n\n* **Quota Corrente:** `{alt} ft`\n\n**Parametri di Discesa Consigliati:**\n* **Regola del 3:** Calcola `3 NM per ogni 1.000 ft` da perdere.\n* Mantieni un sentiero standard di discesa a `3.0°` e monitora il marker *ToD* sul cassetto VNAV."
            }

        elif 'carburante' in q or 'fuel' in q or 'consumo' in q:
            return {
                "success": True, 
                "answer": f"### ⛽ Gestione Carburante & Performance\n\n* **GS Attuale:** `{gs} kt`\n\nApri il pannello **Fuel & Perf** nella barra superiore per calcolare il carburante e le riserve."
            }

        else:
            try:
                self.open_external_gemini(prompt)
            except Exception:
                pass

            return {
                "success": True,
                "answer": f"### 🤖 Assistente Orwill\n\n🌐 **Per questa domanda è meglio allargare la ricerca:** ho aperto Gemini nel browser e **ho copiato la tua domanda negli appunti** (premi `Ctrl + V` per incollarla)."
            }

    def set_setting(self, key, value):
        return self.save_setting(key, value)

    def get_airports_in_bounds(self, min_lat, max_lat, min_lon, max_lon, zoom=8):
        try:
            z = float(zoom)
            if z < 6.5:
                allowed = ("large_airport",)
                limit = 180
            elif z < 9.0:
                allowed = ("large_airport", "medium_airport")
                limit = 320
            else:
                allowed = ("large_airport", "medium_airport", "small_airport")
                limit = 500

            placeholders = ",".join("?" for _ in allowed)
            query = f"""
                SELECT icao, type, name, lat, lon, elev_ft, municipality
                FROM world_airports
                WHERE lat BETWEEN ? AND ?
                  AND lon BETWEEN ? AND ?
                  AND type IN ({placeholders})
                ORDER BY CASE type
                    WHEN 'large_airport' THEN 1
                    WHEN 'medium_airport' THEN 2
                    ELSE 3
                END
                LIMIT ?
            """
            params = [float(min_lat), float(max_lat), float(min_lon), float(max_lon), *allowed, limit]
            with self._db_lock:
                with get_connection() as conn:
                    rows = conn.execute(query, params).fetchall()
                    return {"success": True, "airports": [dict(r) for r in rows]}
        except Exception as e:
            return {"success": False, "error": str(e), "airports": []}

    def search_world_airports(self, query_str):
        q = str(query_str or "").strip().upper()
        if len(q) < 2:
            return {"success": True, "results": []}
        try:
            with self._db_lock:
                with get_connection() as conn:
                    rows = conn.execute("""
                        SELECT icao, type, name, lat, lon, elev_ft, country, municipality
                        FROM world_airports
                        WHERE icao LIKE ? OR UPPER(name) LIKE ? OR UPPER(municipality) LIKE ?
                        ORDER BY CASE
                            WHEN icao = ? THEN 0
                            WHEN icao LIKE ? THEN 1
                            WHEN type = 'large_airport' THEN 2
                            WHEN type = 'medium_airport' THEN 3
                            ELSE 4
                        END
                        LIMIT 25
                    """, (f"{q}%", f"%{q}%", f"%{q}%", q, f"{q}%")).fetchall()
                    return {"success": True, "results": [dict(r) for r in rows]}
        except Exception as e:
            return {"success": False, "error": str(e), "results": []}

    def get_airport_details(self, icao, wind_dir=None, wind_spd=None):
        import math
        ident = str(icao or "").strip().upper()
        try:
            with self._db_lock:
                with get_connection() as conn:
                    apt = conn.execute("SELECT * FROM world_airports WHERE icao = ?", (ident,)).fetchone()
                    rwys = [dict(r) for r in conn.execute("SELECT * FROM world_runways WHERE apt_icao = ?", (ident,)).fetchall()]
                    freqs = [dict(f) for r_f in [conn.execute("SELECT * FROM world_frequencies WHERE apt_icao = ? ORDER BY type", (ident,)).fetchall()] for f in r_f]

            best_rwy = None
            if wind_dir is not None and wind_spd is not None and float(wind_spd) > 0 and rwys:
                w_dir = float(wind_dir)
                w_spd = float(wind_spd)
                best_hw = -999.0
                for r in rwys:
                    for end_key, hdg_key in (("le_ident", "le_hdg"), ("he_ident", "he_hdg")):
                        r_ident = r.get(end_key)
                        r_hdg = float(r.get(hdg_key) or 0)
                        if not r_ident:
                            continue
                        if r_hdg == 0 and r_ident[:2].isdigit():
                            r_hdg = float(int(r_ident[:2]) * 10)
                        rad = math.radians(w_dir - r_hdg)
                        hw = round(w_spd * math.cos(rad), 1)
                        xw = round(abs(w_spd * math.sin(rad)), 1)
                        if hw > best_hw:
                            best_hw = hw
                            best_rwy = {
                                "ident": r_ident,
                                "headwind_kt": hw,
                                "crosswind_kt": xw,
                                "surface": r.get("surface"),
                                "length_ft": r.get("length_ft")
                            }

            return {
                "success": True,
                "airport": dict(apt) if apt else None,
                "runways": rwys,
                "frequencies": freqs,
                "recommended_runway": best_rwy
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_nearest_airport(self, lat, lon):
        """Trova l'aeroporto più vicino alle coordinate date (lat, lon) nel database mondiale SQLite,
           dando priorità agli aeroporti principali/medi rispetto a eliporti o codici minori."""
        try:
            lat = float(lat)
            lon = float(lon)
            with self._db_lock:
                with get_connection() as conn:
                    row = conn.execute("""
                        SELECT icao, name, lat, lon, elev_ft, type
                        FROM world_airports
                        WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
                          AND type IN ('large_airport', 'medium_airport', 'small_airport')
                        ORDER BY (
                            ((lat - ?) * (lat - ?) + (lon - ?) * (lon - ?)) *
                            CASE type
                                WHEN 'large_airport' THEN 0.35
                                WHEN 'medium_airport' THEN 0.65
                                ELSE 1.0
                            END
                        ) ASC
                        LIMIT 1
                    """, (lat - 0.12, lat + 0.12, lon - 0.16, lon + 0.16, lat, lat, lon, lon)).fetchone()
                    if row:
                        return {
                            "success": True,
                            "airport": {
                                "icao": row["icao"],
                                "name": row["name"] or row["icao"],
                                "lat": float(row["lat"]),
                                "lon": float(row["lon"]),
                                "elev": row["elev_ft"] or 0
                            }
                        }
            return {"success": False}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def save_airport_ground_layout(self, icao, layout):
        """Salva il layout di terra (scaricato da OSM via Chromium o backend) nella cache SQLite e su file JSON."""
        import json
        icao = str(icao or "").strip().upper()
        if not icao or not isinstance(layout, dict):
            return {"success": False}
        try:
            layout_json_str = json.dumps(layout)
            with self._db_lock:
                with get_connection() as conn:
                    conn.execute(
                        "INSERT OR REPLACE INTO airport_ground_cache (icao, layout_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                        (icao, layout_json_str)
                    )
                    conn.commit()
            try:
                cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ground_cache")
                os.makedirs(cache_dir, exist_ok=True)
                with open(os.path.join(cache_dir, f"{icao}.json"), "w", encoding="utf-8") as jf:
                    jf.write(layout_json_str)
            except Exception:
                pass
            print(f"[GroundMap] Cache SQLite aggiornata per {icao} (source={layout.get('source', 'osm')}: {len(layout.get('runways', []))} rwy, {len(layout.get('taxiways', []))} twy, {len(layout.get('stands', []))} stand).")
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_airport_ground_layout(self, icao):
        """Restituisce il layout di terra dalla cache SQLite locale o lo estrae con msfs_ground_db."""
        import json
        import math

        icao = str(icao or "").strip().upper()
        if not icao:
            return {"success": False, "error": "ICAO non valido"}

        # 1. Se il layout completo (OSM o MSFS) è già in airport_ground_cache, lo restituisce in 1 ms
        try:
            with self._db_lock:
                with get_connection() as conn:
                    row = conn.execute("SELECT layout_json FROM airport_ground_cache WHERE icao = ?", (icao,)).fetchone()
                    if row and row["layout_json"]:
                        cached_layout = json.loads(row["layout_json"])
                        if cached_layout.get("source") in ("osm", "msfs") and (
                            cached_layout.get("taxiways") or cached_layout.get("stands") or cached_layout.get("aprons")
                        ):
                            return {"success": True, "layout": cached_layout}
        except Exception:
            pass

        lat, lon, apt_name = None, None, icao
        db_runways = []

        # 2. Recupera coordinate e piste reali dal database SQLite locale
        try:
            with self._db_lock:
                with get_connection() as conn:
                    row = conn.execute("SELECT name, lat, lon FROM world_airports WHERE icao = ?", (icao,)).fetchone()
                    if row:
                        apt_name = row["name"] or icao
                        lat, lon = float(row["lat"]), float(row["lon"])

                    if lat is None or lon is None:
                        c_row = conn.execute("SELECT name, lat, lon FROM cached_airports WHERE icao = ?", (icao,)).fetchone()
                        if c_row:
                            apt_name = c_row["name"] or icao
                            lat, lon = float(c_row["lat"]), float(c_row["lon"])

                    rwy_rows = [dict(r) for r in conn.execute("SELECT * FROM world_runways WHERE apt_icao = ?", (icao,)).fetchall()]
                    for idx, r in enumerate(rwy_rows):
                        le_id = str(r.get("le_ident") or "").strip()
                        he_id = str(r.get("he_ident") or "").strip()
                        rwy_ref = f"{le_id}/{he_id}" if (le_id and he_id) else (le_id or he_id or "RWY")
                        surf_raw = str(r.get("surface") or "asphalt").lower()
                        surf = "grass" if ("grass" in surf_raw or "turf" in surf_raw or "grs" in surf_raw) else "asphalt"
                        width_m = max(18.0, float(r.get("width_ft") or 148) * 0.3048)

                        le_lat, le_lon = r.get("le_lat"), r.get("le_lon")
                        he_lat, he_lon = r.get("he_lat"), r.get("he_lon")

                        if le_lat is not None and le_lon is not None and he_lat is not None and he_lon is not None:
                            coords = [[float(le_lat), float(le_lon)], [float(he_lat), float(he_lon)]]
                        elif lat is not None and lon is not None:
                            hdg = float(r.get("le_hdg") or 0.0)
                            if hdg <= 0.0 and len(le_id) >= 2 and le_id[:2].isdigit():
                                hdg = float(int(le_id[:2]) * 10)
                            len_ft = float(r.get("length_ft") or 4500)
                            half_deg_lat = ((len_ft / 6076.12) / 2.0) / 60.0
                            cos_lat = max(0.15, math.cos(math.radians(lat)))
                            hdg_rad = math.radians(hdg)
                            d_lat = half_deg_lat * math.cos(hdg_rad)
                            d_lon = (half_deg_lat * math.sin(hdg_rad)) / cos_lat
                            coords = [[round(lat - d_lat, 6), round(lon - d_lon, 6)],
                                      [round(lat + d_lat, 6), round(lon + d_lon, 6)]]
                        else:
                            continue

                        db_runways.append({
                            "ref": rwy_ref,
                            "width": round(width_m, 1),
                            "surface": surf,
                            "coords": coords
                        })
        except Exception as db_exc:
            print(f"[GroundMap] Errore lettura piste SQLite per {icao}:", db_exc)

        if lat is None or lon is None:
            return {"success": False, "error": f"Aeroporto {icao} non trovato nel database"}

        # 3. Estrae taxiway e parcheggi (da pacchetti MSFS 2024 o rete) e popola SEMPRE airport_ground_cache
        try:
            from src.core.msfs_ground_db import fetch_and_cache_airport_ground
            full_layout = fetch_and_cache_airport_ground(icao, apt_name, lat, lon, db_runways, self._db_lock)
            return {"success": True, "layout": full_layout}
        except Exception as ext_err:
            print(f"[GroundMap] Errore estrazione layout per {icao}:", ext_err)
            fallback_layout = {
                "icao": icao,
                "name": apt_name,
                "lat": lat,
                "lon": lon,
                "source": "runways_only",
                "runways": db_runways,
                "taxiways": [],
                "aprons": [],
                "stands": []
            }
            self.save_airport_ground_layout(icao, fallback_layout)
            return {"success": True, "layout": fallback_layout}

    def get_online_network_traffic_atc(self):
        from concurrent.futures import ThreadPoolExecutor
        now = time.time()
        if hasattr(self, "_net_atc_cache") and (now - getattr(self, "_net_atc_ts", 0)) < 55:
            return self._net_atc_cache

        if not hasattr(self, "_global_atc_polygons"):
            self._global_atc_polygons = {
                "LIRR_TWI_APP": [[42.35, 11.55], [42.42, 12.45], [41.95, 12.88], [41.42, 12.65], [41.48, 11.92], [41.88, 11.52]],
                "LIRF_APP": [[42.35, 11.55], [42.42, 12.45], [41.95, 12.88], [41.42, 12.65], [41.48, 11.92], [41.88, 11.52]],
                "LIMM_APP": [[46.05, 8.35], [46.12, 9.45], [45.65, 9.85], [45.18, 9.45], [45.22, 8.42], [45.62, 8.22]],
                "LIMC_APP": [[46.05, 8.35], [46.12, 9.45], [45.65, 9.85], [45.18, 9.45], [45.22, 8.42], [45.62, 8.22]],
                "LIBD_APP": [[41.48, 16.05], [41.58, 16.38], [41.53, 16.72], [41.32, 17.15], [40.92, 17.95], [40.82, 18.28], [40.58, 18.18], [40.48, 18.35], [40.32, 18.42], [40.18, 18.32], [40.25, 18.02], [40.62, 17.42], [40.98, 16.65], [41.02, 16.45], [40.82, 16.32], [40.80, 15.95], [40.95, 15.72], [41.15, 15.88], [41.28, 16.18]],
                "LIBR_APP": [[41.48, 16.05], [41.58, 16.38], [41.53, 16.72], [41.32, 17.15], [40.92, 17.95], [40.82, 18.28], [40.58, 18.18], [40.48, 18.35], [40.32, 18.42], [40.18, 18.32], [40.25, 18.02], [40.62, 17.42], [40.98, 16.65], [41.02, 16.45], [40.82, 16.32], [40.80, 15.95], [40.95, 15.72], [41.15, 15.88], [41.28, 16.18]],
                "ESSA_TWR": [[59.83, 17.70], [59.83, 18.08], [59.62, 18.22], [59.52, 17.95], [59.52, 17.75], [59.60, 17.63]]
            }
            cache_file = os.path.join(os.path.expanduser("~"), ".aeroglass_nav", "world_atc_polygons_v2.json")
            if os.path.isfile(cache_file):
                try:
                    with open(cache_file, "r", encoding="utf-8") as cf:
                        loaded = json.load(cf)
                        if isinstance(loaded, dict):
                            self._global_atc_polygons.update(loaded)
                except Exception:
                    pass

            def _load_world_polygons_bg():
                import gzip
                urls = [
                    ("APP", "https://raw.githubusercontent.com/vatsimnetwork/simaware-tracon-project/main/TRACONBoundaries.geojson"),
                    ("CTR", "https://raw.githubusercontent.com/vatsimnetwork/vatspy-data-project/master/Boundaries.geojson")
                ]
                updated = False
                for role_type, u in urls:
                    try:
                        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0", "Accept-Encoding": "gzip"})
                        with urllib.request.urlopen(req, timeout=15) as resp:
                            raw = resp.read()
                            if resp.info().get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
                                raw = gzip.decompress(raw)
                            gj = json.loads(raw.decode("utf-8", errors="replace"))
                        for feat in gj.get("features", []):
                            props = feat.get("properties") or {}
                            geom = feat.get("geometry") or {}
                            coords = geom.get("coordinates") or []
                            gtype = geom.get("type", "")
                            ring = None
                            if gtype == "Polygon" and coords and len(coords[0]) >= 3:
                                step = max(1, len(coords[0]) // 120)
                                ring = [[round(float(pt[1]), 4), round(float(pt[0]), 4)] for pt in coords[0][::step]]
                            elif gtype == "MultiPolygon" and coords:
                                longest = max((r[0] for r in coords if r and r[0]), key=len, default=[])
                                if len(longest) >= 3:
                                    step = max(1, len(longest) // 120)
                                    ring = [[round(float(pt[1]), 4), round(float(pt[0]), 4)] for pt in longest[::step]]
                            if not ring or len(ring) < 3:
                                continue

                            raw_keys = []
                            for field in ("id", "label"):
                                if props.get(field):
                                    raw_keys.append(str(props[field]).upper().strip())
                            pfx_val = props.get("prefix")
                            if isinstance(pfx_val, list):
                                raw_keys.extend(str(p).upper().strip() for p in pfx_val)
                            elif pfx_val:
                                raw_keys.append(str(pfx_val).upper().strip())

                            for rk in raw_keys:
                                norm_key = rk.replace("-", "_").strip()
                                base = norm_key.split("_")[0].strip()
                                if not base:
                                    continue
                                self._global_atc_polygons[f"{norm_key}_{role_type}"] = ring
                                if f"{base}_{role_type}" not in self._global_atc_polygons:
                                    self._global_atc_polygons[f"{base}_{role_type}"] = ring
                                if len(base) == 3:
                                    self._global_atc_polygons[f"K{base}_{role_type}"] = ring
                                updated = True
                    except Exception:
                        pass

                if updated:
                    try:
                        os.makedirs(os.path.dirname(cache_file), exist_ok=True)
                        with open(cache_file, "w", encoding="utf-8") as cf:
                            json.dump(self._global_atc_polygons, cf)
                        self._net_atc_ts = 0
                    except Exception:
                        pass

            if len(self._global_atc_polygons) < 200:
                threading.Thread(target=_load_world_polygons_bg, daemon=True).start()

        ATC_POLYGONS = self._global_atc_polygons

        FIR_CENTERS = {
            "LIPP": (45.406, 11.876, "Padova ACC"),
            "LIMM": (45.462, 9.278, "Milano ACC"),
            "LIRR": (41.799, 12.594, "Roma ACC"),
            "LIBB": (40.658, 17.947, "Brindisi ACC"),
            "LSAG": (46.238, 6.109, "Geneva ACC"),
            "LSAZ": (47.458, 8.548, "Zurich ACC"),
            "LFMM": (43.439, 5.214, "Marseille ACC"),
            "LFFF": (48.726, 2.365, "Paris ACC"),
            "LFEE": (48.538, 7.628, "Reims ACC"),
            "LFBB": (44.828, -0.715, "Bordeaux ACC"),
            "LFRR": (48.447, -4.418, "Brest ACC"),
            "EDMM": (48.354, 11.786, "Muenchen ACC"),
            "EDGG": (50.033, 8.571, "Langen ACC"),
            "EDUU": (49.009, 8.404, "Rhein UAC"),
            "EDWW": (53.047, 8.787, "Bremen ACC"),
            "LOVV": (48.110, 16.570, "Wien ACC"),
            "LDZO": (45.743, 16.069, "Zagreb ACC"),
            "LJLA": (46.224, 14.458, "Ljubljana ACC"),
            "EGTT": (51.470, -0.454, "London Control"),
            "LECB": (41.297, 2.078, "Barcelona ACC"),
            "LECM": (40.472, -3.561, "Madrid ACC"),
            "LGAV": (37.936, 23.944, "Athinai ACC"),
            "EURM": (50.901, 5.762, "Maastricht UAC"),
        }

        pilots, controllers, raw_atcs = [], [], []

        def fetch_vatsim():
            v_pilots, v_atcs = [], []
            try:
                req = urllib.request.Request(
                    "https://data.vatsim.net/v3/vatsim-data.json",
                    headers={"User-Agent": "AeroGlass-Nav/0.7"}
                )
                with urllib.request.urlopen(req, timeout=6) as resp:
                    data = json.loads(resp.read().decode("utf-8", errors="replace"))
                for p in data.get("pilots", []):
                    lat, lon = p.get("latitude"), p.get("longitude")
                    if lat is not None and lon is not None:
                        v_pilots.append({
                            "callsign": p.get("callsign", "N/A"),
                            "lat": float(lat),
                            "lon": float(lon),
                            "alt": int(p.get("altitude", 0)),
                            "gs": int(p.get("groundspeed", 0)),
                            "hdg": int(p.get("heading", 0)),
                            "network": "vatsim"
                        })
                for c in data.get("controllers", []):
                    cs = str(c.get("callsign") or "").strip().upper()
                    freq = str(c.get("frequency") or "").strip()
                    if not cs or "_" not in cs or c.get("facility") == 0:
                        continue
                    try:
                        f_val = float(freq)
                        if not (118.0 <= f_val <= 137.0):
                            continue
                    except Exception:
                        continue
                    suffix = cs.split("_")[-1]
                    if suffix not in ("TWR", "APP", "DEP", "CTR"):
                        continue
                    prefix = cs.split("_")[0][:4]
                    v_atcs.append({
                        "callsign": cs,
                        "prefix": prefix,
                        "role": "APP" if suffix == "DEP" else suffix,
                        "freq": freq,
                        "lat": None,
                        "lon": None,
                        "network": "vatsim"
                    })
            except Exception:
                pass
            return v_pilots, v_atcs

        def fetch_ivao():
            i_pilots, i_atcs = [], []
            try:
                import gzip
                req = urllib.request.Request(
                    "https://api.ivao.aero/v2/tracker/whazzup",
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip"
                    }
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    raw_bytes = resp.read()
                    if resp.info().get("Content-Encoding") == "gzip" or raw_bytes[:2] == b"\x1f\x8b":
                        raw_bytes = gzip.decompress(raw_bytes)
                    data = json.loads(raw_bytes.decode("utf-8", errors="replace"))
                clients = data.get("clients", {})
                for p in clients.get("pilots", []):
                    tr = p.get("lastTrack") or {}
                    lat, lon = tr.get("latitude"), tr.get("longitude")
                    if lat is not None and lon is not None:
                        i_pilots.append({
                            "callsign": p.get("callsign", "N/A"),
                            "lat": float(lat),
                            "lon": float(lon),
                            "alt": int(tr.get("altitude", 0)),
                            "gs": int(tr.get("groundSpeed", 0)),
                            "hdg": int(tr.get("heading", 0)),
                            "network": "ivao"
                        })
                for c in clients.get("atcs", []):
                    cs = str(c.get("callsign") or "").strip().upper()
                    sess = c.get("atcSession") or {}
                    freq = sess.get("frequency")
                    if not cs or not freq or "_" not in cs:
                        continue
                    if c.get("isBooked") or sess.get("isBooked") or str(c.get("state", "")).lower() == "booked":
                        continue
                    try:
                        f_val = float(freq)
                        if not (118.0 <= f_val <= 137.0):
                            continue
                        freq_str = "%.3f" % f_val
                    except Exception:
                        continue
                    suffix = cs.split("_")[-1]
                    if suffix not in ("TWR", "APP", "DEP", "CTR"):
                        continue
                    tr = c.get("lastTrack") or {}
                    if not tr or (tr.get("latitude") is None and tr.get("longitude") is None):
                        continue
                    lat, lon = tr.get("latitude"), tr.get("longitude")
                    prefix = cs.split("_")[0][:4]

                    poly = None
                    for src_obj in (c.get("atcPosition"), c.get("subcenter"), c.get("atcSession"), c):
                        if not isinstance(src_obj, dict):
                            continue
                        reg_map = src_obj.get("regionMapPolygon") or src_obj.get("regionMap") or src_obj.get("polygon")
                        if isinstance(reg_map, list) and len(reg_map) >= 3:
                            parsed_poly = []
                            for pt in reg_map:
                                if isinstance(pt, dict):
                                    plat = pt.get("lat") if pt.get("lat") is not None else pt.get("latitude")
                                    plon = pt.get("lng") if pt.get("lng") is not None else (pt.get("lon") if pt.get("lon") is not None else pt.get("longitude"))
                                    if plat is not None and plon is not None:
                                        parsed_poly.append([round(float(plat), 4), round(float(plon), 4)])
                                elif isinstance(pt, (list, tuple)) and len(pt) >= 2:
                                    parsed_poly.append([round(float(pt[0]), 4), round(float(pt[1]), 4)])
                            if len(parsed_poly) >= 3:
                                poly = parsed_poly
                                break

                    role_norm = "APP" if suffix == "DEP" else suffix
                    if poly and prefix:
                        ATC_POLYGONS[f"{cs}"] = poly
                        ATC_POLYGONS[f"{prefix}_{role_norm}"] = poly
                        if prefix not in ATC_POLYGONS:
                            ATC_POLYGONS[prefix] = poly

                    i_atcs.append({
                        "callsign": cs,
                        "prefix": prefix,
                        "role": role_norm,
                        "freq": freq_str,
                        "lat": float(lat) if lat is not None else None,
                        "lon": float(lon) if lon is not None else None,
                        "polygon": poly,
                        "network": "ivao"
                    })
            except Exception:
                pass
            return i_pilots, i_atcs

        with ThreadPoolExecutor(max_workers=2) as ex:
            f_vat = ex.submit(fetch_vatsim)
            f_iva = ex.submit(fetch_ivao)
            vp, va = f_vat.result()
            ip, ia = f_iva.result()
            pilots.extend(vp)
            pilots.extend(ip)
            raw_atcs.extend(va)
            raw_atcs.extend(ia)

        needed_prefixes = list(set(a["prefix"] for a in raw_atcs if a["prefix"]))
        apt_coords = {}
        apt_hdgs = {}
        if needed_prefixes:
            try:
                with self._db_lock:
                    with get_connection() as conn:
                        placeholders = ",".join(["?"] * len(needed_prefixes))
                        sql_q = "SELECT icao, name, lat, lon FROM world_airports WHERE icao IN (" + placeholders + ")"
                        rows = conn.execute(sql_q, needed_prefixes).fetchall()
                        for r in rows:
                            apt_coords[r["icao"]] = (float(r["lat"]), float(r["lon"]), r["name"])
                        sql_rwy = "SELECT apt_icao, le_hdg FROM world_runways WHERE apt_icao IN (" + placeholders + ") AND le_hdg IS NOT NULL"
                        for rw in conn.execute(sql_rwy, needed_prefixes).fetchall():
                            if rw["apt_icao"] not in apt_hdgs and rw["le_hdg"]:
                                apt_hdgs[rw["apt_icao"]] = float(rw["le_hdg"])
            except Exception:
                pass

        for a in raw_atcs:
            pfx = a["prefix"]
            cs_full = a["callsign"]
            role_t = a["role"]
            lat, lon = a["lat"], a["lon"]
            name = pfx
            if pfx in apt_coords:
                lat, lon, name = apt_coords[pfx]
            elif pfx in FIR_CENTERS:
                lat, lon, name = FIR_CENTERS[pfx]

            cs_no_role = "_".join(cs_full.split("_")[:-1])
            poly = (
                a.get("polygon")
                or ATC_POLYGONS.get(cs_full)
                or ATC_POLYGONS.get(f"{cs_no_role}_{role_t}")
                or ATC_POLYGONS.get(f"{pfx}_{role_t}")
                or ATC_POLYGONS.get(f"{pfx[:3]}_{role_t}")
            )

            if poly and (lat is None or lon is None):
                lat = sum(p[0] for p in poly) / len(poly)
                lon = sum(p[1] for p in poly) / len(poly)

            if lat is not None and lon is not None:
                controllers.append({
                    "callsign": a["callsign"],
                    "name": name,
                    "role": a["role"],
                    "freq": a["freq"],
                    "lat": lat,
                    "lon": lon,
                    "polygon": poly,
                    "network": a["network"]
                })

        res = {"success": True, "pilots": pilots, "controllers": controllers}
        self._net_atc_cache = res
        self._net_atc_ts = now
        return res

    def save_simbrief_id(self, simbrief_id):
        return self.save_setting("simbrief_id", simbrief_id)

    def save_active_flight_plan(self, flight_plan, alternate=None):
        try:
            self.flight_plan = flight_plan or []
            new_sig = json.dumps({"fpl": self.flight_plan, "alt": alternate}, sort_keys=True)
            self.save_setting("active_flight_plan", json.dumps(self.flight_plan))
            self.save_setting("active_alternate", json.dumps(alternate) if alternate else "")
            if new_sig != self._last_saved_fpl_sig:
                self._last_saved_fpl_sig = new_sig
                self._fpl_ts = time.time()
            return {"success": True, "fpl_ts": self._fpl_ts}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_user_waypoints(self):
        try:
            with self._db_lock:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT ident, name, lat, lon, alt_ft, type FROM user_waypoints ORDER BY id ASC")
                    rows = cursor.fetchall()
                    waypoints = [dict(row) for row in rows]
                    return {"success": True, "waypoints": waypoints}
        except Exception as e:
            return {"success": False, "waypoints": [], "error": str(e)}

    def save_user_waypoints(self, waypoints):
        try:
            with self._db_lock:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("DELETE FROM user_waypoints")
                    for wp in (waypoints or []):
                        cursor.execute("""
                            INSERT OR REPLACE INTO user_waypoints (ident, name, lat, lon, alt_ft, type)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (
                            str(wp.get("ident", "")).upper(),
                            wp.get("name", "User Waypoint"),
                            float(wp.get("lat", 0.0)),
                            float(wp.get("lon", 0.0)),
                            int(wp.get("alt_ft", 5000)),
                            wp.get("type", "USER")
                        ))
                    conn.commit()
            self._fpl_ts = time.time()
            return {"success": True, "fpl_ts": self._fpl_ts}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_flight_history(self):
        try:
            with self._db_lock:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT id, date, aircraft, departure, destination, distance_nm, fuel_used_gal
                        FROM flight_history ORDER BY id DESC
                    """)
                    rows = cursor.fetchall()
                    return {"success": True, "history": [dict(r) for r in rows]}
        except Exception as e:
            return {"success": False, "history": [], "error": str(e)}

    def add_flight_record(self, aircraft, departure, destination, distance_nm, fuel_used_gal=0.0):
        try:
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            with self._db_lock:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO flight_history (date, aircraft, departure, destination, distance_nm, fuel_used_gal)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        now_str,
                        str(aircraft or "MSFS 2024").strip(),
                        str(departure or "---").strip().upper(),
                        str(destination or "---").strip().upper(),
                        round(float(distance_nm or 0.0), 1),
                        round(float(fuel_used_gal or 0.0), 1)
                    ))
                    conn.commit()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_flight_record(self, record_id):
        try:
            with self._db_lock:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("DELETE FROM flight_history WHERE id = ?", (int(record_id),))
                    conn.commit()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def fetch_simbrief_plan(self):
        res = self.get_setting("simbrief_id")
        sb_id = res.get("value") if res.get("success") else None
        if not sb_id:
            return {"success": False, "error": "SimBrief User ID mancante."}

        url = f"https://www.simbrief.com/api/xml.fetcher.php?userid={sb_id}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AeroGlassNav/1.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                xml_data = response.read()

            root = ET.fromstring(xml_data)
            fpl = []

            origin = root.find("origin")
            dep_rwy = ""
            if origin is not None:
                dep_rwy = (origin.findtext("plan_rwy") or "").strip()
                fpl.append({
                    "ident": origin.findtext("icao_code", "DEP"),
                    "name": origin.findtext("name", "Departure Airport"),
                    "lat": float(origin.findtext("pos_lat", 0.0)),
                    "lon": float(origin.findtext("pos_long", 0.0)),
                    "alt_ft": int(float(origin.findtext("elevation", 0))),
                    "type": "DEP",
                    "rwy": dep_rwy,
                    "proc_type": "SID",
                    "proc_name": f"RWY {dep_rwy}" if dep_rwy else "DEP",
                    "metar": origin.findtext("metar", "")
                })

            navlog = root.find("navlog")
            if navlog is not None:
                for fix in navlog.findall("fix"):
                    ident = fix.findtext("ident", "")
                    if not ident or ident in ("TOC", "TOD", "TIMECLIMB", "TIMECRUIS", "TIMEDSCNT"):
                        continue
                    if fpl and fpl[-1]["ident"] == ident:
                        continue

                    via = (fix.findtext("via_airway") or "").strip()
                    is_sid_star = (fix.findtext("is_sid_star") or "0").strip() == "1"
                    stage = (fix.findtext("stage") or "").strip().upper()

                    proc_type = "ENR"
                    if is_sid_star or via.upper().startswith("SID") or via.upper().startswith("STAR"):
                        if stage == "CLB" or via.upper().startswith("SID"):
                            proc_type = "SID"
                        else:
                            proc_type = "STAR"

                    w_dir = int(float(fix.findtext("wind_dir", 0) or 0))
                    w_spd = int(float(fix.findtext("wind_spd", 0) or 0))

                    fpl.append({
                        "ident": ident,
                        "name": fix.findtext("name", "Waypoint"),
                        "lat": float(fix.findtext("pos_lat", 0.0)),
                        "lon": float(fix.findtext("pos_long", 0.0)),
                        "alt_ft": int(float(fix.findtext("altitude_feet", 5000))),
                        "type": fix.findtext("type", "WPT"),
                        "proc_type": proc_type,
                        "proc_name": via if via and via != "DCT" else proc_type,
                        "wind_dir": w_dir,
                        "wind_spd": w_spd
                    })

            destination = root.find("destination")
            if destination is not None:
                dest_ident = destination.findtext("icao_code", "DEST")
                dest_rwy = (destination.findtext("plan_rwy") or "").strip()
                dest_obj = {
                    "ident": dest_ident,
                    "name": destination.findtext("name", "Destination Airport"),
                    "lat": float(destination.findtext("pos_lat", 0.0)),
                    "lon": float(destination.findtext("pos_long", 0.0)),
                    "alt_ft": int(float(destination.findtext("elevation", 0))),
                    "type": "DEST",
                    "rwy": dest_rwy,
                    "proc_type": "APPR",
                    "proc_name": f"APPR RWY {dest_rwy}" if dest_rwy else "APPR",
                    "metar": destination.findtext("metar", "")
                }
                if fpl and fpl[-1]["ident"] == dest_ident:
                    fpl[-1] = dest_obj
                else:
                    fpl.append(dest_obj)

            alt_node = root.find("alternate")
            alternate = None
            if alt_node is not None and alt_node.findtext("icao_code"):
                alternate = {
                    "ident": alt_node.findtext("icao_code"),
                    "name": alt_node.findtext("name", "Alternate"),
                    "lat": float(alt_node.findtext("pos_lat", 0.0)),
                    "lon": float(alt_node.findtext("pos_long", 0.0))
                }

            self.save_active_flight_plan(fpl, alternate)
            return {"success": True, "flight_plan": fpl, "alternate": alternate, "fpl_ts": self._fpl_ts}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def load_pln_file(self):
        if not self._window:
            return {"success": False, "error": "Finestra non inizializzata"}
        try:
            file_types = ('Flight Plan Files (*.pln)', 'All files (*.*)')
            result = self._window.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=file_types)
            if result and len(result) > 0:
                file_path = result[0]
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    xml_text = f.read()
                return {"success": True, "xml_text": xml_text, "path": file_path}
            return {"success": False, "error": "Nessun file selezionato"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def export_pln_file(self, flight_plan):
        try:
            if not flight_plan or len(flight_plan) < 2:
                return {"success": False, "error": "Piano di volo non valido"}

            dep = flight_plan[0]["ident"]
            dest = flight_plan[-1]["ident"]
            downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
            os.makedirs(downloads_dir, exist_ok=True)
            file_path = os.path.join(downloads_dir, f"{dep}_{dest}.pln")

            max_alt = max(int(wp.get("alt_ft", 5000)) for wp in flight_plan)

            def to_dms(val, is_lat):
                hemi = ('N' if val >= 0 else 'S') if is_lat else ('E' if val >= 0 else 'W')
                v = abs(float(val))
                deg = int(v)
                rem = (v - deg) * 60
                mins = int(rem)
                secs = (rem - mins) * 60
                return f"{hemi}{deg}° {mins}' {secs:.2f}\""

            lines = [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<SimBase.Document Type="AceXML" version="1,0">',
                '    <Descr>AceXML Document</Descr>',
                '    <FlightPlan.FlightPlan>',
                f'        <Title>{dep} to {dest}</Title>',
                '        <FPType>IFR</FPType>',
                f'        <CruisingAlt>{max_alt}</CruisingAlt>',
                f'        <DepartureID>{dep}</DepartureID>',
                f'        <DestinationID>{dest}</DestinationID>'
            ]

            for wp in flight_plan:
                ident = wp.get("ident", "WPT")
                lat = float(wp.get("lat", 0.0))
                lon = float(wp.get("lon", 0.0))
                alt = int(wp.get("alt_ft", 0))
                wpos = f"{to_dms(lat, True)},{to_dms(lon, False)},+{alt:06d}.00"
                wtype = "Airport" if wp.get("type") in ("DEP", "DEST", "APT") else "Intersection"
                lines.extend([
                    f'        <ATCWaypoint id="{ident}">',
                    f'            <ATCWaypointType>{wtype}</ATCWaypointType>',
                    f'            <WorldPosition>{wpos}</WorldPosition>',
                    '            <ICAO>',
                    f'                <ICAOIdent>{ident}</ICAOIdent>',
                    '            </ICAO>',
                    '        </ATCWaypoint>'
                ])

            lines.extend([
                '    </FlightPlan.FlightPlan>',
                '</SimBase.Document>'
            ])

            with open(file_path, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))

            return {"success": True, "path": file_path}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def update_waypoint_altitude(self, index, new_alt):
        try:
            idx = int(index)
            if 0 <= idx < len(self.flight_plan):
                self.flight_plan[idx]["alt_ft"] = int(new_alt)
                self.save_setting("active_flight_plan", json.dumps(self.flight_plan))
                self._fpl_ts = time.time()
            return {"success": True, "fpl_ts": self._fpl_ts}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def clear_flight_plan(self):
        self.flight_plan = []
        self._last_saved_fpl_sig = ""
        self.save_setting("active_flight_plan", "")
        self.save_setting("active_alternate", "")
        self._fpl_ts = time.time()
        return {"success": True, "fpl_ts": self._fpl_ts}

    def get_online_network_traffic(self):
        now = time.time()
        if hasattr(self, "_cached_network_data") and hasattr(self, "_net_fetch_time"):
            if (now - self._net_fetch_time) < 60.0:
                return self._cached_network_data

        pilots = []
        controllers = []

        try:
            vatsim_url = "https://data.vatsim.net/v3/vatsim-data.json"
            req = urllib.request.Request(vatsim_url, headers={"User-Agent": "AeroGlassNav/1.0"})
            with urllib.request.urlopen(req, timeout=4) as resp:
                v_data = json.loads(resp.read().decode("utf-8"))
                for p in v_data.get("pilots", []):
                    lat, lon = p.get("latitude"), p.get("longitude")
                    if lat is not None and lon is not None:
                        pilots.append({
                            "callsign": p.get("callsign"),
                            "name": p.get("name"),
                            "lat": lat,
                            "lon": lon,
                            "alt": p.get("altitude"),
                            "gs": p.get("groundspeed"),
                            "hdg": p.get("heading"),
                            "network": "vatsim"
                        })
        except Exception:
            pass

        try:
            import gzip
            ivao_url = "https://api.ivao.aero/v2/tracker/whazzup"
            req = urllib.request.Request(
                ivao_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip"
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw_bytes = resp.read()
                if resp.info().get("Content-Encoding") == "gzip" or raw_bytes[:2] == b"\x1f\x8b":
                    raw_bytes = gzip.decompress(raw_bytes)
                i_data = json.loads(raw_bytes.decode("utf-8", errors="replace"))
                clients = i_data.get("clients", {})
                pilot_list = clients.get("pilots", []) if isinstance(clients, dict) else clients
                for p in pilot_list:
                    lat = p.get("latitude") or (p.get("lastTrack") or {}).get("latitude")
                    lon = p.get("longitude") or (p.get("lastTrack") or {}).get("longitude")
                    callsign = p.get("callsign") or (p.get("user") or {}).get("callsign")
                    alt = p.get("altitude") or (p.get("lastTrack") or {}).get("altitude")
                    gs = p.get("groundspeed") or (p.get("lastTrack") or {}).get("groundspeed")
                    hdg = p.get("heading") or (p.get("lastTrack") or {}).get("heading")

                    if lat is not None and lon is not None:
                        pilots.append({
                            "callsign": callsign,
                            "name": p.get("name"),
                            "lat": lat,
                            "lon": lon,
                            "alt": alt,
                            "gs": gs,
                            "hdg": hdg,
                            "network": "ivao"
                        })
        except Exception:
            pass

        result = {
            "success": True,
            "controllers": controllers,
            "pilots": pilots,
            "timestamp": now
        }
        self._cached_network_data = result
        self._net_fetch_time = now
        return result

    def get_telemetry(self):
        try:
            data = dict(self._telemetry.get_data())
        except Exception:
            data = dict(DummyTelemetry().get_data())

        # Filtra le coordinate dummy (0°, 0° o 0°, 80°E nell'Oceano Indiano) inviate da MSFS 2024 nel Menu Principale
        lat = data.get("lat")
        lon = data.get("lon")
        if lat is not None and lon is not None:
            try:
                f_lat, f_lon = float(lat), float(lon)
                is_zero_origin = (abs(f_lat) < 0.1 and abs(f_lon) < 0.1)
                is_msfs_menu_ocean = (-4.0 <= f_lat <= 4.0 and 77.0 <= f_lon <= 83.0 and str(data.get("aircraft") or "").strip() in ("MSFS 2024", "MSFS", ""))
                if is_zero_origin or is_msfs_menu_ocean:
                    data["lat"] = None
                    data["lon"] = None
                    data["connected"] = False
                    data["mode"] = "DEMO"
            except Exception:
                pass

        data["fpl_ts"] = self._fpl_ts
        data["efb_ip"] = self.efb_ip
        data["efb_port"] = self.efb_port
        return data

    def close_app(self):
        if self._window:
            self._window.destroy()

    def minimize_app(self):
        if self._window:
            self._window.minimize()

    def toggle_maximize_app(self):
        if self._window:
            self._window.toggle_fullscreen()

    def open_external_gemini(self, query=""):
        """Copia la query negli appunti di Windows e apre la pagina web di Gemini nel browser."""
        try:
            import webbrowser
            import subprocess
            if query:
                subprocess.run(['clip.exe'], input=str(query).strip().encode('utf-8'), check=False)
            webbrowser.open("https://gemini.google.com")
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}