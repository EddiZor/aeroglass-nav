# -*- mode: python ; coding: utf-8 -*-
import os
import sqlite3
from PyInstaller.utils.hooks import collect_all

# Consolida eventuali file -wal/-shm dentro src/core/aeroglass.db prima della build
_master_db = os.path.abspath(os.path.join('src', 'core', 'aeroglass.db'))
if os.path.isfile(_master_db):
    _c = sqlite3.connect(_master_db)
    _c.execute('PRAGMA wal_checkpoint(TRUNCATE);')
    _c.close()

datas = [
    ('src/ui', 'src/ui'),
    ('src/core/aeroglass.db', 'src/core'),
]
binaries = []
hiddenimports = [
    'sqlite3',
    'webview',
    'SimConnect',
    'router',
    'src.core.api',
    'src.core.database',
    'src.core.msfs_ground_db',
    'src.core.diagnostics',
    'src.core.aip_fetcher',
    'src.simconnect.telemetry',
]

# Include automaticamente SimConnect.dll e i relativi file interni
tmp_ret = collect_all('SimConnect')
datas += tmp_ret[0]
binaries += tmp_ret[1]
hiddenimports += tmp_ret[2]

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='AeroGlass-Nav',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='src/ui/AeroGlass-icon.ico',
)