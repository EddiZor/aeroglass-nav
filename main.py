import os
import sys
import ctypes
from ctypes import wintypes
import webview
from src.core.api import AeroGlassAPI


def get_resource_path(relative_path):
    """Restituisce il percorso assoluto, compatibile con PyInstaller (_MEIPASS)."""
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


# --- RILEVAMENTO MONITOR NATIVO WINDOWS (MULTI-MONITOR 80%) ---
class MONITORINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("rcMonitor", wintypes.RECT),
        ("rcWork", wintypes.RECT),
        ("dwFlags", wintypes.DWORD),
    ]


def get_monitor_info_from_point(x, y):
    """Restituisce (handle_monitor, larghezza, altezza, left, top) del monitor alle coordinate (x, y)."""
    try:
        user32 = ctypes.windll.user32
        pt = wintypes.POINT(int(x), int(y))
        hmon = user32.MonitorFromPoint(pt, 2)  # MONITOR_DEFAULTTONEAREST = 2
        mi = MONITORINFO()
        mi.cbSize = ctypes.sizeof(MONITORINFO)
        if user32.GetMonitorInfoW(hmon, ctypes.byref(mi)):
            w = mi.rcMonitor.right - mi.rcMonitor.left
            h = mi.rcMonitor.bottom - mi.rcMonitor.top
            return hmon, w, h, mi.rcMonitor.left, mi.rcMonitor.top
    except Exception:
        pass
    return None, 1920, 1080, 0, 0


def main():
    api = AeroGlassAPI()
    ui_path = get_resource_path(os.path.join("src", "ui", "index.html"))

    # Calcola l'80% del monitor principale all'avvio
    current_mon, mon_w, mon_h, _, _ = get_monitor_info_from_point(100, 100)
    init_w = int(mon_w * 0.8)
    init_h = int(mon_h * 0.8)

    window = webview.create_window(
        title="AeroGlass Nav - Flight Planner & Moving Map",
        url=ui_path,
        js_api=api,
        width=init_w,
        height=init_h,
        min_size=(640, 480),  # Abbassato per supportare anche l'80% su display con altezza 720px
        background_color="#0f172a"
    )

    # Collega il riferimento della finestra all'API (nel caso serva anche da JS)
    api._window = window

    # Traccia il monitor corrente per ridimensionare all'80% quando cambi schermo
    state = {"hmon": current_mon, "resizing": False}

    def on_window_moved(x, y):
        if state["resizing"]:
            return
        # Usa il punto centrale approssimativo della barra del titolo per capire su quale monitor si trova
        hmon, w, h, mon_left, mon_top = get_monitor_info_from_point(int(x) + 200, int(y) + 20)
        if hmon and hmon != state["hmon"]:
            state["hmon"] = hmon
            state["resizing"] = True
            try:
                target_w = int(w * 0.8)
                target_h = int(h * 0.8)
                window.resize(target_w, target_h)
            finally:
                state["resizing"] = False

    window.events.moved += on_window_moved

    # Assicura la chiusura pulita di SimConnect e dei thread in background alla chiusura della finestra
    window.events.closed += lambda: api._telemetry.shutdown()

    webview.start(debug=False)


if __name__ == "__main__":
    main()