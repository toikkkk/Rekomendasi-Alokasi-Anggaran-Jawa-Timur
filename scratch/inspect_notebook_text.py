import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

nb_path = Path("notebooks/eda_dan_model.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

for idx, cell in enumerate(nb["cells"]):
    if cell["cell_type"] == "code":
        source = cell["source"]
        text = "".join(source) if isinstance(source, list) else source
        if "assert X_cluster_scaled.shape" in text or "IPM Aktual" in text or "X_cluster shape" in text:
            print(f"Cell {idx}:")
            print(text)
            print("-" * 50)
