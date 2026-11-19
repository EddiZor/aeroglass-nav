import math
import heapq
import sqlite3

def compute_dist_nm(lat1, lon1, lat2, lon2):
    r_nm = 3440.065
    rad = math.radians
    dlat = rad(lat2 - lat1)
    dlon = rad(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.sin(dlon / 2)**2
    return 2 * r_nm * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def find_airway_route(db_path, dep_lat, dep_lon, dest_lat, dest_lon, cruise_alt=12000, route_type="IFR_LOW"):
    # 1. Calcola il Bounding Box del corridoio di volo (± 2.5° di tolleranza, circa 150 NM)
    buf = 2.5
    min_lat = min(dep_lat, dest_lat) - buf
    max_lat = max(dep_lat, dest_lat) + buf
    min_lon = min(dep_lon, dest_lon) - buf
    max_lon = max(dep_lon, dest_lon) + buf

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 2. Filtra le aerovie compatibili con quota e tipologia
    is_high = (route_type == "IFR_HIGH")
    level_filter = "level_type IN ('H', 'B')" if is_high else "level_type IN ('L', 'B')"

    query = f"""
        SELECT airway, from_ident, to_ident, from_lat, from_lon, to_lat, to_lon, min_alt, direction
        FROM airway_segments
        WHERE min_alt <= ? 
          AND {level_filter}
          AND from_lat BETWEEN ? AND ? AND to_lat BETWEEN ? AND ?
          AND from_lon BETWEEN ? AND ? AND to_lon BETWEEN ? AND ?
    """
    cur.execute(query, (cruise_alt, min_lat, max_lat, min_lat, max_lat, min_lon, max_lon, min_lon, max_lon))
    rows = cur.fetchall()

    # 3. Costruzione Grafo Locale in RAM
    adj = {}
    nodes = {}

    for aw, f_id, t_id, f_lat, f_lon, t_lat, t_lon, min_a, dir_flag in rows:
        nodes[f_id] = (f_lat, f_lon)
        nodes[t_id] = (t_lat, t_lon)
        dist = compute_dist_nm(f_lat, f_lon, t_lat, t_lon)

        if f_id not in adj: adj[f_id] = []
        if t_id not in adj: adj[t_id] = []

        if dir_flag in (0, 1): # Forward o Bidirezionale
            adj[f_id].append((t_id, dist, aw))
        if dir_flag in (0, 2): # Backward o Bidirezionale
            adj[t_id].append((f_id, dist, aw))

    if not nodes:
        conn.close()
        return []

    # 4. Trova Entry e Exit fix più vicini a Partenza e Arrivo
    entry_fix = min(nodes.keys(), key=lambda k: compute_dist_nm(dep_lat, dep_lon, nodes[k][0], nodes[k][1]))
    exit_fix = min(nodes.keys(), key=lambda k: compute_dist_nm(dest_lat, dest_lon, nodes[k][0], nodes[k][1]))

    # 5. Algoritmo A* Pathfinding
    pq = [(0, entry_fix)]
    g_score = {k: float('inf') for k in nodes}
    g_score[entry_fix] = 0
    came_from = {}

    while pq:
        curr_f, curr_node = heapq.heappop(pq)
        if curr_node == exit_fix:
            break

        for neighbor, dist, aw in adj.get(curr_node, []):
            tentative_g = g_score[curr_node] + dist
            if tentative_g < g_score[neighbor]:
                came_from[neighbor] = (curr_node, aw)
                g_score[neighbor] = tentative_g
                h = compute_dist_nm(nodes[neighbor][0], nodes[neighbor][1], nodes[exit_fix][0], nodes[exit_fix][1])
                heapq.heappush(pq, (tentative_g + h, neighbor))

    # 6. Ricostruzione Waypoint
    route = []
    curr = exit_fix
    while curr in came_from:
        prev, aw = came_from[curr]
        route.append({
            "ident": curr,
            "lat": nodes[curr][0],
            "lon": nodes[curr][1],
            "airway": aw,
            "type": "WPT"
        })
        curr = prev

    if route or entry_fix == exit_fix:
        route.append({
            "ident": entry_fix,
            "lat": nodes[entry_fix][0],
            "lon": nodes[entry_fix][1],
            "airway": "SID",
            "type": "WPT"
        })
        route.reverse()

    conn.close()
    return route