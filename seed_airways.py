import sqlite3
import os

# Nodi base di test (aeroporti, VOR e punti di snodo)
fixes = [
    ("CHI", "Chioggia VOR", "VOR", 45.0706, 12.3061),
    ("VIC", "Vicenza VOR", "VOR", 45.5447, 11.5367),
    ("BZO", "Bolzano VOR", "VOR", 46.4628, 11.3283),
    ("TZO", "Treviso VOR", "VOR", 45.6728, 12.2139),
    ("VIL", "Villafranca VOR", "VOR", 45.4183, 10.8756),
    ("BOA", "Bologna VOR", "VOR", 44.5297, 11.2969),
    ("FRZ", "Firenze VOR", "VOR", 43.8189, 11.2047),
    ("ELB", "Elba VOR", "VOR", 42.7481, 10.2394),
    ("PIS", "Pisa VOR", "VOR", 43.6842, 10.3956),
    ("TEA", "Teano VOR", "VOR", 41.2689, 14.0758),
    ("SRN", "Saronno VOR", "VOR", 45.6267, 9.0306),
    ("GEN", "Genova VOR", "VOR", 44.4172, 8.8475),
    ("TOP", "Torino VOR", "VOR", 44.9250, 7.8617),
    ("PAL", "Palermo VOR", "VOR", 38.1814, 13.1117),
    ("MEGAG", "MEGAG", "FIX", 46.1264, 11.8542),
    ("ADOSA", "ADOSA", "FIX", 45.8361, 11.7258),
    ("ROV", "Rovigo INT", "FIX", 45.0683, 11.7850),
    ("LUSIL", "LUSIL", "FIX", 45.9233, 12.4411),
    ("BRENO", "BRENO", "FIX", 45.9083, 10.3167),
    ("ALBET", "ALBET (Brenner)", "FIX", 46.8500, 11.5000)
]

# Tratte aerovie (airway, from_ident, to_ident, from_lat, from_lon, to_lat, to_lon, min_alt, max_alt, level_type, direction)
airways = [
    ("M729", "CHI", "VIC", 45.0706, 12.3061, 45.5447, 11.5367, 5000, 24000, 'L', 0),
    ("M729", "VIC", "ADOSA", 45.5447, 11.5367, 45.8361, 11.7258, 7000, 24000, 'L', 0),
    ("M729", "ADOSA", "MEGAG", 45.8361, 11.7258, 46.1264, 11.8542, 9000, 60000, 'B', 0),
    ("M729", "MEGAG", "BZO", 46.1264, 11.8542, 46.4628, 11.3283, 10000, 60000, 'B', 0),
    ("L615", "CHI", "ROV", 45.0706, 12.3061, 45.0683, 11.7850, 4000, 24000, 'L', 0),
    ("L615", "ROV", "BOA", 45.0683, 11.7850, 44.5297, 11.2969, 4000, 24000, 'L', 0),
    ("L615", "VIC", "VIL", 45.5447, 11.5367, 45.4183, 10.8756, 4000, 24000, 'L', 0),
    ("M858", "VIL", "BRENO", 45.4183, 10.8756, 45.9083, 10.3167, 8000, 60000, 'B', 0),
    ("M858", "BRENO", "BZO", 45.9083, 10.3167, 46.4628, 11.3283, 10000, 60000, 'B', 0),
    ("M738", "BOA", "FRZ", 44.5297, 11.2969, 43.8189, 11.2047, 7000, 60000, 'B', 0),
    ("M738", "FRZ", "ELB", 43.8189, 11.2047, 42.7481, 10.2394, 5000, 60000, 'B', 0)
]

# Individua tutti i database presenti (root e src/core)
target_dbs = []
if os.path.exists("src/core/aeroglass.db"):
    target_dbs.append("src/core/aeroglass.db")
if os.path.exists("aeroglass.db"):
    target_dbs.append("aeroglass.db")

# Fallback: se nessuno esiste ancora, crea quello principale in src/core (o in root)
if not target_dbs:
    target_dbs.append("src/core/aeroglass.db" if os.path.isdir("src/core") else "aeroglass.db")

for db_path in target_dbs:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. Creazione tabelle e indici
    cur.execute("""
        CREATE TABLE IF NOT EXISTS nav_fixes (
            ident TEXT PRIMARY KEY,
            name TEXT,
            type TEXT,
            lat REAL NOT NULL,
            lon REAL NOT NULL
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_fixes_coords ON nav_fixes(lat, lon);")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS airway_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            airway TEXT NOT NULL,
            from_ident TEXT NOT NULL,
            to_ident TEXT NOT NULL,
            from_lat REAL NOT NULL,
            from_lon REAL NOT NULL,
            to_lat REAL NOT NULL,
            to_lon REAL NOT NULL,
            min_alt INTEGER DEFAULT 0,
            max_alt INTEGER DEFAULT 60000,
            level_type TEXT DEFAULT 'B',
            direction INTEGER DEFAULT 0
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_airway_endpoints ON airway_segments(from_ident, to_ident);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_airway_coords ON airway_segments(from_lat, from_lon, to_lat, to_lon);")

    # 2. Inserimento Fix e Segmenti di aerovia
    cur.executemany("INSERT OR REPLACE INTO nav_fixes VALUES (?, ?, ?, ?, ?)", fixes)

    cur.execute("DELETE FROM airway_segments;")  # Evita duplicati in caso di riesecuzioni
    cur.executemany("""
        INSERT INTO airway_segments 
        (airway, from_ident, to_ident, from_lat, from_lon, to_lat, to_lon, min_alt, max_alt, level_type, direction)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, airways)

    conn.commit()
    conn.close()
    print(f"Airways popolate con successo in: {db_path}")

print("Inizializzazione completata con successo!")