"""Singleton artifact loader dan semua fungsi inference backend."""

import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from functools import lru_cache

from ml.preprocessing import CLUSTER_FEATURES, REGRESSION_FEATURES, REGRESSION_FEATURES_KEMISKINAN
from ml.scoring import generate_recommendation, simulate, RASIO_COLS

MODEL_PATH = Path(__file__).parent.parent / "models" / "ml_models.pkl"

_artifact = None


def _load_artifact() -> dict:
    global _artifact
    if _artifact is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model tidak ditemukan: {MODEL_PATH}. "
                "Jalankan 'python -m ml.train' terlebih dahulu."
            )
        _artifact = joblib.load(MODEL_PATH)
    return _artifact


# ── Pemda ─────────────────────────────────────────────────────────────────────

def get_all_pemda() -> dict:
    """Kembalikan ringkasan 38 pemda berdasarkan data tahun terakhir."""
    df: pd.DataFrame = _load_artifact()["df_clustered"]
    latest_idx = df.groupby("nama_pemda")["tahun"].idxmax()
    latest = df.loc[latest_idx].sort_values("nama_pemda")

    data = [
        {
            "nama_pemda":     row["nama_pemda"],
            "klaster":        int(row["klaster"]),
            "ipm":            round(float(row["ipm"]), 2),
            "kemiskinan_pct": round(float(row["kemiskinan_pct"]), 2),
            "tahun_terakhir": int(row["tahun"]),
        }
        for _, row in latest.iterrows()
    ]
    return {"total": len(data), "data": data}


def get_pemda_detail(nama_pemda: str) -> dict | None:
    """Kembalikan profil lengkap + historis satu pemda."""
    df: pd.DataFrame = _load_artifact()["df_clustered"]
    subset = df[df["nama_pemda"] == nama_pemda].sort_values("tahun")
    if subset.empty:
        return None

    klaster = int(subset["klaster"].iloc[-1])
    historis = [
        {
            "tahun":               int(row["tahun"]),
            "pendapatan_total":    _safe_float(row.get("pendapatan_total")),
            "belanja_total":       _safe_float(row.get("belanja_total")),
            "rasio_pegawai_pct":   _safe_float(row.get("rasio_pegawai_pct")),
            "rasio_modal_pct":     _safe_float(row.get("rasio_modal_pct")),
            "rasio_barang_jasa_pct": _safe_float(row.get("rasio_barang_jasa_pct")),
            "ipm":                 _safe_float(row.get("ipm")),
            "kemiskinan_pct":      _safe_float(row.get("kemiskinan_pct")),
        }
        for _, row in subset.iterrows()
    ]
    return {"nama_pemda": nama_pemda, "klaster": klaster, "historis": historis}


def get_cluster_info() -> dict:
    """Kembalikan statistik tiap klaster."""
    df: pd.DataFrame = _load_artifact()["df_clustered"]

    # Gunakan data tahun terakhir per pemda agar satu daerah = satu baris
    latest = df.loc[df.groupby("nama_pemda")["tahun"].idxmax()]

    result = []
    for k_id in sorted(latest["klaster"].unique()):
        subset = latest[latest["klaster"] == k_id]
        result.append({
            "klaster":          int(k_id),
            "jumlah_daerah":    int(len(subset)),
            "rata_ipm":         round(float(subset["ipm"].mean()), 2),
            "rata_kemiskinan":  round(float(subset["kemiskinan_pct"].mean()), 2),
            "anggota":          sorted(subset["nama_pemda"].tolist()),
        })
    return {"data": result}


def get_perbandingan() -> dict:
    """Rekomendasi vs realisasi historis untuk seluruh daerah."""
    artifact = _load_artifact()
    df: pd.DataFrame = artifact["df_clustered"]
    best_cluster_id = int(
        df.groupby("klaster")["ipm"].mean().idxmax()
    )
    best_profile = {
        col: float(df[df["klaster"] == best_cluster_id][col].median())
        for col in RASIO_COLS
    }

    result = []
    for _, row in df.iterrows():
        actual = {col: round(float(row[col]), 4) for col in RASIO_COLS}
        result.append({
            "nama_pemda":       row["nama_pemda"],
            "tahun":            int(row["tahun"]),
            "rasio_realisasi":  actual,
            "rasio_rekomendasi": {k: round(v, 4) for k, v in best_profile.items()},
            "ipm_aktual":       round(float(row["ipm"]), 2),
            "ipm_prediksi":     _predict_ipm_for_row(row, artifact),
        })
    return {"data": result}


# ── Rekomendasi ───────────────────────────────────────────────────────────────

def recommend(request) -> dict:
    """Hasilkan rekomendasi alokasi optimal untuk satu daerah."""
    artifact = _load_artifact()
    df: pd.DataFrame = artifact["df_clustered"]

    # Cari klaster berdasarkan nama + tahun; fallback ke prediksi KMeans
    match = df[(df["nama_pemda"] == request.nama_pemda) & (df["tahun"] == request.tahun)]
    if not match.empty:
        current_cluster = int(match["klaster"].iloc[0])
    else:
        current_cluster = _predict_cluster(
            rasio={col: getattr(request, col) for col in RASIO_COLS},
            ipm=request.ipm,
            kemiskinan_pct=request.kemiskinan_pct,
            pdrb_per_kapita=request.pdrb_per_kapita,
            artifact=artifact,
        )

    pemda_rasio = {col: float(getattr(request, col)) for col in RASIO_COLS}
    rec = generate_recommendation(pemda_rasio, df, artifact["importances"], current_cluster)
    return {"nama_pemda": request.nama_pemda, **rec}


# ── Simulasi ──────────────────────────────────────────────────────────────────

def run_simulate(request) -> dict:
    """Prediksi dampak alokasi what-if (ΔIPM & ΔKemiskinan)."""
    artifact = _load_artifact()

    rasio_input = {col: float(getattr(request, col)) for col in RASIO_COLS}
    context = {
        "ipm_lag1":        request.ipm_lag1,
        "kemiskinan_lag1": request.kemiskinan_lag1,
        "pdrb_per_kapita": request.pdrb_per_kapita,
    }

    cluster_id = _predict_cluster(
        rasio=rasio_input,
        ipm=request.ipm_lag1,
        kemiskinan_pct=request.kemiskinan_lag1,
        pdrb_per_kapita=request.pdrb_per_kapita,
        artifact=artifact,
    )

    return simulate(
        rasio_input=rasio_input,
        context=context,
        cluster_id=cluster_id,
        regressors_ipm=artifact["regressors_ipm"],
        regressors_kemiskinan=artifact["regressors_kemiskinan"],
        cluster_medians=artifact["cluster_medians"],
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _predict_cluster(rasio: dict, ipm: float, kemiskinan_pct: float,
                     pdrb_per_kapita: float, artifact: dict) -> int:
    """Prediksi klaster dari fitur menggunakan model KMeans."""
    X = np.array([[
        rasio.get("rasio_pegawai_pct", 0),
        rasio.get("rasio_modal_pct", 0),
        rasio.get("rasio_barang_jasa_pct", 0),
        rasio.get("rasio_bansos_pct", 0),
        rasio.get("rasio_hibah_pct", 0),
        rasio.get("rasio_bantuan_keu_pct", 0),
        ipm,
        kemiskinan_pct,
        pdrb_per_kapita,
    ]])
    X_scaled = artifact["scaler_cluster"].transform(X)
    return int(artifact["kmeans"].predict(X_scaled)[0])


def _predict_ipm_for_row(row: pd.Series, artifact: dict) -> float:
    """Prediksi IPM satu baris menggunakan RF klaster-nya."""
    cluster_id = int(row["klaster"])
    regressors = artifact["regressors_ipm"]
    rf = regressors.get(cluster_id) or next(iter(regressors.values()))

    medians = artifact["cluster_medians"].get(cluster_id, {})
    X_df = pd.DataFrame(
        [[float(row.get(col, medians.get(col, 0))) for col in REGRESSION_FEATURES]],
        columns=REGRESSION_FEATURES,
    )
    delta_pred = float(rf.predict(X_df)[0])
    ipm_lag1 = float(row.get("ipm_lag1", medians.get("ipm_lag1", 0.0)))
    return round(ipm_lag1 + delta_pred, 2)


def _safe_float(val) -> float | None:
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    return round(float(val), 4)
