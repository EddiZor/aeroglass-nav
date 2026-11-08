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


def _format_dms_coord(val, is_lat=True):
    hemi = ("N" if val >= 0 else "S") if is_lat else ("E" if val >= 0 else "W")
    abs_val = abs(float(val))
    deg = int(abs_val)
    rem = (abs_val - deg) * 60.0
    minutes = int(rem)
    seconds = (rem - minutes) * 60.0
    return f"{hemi}{deg}° {minutes}' {seconds:.2f}\""


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

    def export_pln_file(self, flight_plan_data):
        """Genera e salva un file .pln standard per MSFS nella cartella Download."""
        try:
            if not flight_plan_data or len(flight_plan_data) < 2:
                return {"success": False, "error": "Il piano di volo deve contenere almeno Partenza e Arrivo."}

            downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
            if not os.path.exists(downloads_path):
                downloads_path = os.path.abspath(".")

            dep_icao = str(flight_plan_data[0].get("ident", "DEP")).strip().upper()
            dest_icao = str(flight_plan_data[-1].get("ident", "DEST")).strip().upper()
            file_name = f"{dep_icao}-{dest_icao}.pln"
            file_path = os.path.join(downloads_path, file_name)

            altitudes = [int(float(w.get("alt_ft", 24000) or 0)) for w in flight_plan_data]
            cruise_alt = max(altitudes) if altitudes else 24000

            root = ET.Element("SimBase.Document", Type="AceXML", version="1,0")
            ET.SubElement(root, "Descr").text = "AceXML Document"

            fpl = ET.SubElement(root, "FlightPlan.FlightPlan")
            ET.SubElement(fpl, "Title").text = f"{dep_icao} to {dest_icao}"
            ET.SubElement(fpl, "FPType").text = "IFR"
            ET.SubElement(fpl, "RouteType").text = "HighAltitude"
            ET.SubElement(fpl, "CruisingAlt").text = str(cruise_alt)
            ET.SubElement(fpl, "DepartureID").text = dep_icao
            ET.SubElement(fpl, "DestinationID").text = dest_icao

            if flight_plan_data[0].get("lat") is not None and flight_plan_data[0].get("lon") is not None:
                dep_lat = _format_dms_coord(flight_plan_data[0]["lat"], True)
                dep_lon = _format_dms_coord(flight_plan_data[0]["lon"], False)
                dep_alt = int(float(flight_plan_data[0].get("alt_ft", 0) or 0))
                ET.SubElement(fpl, "DepartureLLA").text = f"{dep_lat},{dep_lon},+{dep_alt:06d}.00"

            if flight_plan_data[-1].get("lat") is not None and flight_plan_data[-1].get("lon") is not None:
                 dst_lat = _format_dms_coord(flight_plan_data[-1]["lat"], True)
                 dst_lon = _format_dms_coord(flight_plan_data[-1]["lon"], False)
                 dst_alt = int(float(flight_plan_data[-1].get("alt_ft", 0) or 0))
                 ET.SubElement(fpl, "DestinationLLA").text = f"{dst_lat},{dst_lon},+{dst_alt:06d}.00"

            for i, wp in enumerate(flight_plan_data):
                ident = str(wp.get("ident", f"WPT{i}")).strip().upper()
                atc_wpt = ET.SubElement(fpl, "ATCWaypoint", id=ident)

                w_type = "Airport" if (i == 0 or i == len(flight_plan_data) - 1) else "Intersection"
                ET.SubElement(atc_wpt, "ATCWaypointType").text = w_type

                lat_val = wp.get("lat") if wp.get("lat") is not None else 0.0
                lon_val = wp.get("lon") if wp.get("lon") is not None else 0.0
                alt_val = int(float(wp.get("alt_ft", 0) or 0))

                dms_lat = _format_dms_coord(lat_val, True)
                dms_lon = _format_dms_coord(lon_val, False)
                ET.SubElement(atc_wpt, "WorldPosition").text = f"{dms_lat},{dms_lon},+{alt_val:06d}.00"

                icao_node = ET.SubElement(atc_wpt, "ICAO")
                ET.SubElement(icao_node, "ICAOIdent").text = ident

            tree = ET.ElementTree(root)
            ET.indent(tree, space="  ", level=0)
            tree.write(file_path, encoding="utf-8", xml_declaration=True)

            self._flight_plan = flight_plan_data
            return {"success": True, "path": file_path}
        except Exception as e:
            return {"success": False, "error": str(e)}

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