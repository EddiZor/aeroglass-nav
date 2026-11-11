import sqlite3
import os

DB_PATH = os.path.join(os.path.expanduser("~"), ".aeroglass_nav", "aeroglass.db")

def get_connection():
    """Crea la cartella di sistema se non esiste e restituisce la connessione SQLite."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Permette di accedere alle colonne per nome
    return conn

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
        
        # 3. Tabella Impostazioni generali (es. SimBrief ID)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        conn.commit()