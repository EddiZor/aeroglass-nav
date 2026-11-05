import os
import json
import urllib.request
import xml.etree.ElementTree as ET
import ctypes
from src.simconnect.telemetry import TelemetryManager

# Istanza esterna alla classe: pywebview NON può ispezionarla!
_TELEMETRY_INSTANCE = None

def _get_telemetry():
    global _TELEMETRY_INSTANCE
    if _TELEMETRY_INSTANCE is None:
        _TELEMETRY_INSTANCE = TelemetryManager()
    return _TELEMETRY_INSTANCE


class AeroGlassAPI:
    def __init__(self):
        self._config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config.json")
        self.simbrief_userid = self._load_config()
        
        self.airports = [
            {"icao": "LIPX", "name": "Verona Villafranca", "lat": 45.3957, "lon": 10.8885, "elev": 239, "rwy": "04/22", "twr": "118.650", "metar": "LIPX 050820Z 04006KT CAVOK 16/09 Q1018"},
            {"icao": "LIPO", "name": "Brescia Montichiari", "lat": 45.4289, "lon": 10.3306, "elev": 356, "rwy": "14/32", "twr": "118.450", "metar": "LIPO 050820Z 06005KT 9999 FEW040 16/10 Q1018"},
            {"icao": "LIDT", "name": "Trento Mattarello", "lat": 46.0219, "lon": 11.1242, "elev": 607, "rwy": "18/36", "twr": "122.600", "metar": "LIDT 050820Z VRB03KT CAVOK 14/06 Q1019"},
            {"icao": "LIPD", "name": "Udine Campoformido", "lat": 46.0319, "lon": 13.1869, "elev": 308, "rwy": "09/27", "twr": "123.500", "metar": "LIPD 050820Z 05004KT CAVOK 17/08 Q1018"},
            {"icao": "LITY", "name": "Agrigento Valle dei Templi", "lat": 37.2450, "lon": 13.6620, "elev": 145, "rwy": "11/29", "twr": "130.000", "metar": "LITY 050820Z 12008KT CAVOK 22/13 Q1016"},
            {"icao": "LIRF", "name": "Roma Fiumicino", "lat": 41.8003, "lon": 12.2389, "elev": 15, "rwy": "16L/34R", "twr": "118.700", "metar": "LIRF 050820Z 25010KT CAVOK 18/11 Q1018"},
            {"icao": "LIPE", "name": "Bologna Borgo Panigale", "lat": 44.5354, "lon": 11.2887, "elev": 123, "rwy": "12/30", "twr": "118.100", "metar": "LIPE 050820Z 12005KT CAVOK 16/10 Q1018"}
        ]
        self.flight_plan = ["LIPX", "LIDT", "LIPD"]

    def _load_config(self):
        try:
            if os.path.exists(self._config_path):
                with open(self._config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("simbrief_userid", "")
        except Exception:
            pass
        return ""

    def _save_config(self):
        try:
            data = {"simbrief_userid": self.simbrief_userid}
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
            "simbrief_userid": self.simbrief_userid
        }

    def save_simbrief_id(self, userid):
        self.simbrief_userid = str(userid).strip()
        self._save_config()
        return {"success": True}

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
            
            orig = root.find(".//origin/icao_code")
            if orig is not None and orig.text:
                parsed_waypoints.append(orig.text.strip())
                
            navlog = root.find("navlog")
            if navlog is not None:
                for fix in navlog.findall("fix"):
                    ident = fix.find("ident")
                    if ident is not None and ident.text:
                        code = ident.text.strip()
                        if code and code not in parsed_waypoints:
                            parsed_waypoints.append(code)
                            
            dest = root.find(".//destination/icao_code")
            if dest is not None and dest.text:
                d_code = dest.text.strip()
                if d_code and d_code not in parsed_waypoints:
                    parsed_waypoints.append(d_code)

            if parsed_waypoints:
                self.flight_plan = parsed_waypoints
                return {"success": True, "flight_plan": self.flight_plan}
                
            return {"success": False, "error": "Nessun piano di volo trovato"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def add_to_flight_plan(self, icao):
        icao = icao.upper().strip()
        if icao not in self.flight_plan:
            self.flight_plan.append(icao)
        return self.flight_plan

    def load_pln_file(self):
        try:
            from ctypes import wintypes
            class OPENFILENAMEW(ctypes.Structure):
                _fields_ = [
                    ("lStructSize", wintypes.DWORD), ("hwndOwner", wintypes.HWND), ("hInstance", wintypes.HINSTANCE),
                    ("lpstrFilter", wintypes.LPCWSTR), ("lpstrCustomFilter", wintypes.LPWSTR), ("nMaxCustFilter", wintypes.DWORD),
                    ("nFilterIndex", wintypes.DWORD), ("lpstrFile", wintypes.LPWSTR), ("nMaxFile", wintypes.DWORD),
                    ("lpstrFileTitle", wintypes.LPWSTR), ("nMaxFileTitle", wintypes.DWORD), ("lpstrInitialDir", wintypes.LPCWSTR),
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
                    
                    dep_elem = xml_root.find(".//DepartureID")
                    if dep_elem is not None and dep_elem.text:
                        dep_code = dep_elem.text.strip()
                        if dep_code:
                            parsed_waypoints.append(dep_code)
                    
                    for wp in xml_root.findall(".//FlightPlan.Waypoint") + xml_root.findall(".//ATCWaypoint"):
                        ident_elem = wp.find(".//ICAOIdent")
                        if ident_elem is not None and ident_elem.text:
                            code = ident_elem.text.strip()
                            if code and code not in parsed_waypoints:
                                parsed_waypoints.append(code)
                        else:
                            icao_elem = wp.find("ICAO")
                            if icao_elem is not None and icao_elem.text:
                                code = icao_elem.text.strip()
                                if code and code not in parsed_waypoints:
                                    parsed_waypoints.append(code)
                    
                    dest_elem = xml_root.find(".//DestinationID")
                    if dest_elem is not None and dest_elem.text:
                        dest_code = dest_elem.text.strip()
                        if dest_code and dest_code not in parsed_waypoints:
                            parsed_waypoints.append(dest_code)
                    
                    if parsed_waypoints:
                        self.flight_plan = parsed_waypoints
                        return {"success": True, "flight_plan": self.flight_plan, "filename": os.path.basename(filepath)}
            
            return {"success": False}
        except Exception as e:
            return {"success": False, "error": str(e)}