import os
import sys
import time
import threading
import ctypes
from ctypes import wintypes
import webview
from src.core.api import AeroGlassAPI

# Mantiene il riferimento globale al Mutex per impedirne la distruzione dal Garbage Collector
single_instance_mutex = None


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


# --- GESTIONE ISTANZA SINGOLA E AVVISO ---
def check_single_instance():
    """Controlla tramite Mutex se esiste già un'istanza in esecuzione."""
    global single_instance_mutex
    mutex_name = "AeroGlassNav_SingleInstance_Mutex"
    single_instance_mutex = ctypes.windll.kernel32.CreateMutexW(None, False, mutex_name)
    error = ctypes.windll.kernel32.GetLastError()
    if error == 183:  # ERROR_ALREADY_EXISTS
        return False
    return True

def focus_existing_instance():
    """Trova la finestra dell'applicazione già aperta e la porta in primo piano."""
    user32 = ctypes.windll.user32
    hwnd = user32.FindWindowW(None, "AeroGlass Nav - Flight Planner & Moving Map")
    if hwnd:
        if user32.IsIconic(hwnd):
            user32.ShowWindow(hwnd, 9)  # SW_RESTORE (ripristina se ridotta a icona)
        else:
            user32.ShowWindow(hwnd, 5)  # SW_SHOW
        user32.SetForegroundWindow(hwnd)

def show_already_running_warning():
    """Mostra un popup Frameless in stile AeroGlass centrato sulla finestra principale."""
    user32 = ctypes.windll.user32
    hwnd = user32.FindWindowW(None, "AeroGlass Nav - Flight Planner & Moving Map")
    
    warn_w = 320
    warn_h = 160
    x_pos = None
    y_pos = None
    
    # Calcola il centro esatto della finestra principale in esecuzione
    if hwnd:
        rect = wintypes.RECT()
        if user32.GetWindowRect(hwnd, ctypes.byref(rect)):
            main_w = rect.right - rect.left
            main_h = rect.bottom - rect.top
            x_pos = rect.left + (main_w - warn_w) // 2
            y_pos = rect.top + (main_h - warn_h) // 2

    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                margin: 0; padding: 12px;
                background-color: #0f172a;
                color: #f8fafc;
                font-family: 'Segoe UI', system-ui, sans-serif;
                display: flex; align-items: center; justify-content: center;
                height: 100vh; box-sizing: border-box;
                overflow: hidden;
            }
            .glass-panel {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.9));
                border: 1px solid rgba(251, 191, 36, 0.4);
                border-radius: 8px;
                padding: 20px;
                width: 100%; height: 100%;
                box-sizing: border-box;
                display: flex; flex-direction: column;
                justify-content: center; align-items: center;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            }
            h3 { margin: 0 0 10px 0; color: #fbbf24; font-size: 15px; font-weight: 700; letter-spacing: 1px; -webkit-app-region: drag; }
            p { margin: 0 0 20px 0; font-size: 12px; color: #94a3b8; -webkit-app-region: drag; }
            .btn {
                background: rgba(251, 191, 36, 0.1);
                border: 1px solid #fbbf24;
                color: #fbbf24;
                padding: 6px 18px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-weight: bold;
                transition: all 0.2s;
                text-transform: uppercase;
                -webkit-app-region: no-drag;
            }
            .btn:hover { background: #fbbf24; color: #0f172a; }
        </style>
    </head>
    <body>
        <div class="glass-panel" style="-webkit-app-region: drag;">
            <h3>⚠️ ISTANZA DUPLICATA</h3>
            <p>L'applicazione AeroGlass Nav<br>è già in esecuzione in background.</p>
            <button class="btn" onclick="pywebview.api.close_warning()">CHIUDI</button>
        </div>
    </body>
    </html>
    """
    
    class WarningAPI:
        def __init__(self):
            self._window = None
        def close_warning(self):
            if self._window:
                self._window.destroy()

    api = WarningAPI()
    
    # Crea la finestra passandole le coordinate esatte del centro della UI principale
    warning_window = webview.create_window(
        title="AeroGlass Nav - Avviso",
        html=html_content,
        js_api=api,
        width=warn_w,
        height=warn_h,
        x=x_pos,
        y=y_pos,
        resizable=False,
        frameless=True,
        on_top=True,
        background_color="#0f172a"
    )
    api._window = warning_window
    webview.start()


def main():
    # 1. Controlla se l'app è già in esecuzione
    if not check_single_instance():
        focus_existing_instance()
        # Attende 200ms per permettere all'animazione di ripristino di Windows di finire prima di calcolare il centro
        time.sleep(0.2)
        show_already_running_warning()
        sys.exit(0)

    # 2. Avvio normale dell'applicazione
    api = AeroGlassAPI()
    ui_path = get_resource_path(os.path.join("src", "ui", "index.html"))

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
        x=init_x,
        y=init_y,
        min_size=(640, 480),
        background_color="#0f172a",
        resizable=True,
        fullscreen=False
    )

    api._window = window

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