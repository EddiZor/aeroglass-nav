import math
import time
import threading


class TelemetryManager:
    def __init__(self):
        self._sm = None
        self._aq = None
        self._connected = False
        self._null_reads = 0
        self._data = self._demo_payload()
        self._thread = None
        self._started = False

    def _start_worker_if_needed(self):
        if not self._started:
            self._started = True
            self._thread = threading.Thread(target=self._worker_loop, daemon=True)
            self._thread.start()

    def _demo_payload(self):
        return {
            "connected": False,
            "mode": "DEMO",
            "aircraft": "MSFS 2024 (DEMO)",
            "lat": 41.8003,
            "lon": 12.2389,
            "alt_ft": "17 ft",
            "gs_kt": "0 kt",
            "hdg_deg": "250°",
            "hdg_true": 250
        }

    def _reset_connection(self):
        self._sm = None
        self._aq = None
        self._connected = False
        self._null_reads = 0
        self._data = self._demo_payload()

    def _normalize_angle(self, val):
        if val is None:
            return 0
        val = float(val)
        if 0 < abs(val) <= (2 * math.pi + 0.001):
            deg = math.degrees(val)
            return int(round(deg)) % 360
        return int(round(val)) % 360

    def _worker_loop(self):
        # Piccola pausa iniziale per lasciare completare il rendering della UI
        time.sleep(0.4)

        try:
            from SimConnect import SimConnect, AircraftRequests
        except ImportError:
            SimConnect = None
            AircraftRequests = None

        while True:
            if SimConnect is None:
                self._reset_connection()
                time.sleep(2.0)
                continue

            if not self._connected or self._sm is None or self._aq is None:
                try:
                    sm = SimConnect()
                    aq = AircraftRequests(sm, _time=200)
                    self._sm = sm
                    self._aq = aq
                    self._connected = True
                    self._null_reads = 0
                except Exception:
                    self._reset_connection()
                    time.sleep(2.0)
                    continue

            try:
                lat = self._aq.get("PLANE_LATITUDE")
                lon = self._aq.get("PLANE_LONGITUDE")

                if lat is None or lon is None or (abs(float(lat)) < 0.001 and abs(float(lon)) < 0.001):
                    self._null_reads += 1
                    self._data = self._demo_payload()
                    if self._null_reads >= 3:
                        self._reset_connection()
                    time.sleep(1.0)
                    continue

                self._null_reads = 0
                alt = self._aq.get("PLANE_ALTITUDE")
                gs = self._aq.get("GROUND_VELOCITY")
                hdg_mag = self._aq.get("PLANE_HEADING_DEGREES_MAGNETIC")
                hdg_true = self._aq.get("PLANE_HEADING_DEGREES_TRUE")
                title = self._aq.get("TITLE")

                alt_val = int(round(float(alt))) if alt is not None else 0
                gs_val = int(round(float(gs))) if gs is not None else 0
                mag_deg = self._normalize_angle(hdg_mag)
                true_deg = self._normalize_angle(hdg_true) if hdg_true is not None else mag_deg

                acft_name = "MSFS 2024"
                if title:
                    if isinstance(title, bytes):
                        title = title.decode("utf-8", errors="ignore")
                    acft_name = str(title).strip().replace("\x00", "")
                    if acft_name.startswith("b'") and acft_name.endswith("'"):
                        acft_name = acft_name[2:-1]
                    acft_name = acft_name[:24]

                self._data = {
                    "connected": True,
                    "mode": "LIVE",
                    "aircraft": acft_name,
                    "lat": round(float(lat), 6),
                    "lon": round(float(lon), 6),
                    "alt_ft": f"{alt_val} ft",
                    "gs_kt": f"{gs_val} kt",
                    "hdg_deg": f"{mag_deg}°",
                    "hdg_true": true_deg
                }
            except Exception:
                self._reset_connection()

            time.sleep(0.5)

    def connect(self):
        self._start_worker_if_needed()
        return self._connected

    def get_data(self):
        self._start_worker_if_needed()
        return self._data