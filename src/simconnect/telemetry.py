import time
import math
import threading

try:
    from SimConnect import SimConnect, AircraftRequests
    SIMCONNECT_AVAILABLE = True
except ImportError:
    SIMCONNECT_AVAILABLE = False


class TelemetryManager:
    def __init__(self):
        self.sm = None
        self.aq = None
        self.connected = False
        self._lock = threading.Lock()
        self._running = True
        self._last_meta_time = 0.0
        self._cached_title = "MSFS 2024"
        self._fail_count = 0

        self._data = {
            "connected": False,
            "mode": "DEMO",
            "aircraft": "MSFS 2024 (DEMO)",
            "lat": 41.8003,
            "lon": 12.2389,
            "alt_ft": "17 ft",
            "gs_kt": "0 kt",
            "hdg_deg": "250°",
            "hdg_true": 250.0
        }

        self._thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._thread.start()

    def connect(self):
        return self.connected

    def _safe_disconnect(self):
        with self._lock:
            self.connected = False
            self.aq = None
            if self.sm is not None:
                try:
                    self.sm.exit()
                except Exception:
                    pass
                self.sm = None

    def _clean_sim_string(self, raw_val, max_len=42):
        if not raw_val:
            return ""
        if isinstance(raw_val, bytes):
            raw_val = raw_val.decode("utf-8", errors="ignore")
        clean = str(raw_val).strip().replace("\x00", "")
        if clean.startswith("b'") and clean.endswith("'"):
            clean = clean[2:-1]
        return clean.strip()[:max_len]

    def _try_connect(self):
            if not SIMCONNECT_AVAILABLE:
                return False
            self._safe_disconnect()
            try:
                new_sm = SimConnect()
                new_aq = AircraftRequests(new_sm, _time=200)
                with self._lock:
                    self.sm = new_sm
                    self.aq = new_aq
                    self.connected = True
                    self._fail_count = 0
                return True
            except Exception:
                self._safe_disconnect()
                return False

    def _poll_loop(self):
        while self._running:
            if not self.connected:
                if not self._try_connect():
                    self._set_demo_state()
                    time.sleep(3.0)
                    continue

            try:
                with self._lock:
                    if not self.aq:
                        raise RuntimeError("AircraftRequests non disponibile")
                    lat = self.aq.get("PLANE_LATITUDE")
                    lon = self.aq.get("PLANE_LONGITUDE")

                if lat is None or lon is None:
                    self._fail_count += 1
                    if self._fail_count >= 10:
                        self._safe_disconnect()
                        self._set_demo_state()
                    time.sleep(1.0)
                    continue

                self._fail_count = 0

                with self._lock:
                    alt = self.aq.get("PLANE_ALTITUDE")
                    gs = self.aq.get("GROUND_VELOCITY")
                    hdg_mag = self.aq.get("PLANE_HEADING_DEGREES_MAGNETIC")
                    hdg_true = self.aq.get("PLANE_HEADING_DEGREES_TRUE")
                    try:
                        fuel_gal = self.aq.get("FUEL_TOTAL_QUANTITY")
                        on_ground = self.aq.get("SIM_ON_GROUND")
                    except Exception:
                        fuel_gal = None
                        on_ground = None

                    now = time.time()
                    if (now - self._last_meta_time) >= 10.0:
                        self._last_meta_time = now
                        title_raw = self.aq.get("TITLE")
                        title_str = self._clean_sim_string(title_raw, max_len=42)
                        if title_str:
                            self._cached_title = title_str

                alt_val = int(round(float(alt))) if alt is not None else 0
                gs_val = int(round(float(gs))) if gs is not None else 0
                fuel_val = round(float(fuel_gal), 1) if fuel_gal is not None else None
                on_gnd_val = bool(int(on_ground)) if on_ground is not None else (gs_val < 30)

                hdg_mag_deg = int(round(math.degrees(float(hdg_mag)))) % 360 if hdg_mag is not None else 0
                hdg_true_deg = round(math.degrees(float(hdg_true)), 1) % 360 if hdg_true is not None else float(hdg_mag_deg)

                if abs(float(hdg_mag or 0)) > 6.5:
                    hdg_mag_deg = int(round(float(hdg_mag))) % 360
                if abs(float(hdg_true or 0)) > 6.5:
                    hdg_true_deg = round(float(hdg_true), 1) % 360

                self._data = {
                    "connected": True,
                    "mode": "LIVE",
                    "aircraft": self._cached_title or "MSFS 2024",
                    "lat": round(float(lat), 6),
                    "lon": round(float(lon), 6),
                    "alt_ft": f"{alt_val} ft",
                    "gs_kt": f"{gs_val} kt",
                    "gs_num": gs_val,
                    "fuel_gal": fuel_val,
                    "on_ground": on_gnd_val,
                    "hdg_deg": f"{hdg_mag_deg}°",
                    "hdg_true": hdg_true_deg
                }

                time.sleep(1.0)

            except Exception as ex:
                print(f"Errore nel polling telemetria: {ex}")
                self._fail_count += 1
                if self._fail_count >= 5:
                    self._safe_disconnect()
                    self._set_demo_state()
                time.sleep(2.0)

    def _set_demo_state(self):
        with self._lock:
            self._data["connected"] = False
            self._data["mode"] = "DEMO"
            self._data["aircraft"] = "MSFS 2024 (DEMO)"

    def get_data(self):
        with self._lock:
            return dict(self._data)

    def shutdown(self):
        self._running = False
        self._safe_disconnect()