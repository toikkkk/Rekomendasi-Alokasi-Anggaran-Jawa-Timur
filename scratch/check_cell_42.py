import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

nb_path = Path("notebooks/eda_dan_model.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

cell = nb["cells"][42]
print("--- CELL 42 ---")
print("".join(cell["source"]))
