import csv
import io
import os
import sqlite3
import urllib.request

# Percorso identico a src/core/database.py (~/.aeroglass_nav/aeroglass.db)
DB_PATH = os.path.join(os.path.expanduser("~"), ".aeroglass_nav", "aeroglass.db")

URLS = {
    "airports": "https://davidmegginson.github.io/ourairports-data/airports.csv",
    "runways": "https://davidmegginson.github.io/ourairports-data/runways.csv",
    "frequencies": "https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv",
}

CUSTOM_ITALIAN_FIELDS = [
    ("LIKL", "small_airport", "Aviosuperficie La Comina (Pordenone)", 46.0019, 12.6978, 295, "IT", "Pordenone"),
    ("LITY", "small_airport", "Aviosuperficie di Agrigento - Valle dei Templi", 37.2464, 13.6697, 590, "IT", "Agrigento"),
    ("LIPD", "small_airport", "Aeroporto di Udine-Campoformido", 46.0319, 13.1869, 308, "IT", "Udine"),
]

CUSTOM_RUNWAYS = [
    ("LIKL", "18R", "36L", 3280, 98, "GRS", 0, 180, 360),
    ("LIKL", "18L", "36R", 3280, 98, "GRS", 0, 180, 360),
    ("LITY", "12", "30", 2132, 65, "ASP", 0, 120, 300),
    ("LIPD", "09", "27", 3937, 115, "GRS", 0, 90, 270),
]

CUSTOM_FREQS = [
    ("LIKL", "INFO", "La Comina Radio", 130.000),
    ("LITY", "INFO", "Agrigento Radio", 130.000),
    ("LIPD", "INFO", "Campoformido Radio", 119.550),
]

def download_csv(url):
    print(f"⬇️ Scaricamento da {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "AeroGlass-Nav/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    return csv.DictReader(io.StringIO(text))

def init_and_populate_db(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.executescript("""
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;

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
            he_hdg REAL
        );

        CREATE TABLE IF NOT EXISTS world_frequencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            apt_icao TEXT,
            type TEXT,
            description TEXT,
            freq_mhz REAL
        );

        DELETE FROM world_airports;
        DELETE FROM world_runways;
        DELETE FROM world_frequencies;
    """)

    # 1. Importazione Aeroporti
    valid_types = {"large_airport", "medium_airport", "small_airport"}
    airports_reader = download_csv(URLS["airports"])
    apt_rows = []
    valid_icaos = set()

    for r in airports_reader:
        atype = r.get("type", "")
        if atype not in valid_types:
            continue
        ident = (r.get("ident") or "").strip().upper()
        if not ident or len(ident) < 3:
            continue
        try:
            lat = round(float(r["latitude_deg"]), 6)
            lon = round(float(r["longitude_deg"]), 6)
        except (ValueError, KeyError):
            continue
        elev = int(float(r["elevation_ft"])) if r.get("elevation_ft") and r["elevation_ft"].lstrip("-").isdigit() else 0
        apt_rows.append((
            ident,
            atype,
            (r.get("name") or ident).strip(),
            lat,
            lon,
            elev,
            (r.get("iso_country") or "").strip(),
            (r.get("municipality") or "").strip()
        ))
        valid_icaos.add(ident)

    for c_apt in CUSTOM_ITALIAN_FIELDS:
        apt_rows.append(c_apt)
        valid_icaos.add(c_apt[0])

    cur.executemany("""
        INSERT OR REPLACE INTO world_airports (icao, type, name, lat, lon, elev_ft, country, municipality)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, apt_rows)
    print(f"✅ Importati {len(apt_rows)} aeroporti mondiali.")

    # 2. Importazione Piste
    runways_reader = download_csv(URLS["runways"])
    rwy_rows = []
    for r in runways_reader:
        if r.get("closed") == "1":
            continue
        apt_ident = (r.get("airport_ident") or "").strip().upper()
        if apt_ident not in valid_icaos:
            continue
        length_ft = int(float(r["length_ft"])) if r.get("length_ft") and r["length_ft"].isdigit() else 0
        width_ft = int(float(r["width_ft"])) if r.get("width_ft") and r["width_ft"].isdigit() else 0
        lighted = 1 if r.get("lighted") == "1" else 0
        try:
            le_hdg = float(r["le_heading_degT"]) if r.get("le_heading_degT") else 0.0
        except ValueError:
            le_hdg = 0.0
        try:
            he_hdg = float(r["he_heading_degT"]) if r.get("he_heading_degT") else 0.0
        except ValueError:
            he_hdg = 0.0

        rwy_rows.append((
            apt_ident,
            (r.get("le_ident") or "").strip(),
            (r.get("he_ident") or "").strip(),
            length_ft,
            width_ft,
            (r.get("surface") or "UNK").strip().upper()[:12],
            lighted,
            le_hdg,
            he_hdg
        ))

    rwy_rows.extend(CUSTOM_RUNWAYS)
    cur.executemany("""
        INSERT INTO world_runways (apt_icao, le_ident, he_ident, length_ft, width_ft, surface, lighted, le_hdg, he_hdg)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rwy_rows)
    print(f"✅ Importate {len(rwy_rows)} piste.")

    # 3. Importazione Frequenze Radio
    freq_reader = download_csv(URLS["frequencies"])
    freq_rows = []
    for r in freq_reader:
        apt_ident = (r.get("airport_ident") or "").strip().upper()
        if apt_ident not in valid_icaos:
            continue
        try:
            mhz = round(float(r["frequency_mhz"]), 3)
        except (ValueError, KeyError):
            continue
        freq_rows.append((
            apt_ident,
            (r.get("type") or "COM").strip().upper(),
            (r.get("description") or "").strip(),
            mhz
        ))

    freq_rows.extend(CUSTOM_FREQS)
    cur.executemany("""
        INSERT INTO world_frequencies (apt_icao, type, description, freq_mhz)
        VALUES (?, ?, ?, ?)
    """, freq_rows)
    print(f"✅ Importate {len(freq_rows)} frequenze radio.")

    # 4. Creazione Indici Spaziali e di Ricerca Rapida
    cur.executescript("""
        CREATE INDEX IF NOT EXISTS idx_world_apt_coords ON world_airports (lat, lon, type);
        CREATE INDEX IF NOT EXISTS idx_world_apt_name ON world_airports (name);
        CREATE INDEX IF NOT EXISTS idx_world_rwy_apt ON world_runways (apt_icao);
        CREATE INDEX IF NOT EXISTS idx_world_freq_apt ON world_frequencies (apt_icao);
    """)

    conn.commit()
    conn.close()
    print(f"🎉 Database completato con successo in: {db_path}")

if __name__ == "__main__":
    init_and_populate_db()