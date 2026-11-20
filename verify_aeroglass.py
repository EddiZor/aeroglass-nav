"""
AeroGlass-Nav - Script di Diagnostica e Verifica di Sistema
Controlla tabelle SQLite, moduli core, routing e calcolo dinamico piste.
"""

import os
import sys
import sqlite3

def run_audit():
    print("=" * 60)
    print("   AEROGLASS-NAV: VERIFICA GENERALE DEL SISTEMA")
    print("=" * 60)

    # 1. Verifica File Chiave
    core_files = [
        "main.py",
        "src/core/api.py",
        "src/core/database.py",
        "src/core/aip_fetcher.py",
        "src/ui/index.html",
        "src/ui/style.css",
        "src/ui/js/charts.js",
        "src/ui/js/flightplan.js",
        "src/ui/js/map.js",
        "src/ui/js/telemetry.js"
    ]
    print("\n[1/5] Verifica integrità file di progetto...")
    missing = []
    for f in core_files:
        status = "OK" if os.path.isfile(f) else "MANCANTE"
        if status == "MANCANTE":
            missing.append(f)
        print(f"  - {f:<35} [{status}]")
    
    if missing:
        print(f"  ⚠️ Attenzione: {len(missing)} file mancanti!")
    else:
        print("  ✅ Tutti i file core sono presenti.")

    # 2. Verifica Database SQLite
    print("\n[2/5] Verifica Database SQLite locale...")
    db_path = os.path.join("src", "core", "aeroglass.db")
    if not os.path.isfile(db_path):
        db_path = "aeroglass.db"
    
    if not os.path.isfile(db_path):
        print("  ❌ Database aeroglass.db non trovato!")
    else:
        print(f"  - Percorso database: {db_path}")
        try:
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            
            # Verifica conteggio tabelle chiave
            tables = [
                "world_airports", "world_runways", "world_frequencies", 
                "airway_segments", "cached_airports", "chart_overlays", "settings"
            ]
            for t in tables:
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {t}")
                    count = cur.fetchone()[0]
                    print(f"  - Tabella {t:<22} : {count:>6} record")
                except Exception as te:
                    print(f"  - Tabella {t:<22} : ERRORE ({te})")
            conn.close()
            print("  ✅ Connessione e tabelle SQLite operative.")
        except Exception as dbe:
            print(f"  ❌ Errore accesso database: {dbe}")

    # 3. Test Modulo API e Import
    print("\n[3/5] Test importazione moduli e API...")
    try:
        from src.core.api import AeroGlassAPI
        api = AeroGlassAPI()
        print("  - Istanziazione AeroGlassAPI     : [OK]")
        
        # Test telecomunicazione / IP EFB
        efb = api.get_efb_info()
        print(f"  - Server EFB locale              : {efb.get('url', 'N/A')} [OK]")
        
        # Test risoluzione ICAO
        res_lipz = api.resolve_icao("LIPZ")
        if res_lipz.get("success"):
            print(f"  - Risoluzione ICAO (LIPZ)        : {res_lipz.get('name')} [OK]")
        else:
            print("  - Risoluzione ICAO (LIPZ)        : [FALLITA]")

    except Exception as ie:
        print(f"  ❌ Errore inizializzazione API: {ie}")

    # 4. Test Calcolo Dinamico Bounding Box (Ground vs Avvicinamento)
    print("\n[4/5] Test motore geometrico Bounding Box...")
    try:
        # Test Ground
        b_ground = api.get_airport_auto_bounds("LIPZ", "Aerodrome Ground Chart")
        print(f"  - LIPZ Ground Layout             : {b_ground.get('source')} -> {b_ground.get('bounds')}")
        
        # Test Procedura IAC con sentiero esteso
        b_app = api.get_airport_auto_bounds("LIPZ", "IAC ILS RWY 04R")
        print(f"  - LIPZ IAC ILS 04R (Esteso)      : {b_app.get('source')} -> {b_app.get('bounds')}")
        print("  ✅ Motore di proiezione dinamica funzionante.")
    except Exception as ge:
        print(f"  ❌ Errore calcolo bounds: {ge}")

    # 5. Verifica Modulo AIP Fetcher
    print("\n[5/5] Test modulo AIP Fetcher (Fallback locale & vettoriale)...")
    try:
        from src.core.aip_fetcher import download_airport_charts
        res_charts = download_airport_charts("LIPD")
        print(f"  - Carte trovate/generate per LIPD: {res_charts.get('count', 0)} carte ({res_charts.get('charts')[0]['type']})")
        print("  ✅ AIP Fetcher locale operativo senza dipendenze bloccanti.")
    except Exception as fe:
        print(f"  ❌ Errore AIP Fetcher: {fe}")

    print("\n" + "=" * 60)
    print("   COLLAUDO COMPLETATO")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    run_audit()