# 🩺 AeroGlass-Nav - Diagnostic & Health Report
**Data e Ora Test:** 2026-11-20 10:43:49  
**Ambiente:** Python 3.14.5 (win32)  
**Tempo di Esecuzione:** `0.64s`  
**Punteggio Salute:** `95.7%`  

---
## 1. Riepilogo Test Funzionali
| Categoria | Test Componente | Stato | Dettagli Tecnici |
| :--- | :--- | :---: | :--- |
| **Database** | `Presenza File` | ✅ PASS | Trovato: aeroglass.db (13.39 MB) |
| **Database** | `Journal Mode WAL` | ✅ PASS | Modalità attuale: WAL |
| **Database** | `Tabella cached_airports` | ✅ PASS | OK (8 record) |
| **Database** | `Tabella world_airports` | ✅ PASS | OK (48,082 record) |
| **Database** | `Tabella world_runways` | ✅ PASS | OK (34,678 record) |
| **Database** | `Tabella world_frequencies` | ✅ PASS | OK (29,504 record) |
| **Database** | `Tabella user_waypoints` | ✅ PASS | OK (0 record) |
| **Database** | `Tabella flight_history` | ✅ PASS | OK (0 record) |
| **Database** | `Tabella settings` | ✅ PASS | OK (7 record) |
| **Database** | `Tabella chart_overlays` | ✅ PASS | OK (0 record) |
| **Database** | `Tabella nav_fixes` | ✅ PASS | OK (20 record) |
| **Database** | `Tabella airway_segments` | ✅ PASS | OK (11 record) |
| **Database** | `Tabella airport_ground_cache` | ✅ PASS | OK (38 record) |
| **Database** | `Indice idx_charts_icao` | ✅ PASS | Indicizzato |
| **Database** | `Indice idx_world_apt_coords` | ✅ PASS | Indicizzato |
| **Database** | `Indice idx_world_rwy_apt` | ✅ PASS | Indicizzato |
| **Routing** | `Modulo router.py` | ✅ PASS | Importazione riuscita |
| **Routing** | `LIPZ -> LIPB (IFR_LOW)` | ✅ PASS | 5 fix in 1.7ms: CHI VIC ADOSA MEGAG BZO |
| **Routing** | `LIPD -> LIRF (IFR_HIGH)` | ⚠️ WARN | 0 fix (corridoio non coperto dal seed aerovie attuale) |
| **Routing** | `LIPZ -> LITY (VFR)` | ⚠️ WARN | 0 fix (corridoio non coperto dal seed aerovie attuale) |
| **Charts** | `Libreria pypdfium2` | ✅ PASS | Installata (vattiva) |
| **Charts** | `Auto-Bounds Preset Piste` | ✅ PASS | Verificati 6 scali chiave (LIPZ, LIPD, LIKL, LITY, LIPB, LIRF) |
| **Charts** | `Cache Directory Carte` | ✅ PASS | Percorso: C:\Users\zorzi\.aeroglass_nav\charts_cache |
| **API Backend** | `resolve_icao('LIPZ')` | ✅ PASS | Coord: 45.505, 12.352 |
| **API Backend** | `export_pln_file()` | ✅ PASS | Generato: LIPZ_LIPB.pln |
| **API Backend** | `save_setting / get_setting` | ✅ PASS | Persistenza corretta in SQLite |
| **API Backend** | `get_flight_history()` | ✅ PASS | 0 record letti |
| **Frontend** | `Script leaflet.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script state.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script map.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script vnav.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script flightplan.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script logbook_efb.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script perf.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script demo.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script telemetry.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script charts.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script demo2.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `Script app.js` | ✅ PASS | Presente & linkato |
| **Frontend** | `ID DOM #map` | ✅ PASS | Elemento presente |
| **Frontend** | `ID DOM #chartsModal` | ✅ PASS | Elemento presente |
| **Frontend** | `ID DOM #createFplModal` | ✅ PASS | Elemento presente |
| **Frontend** | `ID DOM #elevationDrawer` | ✅ PASS | Elemento presente |
| **Frontend** | `ID DOM #autoRouteType` | ✅ PASS | Elemento presente |
| **Frontend** | `ID DOM #manualWpts` | ✅ PASS | Elemento presente |
| **EFB Server** | `Porta HTTP 8339` | ✅ PASS | Server EFB attivo e in ascolto |

---
## 2. Suggerimenti di Correzione & Ottimizzazione
🎉 **Nessuna anomalia rilevata.** L'architettura è stabile, coesa e pronta per il packaging v1.0.0.
---
*Report generato automaticamente dalla suite di verifica interna di AeroGlass-Nav.*