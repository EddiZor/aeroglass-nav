import os
import time
import math
import ctypes
import threading
from src.core.diagnostics import log_diag, install_crash_hooks, SIMCONNECT_GLOBAL_LOCK

install_crash_hooks()

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
        self._last_heartbeat_time = 0.0
        self._cached_title = "MSFS 2024"
        self._fail_count = 0
        self._var_cache = {}

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

        self._thread = threading.Thread(target=self._poll_loop, name="TelemetryPoll", daemon=True)
        self._thread.start()

    def connect(self):
        return self.connected

    def _safe_disconnect(self):
        with SIMCONNECT_GLOBAL_LOCK:
            old_sm = self.sm
            was_connected = self.connected
            self.connected = False
            self.aq = None
            self.sm = None
            self._var_cache.clear()
            if old_sm is not None:
                try:
                    old_sm.exit()
                except Exception:
                    pass
            if was_connected:
                log_diag("SIMCONNECT", "Connessione SimConnect chiusa (_safe_disconnect).")

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
            with SIMCONNECT_GLOBAL_LOCK:
                new_sm = SimConnect()
                # Usa i 4 tentativi standard di AircraftRequests così MSFS 2024 ha il tempo (~15ms) di rispondere sulla pipe
                new_aq = AircraftRequests(new_sm, _time=800)
                self.sm = new_sm
                self.aq = new_aq
                self._var_cache = {}
                self.connected = True
                self._fail_count = 0
                log_diag("SIMCONNECT", "Connessione SimConnect telemetria stabilita con MSFS 2024.")
                return True
        except Exception:
            self._safe_disconnect()
            return False

    def _safe_get(self, aq_obj, var_name):
        """Legge una SimVar tramite aq_obj.get() lasciando intatto il ciclo di vita di Python-SimConnect."""
        if aq_obj is None:
            return None
        try:
            with SIMCONNECT_GLOBAL_LOCK:
                return aq_obj.get(var_name)
        except Exception as ex:
            err_msg = str(ex).lower()
            log_diag("SIM_ERR", f"Eccezione lettura SimVar {var_name}: {ex}")
            if "pipe" in err_msg or "connect" in err_msg or "handle" in err_msg or "0x" in err_msg:
                raise
            return None

    def _poll_loop(self):
        last_slow_vars_time = 0.0
        fuel_gal, on_ground, wind_dir, wind_spd, in_cloud = None, 1, None, None, 0

        while self._running:
            if not self.connected or self.aq is None:
                if not self._try_connect():
                    self._set_demo_state()
                    for _ in range(10):
                        if not self._running:
                            return
                        time.sleep(0.5)
                    continue

            try:
                aq_ref = self.aq
                lat = self._safe_get(aq_ref, "PLANE_LATITUDE")

                # Se lat è None o ~0 (Menu/Hangar/Caricamento), non interroga nemmeno lon e attende 5 secondi
                if lat is None or abs(float(lat)) < 0.05:
                    self._fail_count += 1
                    if self._fail_count == 1:
                        log_diag("SIM_MENU", f"MSFS 2024 in Menu/Caricamento (lat={lat}) — polling ridotto a 5s.")
                        self._set_demo_state()
                    time.sleep(5.0)
                    continue

                lon = self._safe_get(aq_ref, "PLANE_LONGITUDE")
                if lon is None:
                    self._fail_count += 1
                    time.sleep(5.0)
                    continue

                if self._fail_count > 0:
                    log_diag("SIM_LIVE", f"Ricezione coordinate valide ripresa ({float(lat):.4f}, {float(lon):.4f}).")
                self._fail_count = 0

                alt = self._safe_get(aq_ref, "PLANE_ALTITUDE")
                gs = self._safe_get(aq_ref, "GROUND_VELOCITY")
                hdg_mag = self._safe_get(aq_ref, "PLANE_HEADING_DEGREES_MAGNETIC")
                hdg_true = self._safe_get(aq_ref, "PLANE_HEADING_DEGREES_TRUE")

                # Legge carburante, meteo e stato a terra solo ogni 5 secondi per dimezzare le richieste a SimConnect
                now_poll = time.time()
                if (now_poll - last_slow_vars_time) >= 5.0:
                    last_slow_vars_time = now_poll
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
                    if title_str and title_str != self._cached_title:
                        self._cached_title = title_str
                        log_diag("AIRCRAFT", f"Aeromobile rilevato: {self._cached_title}")

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

                with self._lock:
                    self._data = new_snapshot

                # Heartbeat diagnostico ogni 30 secondi su disco (monitora RAM/Pagefile e stato volo)
                if (now - self._last_heartbeat_time) >= 30.0:
                    self._last_heartbeat_time = now
                    log_diag("HEARTBEAT", f"ACFT={self._cached_title} ALT={alt_val}ft GS={gs_val}kt POS=({float(lat):.4f},{float(lon):.4f})")

                time.sleep(1.0)

            except Exception as loop_err:
                self._fail_count += 1
                log_diag("POLL_EXC", f"Errore ciclo telemetria (#{self._fail_count}): {loop_err}")
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

    def send_flight_plan_to_aircraft(self, pln_path):
        """Invia il file .pln attivo al sistema di navigazione dell'aeromobile tramite SimConnect.
           Restituisce no_nav_system=True se l'aeromobile in uso non dispone di un sistema di navigazione."""
        snap = self.get_data()
        acft_title = str(snap.get("aircraft") or "MSFS 2024").strip()
        log_diag("FPL_SEND", f"Richiesta invio piano di volo ({pln_path}) a {acft_title}")

        if not self.connected or self.sm is None or snap.get("mode") == "DEMO":
            log_diag("FPL_SEND", "Invio annullato: simulatore in modalità DEMO o non connesso.")
            return {
                "success": False,
                "no_nav_system": True,
                "aircraft": acft_title,
                "message": f"L'aeromobile in uso ({acft_title}) non dispone di un sistema di navigazione attivo."
            }

        title_low = acft_title.lower()

        no_nav_keywords = (
            "152", "c152", "j-3", "j3 cub", "savage cub", "top rudder", "103 solo",
            "aerolite", "stearman", "pitts", "bucker", "bu-131", "tiger moth",
            "spirit of st", "wright", "bleriot", "jenny", "curtiss", "glider",
            "sailplane", "discus", "dg-1001", "ls8", "sgs 1-26", "balloon",
            "hot air", "paramotor", "powrachute", "ornithopter", "cabri", "bell 47",
            "dr400-100", "cadet"
        )
        nav_override_keywords = ("garmin", "g1000", "g3000", "g3x", "gtn", "gns", "gps", "fms", "rnav")

        if any(k in title_low for k in no_nav_keywords) and not any(ok in title_low for ok in nav_override_keywords):
            log_diag("FPL_SEND", f"Aeromobile {acft_title} identificato come privo di sistema di navigazione.")
            return {
                "success": False,
                "no_nav_system": True,
                "aircraft": acft_title,
                "message": f"L'aeromobile in uso ({acft_title}) non dispone di un sistema di navigazione."
            }

        ap_avail = self._safe_get(self.aq, "AUTOPILOT_AVAILABLE")
        avionics_on = self._safe_get(self.aq, "AVIONICS_MASTER_SWITCH")

        pln_no_ext = os.path.splitext(pln_path)[0]
        loaded_ok = False

        with SIMCONNECT_GLOBAL_LOCK:
            try:
                if hasattr(self.sm, "dll") and hasattr(self.sm, "hSimConnect") and hasattr(self.sm.dll, "SimConnect_FlightPlanLoad"):
                    fn_load = self.sm.dll.SimConnect_FlightPlanLoad
                    fn_load.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
                    fn_load.restype = ctypes.c_long

                    for candidate_path in (pln_no_ext, pln_path):
                        hr = fn_load(self.sm.hSimConnect, os.path.abspath(candidate_path).encode("utf-8"))
                        if hr == 0:
                            loaded_ok = True
                            break
            except Exception as e_load:
                log_diag("FPL_ERR", f"Errore SimConnect_FlightPlanLoad primario: {e_load}")

            if not loaded_ok:
                try:
                    from src.core.msfs_ground_db import _find_modern_simconnect_dll
                    dll, _ = _find_modern_simconnect_dll()
                    if dll and hasattr(dll, "SimConnect_FlightPlanLoad"):
                        h_sim = ctypes.c_void_p()
                        if dll.SimConnect_Open(ctypes.byref(h_sim), b"AeroGlass-Nav FPL", None, 0, None, 0) == 0 and h_sim.value:
                            try:
                                fn_load = dll.SimConnect_FlightPlanLoad
                                fn_load.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
                                fn_load.restype = ctypes.c_long
                                for candidate_path in (pln_no_ext, pln_path):
                                    if fn_load(h_sim, os.path.abspath(candidate_path).encode("utf-8")) == 0:
                                        loaded_ok = True
                                        break
                            finally:
                                dll.SimConnect_Close(h_sim)
                except Exception as e_fb:
                    log_diag("FPL_ERR", f"Errore SimConnect_FlightPlanLoad fallback: {e_fb}")

        time.sleep(0.25)
        wp_count = self._safe_get(self.aq, "GPS_FLIGHT_PLAN_WP_COUNT")
        gps_active = self._safe_get(self.aq, "GPS_IS_ACTIVE_FLIGHT_PLAN")

        known_nav_aircraft = (
            "fenix", "a319", "a320", "a321", "a330", "a350", "a380",
            "b737", "b747", "b777", "b787", "atr", "mb-339", "mb339",
            "pioneer", "172", "208", "caravan", "bonanza", "baron", "da40",
            "da62", "sr22", "tbm", "cj4", "longitude", "vision", "pc-12",
            "pc-24", "king air", "350i", "crj", "learjet", "bae", "rj",
            "garmin", "g1000", "g3000", "g3x", "airbus", "boeing", "cessna"
        )
        is_known_nav = any(k in title_low for k in known_nav_aircraft)

        has_nav = bool(
            (wp_count is not None and float(wp_count) > 0)
            or (gps_active is not None and int(float(gps_active)) > 0)
            or (ap_avail is not None and int(float(ap_avail)) > 0)
            or (avionics_on is not None and int(float(avionics_on)) > 0 and is_known_nav)
            or is_known_nav
        )

        if not has_nav:
            log_diag("FPL_SEND", f"Nessun sistema di navigazione rilevato su {acft_title}")
            return {
                "success": False,
                "no_nav_system": True,
                "aircraft": acft_title,
                "message": f"L'aeromobile in uso ({acft_title}) non dispone di un sistema di navigazione."
            }

        log_diag("FPL_SEND", f"Piano di volo inviato con successo a {acft_title} (simconnect_loaded={loaded_ok})")
        return {
            "success": True,
            "no_nav_system": False,
            "aircraft": acft_title,
            "simconnect_loaded": loaded_ok,
            "message": f"Piano di volo inviato al sistema di navigazione di {acft_title}."
        }

    def shutdown(self):
        self._running = False
        self._safe_disconnect()