import time
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
        self._last_title_check = 0
        self._cached_title = "MSFS 2024"

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
        # Il thread in background gestisce già la connessione in modo sicuro
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

    def _try_connect(self):
        if not SIMCONNECT_AVAILABLE:
            return False
        self._safe_disconnect()
        with self._lock:
            try:
                self.sm = SimConnect()
                # _time=400 evita di inondare la coda SimConnect di MSFS
                self.aq = AircraftRequests(self.sm, _time=400)
                self.connected = True
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
                    # Attende 5 secondi prima di riprovare per non bloccare MSFS durante i caricamenti
                    time.sleep(5.0)
                    continue

            try:
                with self._lock:
                    if not self.aq:
                        raise RuntimeError("AircraftRequests non inizializzato")
                    lat = self.aq.get("PLANE_LATITUDE")
                    lon = self.aq.get("PLANE_LONGITUDE")
                    alt = self.aq.get("PLANE_ALTITUDE")
                    gs = self.aq.get("GROUND_VELOCITY")
                    hdg_mag = self.aq.get("PLANE_HEADING_DEGREES_MAGNETIC")
                    hdg_true = self.aq.get("PLANE_HEADING_DEGREES_TRUE")

                    # Legge TITLE solo ogni 10 secondi per non saturare il buffer stringhe di SimConnect
                    now = time.time()
                    if now - self._last_title_check > 10.0:
                        raw_title = self.aq.get("TITLE")
                        self._last_title_check = now
                        if raw_title:
                            if isinstance(raw_title, bytes):
                                raw_title = raw_title.decode("utf-8", errors="ignore")
                            clean = str(raw_title).strip().replace("\x00", "")
                            if clean.startswith("b'") and clean.endswith("'"):
                                clean = clean[2:-1]
                            if clean:
                                self._cached_title = clean[:24]

                # Se MSFS è nel menu principale (coordinate 0,0 o None), resta in DEMO senza forzare riconnessioni
                if lat is None or lon is None or (abs(float(lat)) < 0.01 and abs(float(lon)) < 0.01):
                    self._set_demo_state()
                    time.sleep(2.0)
                    continue

                alt_val = int(round(float(alt))) if alt is not None else 0
                gs_val = int(round(float(gs))) if gs is not None else 0

                import math
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
                time.sleep(1.0)

            except Exception:
                # Se MSFS viene chiuso o cade il pipe, rilascia subito l'handle SimConnect
                self._safe_disconnect()
                self._set_demo_state()
                time.sleep(3.0)

    def _set_demo_state(self):
        self._data["connected"] = False
        self._data["mode"] = "DEMO"
        self._data["aircraft"] = "MSFS 2024 (DEMO)"

    def get_data(self):
        return dict(self._data)

    def shutdown(self):
        self._running = False
        self._safe_disconnect()