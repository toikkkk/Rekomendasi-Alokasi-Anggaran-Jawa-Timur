import json
from pathlib import Path

nb_path = Path("notebooks/eda_dan_model.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

patched_count = 0

for idx, cell in enumerate(nb["cells"]):
    if cell["cell_type"] == "code":
        source = cell["source"]
        # Convert list of lines to a single string for replacement
        text = "".join(source) if isinstance(source, list) else source
        
        orig_text = text
        
        if idx == 26:
            text = text.replace("X_cluster_scaled.shape == (190, 10)", "X_cluster_scaled.shape == (190, 9)")
            print(f"Patched Cell 26.")
        
        if idx == 42:
            text = text.replace("'IPM Aktual'", "'Delta IPM Aktual'")
            text = text.replace("'IPM Prediksi'", "'Delta IPM Prediksi'")
            text = text.replace("'Actual vs Predicted IPM'", "'Actual vs Predicted Delta IPM'")
            print(f"Patched Cell 42.")
        
        if idx == 51:
            text = text.replace('prep["cluster_feature_names"]', 'CLUSTER_FEATURES')
            text = text.replace('prep["regression_feature_names"]', 'REGRESSION_FEATURES')
            text = text.replace('len(regressors)', 'len(regressors_ipm)')
            print(f"Patched Cell 51.")
        
        if text != orig_text:
            # Jupyter cells usually store source as list of strings ending with \n
            # but standard string is also valid. We'll split it by lines to keep it clean.
            cell["source"] = [line + "\n" for line in text.split("\n")][:-1]
            # Add back the last line without \n if there wasn't one, or just keep it simple
            if text.endswith("\n"):
                cell["source"].append("\n")
            else:
                # Add back lines properly
                lines = text.splitlines(keepends=True)
                cell["source"] = lines
            patched_count += 1

with open(nb_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)

print(f"Notebook saved. Total cells patched: {patched_count}")
