import os
import sys
import time
import ctypes
import threading
import traceback
from datetime import datetime

# Lock globale condiviso: garantisce che una sola operazione SimConnect alla volta comunichi con MSFS 2024
SIMCONNECT_GLOBAL_LOCK = threading.RLock()

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
LOG_FILE = os.path.join(LOG_DIR, "aeroglass_diag.log")
_log_lock = threading.Lock()


class _MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", ctypes.c_ulong),
        ("dwMemoryLoad", ctypes.c_ulong),
        ("ullTotalPhys", ctypes.c_ulonglong),
        ("ullAvailPhys", ctypes.c_ulonglong),
        ("ullTotalPageFile", ctypes.c_ulonglong),
        ("ullAvailPageFile", ctypes.c_ulonglong),
        ("ullTotalVirtual", ctypes.c_ulonglong),
        ("ullAvailVirtual", ctypes.c_ulonglong),
        ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
    ]


def get_system_memory_snapshot():
    """Restituisce una stringa compatta con l'uso attuale di RAM fisica e Memoria Virtuale (Commit/Pagefile)."""
    try:
        stat = _MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(_MEMORYSTATUSEX)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            ram_used_gb = (stat.ullTotalPhys - stat.ullAvailPhys) / (1024 ** 3)
            ram_tot_gb = stat.ullTotalPhys / (1024 ** 3)
            commit_used_gb = (stat.ullTotalPageFile - stat.ullAvailPageFile) / (1024 ** 3)
            commit_tot_gb = stat.ullTotalPageFile / (1024 ** 3)
            return f"RAM:{stat.dwMemoryLoad}% ({ram_used_gb:.1f}/{ram_tot_gb:.1f}GB) | Commit:{commit_used_gb:.1f}/{commit_tot_gb:.1f}GB"
    except Exception:
        pass
    return "MEM:N/A"


def log_diag(category, message, flush_disk=True):
    """Scrive una riga nel file logs/aeroglass_diag.log forzando il salvataggio fisico immediato su disco (fsync)."""
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        tid = threading.current_thread().name
        mem_info = get_system_memory_snapshot()
        line = f"[{ts}] [{category:12s}] [T:{tid}] [{mem_info}] {message}\n"
        with _log_lock:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(line)
                if flush_disk:
                    f.flush()
                    os.fsync(f.fileno())
    except Exception:
        pass


def install_crash_hooks():
    """Intercetta e salva su disco qualsiasi eccezione Python o di thread prima di un eventuale crash."""
    log_diag("STARTUP", "=== AVVIO SESSIONE DIAGNOSTICA AEROGLASS-NAV ===")

    def _handle_exception(exc_type, exc_value, exc_tb):
        tb_str = "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
        log_diag("FATAL_EXC", f"Eccezione non gestita:\n{tb_str}", flush_disk=True)
        sys.__excepthook__(exc_type, exc_value, exc_tb)

    def _handle_thread_exception(args):
        tb_str = "".join(traceback.format_exception(args.exc_type, args.exc_value, args.exc_traceback))
        log_diag("THREAD_EXC", f"Eccezione nel thread {args.thread.name}:\n{tb_str}", flush_disk=True)

    sys.excepthook = _handle_exception
    if hasattr(threading, "excepthook"):
        threading.excepthook = _handle_thread_exception