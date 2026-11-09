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
        self._title_fetched = False
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
            self._title_fetched = False
            self.aq = None
            if self.sm is not None:
                try:
                    self.sm.quit = 1
                    self.sm.exit()
                except Exception:
                    pass
                self.sm = None

    def _try_connect(self):
        if not SIMCONNECT_AVAILABLE:
            return False
        self._safe_disconnect()
        with self._lock:
            try:
                self.sm = SimConnect()
                # _time=1200 mantiene la cache per 1.2s evitando richieste duplicate a MSFS
                self.aq = AircraftRequests(self.sm, _time=1200)
                self.connected = True
                self._fail_count = 0
                return True
            except Exception:
                self.sm = None
                self.aq = None
                self.connected = False
                return False

    def _poll_loop(self):
        while self._running:
            if not self.connected:
                if not self._try_connect():
                    self._set_demo_state()
                    time.sleep(5.0)
                    continue

            try:
                with self._lock:
                    if not self.aq:
                        raise RuntimeError("SimConnect non attivo")

                    lat = self.aq.get("PLANE_LATITUDE")
                    lon = self.aq.get("PLANE_LONGITUDE")

                # Se MSFS ha un micro-stutter in volo (lat/lon = None), NON disconnettere subito:
                # ignora il ciclo saltato e disconnetti solo dopo 10 fallimenti consecutivi (~15s)
                if lat is None or lon is None:
                    self._fail_count += 1
                    if self._fail_count >= 10:
                        self._safe_disconnect()
                        self._set_demo_state()
                    time.sleep(1.5)
                    continue

                # Se siamo nel menu principale di MSFS (coordinate ~ 0,0)
                if abs(float(lat)) < 0.01 and abs(float(lon)) < 0.01:
                    self._title_fetched = False
                    self._set_demo_state()
                    time.sleep(2.5)
                    continue

                self._fail_count = 0

                with self._lock:
                    alt = self.aq.get("PLANE_ALTITUDE")
                    gs = self.aq.get("GROUND_VELOCITY")
                    hdg_mag = self.aq.get("PLANE_HEADING_DEGREES_MAGNETIC")
                    hdg_true = self.aq.get("PLANE_HEADING_DEGREES_TRUE")

                    # Legge il nome dell'aereo UNA SOLA VOLTA a inizio volo
                    if not self._title_fetched:
                        raw_title = self.aq.get("TITLE")
                        if raw_title:
                            if isinstance(raw_title, bytes):
                                raw_title = raw_title.decode("utf-8", errors="ignore")
                            clean = str(raw_title).strip().replace("\x00", "")
                            if clean.startswith("b'") and clean.endswith("'"):
                                clean = clean[2:-1]
                            if clean:
                                self._cached_title = clean[:24]
                                self._title_fetched = True

                alt_val = int(round(float(alt))) if alt is not None else 0
                gs_val = int(round(float(gs))) if gs is not None else 0

                hdg_mag_deg = int(round(math.degrees(float(hdg_mag)))) % 360 if hdg_mag is not None else 0
                hdg_true_deg = round(math.degrees(float(hdg_true)), 1) % 360 if hdg_true is not None else float(hdg_mag_deg)

                if abs(float(hdg_mag or 0)) > 6.5:
                    hdg_mag_deg = int(round(float(hdg_mag))) % 360
                if abs(float(hdg_true or 0)) > 6.5:
                    hdg_true_deg = round(float(hdg_true), 1) % 360

                self._data = {
                    "connected": True,
                    "mode": "LIVE",
                    "aircraft": self._cached_title,
                    "lat": round(float(lat), 6),
                    "lon": round(float(lon), 6),
                    "alt_ft": f"{alt_val} ft",
                    "gs_kt": f"{gs_val} kt",
                    "hdg_deg": f"{hdg_mag_deg}°",
                    "hdg_true": hdg_true_deg
                }

                # Ciclo morbido ogni 1.5 secondi per lasciare libero il thread di MSFS
                time.sleep(1.5)

            except Exception:
                self._fail_count += 1
                if self._fail_count >= 5:
                    self._safe_disconnect()
                    self._set_demo_state()
                time.sleep(2.5)

    def _set_demo_state(self):
        self._data["connected"] = False
        self._data["mode"] = "DEMO"
        self._data["aircraft"] = "MSFS 2024 (DEMO)"

    def get_data(self):
        return dict(self._data)

    def shutdown(self):
        self._running = False
        self._safe_disconnect()