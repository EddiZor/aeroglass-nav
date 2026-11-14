import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.expanduser("~"), ".aeroglass_nav", "aeroglass.db")


@contextmanager
def get_connection():
    """Crea la cartella se non esiste, apre la connessione SQLite in modalità WAL e la chiude sempre a fine blocco."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Inizializza le tabelle del database se non esistono."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Tabella Waypoints Utente (Custom)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_waypoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ident TEXT UNIQUE NOT NULL,
                name TEXT,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                alt_ft INTEGER NOT NULL,
                type TEXT DEFAULT 'USER'
            )
        """)

        # 2. Tabella Storico Voli / Fuel Log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS flight_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                aircraft TEXT,
                departure TEXT,
                destination TEXT,
                distance_nm REAL,
                fuel_used_gal REAL
            )
        """)

        # 3. Tabella Impostazioni generali (es. SimBrief ID e Piano di Volo attivo)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)

        # 4. Tabella Cache Aeroporti ICAO risolti (coordinate, quota e ultimo METAR)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cached_airports (
                icao TEXT PRIMARY KEY,
                name TEXT,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                elev INTEGER DEFAULT 0,
                rwy TEXT DEFAULT '',
                metar TEXT DEFAULT ''
            )
        """)
        conn.commit()