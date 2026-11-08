import os
import sys
import json
import urllib.request
import xml.etree.ElementTree as ET
import webview
from src.simconnect.telemetry import TelemetryManager


def get_base_dir():
    if hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return os.path.abspath(".")


class AeroGlassAPI:
    def __init__(self):
        self._telemetry = TelemetryManager()
        self._flight_plan = []
        self._config_path = os.path.join(os.path.abspath("."), "config.json")
        self._config = self._load_config()

    def _load_config(self):
        if os.path.exists(self._config_path):
            try:
                with open(self._config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {"simbrief_userid": ""}

    def _save_config(self):
        try:
            with open(self._config_path, "w", encoding="utf-8") as f:
                json.dump(self._config, f, indent=4)
        except Exception as e:
            print(f"Errore salvataggio config: {e}")

    def connect_sim(self):
        return self._telemetry.connect()

    def get_telemetry(self):
        return self._telemetry.get_data()

    def get_navdata(self):
        nav_file = os.path.join(get_base_dir(), "data", "navdata.json")
        data = {"airports": [], "vors": [], "ils": []}
        if os.path.exists(nav_file):
            try:
                with open(nav_file, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    data.update(loaded)
            except Exception:
                pass
        data["simbrief_userid"] = self._config.get("simbrief_userid", "")
        return data

    def save_simbrief_id(self, userid):
        self._config["simbrief_userid"] = str(userid).strip()
        self._save_config()
        return {"success": True}

    def fetch_simbrief_plan(self):
        userid = self._config.get("simbrief_userid", "").strip()
        if not userid:
            return {"success": False, "error": "Inserisci il tuo SimBrief Pilot ID o Username."}

        param = "userid" if userid.isdigit() else "username"
        url = f"https://www.simbrief.com/api/xml.fetcher.php?{param}={userid}"

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AeroGlassNav/0.5"})
            with urllib.request.urlopen(req, timeout=10) as response:
                xml_bytes = response.read()

            root = ET.fromstring(xml_bytes)
            fpl = []

            origin = root.find("origin")
            if origin is not None:
                fpl.append({
                    "ident": origin.findtext("icao_code", "DEP"),
                    "name": origin.findtext("name", "Departure Airport"),
                    "lat": float(origin.findtext("pos_lat", 0)),
                    "lon": float(origin.findtext("pos_long", 0)),
                    "alt_ft": int(float(origin.findtext("elevation", 0))),
                    "type": "DEP",
                    "metar": origin.findtext("metar", "")
                })

            navlog = root.find("navlog")
            if navlog is not None:
                for fix in navlog.findall("fix"):
                    ident = fix.findtext("ident", "")
                    if ident in ("TOC", "TOD") or (fix.findtext("is_sid_star") == "1" and not ident):
                        continue
                    fpl.append({
                        "ident": ident,
                        "name": fix.findtext("name", "Waypoint"),
                        "lat": float(fix.findtext("pos_lat", 0)),
                        "lon": float(fix.findtext("pos_long", 0)),
                        "alt_ft": int(float(fix.findtext("altitude_feet", 0))),
                        "type": fix.findtext("type", "WPT")
                    })

            destination = root.find("destination")
            if destination is not None:
                dest_icao = destination.findtext("icao_code", "DEST")
                dest_entry = {
                    "ident": dest_icao,
                    "name": destination.findtext("name", "Destination Airport"),
                    "lat": float(destination.findtext("pos_lat", 0)),
                    "lon": float(destination.findtext("pos_long", 0)),
                    "alt_ft": int(float(destination.findtext("elevation", 0))),
                    "type": "DEST",
                    "metar": destination.findtext("metar", "")
                }
                if fpl and fpl[-1]["ident"] == dest_icao:
                    fpl[-1] = dest_entry
                else:
                    fpl.append(dest_entry)

            alternate_data = None
            alt_node = root.find("alternate")
            if alt_node is not None and alt_node.findtext("icao_code"):
                alternate_data = {
                    "ident": alt_node.findtext("icao_code", ""),
                    "name": alt_node.findtext("name", "Alternate"),
                    "lat": float(alt_node.findtext("pos_lat", 0)),
                    "lon": float(alt_node.findtext("pos_long", 0)),
                    "alt_ft": int(float(alt_node.findtext("elevation", 0))),
                    "metar": alt_node.findtext("metar", "")
                }

            self._flight_plan = fpl
            return {"success": True, "flight_plan": fpl, "alternate": alternate_data}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def load_pln_file(self):
        if not webview.windows:
            return {"success": False}
        win = webview.windows[0]
        file_types = ("MSFS Flight Plan (*.pln;*.xml)", "All files (*.*)")
        result = win.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=file_types)
        if result and len(result) > 0:
            file_path = result[0]
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    xml_text = f.read()
                return {"success": True, "xml_text": xml_text}
            except Exception as e:
                return {"success": False, "error": str(e)}
        return {"success": False}

    def enrich_flight_plan(self, parsed_waypoints):
        self._flight_plan = parsed_waypoints
        return {"success": True, "flight_plan": self._flight_plan}

    def update_waypoint_altitude(self, index, new_alt):
        idx = int(index)
        if 0 <= idx < len(self._flight_plan):
            self._flight_plan[idx]["alt_ft"] = int(new_alt)
        return {"success": True}

    def clear_flight_plan(self):
        self._flight_plan = []
        return {"success": True}

    def add_to_flight_plan(self, icao):
        return self._flight_plan