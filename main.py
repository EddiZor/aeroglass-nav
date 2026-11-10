import os
import sys
import time
import threading
import ctypes
from ctypes import wintypes
import webview
from src.core.api import AeroGlassAPI


def get_resource_path(relative_path):
    """Restituisce il percorso assoluto, compatibile con PyInstaller (_MEIPASS)."""
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


# --- RILEVAMENTO MONITOR NATIVO WINDOWS ---
class MONITORINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("rcMonitor", wintypes.RECT),
        ("rcWork", wintypes.RECT),
        ("dwFlags", wintypes.DWORD),
    ]


def get_point_monitor_info(x, y):
    """Restituisce (larghezza, altezza, left, top) del monitor in base alle coordinate del punto (x, y)."""
    try:
        user32 = ctypes.windll.user32
        pt = wintypes.POINT(int(x), int(y))
        hmon = user32.MonitorFromPoint(pt, 2)
        mi = MONITORINFO()
        mi.cbSize = ctypes.sizeof(MONITORINFO)
        if user32.GetMonitorInfoW(hmon, ctypes.byref(mi)):
            mw = mi.rcMonitor.right - mi.rcMonitor.left
            mh = mi.rcMonitor.bottom - mi.rcMonitor.top
            return mw, mh, mi.rcMonitor.left, mi.rcMonitor.top
    except Exception:
        pass
    return 1920, 1080, 0, 0


def main():
    api = AeroGlassAPI()
    ui_path = get_resource_path(os.path.join("src", "ui", "index.html"))

    # Calcola l'80% del monitor principale e il suo centro esatto per l'avvio
    mw, mh, m_left, m_top = get_point_monitor_info(100, 100)
    init_w = int(mw * 0.8)
    init_h = int(mh * 0.8)
    init_x = m_left + (mw - init_w) // 2
    init_y = m_top + (mh - init_h) // 2

    window = webview.create_window(
        title="AeroGlass Nav - Flight Planner & Moving Map",
        url=ui_path,
        js_api=api,
        width=init_w,
        height=init_h,
        x=init_x,  # Centrato fin dal primo avvio
        y=init_y,  # Centrato fin dal primo avvio
        min_size=(640, 480),
        background_color="#0f172a",
        resizable=True,
        fullscreen=False
    )

    api._window = window

    # Thread di controllo intelligente per il cambio monitor (disabilitato se la finestra è massimizzata)
    def auto_resize_monitor_watcher():
        user32 = ctypes.windll.user32
        hwnd = None
        while not hwnd:
            time.sleep(0.5)
            hwnd = user32.FindWindowW(None, "AeroGlass Nav - Flight Planner & Moving Map")

        while True:
            time.sleep(0.4)
            try:
                if not hwnd:
                    hwnd = user32.FindWindowW(None, "AeroGlass Nav - Flight Planner & Moving Map")
                    if not hwnd:
                        continue

                # Se la finestra è massimizzata a schermo intero, salta il controllo per non interferire
                if user32.IsZoomed(hwnd):
                    continue

                rect = wintypes.RECT()
                if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                    continue
                
                cur_w = rect.right - rect.left
                cur_h = rect.bottom - rect.top

                hmon = user32.MonitorFromWindow(hwnd, 2)
                mi = MONITORINFO()
                mi.cbSize = ctypes.sizeof(MONITORINFO)
                if user32.GetMonitorInfoW(hmon, ctypes.byref(mi)):
                    mw = mi.rcMonitor.right - mi.rcMonitor.left
                    mh = mi.rcMonitor.bottom - mi.rcMonitor.top
                    
                    target_w = int(mw * 0.8)
                    target_h = int(mh * 0.8)

                    if abs(cur_w - target_w) > 15 or abs(cur_h - target_h) > 15:
                        time.sleep(0.3)
                        rect2 = wintypes.RECT()
                        user32.GetWindowRect(hwnd, ctypes.byref(rect2))
                        if rect.left == rect2.left and rect.top == rect2.top:
                            center_x = mi.rcMonitor.left + (mw - target_w) // 2
                            center_y = mi.rcMonitor.top + (mh - target_h) // 2
                            user32.SetWindowPos(hwnd, 0, center_x, center_y, target_w, target_h, 0x0040)
            except Exception:
                pass

    threading.Thread(target=auto_resize_monitor_watcher, daemon=True).start()

    window.events.closed += lambda: api._telemetry.shutdown()
    webview.start(debug=False)


if __name__ == "__main__":
    main()