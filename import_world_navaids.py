"""
AeroGlass-Nav: Script di importazione radioassistenze mondiali (OurAirports).
Scarica navaids.csv (VOR, VORTAC, TACAN, NDB) e crea la tabella indicizzata 'world_navaids'.
"""

import os
import sys
import sqlite3
import csv
import urllib.request

NAVAIDS_URL = "https://davidmegginson.github.io/ourairports-data/navaids.csv"

def get_db_path():
    candidates = [
        os.path.join("src", "core", "aeroglass.db"),
        "aeroglass.db",
        os.path.join(os.path.expanduser("~"), ".aeroglass_nav", "aeroglass.db")
    ]
    for c in candidates:
        if os.path.isfile(c):
            return os.path.abspath(c)
    return os.path.abspath(os.path.join("src", "core", "aeroglass.db"))

def run_import():
    db_path = get_db_path()
    print("=" * 60)
    print("   AEROGLASS-NAV: IMPORTAZIONE RADIOASSISTENZE MONDIALI")
    print("=" * 60)
    print(f"Target Database: {db_path}")

    # 1. Download file navaids.csv
    csv_temp_path = "temp_navaids.csv"
    print(f"\n[1/3] Download archivio radioassistenze da OurAirports...")
    try:
        req = urllib.request.Request(NAVAIDS_URL, headers={"User-Agent": "AeroGlassNav/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp, open(csv_temp_path, "wb") as out_f:
            out_f.write(resp.read())
        size_kb = os.path.getsize(csv_temp_path) // 1024
        print(f"  ✅ Download completato con successo ({size_kb} KB).")
    except Exception as e:
        print(f"  ❌ Errore durante il download: {e}")
        return

    # 2. Connessione SQLite e creazione schema
    print(f"\n[2/3] Preparazione tabella 'world_navaids' e indici spaziali...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS world_navaids (
            id INTEGER PRIMARY KEY,
            ident TEXT,
            name TEXT,
            type TEXT,
            freq_khz INTEGER,
            freq_mhz TEXT,
            lat REAL,
            lon REAL,
            elev_ft INTEGER,
            country TEXT,
            associated_airport TEXT
        )
    """)

    # Pulisce eventuali vecchi record per evitare duplicazioni
    cur.execute("DELETE FROM world_navaids")
    conn.commit()

    # 3. Parsing del CSV e inserimento massivo
    print(f"\n[3/3] Inserimento radioassistenze nel database SQLite...")
    records = []
    with open(csv_temp_path, mode="r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ident = (row.get("ident") or "").strip().upper()
            name = (row.get("name") or "").strip()
            n_type = (row.get("type") or "").strip().upper()
            
            # Filtra solo le categorie di radioassistenza standard
            if not n_type or n_type not in ("VOR", "VOR-DME", "VORTAC", "TACAN", "NDB", "NDB-DME"):
                continue

            try:
                lat = float(row.get("latitude_deg") or 0.0)
                lon = float(row.get("longitude_deg") or 0.0)
            except ValueError:
                continue

            if abs(lat) < 0.001 and abs(lon) < 0.001:
                continue

            try:
                freq_khz = int(float(row.get("frequency_khz") or 0))
            except ValueError:
                freq_khz = 0

            # Calcolo frequenza MHz formattata per VOR/TACAN o kHz per NDB
            if "NDB" in n_type:
                freq_mhz = str(freq_khz)
            else:
                freq_mhz = f"{freq_khz / 1000.0:.2f}" if freq_khz > 0 else "---"

            try:
                elev = int(float(row.get("elevation_ft") or 0))
            except ValueError:
                elev = 0

            country = (row.get("iso_country") or "").strip().upper()
            associated_apt = (row.get("associated_airport") or "").strip().upper()

            records.append((
                ident, name, n_type, freq_khz, freq_mhz,
                lat, lon, elev, country, associated_apt
            ))

    cur.executemany("""
        INSERT INTO world_navaids (ident, name, type, freq_khz, freq_mhz, lat, lon, elev_ft, country, associated_airport)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, records)

    # Creazione indici ad alte prestazioni per le query su bounding box
    cur.execute("CREATE INDEX IF NOT EXISTS idx_navaids_coords ON world_navaids(lat, lon)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_navaids_type ON world_navaids(type)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_navaids_ident ON world_navaids(ident)")
    conn.commit()
    conn.close()

    # Pulizia file temporaneo
    if os.path.exists(csv_temp_path):
        os.remove(csv_temp_path)

    print(f"  ✅ Importate con successo {len(records)} radioassistenze mondiali indicizzate.")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    run_import()