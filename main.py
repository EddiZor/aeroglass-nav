import os
import time
import threading
import ctypes
from ctypes import wintypes
import webview
from src.core.api import AeroGlassAPI

user32 = ctypes.windll.user32

# Abilita Per-Monitor DPI Awareness V2 per letture esatte su tutti i monitor
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    try:
        user32.SetProcessDPIAware()
    except Exception:
        pass

class MONITORINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("rcMonitor", wintypes.RECT),
        ("rcWork", wintypes.RECT),
        ("dwFlags", wintypes.DWORD)
    ]

# Definizioni tipi argomenti Win32 a 64-bit per evitare overflow di handle
user32.MonitorFromPoint.argtypes = [wintypes.POINT, wintypes.DWORD]
user32.MonitorFromPoint.restype = wintypes.HANDLE
user32.MonitorFromWindow.argtypes = [wintypes.HWND, wintypes.DWORD]
user32.MonitorFromWindow.restype = wintypes.HANDLE
user32.GetMonitorInfoW.argtypes = [wintypes.HANDLE, ctypes.POINTER(MONITORINFO)]
user32.GetMonitorInfoW.restype = wintypes.BOOL
user32.FindWindowW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR]
user32.FindWindowW.restype = wintypes.HWND
user32.SetWindowPos.argtypes = [
    wintypes.HWND, wintypes.HWND,
    ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
    wintypes.UINT
]
user32.SetWindowPos.restype = wintypes.BOOL

MONITOR_DEFAULTTONEAREST = 2
SWP_NOZORDER = 0x0004
SWP_NOACTIVATE = 0x0010

def get_monitor_from_cursor():
    pt = wintypes.POINT()
    user32.GetCursorPos(ctypes.byref(pt))
    hmon = user32.MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST)
    return get_work_area(hmon)

def get_monitor_from_hwnd(hwnd):
    hmon = user32.MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST)
    return get_work_area(hmon)

def get_work_area(hmon):
    mi = MONITORINFO()
    mi.cbSize = ctypes.sizeof(MONITORINFO)
    if hmon and user32.GetMonitorInfoW(hmon, ctypes.byref(mi)):
        mx = mi.rcWork.left
        my = mi.rcWork.top
        mw = mi.rcWork.right - mi.rcWork.left
        mh = mi.rcWork.bottom - mi.rcWork.top
        return hmon, mx, my, mw, mh
    return 0, 0, 0, user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)

def monitor_watcher(window_title, initial_hmon):
    """Controlla quando la finestra viene rilasciata su un nuovo monitor e adatta a 2/3."""
    hwnd = None
    for _ in range(50):
        hwnd = user32.FindWindowW(None, window_title)
        if hwnd:
            break
        time.sleep(0.1)

    if not hwnd:
        return

    current_hmon = initial_hmon

# Applichiamo subito il posizionamento nativo all'80% all'avvio tramite Win32
    hmon, mx, my, mw, mh = get_monitor_from_hwnd(hwnd)
    if hmon:
        current_hmon = hmon
        tw, th = int(mw * 0.8), int(mh * 0.8)
        tx, ty = mx + (mw - tw) // 2, my + (mh - th) // 2
        user32.SetWindowPos(hwnd, None, tx, ty, tw, th, SWP_NOZORDER | SWP_NOACTIVATE)

    while True:
        time.sleep(0.12)
        if not user32.IsWindow(hwnd):
            break

        # Attende che il tasto sinistro del mouse NON sia premuto (fine trascinamento)
        if user32.GetAsyncKeyState(0x01) & 0x8000:
            continue

        new_hmon, n_mx, n_my, n_mw, n_mh = get_monitor_from_hwnd(hwnd)
        if new_hmon and new_hmon != current_hmon:
            current_hmon = new_hmon
            target_w = int(n_mw * 0.8)
            target_h = int(n_mh * 0.8)
            target_x = n_mx + (n_mw - target_w) // 2
            target_y = n_my + (n_mh - target_h) // 2
            user32.SetWindowPos(
                hwnd, None,
                target_x, target_y, target_w, target_h,
                SWP_NOZORDER | SWP_NOACTIVATE
            )

def main():
    api = AeroGlassAPI()
    ui_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "src", "ui", "index.html"))
    win_title = "AeroGlass Nav - Flight Planner & Moving Map"

    init_hmon, mx, my, mw, mh = get_monitor_from_cursor()
    init_w = int(mw * 0.8)
    init_h = int(mh * 0.8)
    init_x = mx + (mw - init_w) // 2
    init_y = my + (mh - init_h) // 2

    window = webview.create_window(
        title=win_title,
        url=ui_path,
        js_api=api,
        x=init_x,
        y=init_y,
        width=init_w,
        height=init_h,
        min_size=(640, 400),
        background_color="#090d16"
    )

    def start_watcher():
        t = threading.Thread(target=monitor_watcher, args=(win_title, init_hmon), daemon=True)
        t.start()

    webview.start(start_watcher, debug=False, http_server=True)

if __name__ == "__main__":
    main()