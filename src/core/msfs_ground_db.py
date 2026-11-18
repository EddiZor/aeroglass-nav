import os
import re
import glob
import json
import math
import gzip
import ssl
import socket
import struct
import ctypes
import time
import http.client
import urllib.request
import urllib.parse
from src.core.database import get_connection


# ==============================================================================
# 1. ESTRAZIONE DIRETTA DA MSFS 2024 TRAMITE SIMCONNECT FACILITY DATA API
#    (Funziona quando MSFS 2024 è avviato, anche fermo nel Menu Principale)
# ==============================================================================

SIMCONNECT_RECV_ID_FACILITY_DATA = 28      # 0x1C in SimConnect.h
SIMCONNECT_RECV_ID_FACILITY_DATA_END = 29  # 0x1D in SimConnect.h

FACILITY_TYPE_AIRPORT = 0
FACILITY_TYPE_TAXI_POINT = 14
FACILITY_TYPE_TAXI_PARKING = 15
FACILITY_TYPE_TAXI_PATH = 16
FACILITY_TYPE_TAXI_NAME = 17

PARKING_NAME_MAP = {
    0: "", 1: "P", 2: "NP", 3: "NEP", 4: "EP", 5: "SEP", 6: "SP", 7: "SWP", 8: "WP", 9: "NWP",
    10: "G", 11: "D", 12: "A", 13: "B", 14: "C", 15: "D", 16: "E", 17: "F", 18: "G", 19: "H",
    20: "I", 21: "J", 22: "K", 23: "L", 24: "M", 25: "N", 26: "O", 27: "P", 28: "Q", 29: "R",
    30: "S", 31: "T", 32: "U", 33: "V", 34: "W", 35: "X", 36: "Y", 37: "Z"
}


def _find_modern_simconnect_dll():
    """Cerca una SimConnect.dll a 64-bit compatibile con MSFS 2024 (che esporti SimConnect_AddToFacilityDefinition)."""
    local_app = os.environ.get("LOCALAPPDATA", "")
    candidates = []
    for env_key in ("MSFS2024_SDK", "MSFS_SDK"):
        sdk_dir = os.environ.get(env_key, "")
        if sdk_dir:
            candidates.append(os.path.join(sdk_dir, "SimConnect SDK", "lib", "SimConnect.dll"))

    candidates.extend([
        r"C:\MSFS 2024 SDK\SimConnect SDK\lib\SimConnect.dll",
        r"C:\MSFS SDK\SimConnect SDK\lib\SimConnect.dll",
        r"D:\MSFS 2024 SDK\SimConnect SDK\lib\SimConnect.dll",
        r"D:\MSFS SDK\SimConnect SDK\lib\SimConnect.dll",
        os.path.join(local_app, "MobiFlight", "MobiFlight Connector", "SimConnect.dll"),
        r"C:\Program Files (x86)\MobiFlight\MobiFlight Connector\SimConnect.dll",
        r"C:\Program Files\FenixSim A320\deps\SimConnect.dll",
    ])
    try:
        import SimConnect as sc_pkg
        pkg_dll = os.path.join(os.path.dirname(sc_pkg.__file__), "SimConnect.dll")
        candidates.append(pkg_dll)
    except Exception:
        pass

    for path in candidates:
        if path and os.path.isfile(path):
            try:
                dll = ctypes.WinDLL(path)
                if hasattr(dll, "SimConnect_AddToFacilityDefinition") and hasattr(dll, "SimConnect_RequestFacilityData"):
                    return dll, path
            except Exception:
                continue
    return None, None


def fetch_from_msfs2024_simconnect(icao, fallback_lat, fallback_lon, fallback_name):
    """Interroga direttamente MSFS 2024 in esecuzione per ottenere TAXI_PARKING, TAXI_POINT, TAXI_PATH e TAXI_NAME
       dello scenario attivo (inclusi gli aeroporti streamed dal cloud di MSFS 2024)."""
    dll, dll_path = _find_modern_simconnect_dll()
    if not dll:
        return None

    h_sim = ctypes.c_void_p()
    try:
        res = dll.SimConnect_Open(
            ctypes.byref(h_sim),
            b"AeroGlass-Nav GroundDB",
            None, 0, None, 0
        )
        if res != 0 or not h_sim.value:
            return None
    except Exception:
        return None

    try:
        def_id = 9101
        req_id = 9201

        def add_field(field_str):
            dll.SimConnect_AddToFacilityDefinition(h_sim, def_id, field_str.encode("ascii"))

        add_field("OPEN AIRPORT")
        add_field("LATITUDE")
        add_field("LONGITUDE")
        add_field("ALTITUDE")
        add_field("OPEN TAXI_POINT")
        add_field("TYPE")
        add_field("ORIENTATION")
        add_field("BIAS_X")
        add_field("BIAS_Z")
        add_field("CLOSE TAXI_POINT")
        add_field("OPEN TAXI_PARKING")
        add_field("TYPE")
        add_field("TAXI_POINT_TYPE")
        add_field("NAME")
        add_field("SUFFIX")
        add_field("NUMBER")
        add_field("ORIENTATION")
        add_field("HEADING")
        add_field("RADIUS")
        add_field("BIAS_X")
        add_field("BIAS_Z")
        add_field("CLOSE TAXI_PARKING")
        add_field("OPEN TAXI_PATH")
        add_field("TYPE")
        add_field("WIDTH")
        add_field("START")
        add_field("END")
        add_field("NAME_INDEX")
        add_field("CLOSE TAXI_PATH")
        add_field("OPEN TAXI_NAME")
        add_field("NAME")
        add_field("CLOSE TAXI_NAME")
        add_field("CLOSE AIRPORT")

        hr = dll.SimConnect_RequestFacilityData(
            h_sim, def_id, req_id, icao.encode("ascii"), b""
        )
        if hr != 0:
            return None

        apt_lat = fallback_lat
        apt_lon = fallback_lon
        taxi_points = {}
        parking_spots = {}
        taxi_names = {0: ""}
        taxi_paths = []

        p_data = ctypes.c_void_p()
        cb_data = ctypes.c_uint32()
        deadline = time.time() + 3.5
        finished = False

        while time.time() < deadline and not finished:
            hr_disp = dll.SimConnect_GetNextDispatch(h_sim, ctypes.byref(p_data), ctypes.byref(cb_data))
            if hr_disp != 0 or not p_data.value or cb_data.value < 12:
                time.sleep(0.01)
                continue

            raw_pkt = ctypes.string_at(p_data.value, cb_data.value)
            dw_size, dw_ver, dw_id = struct.unpack_from("<III", raw_pkt, 0)

            if dw_id == SIMCONNECT_RECV_ID_FACILITY_DATA_END:
                finished = True
                break

            if dw_id == SIMCONNECT_RECV_ID_FACILITY_DATA and cb_data.value >= 40:
                u_req, uniq_id, parent_id, f_type, is_list, item_idx, list_size = struct.unpack_from("<IIIIIII", raw_pkt, 12)
                payload = raw_pkt[40:]

                if f_type == FACILITY_TYPE_AIRPORT and len(payload) >= 24:
                    a_lat, a_lon, _ = struct.unpack_from("<ddd", payload, 0)
                    if abs(a_lat) > 0.01 or abs(a_lon) > 0.01:
                        apt_lat, apt_lon = float(a_lat), float(a_lon)

                elif f_type == FACILITY_TYPE_TAXI_POINT and len(payload) >= 16:
                    _, _, bias_x, bias_z = struct.unpack_from("<iiff", payload, 0)
                    cos_lat = max(0.15, math.cos(math.radians(apt_lat)))
                    pt_lat = apt_lat + (float(bias_z) / 111132.95)
                    pt_lon = apt_lon + (float(bias_x) / (111319.49 * cos_lat))
                    taxi_points[item_idx] = [round(pt_lat, 6), round(pt_lon, 6)]

                elif f_type == FACILITY_TYPE_TAXI_PARKING and len(payload) >= 40:
                    p_type, pt_type, p_name, p_suffix, p_num, p_orient, p_hdg, p_rad, bias_x, bias_z = struct.unpack_from("<iiiiIiffff", payload, 0)
                    cos_lat = max(0.15, math.cos(math.radians(apt_lat)))
                    pk_lat = apt_lat + (float(bias_z) / 111132.95)
                    pk_lon = apt_lon + (float(bias_x) / (111319.49 * cos_lat))
                    pfx = PARKING_NAME_MAP.get(p_name, "")
                    sfx = PARKING_NAME_MAP.get(p_suffix, "") if p_suffix > 0 else ""
                    ref_str = f"{pfx}{p_num}{sfx}".strip() if p_num > 0 else (pfx or f"P{item_idx}")
                    parking_spots[item_idx] = {"ref": ref_str, "lat": round(pk_lat, 6), "lon": round(pk_lon, 6)}

                elif f_type == FACILITY_TYPE_TAXI_NAME and len(payload) >= 4:
                    t_str = payload[:32].split(b"\x00")[0].decode("ascii", errors="ignore").strip()
                    taxi_names[item_idx] = t_str

                elif f_type == FACILITY_TYPE_TAXI_PATH and len(payload) >= 20:
                    path_t, width, st_idx, end_idx, name_idx = struct.unpack_from("<ifiiI", payload, 0)
                    taxi_paths.append((st_idx, end_idx, path_t, name_idx))

        taxiways = []
        for st_idx, end_idx, path_t, name_idx in taxi_paths:
            if path_t in (2, 5, 6, 7):
                continue
            p1 = taxi_points.get(st_idx)
            p2 = parking_spots.get(end_idx) if path_t == 3 else taxi_points.get(end_idx)
            if isinstance(p2, dict):
                p2 = [p2["lat"], p2["lon"]]
            if p1 and p2:
                t_ref = taxi_names.get(name_idx, "") if path_t == 1 else ""
                taxiways.append({
                    "ref": t_ref,
                    "kind": "taxilane" if path_t in (3, 4) else "taxiway",
                    "coords": [p1, p2]
                })

        if taxiways or parking_spots:
            print(f"[MSFS-GroundDB] Estratto {icao} direttamente da MSFS 2024 SimConnect ({len(taxiways)} taxiway, {len(parking_spots)} parcheggi)")
            return {
                "icao": icao,
                "name": fallback_name or icao,
                "lat": apt_lat,
                "lon": apt_lon,
                "source": "msfs",
                "runways": [],
                "taxiways": taxiways,
                "aprons": [],
                "stands": list(parking_spots.values())
            }
    except Exception as sc_err:
        print(f"[MSFS-GroundDB] Avviso SimConnect Facility Data per {icao}:", sc_err)
    finally:
        try:
            dll.SimConnect_Close(h_sim)
        except Exception:
            pass
    return None


# ==============================================================================
# 2. LETTURA FILE BINARI .BGL SU DISCO (Community + Griglia QMID APXxxxx0.bgl)
# ==============================================================================
def find_msfs_package_dirs():
    local_app = os.environ.get("LOCALAPPDATA", "")
    app_data = os.environ.get("APPDATA", "")

    cfg_candidates = [
        os.path.join(local_app, "Packages", "Microsoft.Limitless_8wekyb3d8bbwe", "LocalCache", "UserCfg.opt"),
        os.path.join(app_data, "Microsoft Flight Simulator 2024", "UserCfg.opt"),
        os.path.join(local_app, "Packages", "Microsoft.FlightSimulator_8wekyb3d8bbwe", "LocalCache", "UserCfg.opt"),
        os.path.join(app_data, "Microsoft Flight Simulator", "UserCfg.opt"),
    ]

    found_dirs = []
    for cfg in cfg_candidates:
        if os.path.isfile(cfg):
            base_cache = os.path.dirname(cfg)
            local_state = os.path.join(os.path.dirname(base_cache), "LocalState")
            for extra in (
                os.path.join(local_state, "StreamedPackages"),
                os.path.join(base_cache, "Packages", "Community"),
                os.path.join(base_cache, "Packages", "StreamedPackages"),
            ):
                if os.path.isdir(extra) and extra not in found_dirs:
                    found_dirs.append(extra)
            try:
                with open(cfg, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        if "InstalledPackagesPath" in line:
                            m = re.search(r'"([^"]+)"', line)
                            if m and os.path.isdir(m.group(1)):
                                pkg_root = m.group(1)
                                for sub in ("Community", "Community2024", "StreamedPackages", "Official2024", "Official2020", "Official"):
                                    p = os.path.join(pkg_root, sub)
                                    if os.path.isdir(p) and p not in found_dirs:
                                        found_dirs.append(p)
            except Exception:
                pass
    return found_dirs


def _get_msfs_apx_subpath(lat, lon):
    """Calcola la cartella QMID (es. '0602') e il file BGL (es. 'APX51170.bgl') usato da MSFS per una coordinata."""
    u_dir = int((lon + 180.0) / 30.0)
    v_dir = int((90.0 - lat) / 22.5)
    u_file = int((lon + 180.0) / 3.75)
    v_file = int((90.0 - lat) / 2.8125)
    return f"{u_dir:02d}{v_dir:02d}", f"APX{u_file:02d}{v_file:02d}0.bgl"


def _bgl_lon(raw_dword):
    return (raw_dword * (360.0 / (3 * 0x10000000))) - 180.0


def _bgl_lat(raw_dword):
    return 90.0 - (raw_dword * (180.0 / (2 * 0x10000000)))


def _decode_bgl_icao(dword_val):
    val = dword_val >> 5
    chars = []
    while val > 0:
        rem = val % 38
        val //= 38
        if 2 <= rem <= 11:
            chars.append(chr(ord("0") + rem - 2))
        elif 12 <= rem <= 37:
            chars.append(chr(ord("A") + rem - 12))
    return "".join(reversed(chars))


def parse_bgl_for_icao(bgl_path, target_icao):
    target_icao = target_icao.upper().strip()
    try:
        with open(bgl_path, "rb") as f:
            data = f.read()
    except Exception:
        return None

    if len(data) < 56:
        return None
    magic, header_size, _, _, section_count = struct.unpack_from("<IIIII", data, 0)
    if magic != 0x19920201 or section_count > 500:
        return None

    sec_offset = header_size
    for _ in range(section_count):
        if sec_offset + 20 > len(data):
            break
        sec_type, _, sub_count, first_sub_off, _ = struct.unpack_from("<IIIII", data, sec_offset)
        sec_offset += 20
        if sec_type != 0x0003:
            continue

        for s_idx in range(sub_count):
            sub_hdr = first_sub_off + (s_idx * 16)
            if sub_hdr + 16 > len(data):
                break
            _, rec_count, rec_off, rec_size = struct.unpack_from("<IIII", data, sub_hdr)
            end_sub = min(len(data), rec_off + rec_size)
            pos = rec_off

            while pos + 44 <= end_sub:
                rec_id, rec_len = struct.unpack_from("<HI", data, pos)
                if rec_len < 12 or pos + rec_len > end_sub:
                    break

                if rec_id in (0x0056, 0x003C, 0x0003):
                    matched_icao = False
                    apt_lon, apt_lat = None, None
                    for icao_off, coord_off in ((32, 12), (24, 12), (36, 16)):
                        if pos + icao_off + 4 <= pos + rec_len:
                            raw_icao = struct.unpack_from("<I", data, pos + icao_off)[0]
                            if _decode_bgl_icao(raw_icao) == target_icao:
                                matched_icao = True
                                raw_lon, raw_lat = struct.unpack_from("<II", data, pos + coord_off)
                                apt_lon, apt_lat = _bgl_lon(raw_lon), _bgl_lat(raw_lat)
                                break

                    if matched_icao:
                        return _extract_bgl_airport_children(data, pos, pos + rec_len, target_icao, apt_lat, apt_lon)

                pos += rec_len
    return None


def _extract_bgl_airport_children(data, apt_start, apt_end, icao, apt_lat, apt_lon):
    taxi_points = {}
    parking_spots = {}
    taxi_names = {0: ""}
    taxi_paths = []
    apt_name = icao

    sub_pos = apt_start + 44
    for cand_hdr in (44, 48, 52, 56, 60, 64):
        if apt_start + cand_hdr + 6 <= apt_end:
            cid, _ = struct.unpack_from("<HI", data, apt_start + cand_hdr)
            if cid in (0x0019, 0x0004, 0x00CE, 0x001A, 0x00AC, 0x001B, 0x003D, 0x00E7, 0x001C, 0x003E, 0x00D8, 0x001D):
                sub_pos = apt_start + cand_hdr
                break

    while sub_pos + 6 <= apt_end:
        sub_id, sub_len = struct.unpack_from("<HI", data, sub_pos)
        if sub_len < 6 or sub_pos + sub_len > apt_end:
            break

        if sub_id == 0x0019 and sub_len > 6:
            raw_txt = data[sub_pos + 6: sub_pos + sub_len].split(b"\x00")[0]
            apt_name = raw_txt.decode("utf-8", errors="ignore").strip() or icao

        elif sub_id in (0x001A, 0x00AC) and sub_len >= 8:
            count = struct.unpack_from("<H", data, sub_pos + 6)[0]
            item_size = (sub_len - 8) // max(1, count)
            if item_size >= 12:
                for i in range(count):
                    off = sub_pos + 8 + (i * item_size)
                    raw_lon, raw_lat = struct.unpack_from("<II", data, off + 4)
                    taxi_points[i] = [round(_bgl_lat(raw_lat), 6), round(_bgl_lon(raw_lon), 6)]

        elif sub_id == 0x001D and sub_len >= 8:
            count = struct.unpack_from("<H", data, sub_pos + 6)[0]
            for i in range(count):
                off = sub_pos + 8 + (i * 8)
                if off + 8 <= sub_pos + sub_len:
                    t_name = data[off: off + 8].split(b"\x00")[0].decode("ascii", errors="ignore").strip()
                    taxi_names[i] = t_name

        elif sub_id in (0x001B, 0x003D, 0x00E7) and sub_len >= 8:
            count = struct.unpack_from("<H", data, sub_pos + 6)[0]
            p_off = sub_pos + 8
            for _ in range(count):
                if p_off + 20 > sub_pos + sub_len:
                    break
                flags = struct.unpack_from("<I", data, p_off)[0]
                p_idx = flags & 0xFFF
                p_num = (flags >> 12) & 0xFFF
                p_name_id = (flags >> 24) & 0x3F
                coord_shift = 28 if sub_id == 0x00E7 else 12
                if p_off + coord_shift + 8 <= sub_pos + sub_len:
                    raw_lon, raw_lat = struct.unpack_from("<II", data, p_off + coord_shift)
                    p_lat, p_lon = round(_bgl_lat(raw_lat), 6), round(_bgl_lon(raw_lon), 6)
                    prefix = PARKING_NAME_MAP.get(p_name_id, "")
                    ref_str = f"{prefix}{p_num}" if p_num > 0 else (prefix or f"P{p_idx}")
                    parking_spots[p_idx] = {"ref": ref_str, "lat": p_lat, "lon": p_lon}
                n_airlines = data[p_off + (coord_shift - 4)] if coord_shift >= 16 else 0
                p_off += (coord_shift + 8) + (n_airlines * 4)

        elif sub_id in (0x001C, 0x003E, 0x00D8) and sub_len >= 8:
            count = struct.unpack_from("<H", data, sub_pos + 6)[0]
            item_size = (sub_len - 8) // max(1, count)
            if item_size >= 12:
                for i in range(count):
                    off = sub_pos + 8 + (i * item_size)
                    st_idx, end_bit, t_flags, name_idx = struct.unpack_from("<HHBB", data, off)
                    end_idx = end_bit & 0xFFF
                    path_type = t_flags & 0x0F
                    taxi_paths.append((st_idx, end_idx, path_type, name_idx))

        sub_pos += sub_len

    taxiways = []
    for st_idx, end_idx, path_type, name_idx in taxi_paths:
        if path_type in (2, 5):
            continue
        p1 = taxi_points.get(st_idx)
        p2 = parking_spots.get(end_idx) if path_type == 3 else taxi_points.get(end_idx)
        if isinstance(p2, dict):
            p2 = [p2["lat"], p2["lon"]]
        if p1 and p2:
            t_ref = taxi_names.get(name_idx, "") if path_type == 1 else ""
            taxiways.append({
                "ref": t_ref,
                "kind": "taxilane" if path_type in (3, 4) else "taxiway",
                "coords": [p1, p2]
            })

    if not taxiways and not parking_spots:
        return None

    return {
        "icao": icao,
        "name": apt_name,
        "lat": round(apt_lat, 6) if apt_lat else None,
        "lon": round(apt_lon, 6) if apt_lon else None,
        "source": "msfs",
        "runways": [],
        "taxiways": taxiways,
        "aprons": [],
        "stands": list(parking_spots.values())
    }


# ==============================================================================
# 3. RISOLUZIONE COMPLETA E FALLBACK IPv4 VELOCE (QUANDO MSFS 2024 È CHIUSO)
# ==============================================================================
def fetch_and_cache_airport_ground(icao, apt_name, lat, lon, db_runways, db_lock):
    icao = str(icao or "").strip().upper()

    # A. Canale 1: Se MSFS 2024 è aperto, estrae direttamente dal simulatore via SimConnect Facility Data
    sc_layout = fetch_from_msfs2024_simconnect(icao, lat, lon, apt_name)
    if sc_layout:
        sc_layout["runways"] = db_runways
        _save_to_sqlite_cache(icao, sc_layout, db_lock)
        return sc_layout

    # B. Canale 2: Cerca nei file .BGL su disco (sia Community/*icao* sia griglia QMID APXxxxx0.bgl)
    qmid_dir, apx_file = _get_msfs_apx_subpath(lat, lon)
    for pkg_dir in find_msfs_package_dirs():
        bgl_candidates = glob.glob(os.path.join(pkg_dir, f"*{icao.lower()}*", "**", "*.bgl"), recursive=True)
        for sub_base in ("", "OneStore", "Steam"):
            apx_cand = os.path.join(pkg_dir, sub_base, "fs-base-genericairports", "scenery", qmid_dir, apx_file) if sub_base else os.path.join(pkg_dir, "fs-base-genericairports", "scenery", qmid_dir, apx_file)
            if os.path.isfile(apx_cand):
                bgl_candidates.append(apx_cand)

        for bgl_file in bgl_candidates:
            bgl_layout = parse_bgl_for_icao(bgl_file, icao)
            if bgl_layout:
                bgl_layout["runways"] = db_runways
                bgl_layout["lat"] = lat
                bgl_layout["lon"] = lon
                print(f"[MSFS-GroundDB] Estratto {icao} da BGL locale: {bgl_file}")
                _save_to_sqlite_cache(icao, bgl_layout, db_lock)
                return bgl_layout

    # C. Canale 3: A simulatore chiuso (DEMO), scarica in IPv4 puro con singola scansione veloce
    layout = {
        "icao": icao,
        "name": apt_name,
        "lat": lat,
        "lon": lon,
        "source": "msfs",
        "runways": db_runways,
        "taxiways": [],
        "aprons": [],
        "stands": []
    }

    s, w, n, e = round(lat - 0.025, 5), round(lon - 0.035, 5), round(lat + 0.025, 5), round(lon + 0.035, 5)
    # Query con indice chiave=valore esatto e bbox globale (risposta < 0.5s su overpass.private.coffee)
    overpass_query = (
        f"[out:json][timeout:18][bbox:{s},{w},{n},{e}];("
        f"way[\"aeroway\"=\"taxiway\"];"
        f"way[\"aeroway\"=\"taxilane\"];"
        f"way[\"aeroway\"=\"apron\"];"
        f"way[\"aeroway\"=\"parking_position\"];"
        f"node[\"aeroway\"=\"parking_position\"];"
        f"node[\"aeroway\"=\"gate\"];"
        f");out geom qt;"
    )

    ssl_ctx = ssl._create_unverified_context()

    class _IPv4HTTPSConnection(http.client.HTTPSConnection):
        def connect(self_conn):
            last_err = None
            for res in socket.getaddrinfo(self_conn.host, self_conn.port or 443, socket.AF_INET, socket.SOCK_STREAM):
                af, socktype, proto, _, sa = res
                sock = None
                try:
                    sock = socket.socket(af, socktype, proto)
                    sock.settimeout(16.0)
                    sock.connect(sa)
                    self_conn.sock = ssl_ctx.wrap_socket(sock, server_hostname=self_conn.host)
                    return
                except Exception as err:
                    last_err = err
                    if sock is not None:
                        sock.close()
            raise last_err or OSError(f"Connessione IPv4 fallita verso {self_conn.host}")

    class _IPv4HTTPSHandler(urllib.request.HTTPSHandler):
        def https_open(self_h, req):
            return self_h.do_open(lambda host, **kw: _IPv4HTTPSConnection(host, **kw), req)

    ipv4_opener = urllib.request.build_opener(_IPv4HTTPSHandler())
    post_data = urllib.parse.urlencode({"data": overpass_query}).encode("utf-8")

    mirrors = [
        "https://overpass.private.coffee/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ]

    osm_data = None
    for url in mirrors:
        try:
            req = urllib.request.Request(
                url,
                data=post_data,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AeroGlass-Nav/0.7.1",
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                }
            )
            with ipv4_opener.open(req, timeout=16.0) as resp:
                raw = resp.read()
                if raw[:2] == b"\x1f\x8b":
                    raw = gzip.decompress(raw)
                osm_data = json.loads(raw.decode("utf-8", errors="replace"))
            if osm_data and isinstance(osm_data.get("elements"), list) and len(osm_data["elements"]) > 0:
                print(f"[MSFS-GroundDB] Scaricati {len(osm_data['elements'])} elementi per {icao} da {url}")
                break
        except Exception as err:
            print(f"[MSFS-GroundDB] Mirror {url} errore per {icao}: {err}")
            continue

    raw_node_stands = []
    raw_way_stands = []
    osm_runways = []

    if osm_data and isinstance(osm_data.get("elements"), list):
        for el in osm_data["elements"]:
            el_type = el.get("type")
            tags = el.get("tags") or {}
            aeroway = tags.get("aeroway")
            ref = str(tags.get("ref") or tags.get("name") or "").strip()

            if el_type == "way" and isinstance(el.get("geometry"), list):
                coords = [[float(pt["lat"]), float(pt["lon"])] for pt in el["geometry"] if "lat" in pt and "lon" in pt]
                if len(coords) < 2:
                    continue
                if aeroway in ("taxiway", "taxilane"):
                    layout["taxiways"].append({"ref": ref if aeroway == "taxiway" else "", "kind": aeroway, "coords": coords})
                elif aeroway == "apron":
                    layout["aprons"].append(coords)
                elif aeroway == "runway" and not db_runways:
                    surf_tag = str(tags.get("surface") or "asphalt").lower()
                    osm_runways.append({
                        "ref": ref or "RWY",
                        "width": 45,
                        "surface": "grass" if ("grass" in surf_tag or "turf" in surf_tag) else "asphalt",
                        "coords": coords
                    })
                elif aeroway == "parking_position":
                    layout["taxiways"].append({"ref": "", "kind": "taxilane", "coords": coords})
                    nose_pt = coords[-1]
                    if ref:
                        raw_way_stands.append({"ref": ref, "lat": nose_pt[0], "lon": nose_pt[1]})

            elif el_type == "node" and aeroway in ("parking_position", "gate", "helipad"):
                if "lat" in el and "lon" in el:
                    stand_ref = ref or ("H" if aeroway == "helipad" else "")
                    if stand_ref:
                        raw_node_stands.append({"ref": stand_ref, "lat": float(el["lat"]), "lon": float(el["lon"])})

    seen_stands = []
    for st in (raw_node_stands + raw_way_stands):
        is_dup = any(
            (s_ref == st["ref"] and abs(s_lat - st["lat"]) < 0.0006 and abs(s_lon - st["lon"]) < 0.0006)
            or (abs(s_lat - st["lat"]) < 0.00008 and abs(s_lon - st["lon"]) < 0.00008)
            for s_ref, s_lat, s_lon in seen_stands
        )
        if not is_dup:
            seen_stands.append((st["ref"], st["lat"], st["lon"]))
            layout["stands"].append(st)

    if not layout["runways"] and osm_runways:
        layout["runways"] = osm_runways

    if not layout["taxiways"] and not layout["stands"]:
        layout["source"] = "runways_only"

    _save_to_sqlite_cache(icao, layout, db_lock)
    return layout


def _save_to_sqlite_cache(icao, layout, db_lock):
    try:
        layout_json_str = json.dumps(layout)
        with db_lock:
            with get_connection() as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO airport_ground_cache (icao, layout_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                    (icao, layout_json_str)
                )
                conn.commit()
        print(f"[MSFS-GroundDB] Salvato {icao} in airport_ground_cache (source={layout.get('source')}: {len(layout.get('runways', []))} piste, {len(layout.get('taxiways', []))} taxiway, {len(layout.get('stands', []))} parcheggi).")
    except Exception as e:
        print(f"[MSFS-GroundDB] Errore salvataggio SQLite per {icao}:", e)