import os
import sys
import shutil
import sqlite3
from contextlib import contextmanager


def _sync_master_to_user_db(bundled_db, user_db):
    """Sincronizza le tabelle aeronautiche di riferimento e la cache ground dal DB master
    al database utente (~/.aeroglass_nav/aeroglass.db) preservando tutti i dati personali."""
    if not os.path.isfile(bundled_db) or not os.path.isfile(user_db):
        return
    try:
        sig = f"{os.path.getsize(bundled_db)}_{int(os.path.getmtime(bundled_db))}"
        conn = sqlite3.connect(user_db, timeout=10.0)
        try:
            conn.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)")
            row = conn.execute("SELECT value FROM settings WHERE key = '_master_db_sig'").fetchone()
            if row and row[0] == sig:
                return

            conn.execute("ATTACH DATABASE ? AS master_db", (bundled_db,))
            master_tables = {
                r[0] for r in conn.execute("SELECT name FROM master_db.sqlite_master WHERE type='table'").fetchall()
            }
            user_tables = {
                r[0] for r in conn.execute("SELECT name FROM main.sqlite_master WHERE type='table'").fetchall()
            }

            # 1. Tabelle aeronautiche di sola lettura: ricreate in modo pulito dal master
            replace_tables = (
                "world_airports", "world_runways", "world_frequencies",
                "world_navaids", "world_aircraft_types", "nav_fixes", "airway_segments"
            )
            for tbl in replace_tables:
                if tbl not in master_tables:
                    continue
                ddl_row = conn.execute(
                    "SELECT sql FROM master_db.sqlite_master WHERE type='table' AND name=?", (tbl,)
                ).fetchone()
                if not ddl_row or not ddl_row[0]:
                    continue
                conn.execute(f"DROP TABLE IF EXISTS main.{tbl}")
                conn.execute(ddl_row[0])
                conn.execute(f"INSERT INTO main.{tbl} SELECT * FROM master_db.{tbl}")
                for idx_row in conn.execute(
                    "SELECT sql FROM master_db.sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL",
                    (tbl,)
                ).fetchall():
                    conn.execute(idx_row[0])

            # 2. Tabelle miste (master + dati utente/MSFS): merge non distruttivo
            if "airport_ground_cache" in master_tables:
                if "airport_ground_cache" not in user_tables:
                    ddl_row = conn.execute(
                        "SELECT sql FROM master_db.sqlite_master WHERE type='table' AND name='airport_ground_cache'"
                    ).fetchone()
                    if ddl_row and ddl_row[0]:
                        conn.execute(ddl_row[0])
                else:
                    conn.execute("""
                        DELETE FROM main.airport_ground_cache
                        WHERE layout_json IS NULL OR layout_json = ''
                           OR layout_json LIKE '%"source": "procedural"%'
                           OR layout_json LIKE '%"source": "runways_only"%'
                    """)
                conn.execute("""
                    INSERT OR IGNORE INTO main.airport_ground_cache (icao, layout_json, updated_at)
                    SELECT icao, layout_json, updated_at FROM master_db.airport_ground_cache
                """)

            if "world_airlines" in master_tables:
                if "world_airlines" not in user_tables:
                    ddl_row = conn.execute(
                        "SELECT sql FROM master_db.sqlite_master WHERE type='table' AND name='world_airlines'"
                    ).fetchone()
                    if ddl_row and ddl_row[0]:
                        conn.execute(ddl_row[0])
                conn.execute("""
                    INSERT OR IGNORE INTO main.world_airlines (icao, name, country, is_va)
                    SELECT icao, name, country, is_va FROM master_db.world_airlines
                """)

            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('_master_db_sig', ?)", (sig,))
            conn.commit()
            conn.execute("DETACH DATABASE master_db")
        finally:
            conn.close()
    except Exception as e:
        print(f"[Database] Avviso sincronizzazione master DB: {e}")


def _resolve_db_path():
    """Unica fonte di verità per aeroglass.db:
    - In sviluppo: src/core/aeroglass.db
    - In eseguibile PyInstaller: ~/.aeroglass_nav/aeroglass.db (copiato e sincronizzato dal DB master)
    """
    if hasattr(sys, "_MEIPASS"):
        user_dir = os.path.join(os.path.expanduser("~"), ".aeroglass_nav")
        os.makedirs(user_dir, exist_ok=True)
        user_db = os.path.join(user_dir, "aeroglass.db")
        bundled_db = os.path.join(sys._MEIPASS, "src", "core", "aeroglass.db")
        if not os.path.isfile(user_db):
            if os.path.isfile(bundled_db):
                shutil.copy2(bundled_db, user_db)
        else:
            _sync_master_to_user_db(bundled_db, user_db)
        return user_db
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "aeroglass.db")


DB_PATH = _resolve_db_path()


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

        # 9. Tabelle Compagnie Aeree / VA e Categorie Aeromobili (per IVAO / VATSIM)
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS world_airlines (
                icao TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                country TEXT DEFAULT '',
                is_va INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS world_aircraft_types (
                icao TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                name TEXT DEFAULT ''
            );
        """)

        if cursor.execute("SELECT COUNT(*) FROM world_airlines").fetchone()[0] == 0:
            default_airlines = [
                ("ITY", "ITA Airways", "IT", 0), ("AZA", "Alitalia / ITA", "IT", 0),
                ("ADH", "Air Dolomiti", "IT", 0), ("NOS", "Neos", "IT", 0),
                ("BPA", "Blue Panorama", "IT", 0), ("RYR", "Ryanair", "IE", 0),
                ("EZY", "easyJet", "GB", 0), ("EJU", "easyJet Europe", "AT", 0),
                ("DLH", "Lufthansa", "DE", 0), ("AFR", "Air France", "FR", 0),
                ("BAW", "British Airways", "GB", 0), ("IBE", "Iberia", "ES", 0),
                ("VLG", "Vueling", "ES", 0), ("KLM", "KLM", "NL", 0),
                ("SWR", "Swiss", "CH", 0), ("AUA", "Austrian", "AT", 0),
                ("TAP", "TAP Portugal", "PT", 0), ("WZZ", "Wizz Air", "HU", 0),
                ("WMT", "Wizz Air Malta", "MT", 0), ("SAS", "SAS", "SE", 0),
                ("THY", "Turkish Airlines", "TR", 0), ("UAE", "Emirates", "AE", 0),
                ("QTR", "Qatar Airways", "QA", 0), ("ETD", "Etihad", "AE", 0),
                ("AAL", "American Airlines", "US", 0), ("DAL", "Delta Air Lines", "US", 0),
                ("UAL", "United Airlines", "US", 0), ("SWA", "Southwest", "US", 0),
                ("ACA", "Air Canada", "CA", 0), ("FIN", "Finnair", "FI", 0),
                ("LOT", "LOT Polish", "PL", 0), ("EWG", "Eurowings", "DE", 0),
                ("CFG", "Condor", "DE", 0), ("TUI", "TUI Airways", "GB", 0),
                ("TRA", "Transavia", "NL", 0), ("TVF", "Transavia France", "FR", 0),
                ("AEE", "Aegean Airlines", "GR", 0), ("VOE", "Volotea", "ES", 0),
                ("BEL", "Brussels Airlines", "BE", 0), ("EIN", "Aer Lingus", "IE", 0),
                ("FDX", "FedEx Express", "US", 0), ("UPS", "UPS Airlines", "US", 0),
                ("BCS", "DHL / EAT Leipzig", "DE", 0), ("CLX", "Cargolux", "LU", 0),
                ("IAM", "Aeronautica Militare", "IT", 0),
                ("IVV", "Italiani Volanti VA", "IT", 1)
            ]
            cursor.executemany(
                "INSERT OR IGNORE INTO world_airlines (icao, name, country, is_va) VALUES (?, ?, ?, ?)",
                default_airlines
            )

        if cursor.execute("SELECT COUNT(*) FROM world_aircraft_types").fetchone()[0] == 0:
            default_types = (
                [(t, "heavy", "") for t in (
                    "A332", "A333", "A338", "A339", "A342", "A343", "A345", "A346", "A359", "A35K", "A388",
                    "B744", "B748", "B762", "B763", "B764", "B772", "B77L", "B77W", "B773", "B788", "B789", "B78X",
                    "MD11", "DC10", "IL96", "A124", "C17", "C5M"
                )] +
                [(t, "turboprop", "") for t in (
                    "AT43", "AT45", "AT46", "AT72", "AT75", "AT76", "DH8A", "DH8B", "DH8C", "DH8D",
                    "B190", "B350", "BE20", "BE9L", "PC12", "TBM7", "TBM8", "TBM9", "C208", "DHC6",
                    "SF34", "SB20", "F50", "C130", "C30J", "A400", "P180", "E120", "SW4", "JS41", "KODI"
                )] +
                [(t, "mil", "") for t in (
                    "M339", "MB39", "M346", "EUFI", "F16", "F18", "FA18", "F18S", "F15", "F14", "F22", "F35",
                    "RFAL", "TORN", "HAWK", "L39", "T45", "T6", "T38", "A10", "AV8B", "M200", "MIR2", "SU27", "MIG2"
                )] +
                [(t, "heli", "") for t in (
                    "H125", "H135", "H145", "H160", "EC35", "EC45", "AS50", "AS32", "AW09", "A109", "A139",
                    "AW39", "B06", "B407", "B412", "B429", "UH1", "UH60", "H60", "S76", "S92", "R22", "R44", "R66", "CH47", "NH90"
                )] +
                [(t, "ga", "") for t in (
                    "C152", "C172", "C182", "C206", "PA28", "PA34", "PA44", "SR20", "SR22",
                    "DA20", "DA40", "DA42", "DA62", "BE36", "BE58", "DR40", "M20P", "P400", "P300", "SAVA", "VL3", "GABR"
                )]
            )
            cursor.executemany(
                "INSERT OR IGNORE INTO world_aircraft_types (icao, category, name) VALUES (?, ?, ?)",
                default_types
            )

        conn.commit()