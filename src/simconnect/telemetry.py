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
            "gs_num": 0,
            "fuel_gal": None,
            "on_ground": True,
            "hdg_deg": "250°",
            "hdg_true": 250.0,
            "wind_dir": None,
            "wind_spd": None
        }

        self._thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._thread.start()

    def connect(self):
        return self.connected

    def _safe_disconnect(self):
        old_sm = self.sm
        self.connected = False
        self.aq = None
        self.sm = None
        if old_sm is not None:
            try:
                old_sm.exit()
            except Exception:
                pass

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
            # _time=900ms evita richieste duplicate nel ciclo da 1s; _attemps=1 evita attese bloccanti sulla DLL
            try:
                new_aq = AircraftRequests(new_sm, _time=900, _attemps=1)
            except TypeError:
                new_aq = AircraftRequests(new_sm, _time=900)
            self.sm = new_sm
            self.aq = new_aq
            self.connected = True
            self._fail_count = 0
            return True
        except Exception:
            self._safe_disconnect()
            return False

    def _safe_get(self, aq_obj, var_name):
        """Legge una SimVar senza mai bloccare il lock della UI."""
        if aq_obj is None:
            return None
        try:
            return aq_obj.get(var_name)
        except Exception as ex:
            # Se la pipe SimConnect è caduta (simulatore chiuso), rilancia l'eccezione per disconnettere
            err_msg = str(ex).lower()
            if "pipe" in err_msg or "connect" in err_msg or "handle" in err_msg or "0x" in err_msg:
                raise
            return None

    def _poll_loop(self):
        while self._running:
            if not self.connected or self.aq is None:
                if not self._try_connect():
                    self._set_demo_state()
                    # Backoff rilassato (5 secondi) quando MSFS 2024 non è in esecuzione
                    for _ in range(10):
                        if not self._running:
                            return
                        time.sleep(0.5)
                    continue

            try:
                aq_ref = self.aq
                lat = self._safe_get(aq_ref, "PLANE_LATITUDE")
                lon = self._safe_get(aq_ref, "PLANE_LONGITUDE")

                # Se MSFS 2024 è nel menu principale o in caricamento, lat/lon possono essere None o (0, 0).
                # NON disconnettiamo SimConnect (evita il loop SimConnect_Open/Close che blocca MSFS 2024).
                if lat is None or lon is None or (abs(float(lat)) < 0.001 and abs(float(lon)) < 0.001):
                    self._fail_count += 1
                    # Solo dopo ~60 secondi consecutivi di assenza totale di risposta verifichiamo la pipe
                    if self._fail_count >= 40:
                        self._safe_disconnect()
                        self._set_demo_state()
                    time.sleep(1.5)
                    continue

                self._fail_count = 0

                alt = self._safe_get(aq_ref, "PLANE_ALTITUDE")
                gs = self._safe_get(aq_ref, "GROUND_VELOCITY")
                hdg_mag = self._safe_get(aq_ref, "PLANE_HEADING_DEGREES_MAGNETIC")
                hdg_true = self._safe_get(aq_ref, "PLANE_HEADING_DEGREES_TRUE")
                fuel_gal = self._safe_get(aq_ref, "FUEL_TOTAL_QUANTITY")
                on_ground = self._safe_get(aq_ref, "SIM_ON_GROUND")
                wind_dir = self._safe_get(aq_ref, "AMBIENT_WIND_DIRECTION")
                wind_spd = self._safe_get(aq_ref, "AMBIENT_WIND_VELOCITY")
                in_cloud = self._safe_get(aq_ref, "AMBIENT_IN_CLOUD")

                now = time.time()
                if (now - self._last_meta_time) >= 30.0 or self._cached_title == "MSFS 2024":
                    self._last_meta_time = now
                    title_raw = self._safe_get(aq_ref, "TITLE")
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

                w_dir_val = int(round(float(wind_dir))) % 360 if wind_dir is not None else None
                w_spd_val = int(round(float(wind_spd))) if wind_spd is not None else None

                new_snapshot = {
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
                    "hdg_true": hdg_true_deg,
                    "wind_dir": w_dir_val,
                    "wind_spd": w_spd_val,
                    "in_cloud": bool(int(in_cloud)) if in_cloud is not None else False
                }

                # Lock acquisito solo per pochi microsecondi durante lo scambio del dizionario in memoria
                with self._lock:
                    self._data = new_snapshot

                time.sleep(1.0)

            except Exception:
                self._fail_count += 1
                if self._fail_count >= 3:
                    self._safe_disconnect()
                    self._set_demo_state()
                time.sleep(2.5)

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