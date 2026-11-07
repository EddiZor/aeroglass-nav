import os
import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import ctypes
from src.simconnect.telemetry import TelemetryManager

_TELEMETRY_INSTANCE = None

def _get_telemetry():
    global _TELEMETRY_INSTANCE
    if _TELEMETRY_INSTANCE is None:
        _TELEMETRY_INSTANCE = TelemetryManager()
    return _TELEMETRY_INSTANCE


class AeroGlassAPI:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self._config_path = os.path.join(base_dir, "config.json")
        self._cache_path = os.path.join(base_dir, "nav_cache.json")
        self._global_apt_path = os.path.join(base_dir, "global_airports.json")
        
        self.nav_cache = self._load_json(self._cache_path, {})
        self.global_airports = self._load_json(self._global_apt_path, {})

        self.airports = [
            {"icao": "LIPX", "name": "Verona Villafranca", "lat": 45.3957, "lon": 10.8885, "elev": 239, "rwy": "04/22", "twr": "118.650", "metar": "LIPX 061650Z 04006KT CAVOK 16/09 Q1018"},
            {"icao": "LIPO", "name": "Brescia Montichiari", "lat": 45.4289, "lon": 10.3306, "elev": 356, "rwy": "14/32", "twr": "118.450", "metar": "LIPO 061650Z 06005KT 9999 FEW040 16/10 Q1018"},
            {"icao": "LIDT", "name": "Trento Mattarello", "lat": 46.0219, "lon": 11.1242, "elev": 607, "rwy": "18/36", "twr": "122.600", "metar": "LIDT 061650Z VRB03KT CAVOK 14/06 Q1019"},
            {"icao": "LIPD", "name": "Udine Campoformido", "lat": 46.0319, "lon": 13.1869, "elev": 308, "rwy": "09/27", "twr": "123.500", "metar": "LIPD 061650Z 05004KT CAVOK 17/08 Q1018"},
            {"icao": "LITY", "name": "Agrigento Valle dei Templi", "lat": 37.2450, "lon": 13.6620, "elev": 145, "rwy": "11/29", "twr": "130.000", "metar": "LITY 061650Z 12008KT CAVOK 22/13 Q1016"},
            {"icao": "LIRF", "name": "Roma Fiumicino", "lat": 41.8003, "lon": 12.2389, "elev": 15, "rwy": "16L/34R", "twr": "118.700", "metar": "LIRF 061650Z 25010KT CAVOK 18/11 Q1018"},
            {"icao": "LIPE", "name": "Bologna Borgo Panigale", "lat": 44.5354, "lon": 11.2887, "elev": 123, "rwy": "12/30", "twr": "118.100", "metar": "LIPE 061650Z 12005KT CAVOK 16/10 Q1018"},
            {"icao": "LIMC", "name": "Milano Malpensa", "lat": 45.6306, "lon": 8.7281, "elev": 768, "rwy": "17/35", "twr": "118.400", "metar": "LIMC 061650Z 35005KT CAVOK 15/08 Q1019"},
            {"icao": "LDZA", "name": "Zagreb Franjo Tudman", "lat": 45.7429, "lon": 16.0688, "elev": 353, "rwy": "04/22", "twr": "118.300", "metar": "LDZA 061650Z 05006KT CAVOK 15/08 Q1019"},
            {"icao": "BIKF", "name": "Keflavik Intl", "lat": 63.9850, "lon": -22.6056, "elev": 171, "rwy": "01/19", "twr": "118.000", "metar": "BIKF 061650Z 04014KT 9999 FEW025 04/M01 Q1012"},
            {"icao": "BGKK", "name": "Kulusuk Airport", "lat": 65.5736, "lon": -37.1236, "elev": 117, "rwy": "10/28", "twr": "118.100", "metar": "BGKK 061650Z 07008KT 9999 SCT030 M03/M08 Q1009"}
        ]

        self.vors = [
            {"ident": "OST", "name": "Ostia VOR-DME", "freq": "114.35", "lat": 41.7917, "lon": 12.2314, "type": "VOR-DME"},
            {"ident": "FLR", "name": "Firenze VOR", "freq": "112.30", "lat": 43.8083, "lon": 11.2014, "type": "VOR"},
            {"ident": "BOL", "name": "Bologna VOR-DME", "freq": "113.10", "lat": 44.5322, "lon": 11.2975, "type": "VOR-DME"},
            {"ident": "VTR", "name": "Viterbo VOR", "freq": "115.70", "lat": 42.4167, "lon": 12.0667, "type": "VOR"}
        ]

        self.ils = [
            {"ident": "IFRM", "rwy": "16L", "name": "ILS-DME Fiumicino RWY 16L", "freq": "109.10", "course": 164, "gs_alt": "3,000 ft", "lat": 41.8210, "lon": 12.2450},
            {"ident": "IFRR", "rwy": "34R", "name": "ILS-DME Fiumicino RWY 34R", "freq": "108.90", "course": 344, "gs_alt": "3,000 ft", "lat": 41.7820, "lon": 12.2310},
            {"ident": "IBOL", "rwy": "12", "name": "ILS Bologna RWY 12", "freq": "109.30", "course": 122, "gs_alt": "2,500 ft", "lat": 44.5420, "lon": 11.2720},
            {"ident": "IVER", "rwy": "04", "name": "ILS Verona RWY 04", "freq": "109.50", "course": 43, "gs_alt": "3,000 ft", "lat": 45.3820, "lon": 10.8710}
        ]
        
        config_data = self._load_config()
        self.simbrief_userid = config_data.get("simbrief_userid", "")
        saved_fpl = config_data.get("flight_plan", [])
        self.alternate = config_data.get("alternate", None)
        
        if saved_fpl:
            self.flight_plan = saved_fpl
        else:
            self.flight_plan = []

    def _load_json(self, path, default):
        try:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return default

    def _save_json(self, path, data):
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    def _load_config(self):
        return self._load_json(self._config_path, {})

    def _save_config(self):
        data = {
            "simbrief_userid": self.simbrief_userid,
            "flight_plan": self.flight_plan,
            "alternate": self.alternate
        }
        self._save_json(self._config_path, data)

    def _ensure_global_airports(self):
        if self.global_airports:
            return
        try:
            url = "https://raw.githubusercontent.com/mwgg/Airports/master/airports.json"
            req = urllib.request.Request(url, headers={"User-Agent": "AeroGlassNav/0.3"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                self.global_airports = json.loads(resp.read().decode("utf-8"))
                self._save_json(self._global_apt_path, self.global_airports)
        except Exception:
            pass

    def _lookup_awc_point(self, ident, wpt_type="WPT"):
        ident = ident.upper().strip()
        if ident in self.nav_cache:
            return self.nav_cache[ident]

        # 1. Cerca nel DB locale degli aeroporti
        apt = next((a for a in self.airports if a["icao"] == ident), None)
        if apt:
            res = {"lat": apt["lat"], "lon": apt["lon"], "name": apt["name"], "elev": apt.get("elev", 0), "metar": apt.get("metar", "")}
            self.nav_cache[ident] = res
            return res

        # 2. Se è un aeroporto (4 lettere o DEP/DEST), cerca via NOAA AWC Airport API o Global Airports JSON
        if wpt_type in ("DEP", "DEST") or len(ident) == 4:
            try:
                url = f"https://aviationweather.gov/api/data/airport?ids={urllib.parse.quote(ident)}&format=json"
                req = urllib.request.Request(url, headers={"User-Agent": "AeroGlassNav/0.3"})
                with urllib.request.urlopen(req, timeout=4) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    if isinstance(data, list) and len(data) > 0:
                        item = data[0]
                        lat = item.get("lat")
                        lon = item.get("lon")
                        if lat is not None and lon is not None:
                            name = item.get("name", ident).title()
                            elev = int(float(item.get("elev", 0)) * 3.28084) if item.get("elev") else 0
                            metar_str = ""
                            try:
                                m_url = f"https://aviationweather.gov/api/data/metar?ids={urllib.parse.quote(ident)}&format=json"
                                m_req = urllib.request.Request(m_url, headers={"User-Agent": "AeroGlassNav/0.3"})
                                with urllib.request.urlopen(m_req, timeout=3) as m_resp:
                                    m_data = json.loads(m_resp.read().decode("utf-8"))
                                    if isinstance(m_data, list) and len(m_data) > 0:
                                        metar_str = m_data[0].get("rawOb", "")
                            except Exception:
                                pass
                            res = {"lat": float(lat), "lon": float(lon), "name": name, "elev": elev, "metar": metar_str}
                            self.nav_cache[ident] = res
                            self._save_json(self._cache_path, self.nav_cache)
                            return res
            except Exception:
                pass

            self._ensure_global_airports()
            if ident in self.global_airports:
                g = self.global_airports[ident]
                res = {
                    "lat": float(g["lat"]),
                    "lon": float(g["lon"]),
                    "name": g.get("name", ident),
                    "elev": int(g.get("elevation", 0)),
                    "metar": ""
                }
                self.nav_cache[ident] = res
                self._save_json(self._cache_path, self.nav_cache)
                return res

        # 3. Cerca come Fix (5 lettere) o Navaid (VOR/NDB 2-3 lettere) su NOAA AWC API
        endpoints = ["fix", "navaid"] if len(ident) == 5 else ["navaid", "fix"]
        for ep in endpoints:
            try:
                url = f"https://aviationweather.gov/api/data/{ep}?ids={urllib.parse.quote(ident)}&format=json"
                req = urllib.request.Request(url, headers={"User-Agent": "AeroGlassNav/0.3"})
                with urllib.request.urlopen(req, timeout=4) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    if isinstance(data, list) and len(data) > 0:
                        # Se ci sono più omonimi nel mondo, vengono filtrati dopo o preso il primo valido
                        item = data[0]
                        lat = item.get("lat")
                        lon = item.get("lon")
                        if lat is not None and lon is not None:
                            res = {
                                "lat": float(lat),
                                "lon": float(lon),
                                "name": item.get("name", "Waypoint Navlog"),
                                "candidates": [{"lat": float(x["lat"]), "lon": float(x["lon"])} for x in data if "lat" in x and "lon" in x]
                            }
                            self.nav_cache[ident] = res
                            self._save_json(self._cache_path, self.nav_cache)
                            return res
            except Exception:
                pass

        return None

    def enrich_flight_plan(self, waypoints):
        if not waypoints or not isinstance(waypoints, list):
            return {"success": False}

        # 1. Risolvi prima gli aeroporti di partenza e destinazione
        for i in [0, len(waypoints) - 1]:
            wp = waypoints[i]
            if wp.get("lat") is None or wp.get("lon") is None:
                info = self._lookup_awc_point(wp["ident"], wp.get("type", "APT"))
                if info:
                    wp["lat"] = info["lat"]
                    wp["lon"] = info["lon"]
                    wp["name"] = info.get("name", wp.get("name", ""))
                    if info.get("metar"):
                        wp["metar"] = info["metar"]
                    if wp.get("alt_ft", 0) == 0 and info.get("elev"):
                        wp["alt_ft"] = info["elev"]

        ref_lat = waypoints[0].get("lat") or 45.0
        ref_lon = waypoints[0].get("lon") or 11.0

        # 2. Risolvi i waypoint intermedi scegliendo il candidato più vicino alla rotta
        for i in range(1, len(waypoints) - 1):
            wp = waypoints[i]
            if wp.get("lat") is None or wp.get("lon") is None:
                info = self._lookup_awc_point(wp["ident"], "WPT")
                if info:
                    candidates = info.get("candidates", [{"lat": info["lat"], "lon": info["lon"]}])
                    best = min(candidates, key=lambda c: (c["lat"] - ref_lat) ** 2 + (c["lon"] - ref_lon) ** 2)
                    # Accetta il candidato solo se coerente con l'area geografica della rotta (< 35 gradi)
                    if ((best["lat"] - ref_lat) ** 2 + (best["lon"] - ref_lon) ** 2) ** 0.5 < 35.0:
                        wp["lat"] = best["lat"]
                        wp["lon"] = best["lon"]
                        ref_lat, ref_lon = best["lat"], best["lon"]

        # 3. Interpolazione lineare tra i punti noti per eventuali fix oceanici/remoti non in database
        last_idx = len(waypoints) - 1
        for i in range(1, last_idx):
            if waypoints[i].get("lat") is None or waypoints[i].get("lon") is None:
                prev_i = i - 1
                while prev_i > 0 and waypoints[prev_i].get("lat") is None:
                    prev_i -= 1
                next_i = i + 1
                while next_i < last_idx and waypoints[next_i].get("lat") is None:
                    next_i += 1
                if waypoints[prev_i].get("lat") is not None and waypoints[next_i].get("lat") is not None:
                    span = next_i - prev_i
                    frac = (i - prev_i) / span
                    waypoints[i]["lat"] = round(waypoints[prev_i]["lat"] + frac * (waypoints[next_i]["lat"] - waypoints[prev_i]["lat"]), 5)
                    waypoints[i]["lon"] = round(waypoints[prev_i]["lon"] + frac * (waypoints[next_i]["lon"] - waypoints[prev_i]["lon"]), 5)

        self.flight_plan = waypoints
        self.alternate = None
        self._save_config()
        return {"success": True, "flight_plan": self.flight_plan, "alternate": None}

    def connect_sim(self):
        return _get_telemetry().connect()

    def get_telemetry(self):
        return _get_telemetry().get_aircraft_data()

    def get_navdata(self):
        return {
            "airports": self.airports,
            "vors": self.vors,
            "ils": self.ils,
            "flight_plan": self.flight_plan,
            "simbrief_userid": self.simbrief_userid,
            "alternate": self.alternate
        }

    def save_simbrief_id(self, userid):
        self.simbrief_userid = str(userid).strip()
        self._save_config()
        return {"success": True}

    def update_waypoint_altitude(self, index, alt_ft):
        try:
            idx = int(index)
            if 0 <= idx < len(self.flight_plan):
                self.flight_plan[idx]["alt_ft"] = int(alt_ft)
                self._save_config()
                return {"success": True, "flight_plan": self.flight_plan}
        except Exception as e:
            return {"success": False, "error": str(e)}
        return {"success": False}

    def clear_flight_plan(self):
        self.flight_plan = []
        self.alternate = None
        self._save_config()
        return {"success": True, "flight_plan": [], "alternate": None}

    def fetch_simbrief_plan(self):
        try:
            if not self.simbrief_userid:
                return {"success": False, "error": "SimBrief User ID non impostato"}
            
            url = f"https://www.simbrief.com/api/xml.fetcher.php?userid={self.simbrief_userid}"
            req = urllib.request.Request(url, headers={'User-Agent': 'AeroGlassNav/0.3'})
            
            with urllib.request.urlopen(req, timeout=10) as response:
                xml_data = response.read()
                
            root = ET.fromstring(xml_data)
            parsed_waypoints = []
            
            def get_coords(elem):
                lat, lon = None, None
                for t in ["lat", "latitude", "pos_lat"]:
                    n = elem.find(t)
                    if n is not None and n.text:
                        try: lat = float(n.text.strip()); break
                        except: pass
                for t in ["lon", "longitude", "pos_long", "long"]:
                    n = elem.find(t)
                    if n is not None and n.text:
                        try: lon = float(n.text.strip()); break
                        except: pass
                return lat, lon

            def get_alt(elem):
                for t in ["altitude_feet", "alt", "altitude"]:
                    n = elem.find(t)
                    if n is not None and n.text:
                        try: return int(float(n.text.strip()))
                        except: pass
                return 5000

            orig = root.find(".//origin")
            if orig is not None:
                icao_node = orig.find("icao_code")
                metar_node = orig.find("metar")
                name_node = orig.find("name")
                lat, lon = get_coords(orig)
                if icao_node is not None and icao_node.text:
                    dep_code = icao_node.text.strip()
                    apt = next((a for a in self.airports if a["icao"] == dep_code), None)
                    dep_metar = metar_node.text.strip() if (metar_node is not None and metar_node.text) else (apt["metar"] if apt else "")
                    dep_name = name_node.text.strip() if (name_node is not None and name_node.text) else (apt["name"] if apt else "Aeroporto di Partenza")
                    parsed_waypoints.append({
                        "ident": dep_code,
                        "name": dep_name,
                        "lat": lat if lat is not None else (apt["lat"] if apt else None),
                        "lon": lon if lon is not None else (apt["lon"] if apt else None),
                        "alt_ft": 0,
                        "type": "DEP",
                        "metar": dep_metar
                    })
                
            navlog = root.find("navlog")
            if navlog is not None:
                for fix in navlog.findall("fix"):
                    ident = fix.find("ident")
                    if ident is not None and ident.text:
                        code = ident.text.strip()
                        if code in ("TOC", "TOD", "TIMECLIMB", "TIMECRUIS", "TIMEDSCNT"):
                            continue
                        lat, lon = get_coords(fix)
                        alt = get_alt(fix)
                        if not parsed_waypoints or parsed_waypoints[-1]["ident"] != code:
                            parsed_waypoints.append({
                                "ident": code,
                                "lat": lat,
                                "lon": lon,
                                "alt_ft": alt,
                                "type": "WPT"
                            })
                            
            dest = root.find(".//destination")
            if dest is not None:
                icao_node = dest.find("icao_code")
                metar_node = dest.find("metar")
                name_node = dest.find("name")
                lat, lon = get_coords(dest)
                dest_code = icao_node.text.strip() if icao_node is not None and icao_node.text else "DEST"
                apt = next((a for a in self.airports if a["icao"] == dest_code), None)
                dest_metar = metar_node.text.strip() if (metar_node is not None and metar_node.text) else (apt["metar"] if apt else "")
                dest_name = name_node.text.strip() if (name_node is not None and name_node.text) else (apt["name"] if apt else "Aeroporto di Arrivo")
                
                if not parsed_waypoints or parsed_waypoints[-1]["ident"] != dest_code:
                    parsed_waypoints.append({
                        "ident": dest_code,
                        "name": dest_name,
                        "lat": lat if lat is not None else (apt["lat"] if apt else None),
                        "lon": lon if lon is not None else (apt["lon"] if apt else None),
                        "alt_ft": 0,
                        "type": "DEST",
                        "metar": dest_metar
                    })
                else:
                    parsed_waypoints[-1]["type"] = "DEST"
                    parsed_waypoints[-1]["metar"] = dest_metar
                    parsed_waypoints[-1]["name"] = dest_name

            alternate_data = None
            alt_node = root.find(".//alternate")
            if alt_node is not None:
                alt_icao = alt_node.find("icao_code")
                alt_metar_node = alt_node.find("metar")
                lat, lon = get_coords(alt_node)
                if alt_icao is not None and alt_icao.text:
                    alt_code = alt_icao.text.strip()
                    apt = next((a for a in self.airports if a["icao"] == alt_code), None)
                    if (lat is None or lon is None) and apt:
                        lat, lon = apt["lat"], apt["lon"]
                    alt_metar = alt_metar_node.text.strip() if (alt_metar_node is not None and alt_metar_node.text) else (apt["metar"] if apt else "")
                    if lat is not None and lon is not None:
                        alternate_data = {"ident": alt_code, "lat": lat, "lon": lon, "metar": alt_metar}

            if parsed_waypoints:
                enriched = self.enrich_flight_plan(parsed_waypoints)
                self.alternate = alternate_data
                self._save_config()
                return {
                    "success": True, 
                    "flight_plan": enriched["flight_plan"], 
                    "alternate": self.alternate
                }
                
            return {"success": False, "error": "Nessun piano di volo trovato"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def add_to_flight_plan(self, icao):
        icao = icao.upper().strip()
        info = self._lookup_awc_point(icao, "APT")
        if info:
            self.flight_plan.append({
                "ident": icao,
                "lat": info["lat"],
                "lon": info["lon"],
                "alt_ft": info.get("elev", 5000),
                "name": info.get("name", icao),
                "type": "WPT",
                "metar": info.get("metar", "")
            })
            self._save_config()
        return self.flight_plan

    def load_pln_file(self):
        try:
            from ctypes import wintypes
            class OPENFILENAMEW(ctypes.Structure):
                _fields_ = [
                    ("lStructSize", wintypes.DWORD), ("hwndOwner", wintypes.HWND), ("hInstance", wintypes.HINSTANCE),
                    ("lpstrFilter", wintypes.LPCWSTR), ("lpstrCustomFilter", wintypes.LPWSTR), ("nMaxCustFilter", wintypes.DWORD),
                    ("nFilterIndex", wintypes.DWORD), ("lpstrFile", wintypes.LPCWSTR), ("nMaxFile", wintypes.DWORD),
                    ("lpstrFileTitle", wintypes.LPCWSTR), ("nMaxFileTitle", wintypes.DWORD), ("lpstrInitialDir", wintypes.LPCWSTR),
                    ("lpstrTitle", wintypes.LPCWSTR), ("Flags", wintypes.DWORD), ("nFileOffset", wintypes.WORD),
                    ("nFileExtension", wintypes.WORD), ("lpstrDefExt", wintypes.LPCWSTR), ("lCustData", wintypes.LPARAM),
                    ("lpfnHook", ctypes.c_void_p), ("lpstrTemplateName", wintypes.LPCWSTR), ("pvReserved", ctypes.c_void_p),
                    ("dwReserved", wintypes.DWORD), ("flagsEx", wintypes.DWORD)
                ]

            buffer = ctypes.create_unicode_buffer(260)
            ofn = OPENFILENAMEW()
            ofn.lStructSize = ctypes.sizeof(OPENFILENAMEW)
            ofn.lpstrFile = ctypes.cast(buffer, wintypes.LPWSTR)
            ofn.nMaxFile = 260
            ofn.lpstrFilter = "MSFS Flight Plan (*.pln)\0*.pln\0Tutti i file (*.*)\0*.*\0"
            ofn.nFilterIndex = 1
            ofn.lpstrTitle = "Seleziona Piano di Volo MSFS (.pln)"
            
            downloads_path = os.path.abspath(os.path.expanduser("~/Downloads"))
            if os.path.exists(downloads_path):
                ofn.lpstrInitialDir = downloads_path

            ofn.Flags = 0x00080000 | 0x00001000 | 0x00000004 

            if ctypes.windll.comdlg32.GetOpenFileNameW(ctypes.byref(ofn)):
                filepath = buffer.value
                if filepath and os.path.exists(filepath):
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        xml_text = f.read()
                    return {"success": True, "xml_text": xml_text}
            
            return {"success": False}
        except Exception as e:
            return {"success": False, "error": str(e)}