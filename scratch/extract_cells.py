import json
from pathlib import Path

nb_path = Path("notebooks/eda_dan_model.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

output = []
for idx, cell in enumerate(nb["cells"]):
    if cell["cell_type"] == "code":
        source = cell["source"]
        text = "".join(source) if isinstance(source, list) else source
        if any(term in text for term in ["CLUSTER_FEATURES", "REGRESSION_FEATURES", "TARGET_REG", "TARGET_KEMISKINAN", "compare_models", "def train_single"]):
            output.append(f"=== CELL {idx} ===")
            output.append(text)
            output.append("\n" + "="*80 + "\n")

out_path = Path("scratch/notebook_cells_of_interest.txt")
with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(output))

print(f"Dumped {len(output)//3} cells to {out_path}")
