import os
import multiprocessing as mp
import webview
from src.core.api import AeroGlassAPI

def main():
    api = AeroGlassAPI()
    ui_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "ui", "index.html")

    webview.create_window(
        title="AeroGlass Nav - Flight Planner & Moving Map",
        url=ui_path,
        js_api=api,
        width=1360,
        height=840,
        min_size=(1024, 680),
        background_color="#090d16"
    )
    webview.start(http_server=True, debug=False)

if __name__ == "__main__":
    mp.freeze_support()
    main()