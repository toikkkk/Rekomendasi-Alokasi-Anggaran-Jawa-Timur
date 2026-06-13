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
        if any(term in text for term in ["RobustScaler", "KMeans", "RandomForestRegressor", "train_single", "TARGET_REG"]):
            print(f"--- Cell {idx} ---")
            print(text)
            print("\n" + "="*80 + "\n")
