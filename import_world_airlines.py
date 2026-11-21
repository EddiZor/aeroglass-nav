"""
AeroGlass-Nav: Importazione compagnie aeree ICAO mondiali (OpenFlights) in aeroglass.db.
Preserva le compagnie virtuali (is_va = 1) e gli override moderni.
"""

import csv
import io
import os
import sqlite3
import urllib.request
from src.core.database import DB_PATH, init_db

AIRLINES_URL = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat"

MODERN_OVERRIDES = [
    ("ITY", "ITA Airways", "IT", 0),
    ("WMT", "Wizz Air Malta", "MT", 0),
    ("EJU", "easyJet Europe", "AT", 0),
    ("EZS", "easyJet Switzerland", "CH", 0),
    ("NOS", "Neos", "IT", 0),
    ("ADH", "Air Dolomiti", "IT", 0),
    ("IAM", "Aeronautica Militare", "IT", 0),
    ("IVV", "Italiani Volanti VA", "IT", 1),
]


def run_import():
    init_db()
    db_path = os.path.abspath(DB_PATH)
    print(f"Target Database: {db_path}")
    print("⬇️ Download archivio compagnie ICAO (OpenFlights)...")

    req = urllib.request.Request(AIRLINES_URL, headers={"User-Agent": "AeroGlassNav/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        text = resp.read().decode("utf-8", errors="replace")

    rows = []
    reader = csv.reader(io.StringIO(text))
    for r in reader:
        if len(r) < 8:
            continue
        name = (r[1] or "").strip()
        icao = (r[4] or "").strip().upper()
        country = (r[6] or "").strip()
        active = (r[7] or "").strip().upper()

        if active != "Y" or len(icao) != 3 or not icao.isalpha():
            continue
        if not name or name in ("\\N", "Unknown"):
            continue
        rows.append((icao, name, country, 0))

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Non sovrascrive eventuali VA personalizzate (is_va = 1)
    cur.executemany(
        "INSERT OR IGNORE INTO world_airlines (icao, name, country, is_va) VALUES (?, ?, ?, ?)",
        rows
    )
    cur.executemany(
        "INSERT OR REPLACE INTO world_airlines (icao, name, country, is_va) VALUES (?, ?, ?, ?)",
        MODERN_OVERRIDES
    )

    total = cur.execute("SELECT COUNT(*) FROM world_airlines").fetchone()[0]
    conn.commit()
    conn.close()
    print(f"✅ Tabella world_airlines aggiornata: {total} compagnie ICAO in SQLite.")


if __name__ == "__main__":
    run_import()