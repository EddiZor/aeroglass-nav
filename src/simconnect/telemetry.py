import math
import time
import multiprocessing as mp

def _simconnect_worker(shared_dict):
    """Gira in un processo separato: zero blocchi per la GUI di pywebview."""
    sm = None
    aq = None
    connected = False
    demo_angle = 0.0

    while True:
        if not connected:
            try:
                from SimConnect import SimConnect, AircraftRequests
                sm = SimConnect()
                aq = AircraftRequests(sm, _time=100)
                connected = True
                print("[SimConnect] Connesso con successo a MSFS 2024!")
            except Exception:
                sm = None
                aq = None
                connected = False
                # Aggiorna dati DEMO
                demo_angle = (demo_angle + 1.5) % 360
                rad = math.radians(demo_angle)
                shared_dict["connected"] = False
                shared_dict["mode"] = "DEMO"
                shared_dict["lat"] = round(45.4500 + 0.08 * math.sin(rad), 5)
                shared_dict["lon"] = round(10.8500 + 0.12 * math.cos(rad), 5)
                shared_dict["alt_ft"] = 6500
                shared_dict["gs_kt"] = 245
                shared_dict["hdg_deg"] = round((demo_angle + 90) % 360)
                shared_dict["vs_fpm"] = 0
                time.sleep(1.0)
                continue

        try:
            lat = aq.get("PLANE_LATITUDE")
            lon = aq.get("PLANE_LONGITUDE")
            alt = aq.get("PLANE_ALTITUDE")
            gs = aq.get("GROUND_VELOCITY")
            hdg = aq.get("PLANE_HEADING_DEGREES_MAGNETIC")
            vs = aq.get("VERTICAL_SPEED")

            if lat is not None and lon is not None and (abs(float(lat)) > 0.001 or abs(float(lon)) > 0.001):
                shared_dict["connected"] = True
                shared_dict["mode"] = "LIVE"
                shared_dict["lat"] = round(float(lat), 5)
                shared_dict["lon"] = round(float(lon), 5)
                shared_dict["alt_ft"] = round(float(alt or 0))
                shared_dict["gs_kt"] = round(float(gs or 0))
                shared_dict["hdg_deg"] = round(float(hdg or 0)) % 360
                shared_dict["vs_fpm"] = round(float(vs or 0))
            else:
                # Nel menu principale di MSFS le coordinate sono (0,0)
                shared_dict["connected"] = True
                shared_dict["mode"] = "IN MENU"
        except Exception as e:
            print(f"[SimConnect] Connessione persa: {e}")
            connected = False
            aq = None
            sm = None

        time.sleep(0.25)


class TelemetryManager:
    def __init__(self):
        self._manager = mp.Manager()
        self._shared = self._manager.dict({
            "connected": False,
            "mode": "DEMO",
            "lat": 45.4500,
            "lon": 10.8500,
            "alt_ft": 6500,
            "gs_kt": 245,
            "hdg_deg": 90,
            "vs_fpm": 0
        })
        self._proc = mp.Process(target=_simconnect_worker, args=(self._shared,), daemon=True)
        self._proc.start()

    def connect(self):
        is_conn = bool(self._shared.get("connected", False))
        return {
            "status": "CONNECTED" if is_conn else "DEMO_MODE",
            "mode": "SIMCONNECT" if is_conn else "SIMULATED"
        }

    def get_aircraft_data(self):
        return dict(self._shared)