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
                # Disabilita log su stderr per compatibilità PyInstaller console=False
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

        # Cerca la porta preferita (es. 8339) o la prima libera successiva (evitando 8080)
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
        """Restituisce IP locale, porta attiva e URL completo per collegare il Tablet EFB."""
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
        """Salva una nuova porta preferita per l'EFB in SQLite (diversa da 8080)."""
        try:
            p = int(new_port)
            if p < 1024 or p > 65535 or p == 8080:
                return {"success": False, "error": "Inserisci una porta compresa tra 1024 e 65535 (diversa da 8080)."}
            self.save_setting("efb_port", str(p))
            return {"success": True, "port": p}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # --- DATI INIZIALI E IMPOSTAZIONI (SQLITE) ---
    def get_initial_data(self):
        """Restituisce i dati iniziali all'avvio della UI, inclusi cache aeroporti SQLite, SimBrief ID, EFB e ultimo piano di volo."""
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
        """Risolve coordinate, quota e METAR di qualsiasi aeroporto ICAO e lo salva nella tabella SQLite cached_airports."""
        code = str(ident or "").strip().upper()
        if not code:
            return {"success": False}

        result = None

        # 1. Controlla prima se l'aeroporto è già presente nel database SQLite
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
        except Exception:
            pass

        # 2. Hub principali europei di fallback immediato
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

        # 3. Ricerca live tramite API AviationWeather (coordinate + METAR aggiornato)
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

        # 4. Fallback su endpoint anagrafica aeroporti AviationWeather se non ha METAR attivo
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

        # 5. Salva o aggiorna l'aeroporto trovato nella tabella SQLite cached_airports
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
        """Recupera un'impostazione dalla tabella settings di SQLite."""
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
        """Salva o aggiorna un'impostazione nella tabella settings di SQLite."""
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

    def set_setting(self, key, value):
        """Alias compatibile per save_setting."""
        return self.save_setting(key, value)

    def save_simbrief_id(self, simbrief_id):
        """Metodo ponte chiamato da flightplan.js per salvare il SimBrief User ID."""
        return self.save_setting("simbrief_id", simbrief_id)

    def save_active_flight_plan(self, flight_plan, alternate=None):
        """Salva il piano di volo corrente e l'alternato in SQLite e aggiorna il timestamp di sync EFB solo se modificato."""
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

    # --- WAYPOINTS UTENTE CUSTOM (SQLITE) ---
    def get_user_waypoints(self):
        """Restituisce tutti i waypoint personalizzati salvati nel DB SQLite."""
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
        """Sincronizza la lista dei waypoint utente nel DB SQLite e aggiorna il timestamp di sync EFB."""
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

    # --- STORICO VOLI E FUEL LOG (SQLITE) ---
    def get_flight_history(self):
        """Restituisce lo storico dei voli registrati nel DB SQLite."""
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
        """Aggiunge un volo completato nello storico SQLite."""
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
        """Elimina un singolo volo dallo storico SQLite."""
        try:
            with self._db_lock:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("DELETE FROM flight_history WHERE id = ?", (int(record_id),))
                    conn.commit()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # --- GESTIONE PIANO DI VOLO E SIMBRIEF ---
    def fetch_simbrief_plan(self):
        """Scarica l'ultimo OFP da SimBrief includendo SID, STAR, aerovie e piste in uso."""
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

                    fpl.append({
                        "ident": ident,
                        "name": fix.findtext("name", "Waypoint"),
                        "lat": float(fix.findtext("pos_lat", 0.0)),
                        "lon": float(fix.findtext("pos_long", 0.0)),
                        "alt_ft": int(float(fix.findtext("altitude_feet", 5000))),
                        "type": fix.findtext("type", "WPT"),
                        "proc_type": proc_type,
                        "proc_name": via if via and via != "DCT" else proc_type
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
        """Apre il selettore file nativo per importare un file .pln."""
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
        """Esporta il piano di volo corrente in formato MSFS .pln nella cartella Download."""
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
        """Aggiorna la quota di un singolo waypoint nel piano di volo e su SQLite."""
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
        """Svuota il piano di volo attivo in memoria e su SQLite."""
        self.flight_plan = []
        self._last_saved_fpl_sig = ""
        self.save_setting("active_flight_plan", "")
        self.save_setting("active_alternate", "")
        self._fpl_ts = time.time()
        return {"success": True, "fpl_ts": self._fpl_ts}

    # --- TELEMETRIA E CONTROLLI FINESTRA ---
    def get_telemetry(self):
        """Restituisce i dati di telemetria istantanei al frontend insieme al timestamp di sync EFB."""
        try:
            data = dict(self._telemetry.get_data())
        except Exception:
            data = dict(DummyTelemetry().get_data())
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