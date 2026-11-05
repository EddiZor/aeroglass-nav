import math
try:
    from SimConnect import SimConnect, AircraftRequests
except ImportError:
    SimConnect = None
    AircraftRequests = None

class TelemetryManager:
    def __init__(self):
        self.sm = None
        self.aq = None
        self.connected = False

    def connect(self):
        if SimConnect is None:
            self.connected = False
            return False
        
        try:
            self.sm = SimConnect()
            self.aq = AircraftRequests(self.sm, _time=200)
            self.connected = True
            return True
        except Exception:
            self.connected = False
            return False

    def _normalize_angle(self, val):
        if val is None:
            return 0
        val = float(val)
        # Python-SimConnect restituisce gli angoli in radianti (0 .. 2*pi = 6.283185)
        # Se il valore è nel range dei radianti, lo convertiamo in gradi
        if abs(val) <= (2 * math.pi + 0.05) and val != 0:
            return int(round(math.degrees(val))) % 360
        return int(round(val)) % 360

    def get_aircraft_data(self):
        if not self.connected or not self.aq:
            return {
                "connected": False,
                "mode": "DEMO",
                "lat": 41.8003,
                "lon": 12.2389,
                "alt_ft": 17,
                "gs_kt": 0,
                "hdg_deg": 250,
                "hdg_true": 250,
                "aircraft": "MSFS 2024 (DEMO)"
            }

        try:
            lat = self.aq.get("PLANE_LATITUDE") or 41.8003
            lon = self.aq.get("PLANE_LONGITUDE") or 12.2389
            
            alt = self.aq.get("PLANE_ALTITUDE")
            alt_ft = int(alt) if alt is not None else 0
            
            gs = self.aq.get("GROUND_VELOCITY")
            gs_kt = int(gs) if gs is not None else 0
            
            # Prua Vera per l'orientamento geometrico sulla mappa (True North)
            hdg_true_raw = self.aq.get("PLANE_HEADING_DEGREES_TRUE")
            # Prua Magnetica per il display testuale in cabina
            hdg_mag_raw = self.aq.get("PLANE_HEADING_DEGREES_MAGNETIC")
            if hdg_mag_raw is None:
                hdg_mag_raw = self.aq.get("PLANE_HEADING_DEGREES_GYRO")

            hdg_true = self._normalize_angle(hdg_true_raw)
            hdg_mag = self._normalize_angle(hdg_mag_raw) if hdg_mag_raw is not None else hdg_true

            # Se l'aereo è in movimento (> 3 nodi), calcoliamo o usiamo la prua vera per allineare l'icona
            aircraft_title = self.aq.get("TITLE")
            if isinstance(aircraft_title, bytes):
                try:
                    aircraft_title = aircraft_title.decode('utf-8', errors='ignore').strip(" '\x00")
                except Exception:
                    pass

            if not aircraft_title:
                aircraft_title = self.aq.get("ATC_MODEL") or "MSFS 2024"
                if isinstance(aircraft_title, bytes):
                    try:
                        aircraft_title = aircraft_title.decode('utf-8', errors='ignore').strip(" '\x00")
                    except Exception:
                        pass

            return {
                "connected": True,
                "mode": "LIVE",
                "lat": round(float(lat), 6),
                "lon": round(float(lon), 6),
                "alt_ft": alt_ft,
                "gs_kt": gs_kt,
                "hdg_deg": hdg_mag,
                "hdg_true": hdg_true,
                "aircraft": str(aircraft_title).strip()
            }
        except Exception:
            self.connected = False
            return {
                "connected": False,
                "mode": "DISCONNECTED",
                "lat": 41.8003,
                "lon": 12.2389,
                "alt_ft": "---",
                "gs_kt": "---",
                "hdg_deg": "---",
                "hdg_true": 0,
                "aircraft": "MSFS 2024"
            }