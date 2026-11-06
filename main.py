import os
import webview
from src.core.api import AeroGlassAPI

def main():
    api = AeroGlassAPI()
    
    ui_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "src", "ui", "index.html"))
    
    window = webview.create_window(
        title="AeroGlass Nav - Flight Planner & Moving Map",
        url=ui_path,
        js_api=api,
        width=1350,
        height=850,
        min_size=(1024, 700),
        background_color="#090d16"
    )
    
    webview.start(debug=False, http_server=True)

if __name__ == "__main__":
    main()