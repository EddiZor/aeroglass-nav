import os
import sqlite3
from contextlib import contextmanager

# Punta direttamente al database nella cartella src/core/ del progetto
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aeroglass.db")


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
    """Inizializza le tabelle del database se non esistono e ripulisce eventuali cache ground incomplete."""
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

        # Tabella Cartine Aeroportuali & Overlay Georeferenziati (AIP/ENAV)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chart_overlays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                icao TEXT NOT NULL,
                name TEXT NOT NULL,
                chart_type TEXT DEFAULT 'AIP',
                file_path TEXT NOT NULL,
                is_pdf INTEGER DEFAULT 0,
                bounds_json TEXT,
                opacity REAL DEFAULT 0.75,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_charts_icao ON chart_overlays(icao);")

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

        # 5. Tabelle Database Mondiale Aeroporti, Piste, Frequenze e Cache Ground Map (OurAirports & OSM)
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS world_airports (
                icao TEXT PRIMARY KEY,
                type TEXT,
                name TEXT,
                lat REAL,
                lon REAL,
                elev_ft INTEGER,
                country TEXT,
                municipality TEXT
            );

            CREATE TABLE IF NOT EXISTS airport_ground_cache (
                icao TEXT PRIMARY KEY,
                layout_json TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS world_runways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                apt_icao TEXT,
                le_ident TEXT,
                he_ident TEXT,
                length_ft INTEGER,
                width_ft INTEGER,
                surface TEXT,
                lighted INTEGER,
                le_hdg REAL,
                he_hdg REAL,
                le_lat REAL,
                le_lon REAL,
                he_lat REAL,
                he_lon REAL
            );

            CREATE TABLE IF NOT EXISTS world_frequencies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                apt_icao TEXT,
                type TEXT,
                description TEXT,
                freq_mhz REAL
            );

            CREATE INDEX IF NOT EXISTS idx_world_apt_coords ON world_airports (lat, lon, type);
            CREATE INDEX IF NOT EXISTS idx_world_apt_name ON world_airports (name);
            CREATE INDEX IF NOT EXISTS idx_world_rwy_apt ON world_runways (apt_icao);
            CREATE INDEX IF NOT EXISTS idx_world_freq_apt ON world_frequencies (apt_icao);
        """)

        # 6. Migrazione automatica colonne coordinate soglie pista se il DB preesistente non le aveva
        try:
            existing_cols = {row["name"] for row in cursor.execute("PRAGMA table_info(world_runways)").fetchall()}
            for col_name in ("le_lat", "le_lon", "he_lat", "he_lon"):
                if col_name not in existing_cols:
                    cursor.execute(f"ALTER TABLE world_runways ADD COLUMN {col_name} REAL")
        except Exception:
            pass

        # 7. Copia automatica delle piste con coordinate reali (le_lat/he_lat) da ~/.aeroglass_nav/aeroglass.db
        try:
            has_coords = cursor.execute("SELECT COUNT(*) FROM world_runways WHERE le_lat IS NOT NULL").fetchone()[0]
            legacy_db = os.path.join(os.path.expanduser("~"), ".aeroglass_nav", "aeroglass.db")
            if has_coords == 0 and os.path.isfile(legacy_db) and os.path.abspath(legacy_db) != os.path.abspath(DB_PATH):
                conn.commit()
                cursor.execute("ATTACH DATABASE ? AS legacy_home", (legacy_db,))
                legacy_cols = {row["name"] for row in cursor.execute("PRAGMA legacy_home.table_info(world_runways)").fetchall()}
                if "le_lat" in legacy_cols:
                    cnt = cursor.execute("SELECT COUNT(*) FROM legacy_home.world_runways WHERE le_lat IS NOT NULL").fetchone()[0]
                    if cnt > 0:
                        cursor.execute("DELETE FROM world_runways")
                        cursor.execute("""
                            INSERT INTO world_runways (apt_icao, le_ident, he_ident, length_ft, width_ft, surface, lighted, le_hdg, he_hdg, le_lat, le_lon, he_lat, he_lon)
                            SELECT apt_icao, le_ident, he_ident, length_ft, width_ft, surface, lighted, le_hdg, he_hdg, le_lat, le_lon, he_lat, he_lon
                            FROM legacy_home.world_runways
                        """)
                        print(f"[Database] Migrate {cnt} piste con coordinate esatte da ~/.aeroglass_nav/aeroglass.db")
                conn.commit()
                cursor.execute("DETACH DATABASE legacy_home")
        except Exception as mig_err:
            print("[Database] Avviso migrazione piste:", mig_err)

        # 8. Pulizia automatica dei record vuoti, procedurali o runways_only in airport_ground_cache
        try:
            cursor.execute("""
                DELETE FROM airport_ground_cache
                WHERE layout_json IS NULL
                   OR layout_json = ''
                   OR layout_json LIKE '%"source": "procedural"%'
                   OR layout_json LIKE '%"source": "runways_only"%'
                   OR (layout_json LIKE '%"runways": []%' AND layout_json LIKE '%"taxiways": []%')
                   OR (layout_json LIKE '%"taxiways": []%' AND layout_json LIKE '%"stands": []%')
            """)
        except Exception:
            pass

        conn.commit()