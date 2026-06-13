import pandas as pd
import numpy as np
from sklearn.preprocessing import RobustScaler
from pathlib import Path

CLUSTER_FEATURES = [
    "rasio_pegawai_pct",
    "rasio_modal_pct",
    "rasio_barang_jasa_pct",
    "rasio_bansos_pct",
    "rasio_hibah_pct",
    "rasio_bantuan_keu_pct",
    "ipm_lag1",
    "kemiskinan_lag1",
    "pdrb_per_kapita",
]

REGRESSION_FEATURES = [
    # Alokasi belanja (keputusan kebijakan — ditetapkan sebelum outcome diukur)
    "rasio_pegawai_pct",
    "rasio_modal_pct",
    "rasio_barang_jasa_pct",
    "rasio_bansos_pct",
    "rasio_hibah_pct",
    "rasio_bantuan_keu_pct",
    # Kondisi sosek tahun sebelumnya (t-1) — kausal mendahului target ipm_t
    "ipm_lag1",
    "kemiskinan_lag1",
]
# DIHAPUS dari regression (variabel kontemporer dengan target ipm_t → data leakage):
#   delta_kemiskinan  = kemiskinan_t - kemiskinan_t-1  (mengandung info tahun t)
#   tpt               = tingkat pengangguran tahun t    (diukur bersamaan dengan ipm_t)
#   pdrb_per_kapita   = PDRB tahun t                   (diukur bersamaan dengan ipm_t)
#   belanja_per_pdrb  = belanja_t / pdrb_t             (diturunkan dari pdrb tahun t)
# Catatan: tpt & pdrb tetap dipakai di CLUSTER_FEATURES karena clustering tidak
# memprediksi target — hanya mengelompokkan daerah berdasarkan profil sosek.

TARGET_REG        = "delta_ipm"            # delta IPM (target model IPM)
TARGET_KEMISKINAN = "delta_kemiskinan"     # delta kemiskinan (target model kemiskinan)

# Kedua model sekarang pakai fitur yang sama (tidak ada lagi delta_kemiskinan)
REGRESSION_FEATURES_KEMISKINAN = list(REGRESSION_FEATURES)

DEFAULT_DATASET_PATH = (
    Path(__file__).parent.parent / "data" / "dataset_final_jatim.csv"
)


def load_and_clean(path: str) -> pd.DataFrame:
    """Load CSV, fix anomali Banyuwangi 2018, impute pembiayaan, drop tahun 2013."""
    df = pd.read_csv(path)

    # Fix anomali pembiayaan Kab. Banyuwangi 2018 (nilai mustahil secara fiskal)
    mask_bwi = (df["nama_pemda"] == "Kab. Banyuwangi") & (df["tahun"] == 2018)
    df.loc[mask_bwi, "pembiayaan"] = np.nan

    # Impute NaN pembiayaan dengan median per nama_pemda
    df["pembiayaan"] = df.groupby("nama_pemda")["pembiayaan"].transform(
        lambda s: s.fillna(s.median())
    )

    # Simpan 2013 sebelum di-drop (dikembalikan di run_preprocessing)
    df = df[df["tahun"] != 2013].copy()

    return df


def get_cluster_features(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, list[str]]:
    """Pilih dan validasi fitur untuk K-Means clustering."""
    X = df[CLUSTER_FEATURES].copy()
    nan_cols = X.columns[X.isna().any()].tolist()
    if nan_cols:
        raise ValueError(f"NaN ditemukan di fitur cluster: {nan_cols}")
    return X, list(CLUSTER_FEATURES)


def get_regression_features(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.Series, list[str]]:
    """Pilih fitur dan target untuk Random Forest; drop baris dengan NaN."""
    cols = REGRESSION_FEATURES + [TARGET_REG]
    df_reg = df[cols].dropna().copy()
    X = df_reg[REGRESSION_FEATURES]
    y = df_reg[TARGET_REG]
    return X, y, list(REGRESSION_FEATURES)


def fit_scalers(
    X_cluster: pd.DataFrame, X_reg: pd.DataFrame
) -> tuple[RobustScaler, RobustScaler]:
    """Fit RobustScaler terpisah untuk clustering dan regression (tidak transform)."""
    scaler_cluster = RobustScaler().fit(X_cluster)
    scaler_reg = RobustScaler().fit(X_reg)
    return scaler_cluster, scaler_reg


def transform_cluster(X: pd.DataFrame, scaler: RobustScaler) -> np.ndarray:
    """Apply scaler clustering ke data."""
    return scaler.transform(X)


def transform_regression(X: pd.DataFrame, scaler: RobustScaler) -> np.ndarray:
    """Apply scaler regression ke data."""
    return scaler.transform(X)


def run_preprocessing(dataset_path: str | None = None) -> dict:
    """Orkestrasi full preprocessing pipeline; dipanggil oleh ml/train.py."""
    path = dataset_path or str(DEFAULT_DATASET_PATH)

    df_raw = pd.read_csv(path)
    df_2013 = df_raw[df_raw["tahun"] == 2013].copy()

    df = load_and_clean(path)

    X_cluster_df, cluster_feature_names = get_cluster_features(df)
    X_reg_df, y_reg, regression_feature_names = get_regression_features(df)

    scaler_cluster, scaler_reg = fit_scalers(X_cluster_df, X_reg_df)

    X_cluster_scaled = transform_cluster(X_cluster_df, scaler_cluster)
    X_reg_scaled = transform_regression(X_reg_df, scaler_reg)

    result = {
        "df": df,
        "df_2013": df_2013,
        "X_cluster": X_cluster_scaled,
        "X_reg": X_reg_scaled,
        "y_reg": y_reg,
        "scaler_cluster": scaler_cluster,
        "scaler_reg": scaler_reg,
        "cluster_feature_names": cluster_feature_names,
        "regression_feature_names": regression_feature_names,
        "df_reg_index": X_reg_df.index,
    }

    save_artifacts(result)

    return result


def save_artifacts(result: dict, out_dir: str = None) -> None:
    """Simpan semua artifact preprocessing ke disk."""
    import pickle

    if out_dir is None:
        out_dir = Path(__file__).parent.parent / "data" / "processed"

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    result["df"].to_csv(out_dir / "df_clean.csv", index=False, encoding="utf-8-sig")
    result["df_2013"].to_csv(out_dir / "df_2013.csv", index=False, encoding="utf-8-sig")

    with open(out_dir / "scaler_cluster.pkl", "wb") as f:
        pickle.dump(result["scaler_cluster"], f)
    with open(out_dir / "scaler_reg.pkl", "wb") as f:
        pickle.dump(result["scaler_reg"], f)

    with open(out_dir / "feature_names.pkl", "wb") as f:
        pickle.dump(
            {
                "cluster": result["cluster_feature_names"],
                "regression": result["regression_feature_names"],
            },
            f,
        )

    print(f"[Preprocessing] Artifact disimpan ke: {out_dir}")


def validate_output(result: dict) -> None:
    """Validasi shape dan kebersihan output preprocessing; print ringkasan."""
    df: pd.DataFrame = result["df"]
    X_cluster: np.ndarray = result["X_cluster"]
    X_reg: np.ndarray = result["X_reg"]
    y_reg: pd.Series = result["y_reg"]

    errors = []

    if len(df) != 190:
        errors.append(f"df harus 190 baris, dapat {len(df)}")

    expected_reg_feats = len(REGRESSION_FEATURES)
    if X_cluster.shape != (190, 9):
        errors.append(f"X_cluster shape harus (190, 9), dapat {X_cluster.shape}")
    if X_reg.shape[1] != expected_reg_feats:
        errors.append(f"X_reg harus {expected_reg_feats} fitur, dapat {X_reg.shape[1]}")

    if np.isnan(X_cluster).any():
        errors.append("X_cluster mengandung NaN")

    if np.isnan(X_reg).any():
        errors.append("X_reg mengandung NaN")

    if y_reg.isna().any():
        errors.append("y_reg mengandung NaN")

    print(f"[Preprocessing] Baris total   : 228")
    print(f"[Preprocessing] Tahun 2013    : 38 baris (di-drop dari training)")
    print(f"[Preprocessing] Training set  : {len(df)} baris")
    print(f"[Preprocessing] Fitur cluster : {X_cluster.shape[1]}")
    print(f"[Preprocessing] Fitur regresi : {X_reg.shape[1]}")
    print(f"[Preprocessing] NaN tersisa   : {int(np.isnan(X_cluster).sum() + np.isnan(X_reg).sum() + y_reg.isna().sum())}")

    if errors:
        for e in errors:
            print(f"[Preprocessing] ❌ {e}")
        raise AssertionError("Validasi preprocessing gagal")

    print("[Preprocessing] OK Validasi passed")


if __name__ == "__main__":
    result = run_preprocessing()
    validate_output(result)
