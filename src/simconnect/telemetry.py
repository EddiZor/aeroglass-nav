import time
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

    def get_aircraft_data(self):
        if not self.connected or not self.aq:
            # Dati di fallback in modalità DEMO se SimConnect non è attivo
            return {
                "connected": False,
                "mode": "DEMO",
                "lat": 41.9,
                "lon": 12.5,
                "alt_ft": 17,
                "gs_kt": 0,
                "hdg_deg": 4,
                "aircraft": "MSFS 2024 (DEMO)"
            }

        try:
            # Estrazione dei dati reali da SimConnect
            lat = self.aq.get("PLANE_LATITUDE") or 41.9
            lon = self.aq.get("PLANE_LONGITUDE") or 12.5
            alt = self.aq.get("PLANE_ALTITUDE")
            alt_ft = int(alt * 3.28084) if alt is not None else 0
            
            gs = self.aq.get("GROUND_VELOCITY")
            gs_kt = int(gs * 1.94384) if gs is not None else 0
            
            hdg = self.aq.get("PLANE_HEADING_DEGREES_GYRO") or 0
            hdg_deg = int(hdg) % 360

            # Lettura e pulizia del titolo dell'aeromobile
            aircraft_title = self.aq.get("TITLE")
            if isinstance(aircraft_title, bytes):
                try:
                    aircraft_title = aircraft_title.decode('utf-8', errors='ignore').strip(" '")
                except:
                    pass

            if not aircraft_title:
                aircraft_title = self.aq.get("ATC_MODEL") or "MSFS 2024"
                if isinstance(aircraft_title, bytes):
                    try:
                        aircraft_title = aircraft_title.decode('utf-8', errors='ignore').strip(" '")
                    except:
                        pass

            return {
                "connected": True,
                "mode": "LIVE",
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "alt_ft": alt_ft,
                "gs_kt": gs_kt,
                "hdg_deg": hdg_deg,
                "aircraft": str(aircraft_title).strip()
            }
        except Exception:
            self.connected = False
            return {
                "connected": False,
                "mode": "DISCONNECTED",
                "lat": 41.9,
                "lon": 12.5,
                "alt_ft": "---",
                "gs_kt": "---",
                "hdg_deg": "---",
                "aircraft": "MSFS 2024"
            }