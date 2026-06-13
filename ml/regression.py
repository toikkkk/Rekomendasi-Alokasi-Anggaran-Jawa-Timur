"""Fallback training module — digunakan oleh ml/train.py untuk quick retrain.

CATATAN: Untuk pelatihan resmi dengan pemilihan model otomatis,
gunakan notebook `notebooks/eda_dan_model.ipynb` (Section 6).
ml/train.py menggunakan Random Forest dengan parameter tetap (tanpa model comparison).
"""

import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.preprocessing import REGRESSION_FEATURES, REGRESSION_FEATURES_KEMISKINAN, TARGET_REG, TARGET_KEMISKINAN

RF_PARAMS = {
    "n_estimators": 200,
    "min_samples_leaf": 2,
    "random_state": 42,
}

TEST_YEAR  = 2018   # tahun holdout — tidak dilihat saat training
MODELS_DIR = Path(__file__).parent.parent / "backend" / "models"


def _train_single(
    X_df: pd.DataFrame,
    y: np.ndarray,
    years: np.ndarray,
    target_name: str,
    cluster_id: int,
) -> tuple:
    """Temporal split: train = 2014–2017, test = 2018, finalize = semua data.

    Returns (finalized_pipeline, metrics_dict).
    Pipeline menerima raw DataFrame — RobustScaler tertanam di dalamnya.
    """
    n = len(X_df)
    pipe = Pipeline([("scaler", RobustScaler()), ("model", RandomForestRegressor(**RF_PARAMS))])

    train_mask = years < TEST_YEAR
    test_mask  = years == TEST_YEAR

    n_train = train_mask.sum()
    n_test  = test_mask.sum()

    if n_train < 4 or n_test == 0:
        # Micro-cluster atau tidak ada data 2018 → fit langsung semua data
        pipe.fit(X_df, y)
        return pipe, {"n": n, "model_ipm": "Random Forest", "note": "micro-cluster"}

    # 1. Evaluasi pada test set (2018)
    pipe.fit(X_df.iloc[train_mask], y[train_mask])
    y_pred = pipe.predict(X_df.iloc[test_mask])
    y_te   = y[test_mask]

    metrics = {
        "n":       n,
        "n_train": int(n_train),
        "n_test":  int(n_test),
        "split":   f"train=2014-{TEST_YEAR-1}, test={TEST_YEAR}",
        "model_ipm": "Random Forest",
        "MAE":  round(float(mean_absolute_error(y_te, y_pred)), 4),
        "RMSE": round(float(mean_squared_error(y_te, y_pred) ** 0.5), 4),
        "R2":   round(float(r2_score(y_te, y_pred)), 4),
    }

    # 2. Finalize: latih ulang pada SELURUH data
    pipe.fit(X_df, y)
    return pipe, metrics


def run_regression(prep_result: dict, clustering_result: dict) -> dict:
    """Latih Pipeline RF per klaster untuk IPM dan kemiskinan.

    Menggunakan temporal split (train 2014–2017, test 2018) untuk evaluasi,
    lalu finalize pada seluruh data.
    """
    df_clean: pd.DataFrame     = prep_result["df"]
    reg_index                  = prep_result["df_reg_index"]
    df_clustered: pd.DataFrame = clustering_result["df_with_clusters"]

    X_ipm_full  = df_clean.loc[reg_index, REGRESSION_FEATURES].copy()
    X_kem_full  = df_clean.loc[reg_index, REGRESSION_FEATURES_KEMISKINAN].copy()
    y_ipm_arr   = df_clean.loc[reg_index, TARGET_REG].values
    y_kem_arr   = df_clean.loc[reg_index, TARGET_KEMISKINAN].values
    years_arr   = df_clean.loc[reg_index, "tahun"].values

    cluster_labels = df_clustered.loc[reg_index, "klaster"].values

    regressors_ipm:        dict = {}
    regressors_kemiskinan: dict = {}
    metrics:               dict = {}
    importances:           dict = {}
    cluster_medians:       dict = {}

    for k_id in sorted(set(cluster_labels)):
        mask = cluster_labels == k_id

        pipe_ipm, m_ipm = _train_single(
            X_ipm_full[mask], y_ipm_arr[mask], years_arr[mask], TARGET_REG, k_id
        )
        pipe_kem, _     = _train_single(
            X_kem_full[mask], y_kem_arr[mask], years_arr[mask], TARGET_KEMISKINAN, k_id
        )

        regressors_ipm[k_id]        = pipe_ipm
        regressors_kemiskinan[k_id] = pipe_kem
        metrics[k_id]               = m_ipm

        try:
            rf_step = pipe_ipm.named_steps["model"]
            importances[k_id] = dict(zip(REGRESSION_FEATURES, rf_step.feature_importances_.tolist()))
        except Exception:
            importances[k_id] = {f: 0.0 for f in REGRESSION_FEATURES}

        cluster_medians[k_id] = {
            col: float(df_clean.loc[reg_index[mask], col].median())
            for col in REGRESSION_FEATURES
        }

        r2   = m_ipm.get("R2", "n/a")
        note = m_ipm.get("note", "")
        split_info = m_ipm.get("split", "")
        print(f"[Regression] Klaster {k_id}: n={m_ipm['n']}  R2(test 2018)={r2}  {note or split_info}")

    _save_artifacts(regressors_ipm, regressors_kemiskinan)

    return {
        "regressors_ipm":        regressors_ipm,
        "regressors_kemiskinan": regressors_kemiskinan,
        "metrics":               metrics,
        "importances":           importances,
        "cluster_medians":       cluster_medians,
    }


def _save_artifacts(regressors_ipm: dict, regressors_kemiskinan: dict) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    with open(MODELS_DIR / "regressors_ipm.pkl", "wb") as f:
        pickle.dump(regressors_ipm, f)
    with open(MODELS_DIR / "regressors_kemiskinan.pkl", "wb") as f:
        pickle.dump(regressors_kemiskinan, f)
    print(f"[Regression] Artifact disimpan ke: {MODELS_DIR}")


if __name__ == "__main__":
    from ml.preprocessing import run_preprocessing
    from ml.clustering import run_clustering

    prep  = run_preprocessing()
    clust = run_clustering(prep)
    result = run_regression(prep, clust)

    print("\n=== Metrik Evaluasi Temporal Split ===")
    for k_id, m in result["metrics"].items():
        r2   = m.get("R2", "n/a")
        note = m.get("note", "")
        print(f"Klaster {k_id}: R²(test 2018)={r2}  n_train={m.get('n_train','—')}  n_test={m.get('n_test','—')}  {note}")
    print("\n[Regression] OK selesai")
