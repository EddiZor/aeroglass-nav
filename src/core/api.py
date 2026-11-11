import os
import json
import urllib.request
import xml.etree.ElementTree as ET
import webview
from datetime import datetime
from src.core.database import init_db, get_connection

try:
    from src.simconnect.telemetry import TelemetryManager
except ImportError:
    TelemetryManager = None

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
        self.flight_plan = []
        
        # 1. Inizializza il database SQLite all'avvio
        init_db()
        
        # 2. Avvia il gestore della telemetria SimConnect
        if TelemetryManager:
            try:
                self._telemetry = TelemetryManager()
            except Exception:
                self._telemetry = DummyTelemetry()
        else:
            self._telemetry = DummyTelemetry()

# --- DATI INIZIALI E IMPOSTAZIONI (SQLITE) ---
    def get_initial_data(self):
        """Restituisce i dati iniziali all'avvio della UI, inclusi nav_cache.json, SimBrief ID e ultimo piano di volo."""
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

        airports, vors, ils = [], [], []
        cache_path = os.path.join(os.path.abspath("."), "nav_cache.json")
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    cache_data = json.load(f)
                if isinstance(cache_data, dict):
                    airports = cache_data.get("airports", [])
                    vors = cache_data.get("vors", [])
                    ils = cache_data.get("ils", [])
                elif isinstance(cache_data, list):
                    airports = cache_data
            except Exception:
                pass

        self.flight_plan = saved_fpl

        return {
            "airports": airports,
            "vors": vors,
            "ils": ils,
            "simbrief_id": simbrief_id or "",
            "flight_plan": saved_fpl,
            "alternate": saved_alt
        }

    def resolve_icao(self, ident):
        """Risolve coordinate, quota e METAR di qualsiasi aeroporto ICAO (locale o via API AviationWeather)."""
        code = str(ident or "").strip().upper()
        if not code:
            return {"success": False}

        # 1. Hub principali europei di fallback immediato
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

        result = None
        if code in hub_airports:
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

        # 2. Ricerca live tramite API AviationWeather (coordinate + METAR aggiornato per qualsiasi ICAO mondiale)
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

        # 3. Fallback su endpoint anagrafica aeroporti AviationWeather se non ha METAR attivo
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
            return result
        return {"success": False}

    def get_setting(self, key):
        """Recupera un'impostazione dalla tabella settings di SQLite."""
        try:
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

    def save_simbrief_id(self, simbrief_id):
        """Metodo ponte chiamato da flightplan.js per salvare il SimBrief User ID."""
        return self.save_setting("simbrief_id", simbrief_id)

    def save_active_flight_plan(self, flight_plan, alternate=None):
        """Salva il piano di volo corrente e l'alternato in SQLite per ricaricarli al prossimo avvio."""
        try:
            self.flight_plan = flight_plan or []
            self.save_setting("active_flight_plan", json.dumps(self.flight_plan))
            self.save_setting("active_alternate", json.dumps(alternate) if alternate else "")
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # --- WAYPOINTS UTENTE CUSTOM (SQLITE) ---
    def get_user_waypoints(self):
        """Restituisce tutti i waypoint personalizzati salvati nel DB SQLite."""
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT ident, name, lat, lon, alt_ft, type FROM user_waypoints ORDER BY id ASC")
                rows = cursor.fetchall()
                waypoints = [dict(row) for row in rows]
                return {"success": True, "waypoints": waypoints}
        except Exception as e:
            return {"success": False, "waypoints": [], "error": str(e)}

    def save_user_waypoints(self, waypoints):
        """Sincronizza la lista dei waypoint utente nel DB SQLite."""
        try:
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
            return {"success": True}
        except Exception as e:
            print("Errore save_user_waypoints:", e)
            return {"success": False, "error": str(e)}

    # --- STORICO VOLI E FUEL LOG (SQLITE) ---
    def get_flight_history(self):
        """Restituisce lo storico dei voli registrati nel DB SQLite."""
        try:
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
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO flight_history (date, aircraft, departure, destination, distance_nm, fuel_used_gal)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (now_str, aircraft, departure, destination, float(distance_nm), float(fuel_used_gal)))
                conn.commit()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # --- GESTIONE PIANO DI VOLO E SIMBRIEF ---
    def fetch_simbrief_plan(self):
        """Scarica l'ultimo OFP da SimBrief usando il SimBrief ID salvato in SQLite."""
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
            if origin is not None:
                fpl.append({
                    "ident": origin.findtext("icao_code", "DEP"),
                    "name": origin.findtext("name", "Departure Airport"),
                    "lat": float(origin.findtext("pos_lat", 0.0)),
                    "lon": float(origin.findtext("pos_long", 0.0)),
                    "alt_ft": int(float(origin.findtext("elevation", 0))),
                    "type": "DEP",
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
                    fpl.append({
                        "ident": ident,
                        "name": fix.findtext("name", "Waypoint"),
                        "lat": float(fix.findtext("pos_lat", 0.0)),
                        "lon": float(fix.findtext("pos_long", 0.0)),
                        "alt_ft": int(float(fix.findtext("altitude_feet", 5000))),
                        "type": fix.findtext("type", "WPT")
                    })

            destination = root.find("destination")
            if destination is not None:
                dest_ident = destination.findtext("icao_code", "DEST")
                dest_obj = {
                    "ident": dest_ident,
                    "name": destination.findtext("name", "Destination Airport"),
                    "lat": float(destination.findtext("pos_lat", 0.0)),
                    "lon": float(destination.findtext("pos_long", 0.0)),
                    "alt_ft": int(float(destination.findtext("elevation", 0))),
                    "type": "DEST",
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
            return {"success": True, "flight_plan": fpl, "alternate": alternate}
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
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def clear_flight_plan(self):
        """Svuota il piano di volo attivo in memoria e su SQLite."""
        self.flight_plan = []
        self.save_setting("active_flight_plan", "")
        self.save_setting("active_alternate", "")
        return {"success": True}

    # --- TELEMETRIA E CONTROLLI FINESTRA ---
    def get_telemetry(self):
        """Restituisce i dati di telemetria istantanei al frontend."""
        try:
            return self._telemetry.get_data()
        except Exception:
            return DummyTelemetry().get_data()

    def close_app(self):
        if self._window:
            self._window.destroy()

    def minimize_app(self):
        if self._window:
            self._window.minimize()

    def toggle_maximize_app(self):
        if self._window:
            self._window.toggle_fullscreen()

    # --- STORICO VOLI E FUEL LOG (SQLITE) ---
    def get_flight_history(self):
        """Restituisce lo storico dei voli registrati nel DB SQLite."""
        try:
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
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO flight_history (date, aircraft, departure, destination, distance_nm, fuel_used_gal)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (now_str, aircraft, departure, destination, float(distance_nm), float(fuel_used_gal)))
                conn.commit()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # --- GESTIONE PIANO DI VOLO E SIMBRIEF ---
    def fetch_simbrief_plan(self):
        """Scarica l'ultimo OFP da SimBrief usando il SimBrief ID salvato in SQLite."""
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
            if origin is not None:
                fpl.append({
                    "ident": origin.findtext("icao_code", "DEP"),
                    "name": origin.findtext("name", "Departure Airport"),
                    "lat": float(origin.findtext("pos_lat", 0.0)),
                    "lon": float(origin.findtext("pos_long", 0.0)),
                    "alt_ft": int(float(origin.findtext("elevation", 0))),
                    "type": "DEP",
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
                    fpl.append({
                        "ident": ident,
                        "name": fix.findtext("name", "Waypoint"),
                        "lat": float(fix.findtext("pos_lat", 0.0)),
                        "lon": float(fix.findtext("pos_long", 0.0)),
                        "alt_ft": int(float(fix.findtext("altitude_feet", 5000))),
                        "type": fix.findtext("type", "WPT")
                    })

            destination = root.find("destination")
            if destination is not None:
                dest_ident = destination.findtext("icao_code", "DEST")
                dest_obj = {
                    "ident": dest_ident,
                    "name": destination.findtext("name", "Destination Airport"),
                    "lat": float(destination.findtext("pos_lat", 0.0)),
                    "lon": float(destination.findtext("pos_long", 0.0)),
                    "alt_ft": int(float(destination.findtext("elevation", 0))),
                    "type": "DEST",
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
            return {"success": True, "flight_plan": fpl, "alternate": alternate}
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
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def clear_flight_plan(self):
        """Svuota il piano di volo attivo in memoria e su SQLite."""
        self.flight_plan = []
        self.save_setting("active_flight_plan", "")
        self.save_setting("active_alternate", "")
        return {"success": True}

    # --- TELEMETRIA E CONTROLLI FINESTRA ---
    def get_telemetry(self):
        """Restituisce i dati di telemetria istantanei al frontend."""
        try:
            return self._telemetry.get_data()
        except Exception:
            return DummyTelemetry().get_data()

    def close_app(self):
        if self._window:
            self._window.destroy()

    def minimize_app(self):
        if self._window:
            self._window.minimize()

    def toggle_maximize_app(self):
        if self._window:
            self._window.toggle_fullscreen()

def save_user_waypoints(self, waypoints):
        """Sincronizza la lista dei waypoint utente nel DB SQLite."""
        try:
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
            return {"success": True}
        except Exception as e:
            print("Errore save_user_waypoints:", e)
            return {"success": False, "error": str(e)}
        