import os
import json
import urllib.request
import xml.etree.ElementTree as ET
import webview
from datetime import datetime
from src.core.database import init_db, get_connection

try:
    from src.core.telemetry import TelemetryManager
except ImportError:
    TelemetryManager = None


class DummyTelemetry:
    """Fallback nel caso in cui il modulo telemetria non sia attivo o connesso."""
    def get_data(self):
        return {
            "connected": False,
            "mode": "DEMO",
            "aircraft": "MSFS 2024",
            "alt_ft": "--- ft",
            "gs_kt": "--- kt",
            "hdg_deg": "---°",
            "hdg_true": 0,
            "lat": None,
            "lon": None
        }

    def shutdown(self):
        pass


class AeroGlassAPI:
    def __init__(self):
        self._window = None
        self.flight_plan = []
        
        # 1. Inizializza il database SQLite all'avvio
        init_db()
        
        # 2. Avvia il gestore della telemetria SimConnect
        if TelemetryManager:
            try:
                self._telemetry = TelemetryManager()
            except Exception:
                self._telemetry = DummyTelemetry()
        else:
            self._telemetry = DummyTelemetry()

    # --- DATI INIZIALI E IMPOSTAZIONI (SQLITE) ---
    def get_initial_data(self):
        """Restituisce i dati iniziali all'avvio della UI, incluso il SimBrief ID salvato."""
        simbrief_res = self.get_setting("simbrief_id")
        simbrief_id = simbrief_res.get("value") if simbrief_res.get("success") else ""

        return {
            "airports": [],
            "vors": [],
            "ils": [],
            "simbrief_id": simbrief_id or ""
        }

    def get_setting(self, key):
        """Recupera un'impostazione dalla tabella settings di SQLite."""
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
                row = cursor.fetchone()
                return {"success": True, "value": row["value"] if row else None}
        except Exception as e:
            return {"success": False, "value": None, "error": str(e)}

    def save_setting(self, key, value):
        """Salva o aggiorna un'impostazione nella tabella settings di SQLite."""
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                    (key, str(value).strip())
                )
                conn.commit()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def save_simbrief_id(self, simbrief_id):
        """Metodo ponte chiamato da flightplan.js per salvare il SimBrief User ID."""
        return self.save_setting("simbrief_id", simbrief_id)

    # --- WAYPOINTS UTENTE CUSTOM (SQLITE) ---
    def get_user_waypoints(self):
        """Restituisce tutti i waypoint personalizzati salvati nel DB SQLite."""
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT ident, name, lat, lon, alt_ft, type FROM user_waypoints ORDER BY id ASC")
                rows = cursor.fetchall()
                waypoints = [dict(row) for row in rows]
                return {"success": True, "waypoints": waypoints}
        except Exception as e:
            return {"success": False, "waypoints": [], "error": str(e)}

def save_user_waypoints(self, waypoints):
        """Sincronizza la lista dei waypoint utente nel DB SQLite."""
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM user_waypoints")
                for wp in (waypoints or []):
                    cursor.execute("""
                        INSERT OR REPLACE INTO user_waypoints (ident, name, lat, lon, alt_ft, type)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        str(wp.get("ident", "")).upper(),
                        wp.get("name", "User Waypoint"),
                        float(wp.get("lat", 0.0)),
                        float(wp.get("lon", 0.0)),
                        int(wp.get("alt_ft", 5000)),
                        wp.get("type", "USER")
                    ))
                conn.commit()
            return {"success": True}
        except Exception as e:
            print("Errore save_user_waypoints:", e)
            return {"success": False, "error": str(e)}
        