"""Entry point pipeline ML.

Urutan eksekusi:
    1. preprocessing  → siapkan data bersih + scaler
    2. clustering     → K-Means, tambahkan label klaster
    3. regression     → Random Forest per klaster (delta_ipm & delta_kemiskinan)
    4. bundle + save  → backend/models/ml_models.pkl

Jalankan: python -m ml.train
"""

import joblib
from pathlib import Path

from ml.preprocessing import run_preprocessing, validate_output
from ml.clustering import run_clustering
from ml.regression import run_regression

MODEL_OUTPUT_PATH = Path(__file__).parent.parent / "backend" / "models" / "ml_models.pkl"


def main() -> None:
    print("=" * 50)
    print("=== [1/4] Preprocessing ===")
    print("=" * 50)
    prep = run_preprocessing()
    validate_output(prep)

    print()
    print("=" * 50)
    print("=== [2/4] Clustering ===")
    print("=" * 50)
    clust = run_clustering(prep)

    print()
    print("=" * 50)
    print("=== [3/4] Regression ===")
    print("=" * 50)
    reg = run_regression(prep, clust)

    print()
    print("=" * 50)
    print("=== [4/4] Simpan artifact ===")
    print("=" * 50)
    artifact = {
        "scaler_cluster":        prep["scaler_cluster"],
        "scaler_reg":            prep["scaler_reg"],
        "kmeans":                clust["kmeans"],
        "k":                     clust["k"],
        "regressors_ipm":        reg["regressors_ipm"],
        "regressors_kemiskinan": reg["regressors_kemiskinan"],
        "cluster_profiles":      clust["cluster_profiles"],
        "df_clustered":          clust["df_with_clusters"],
        "feature_names": {
            "cluster":    prep["cluster_feature_names"],
            "regression": prep["regression_feature_names"],
        },
        "metrics":         reg["metrics"],
        "importances":     reg["importances"],
        "cluster_medians": reg["cluster_medians"],
    }

    MODEL_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, MODEL_OUTPUT_PATH)
    print(f"[Train] Artifact disimpan ke: {MODEL_OUTPUT_PATH}")

    _print_summary(prep, clust, reg)


def _print_summary(prep: dict, clust: dict, reg: dict) -> None:
    print()
    print("=" * 50)
    print("=== Ringkasan Pipeline ===")
    print("=" * 50)
    print(f"  Training set     : {len(prep['df'])} baris (2014-2018)")
    print(f"  Fitur clustering : {len(prep['cluster_feature_names'])}")
    print(f"  Fitur regression : {len(prep['regression_feature_names'])}")
    print(f"  K optimal        : {clust['k']} klaster")
    dist = clust["df_with_clusters"]["klaster"].value_counts().sort_index()
    for k_id, cnt in dist.items():
        m  = reg["metrics"][k_id]
        r2 = m.get("R2", m.get("note", "n/a"))
        print(f"    Klaster {k_id}: {cnt} baris  |  R2={r2}  model={m.get('model_ipm','RF')}")
    print(f"  Artifact         : {MODEL_OUTPUT_PATH}")
    print("[Train] OK Pipeline selesai")


if __name__ == "__main__":
    main()
