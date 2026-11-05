import os
import json
import urllib.request
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
        self._config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config.json")
        
        self.airports = [
            {"icao": "LIPX", "name": "Verona Villafranca", "lat": 45.3957, "lon": 10.8885, "elev": 239, "rwy": "04/22", "twr": "118.650", "metar": "LIPX 050820Z 04006KT CAVOK 16/09 Q1018"},
            {"icao": "LIPO", "name": "Brescia Montichiari", "lat": 45.4289, "lon": 10.3306, "elev": 356, "rwy": "14/32", "twr": "118.450", "metar": "LIPO 050820Z 06005KT 9999 FEW040 16/10 Q1018"},
            {"icao": "LIDT", "name": "Trento Mattarello", "lat": 46.0219, "lon": 11.1242, "elev": 607, "rwy": "18/36", "twr": "122.600", "metar": "LIDT 050820Z VRB03KT CAVOK 14/06 Q1019"},
            {"icao": "LIPD", "name": "Udine Campoformido", "lat": 46.0319, "lon": 13.1869, "elev": 308, "rwy": "09/27", "twr": "123.500", "metar": "LIPD 050820Z 05004KT CAVOK 17/08 Q1018"},
            {"icao": "LITY", "name": "Agrigento Valle dei Templi", "lat": 37.2450, "lon": 13.6620, "elev": 145, "rwy": "11/29", "twr": "130.000", "metar": "LITY 050820Z 12008KT CAVOK 22/13 Q1016"},
            {"icao": "LIRF", "name": "Roma Fiumicino", "lat": 41.8003, "lon": 12.2389, "elev": 15, "rwy": "16L/34R", "twr": "118.700", "metar": "LIRF 050820Z 25010KT CAVOK 18/11 Q1018"},
            {"icao": "LIPE", "name": "Bologna Borgo Panigale", "lat": 44.5354, "lon": 11.2887, "elev": 123, "rwy": "12/30", "twr": "118.100", "metar": "LIPE 050820Z 12005KT CAVOK 16/10 Q1018"}
        ]
        
        config_data = self._load_config()
        self.simbrief_userid = config_data.get("simbrief_userid", "")
        saved_fpl = config_data.get("flight_plan", [])
        self.alternate = config_data.get("alternate", None)
        
        if saved_fpl:
            self.flight_plan = saved_fpl
        else:
            self.flight_plan = [
                {"ident": "LIPX", "lat": 45.3957, "lon": 10.8885, "alt_ft": 239, "name": "Verona Villafranca", "type": "DEP", "metar": "LIPX 050820Z 04006KT CAVOK 16/09 Q1018"},
                {"ident": "LIDT", "lat": 46.0219, "lon": 11.1242, "alt_ft": 6500, "name": "Trento Mattarello", "type": "WPT"},
                {"ident": "LIPD", "lat": 46.0319, "lon": 13.1869, "alt_ft": 308, "name": "Udine Campoformido", "type": "DEST", "metar": "LIPD 050820Z 05004KT CAVOK 17/08 Q1018"}
            ]

    def _load_config(self):
        try:
            if os.path.exists(self._config_path):
                with open(self._config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return {}

    def _save_config(self):
        try:
            data = {
                "simbrief_userid": self.simbrief_userid,
                "flight_plan": self.flight_plan,
                "alternate": self.alternate
            }
            with open(self._config_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
        except Exception:
            pass

    def connect_sim(self):
        return _get_telemetry().connect()

    def get_telemetry(self):
        return _get_telemetry().get_aircraft_data()

    def get_navdata(self):
        return {
            "airports": self.airports,
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

            dep_lat, dep_lon = 41.8, 12.4
            orig = root.find(".//origin")
            if orig is not None:
                icao_node = orig.find("icao_code")
                metar_node = orig.find("metar")
                name_node = orig.find("name")
                lat, lon = get_coords(orig)
                apt = None
                if icao_node is not None and icao_node.text:
                    apt = next((a for a in self.airports if a["icao"] == icao_node.text.strip()), None)
                if lat is not None: dep_lat, dep_lon = lat, lon
                elif apt: dep_lat, dep_lon = apt["lat"], apt["lon"]
                
                if icao_node is not None and icao_node.text:
                    dep_code = icao_node.text.strip()
                    dep_metar = metar_node.text.strip() if (metar_node is not None and metar_node.text) else (apt["metar"] if apt else "")
                    dep_name = name_node.text.strip() if (name_node is not None and name_node.text) else (apt["name"] if apt else "Aeroporto di Partenza")
                    parsed_waypoints.append({
                        "ident": dep_code,
                        "name": dep_name,
                        "lat": dep_lat,
                        "lon": dep_lon,
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
                        lat, lon = get_coords(fix)
                        alt = get_alt(fix)
                        if not parsed_waypoints or parsed_waypoints[-1]["ident"] != code:
                            parsed_waypoints.append({
                                "ident": code,
                                "lat": lat if lat is not None else 0.0,
                                "lon": lon if lon is not None else 0.0,
                                "alt_ft": alt,
                                "type": "WPT"
                            })
                            
            dest_lat, dest_lon = 44.5, 11.2
            dest = root.find(".//destination")
            if dest is not None:
                icao_node = dest.find("icao_code")
                metar_node = dest.find("metar")
                name_node = dest.find("name")
                lat, lon = get_coords(dest)
                apt = None
                if icao_node is not None and icao_node.text:
                    apt = next((a for a in self.airports if a["icao"] == icao_node.text.strip()), None)
                if lat is not None: dest_lat, dest_lon = lat, lon
                elif apt: dest_lat, dest_lon = apt["lat"], apt["lon"]

                dest_code = icao_node.text.strip() if icao_node is not None and icao_node.text else "DEST"
                dest_metar = metar_node.text.strip() if (metar_node is not None and metar_node.text) else (apt["metar"] if apt else "")
                dest_name = name_node.text.strip() if (name_node is not None and name_node.text) else (apt["name"] if apt else "Aeroporto di Arrivo")
                
                if not parsed_waypoints or parsed_waypoints[-1]["ident"] != dest_code:
                    parsed_waypoints.append({
                        "ident": dest_code,
                        "name": dest_name,
                        "lat": dest_lat,
                        "lon": dest_lon,
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

            total = len(parsed_waypoints)
            if total > 2:
                start_lat = parsed_waypoints[0]["lat"]
                start_lon = parsed_waypoints[0]["lon"]
                end_lat = parsed_waypoints[-1]["lat"]
                end_lon = parsed_waypoints[-1]["lon"]
                for i, wp in enumerate(parsed_waypoints):
                    if wp["lat"] == 0.0 or wp["lon"] == 0.0:
                        fraction = i / (total - 1)
                        wp["lat"] = round(start_lat + fraction * (end_lat - start_lat), 5)
                        wp["lon"] = round(start_lon + fraction * (end_lon - start_lon), 5)

            if parsed_waypoints:
                self.flight_plan = parsed_waypoints
                self.alternate = alternate_data
                self._save_config()
                return {
                    "success": True, 
                    "flight_plan": self.flight_plan, 
                    "alternate": self.alternate
                }
                
            return {"success": False, "error": "Nessun piano di volo trovato"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def add_to_flight_plan(self, icao):
        icao = icao.upper().strip()
        apt = next((a for a in self.airports if a["icao"] == icao), None)
        if apt:
            self.flight_plan.append({
                "ident": apt["icao"],
                "lat": apt["lat"],
                "lon": apt["lon"],
                "alt_ft": 5000,
                "name": apt["name"],
                "type": "WPT",
                "metar": apt.get("metar", "")
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
                    tree = ET.parse(filepath)
                    xml_root = tree.getroot()
                    parsed_waypoints = []
                    
                    def get_coords_for_ident(ident):
                        apt = next((a for a in self.airports if a["icao"] == ident), None)
                        if apt: return apt["lat"], apt["lon"]
                        return 45.0, 10.0

                    dep_elem = xml_root.find(".//DepartureID")
                    if dep_elem is not None and dep_elem.text:
                        dep_code = dep_elem.text.strip()
                        apt = next((a for a in self.airports if a["icao"] == dep_code), None)
                        lat, lon = get_coords_for_ident(dep_code)
                        parsed_waypoints.append({
                            "ident": dep_code,
                            "lat": lat,
                            "lon": lon,
                            "alt_ft": 0,
                            "type": "DEP",
                            "metar": apt["metar"] if apt else ""
                        })
                    
                    for wp in xml_root.findall(".//FlightPlan.Waypoint") + xml_root.findall(".//ATCWaypoint"):
                        code = ""
                        ident_elem = wp.find(".//ICAOIdent")
                        if ident_elem is not None and ident_elem.text:
                            code = ident_elem.text.strip()
                        else:
                            icao_elem = wp.find("ICAO")
                            if icao_elem is not None and icao_elem.text:
                                code = icao_elem.text.strip()
                        
                        wp_lat, wp_lon = 0.0, 0.0
                        wp_pt = wp.find("WorldPoint")
                        if wp_pt is not None and wp_pt.text:
                            parts = wp_pt.text.split(",")
                            if len(parts) >= 2:
                                try: wp_lat, wp_lon = float(parts[0]), float(parts[1])
                                except: pass

                        alt_ft = 5000
                        alt_elem = wp.find("Altitude")
                        if alt_elem is not None and alt_elem.text:
                            try: alt_ft = int(float(alt_elem.text.strip()))
                            except: pass

                        if code:
                            if wp_lat == 0.0:
                                wp_lat, wp_lon = get_coords_for_ident(code)
                            
                            if not parsed_waypoints or parsed_waypoints[-1]["ident"] != code:
                                parsed_waypoints.append({"ident": code, "lat": wp_lat, "lon": wp_lon, "alt_ft": alt_ft, "type": "WPT"})
                    
                    dest_elem = xml_root.find(".//DestinationID")
                    if dest_elem is not None and dest_elem.text:
                        dest_code = dest_elem.text.strip()
                        apt = next((a for a in self.airports if a["icao"] == dest_code), None)
                        lat, lon = get_coords_for_ident(dest_code)
                        if not parsed_waypoints or parsed_waypoints[-1]["ident"] != dest_code:
                            parsed_waypoints.append({
                                "ident": dest_code,
                                "lat": lat,
                                "lon": lon,
                                "alt_ft": 0,
                                "type": "DEST",
                                "metar": apt["metar"] if apt else ""
                            })
                        else:
                            parsed_waypoints[-1]["type"] = "DEST"
                            parsed_waypoints[-1]["metar"] = apt["metar"] if apt else ""
                    
                    if parsed_waypoints:
                        self.flight_plan = parsed_waypoints
                        self.alternate = None
                        self._save_config()
                        return {"success": True, "flight_plan": self.flight_plan, "alternate": None, "filename": os.path.basename(filepath)}
            
            return {"success": False}
        except Exception as e:
            return {"success": False, "error": str(e)}