import os
import sys
import webview
from src.core.api import AeroGlassAPI


def get_resource_path(relative_path):
    """Restituisce il percorso assoluto, compatibile con PyInstaller (_MEIPASS)."""
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


def main():
    api = AeroGlassAPI()
    ui_path = get_resource_path(os.path.join("src", "ui", "index.html"))

    webview.create_window(
        title="AeroGlass Nav - Flight Planner & Moving Map",
        url=ui_path,
        js_api=api,
        width=1360,
        height=840,
        min_size=(960, 600),
        background_color="#0f172a"
    )
    webview.start(debug=False)


if __name__ == "__main__":
    main()