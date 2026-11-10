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


# --- RILEVAMENTO MONITOR NATIVO WINDOWS (MULTI-MONITOR 80%) ---
class MONITORINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("rcMonitor", wintypes.RECT),
        ("rcWork", wintypes.RECT),
        ("dwFlags", wintypes.DWORD),
    ]


def get_window_monitor_info(hwnd):
    """Restituisce (larghezza, altezza) del monitor su cui si trova attualmente la finestra (HWND)."""
    try:
        user32 = ctypes.windll.user32
        hmon = user32.MonitorFromWindow(hwnd, 2)  # MONITOR_DEFAULTTONEAREST = 2
        mi = MONITORINFO()
        mi.cbSize = ctypes.sizeof(MONITORINFO)
        if user32.GetMonitorInfoW(hmon, ctypes.byref(mi)):
            w = mi.rcMonitor.right - mi.rcMonitor.left
            h = mi.rcMonitor.bottom - mi.rcMonitor.top
            return w, h
    except Exception:
        pass
    return 1920, 1080


def get_point_monitor_info(x, y):
    """Restituisce (larghezza, altezza) del monitor in base alle coordinate del punto (x, y)."""
    try:
        user32 = ctypes.windll.user32
        pt = wintypes.POINT(int(x), int(y))
        hmon = user32.MonitorFromPoint(pt, 2)
        mi = MONITORINFO()
        mi.cbSize = ctypes.sizeof(MONITORINFO)
        if user32.GetMonitorInfoW(hmon, ctypes.byref(mi)):
            return mi.rcMonitor.right - mi.rcMonitor.left, mi.rcMonitor.bottom - mi.rcMonitor.top
    except Exception:
        pass
    return 1920, 1080


def main():
    api = AeroGlassAPI()
    ui_path = get_resource_path(os.path.join("src", "ui", "index.html"))

    # Calcola l'80% del monitor principale all'avvio
    init_w, init_h = get_point_monitor_info(100, 100)
    init_w = int(init_w * 0.8)
    init_h = int(init_h * 0.8)

    window = webview.create_window(
        title="AeroGlass Nav - Flight Planner & Moving Map",
        url=ui_path,
        js_api=api,
        width=init_w,
        height=init_h,
        min_size=(640, 480),
        background_color="#0f172a"
    )

    api._window = window

# Thread di controllo intelligente: adatta le dimensioni e centra la finestra sul nuovo monitor
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

                # Legge le coordinate e le dimensioni attuali della finestra via Win32
                rect = wintypes.RECT()
                if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                    continue
                
                cur_w = rect.right - rect.left
                cur_h = rect.bottom - rect.top

                # Ottiene le informazioni dettagliate del monitor corrente (inclusa l'area di lavoro)
                hmon = user32.MonitorFromWindow(hwnd, 2)
                mi = MONITORINFO()
                mi.cbSize = ctypes.sizeof(MONITORINFO)
                if user32.GetMonitorInfoW(hmon, ctypes.byref(mi)):
                    mw = mi.rcMonitor.right - mi.rcMonitor.left
                    mh = mi.rcMonitor.bottom - mi.rcMonitor.top
                    
                    target_w = int(mw * 0.8)
                    target_h = int(mh * 0.8)

                    # Se la dimensione attuale differisce da quella attesa per quel monitor
                    if abs(cur_w - target_w) > 15 or abs(cur_h - target_h) > 15:
                        time.sleep(0.3) # Attende che l'utente rilasci il mouse
                        rect2 = wintypes.RECT()
                        user32.GetWindowRect(hwnd, ctypes.byref(rect2))
                        if rect.left == rect2.left and rect.top == rect2.top:
                            # Calcola il centro esatto del monitor target
                            center_x = mi.rcMonitor.left + (mw - target_w) // 2
                            center_y = mi.rcMonitor.top + (mh - target_h) // 2
                            
                            # Ridimensiona e sposta la finestra al centro dello schermo in un solo colpo
                            user32.SetWindowPos(hwnd, 0, center_x, center_y, target_w, target_h, 0x0040) # SWP_SHOWWINDOW = 0x0040
            except Exception:
                pass

    threading.Thread(target=auto_resize_monitor_watcher, daemon=True).start()

    # Assicura la chiusura pulita di SimConnect e dei thread in background alla chiusura della finestra
    window.events.closed += lambda: api._telemetry.shutdown()

    webview.start(debug=False)


if __name__ == "__main__":
    main()