import numpy as np
import pandas as pd

from ml.preprocessing import REGRESSION_FEATURES, REGRESSION_FEATURES_KEMISKINAN

RASIO_COLS = [
    "rasio_pegawai_pct",
    "rasio_modal_pct",
    "rasio_barang_jasa_pct",
    "rasio_bansos_pct",
    "rasio_hibah_pct",
    "rasio_bantuan_keu_pct",
]

SEKTOR_LABEL = {
    "rasio_pegawai_pct":     "Belanja Pegawai",
    "rasio_modal_pct":       "Belanja Modal",
    "rasio_barang_jasa_pct": "Belanja Barang & Jasa",
    "rasio_bansos_pct":      "Belanja Bantuan Sosial",
    "rasio_hibah_pct":       "Belanja Hibah",
    "rasio_bantuan_keu_pct": "Belanja Bantuan Keuangan",
}


# ── Recommendation ────────────────────────────────────────────────────────────

# Minimum jumlah daerah unik agar klaster layak jadi benchmark
MIN_DAERAH_BENCHMARK = 3


def get_cluster_benchmark_profile(df_clustered: pd.DataFrame, cluster_id: int) -> dict:
    """Dapatkan profil benchmark (median rasio belanja) untuk klaster tertentu.
    Benchmark diambil dari daerah-daerah di dalam klaster tersebut yang memiliki
    nilai IPM di atas median klaster (berperforma tinggi).
    """
    subset = df_clustered[df_clustered["klaster"] == cluster_id]
    if len(subset) == 0:
        return {col: 0.0 for col in RASIO_COLS}

    # Cari threshold median IPM di klaster tersebut
    median_ipm = subset["ipm"].median()

    # Ambil daerah dengan IPM >= median
    high_performers = subset[subset["ipm"] >= median_ipm]

    if len(high_performers) == 0:
        high_performers = subset

    profile = {col: float(high_performers[col].median()) for col in RASIO_COLS}
    return profile


def compute_gap(actual_rasio: dict, target_rasio: dict) -> dict:
    """Hitung selisih target - actual untuk setiap sektor.

    Positif = perlu naik, negatif = perlu turun.
    """
    return {
        col: round(target_rasio[col] - actual_rasio.get(col, 0.0), 4)
        for col in RASIO_COLS
    }


def score_recommendations(gap: dict, importances: dict) -> list:
    """Urutkan rekomendasi berdasarkan prioritas = |gap| × importance.

    Return list of dict dengan key: sektor, label, gap_pct, prioritas, arah.
    """
    result = []
    for col in RASIO_COLS:
        g = gap.get(col, 0.0)
        imp = importances.get(col, 0.0)
        prioritas = abs(g) * imp
        result.append({
            "sektor":    col,
            "label":     SEKTOR_LABEL[col],
            "gap_pct":   round(g, 4),
            "prioritas": round(prioritas, 6),
            "arah":      "naik" if g > 0 else "turun",
        })
    return sorted(result, key=lambda x: x["prioritas"], reverse=True)


def generate_recommendation(
    pemda_rasio: dict,
    df_clustered: pd.DataFrame,
    importances: dict,
    current_cluster: int,
) -> dict:
    """Hasilkan rekomendasi alokasi optimal untuk satu daerah.

    Args:
        pemda_rasio     : dict rasio aktual daerah {rasio_col: value}
        df_clustered    : DataFrame dengan kolom klaster + ipm
        importances     : {cluster_id: {feature_name: importance}} dari regression
        current_cluster : klaster daerah saat ini

    Returns dict:
        rekomendasi, target_klaster, ipm_target, klaster_saat_ini
    """
    # Gunakan benchmark lokal di dalam klaster daerah itu sendiri
    target_rasio = get_cluster_benchmark_profile(df_clustered, current_cluster)

    # Target IPM adalah rata-rata IPM dari daerah berkinerja tinggi di klaster tersebut
    subset = df_clustered[df_clustered["klaster"] == current_cluster]
    median_ipm = subset["ipm"].median()
    high_performers = subset[subset["ipm"] >= median_ipm]
    target_ipm = float(high_performers["ipm"].mean()) if len(high_performers) > 0 else float(subset["ipm"].mean())

    # Gunakan importances dari klaster daerah; fallback ke klaster pertama jika tidak ada
    imp_for_cluster = importances.get(current_cluster, next(iter(importances.values())) if importances else {})

    gap = compute_gap(pemda_rasio, target_rasio)
    rekomendasi = score_recommendations(gap, imp_for_cluster)

    return {
        "klaster_saat_ini": current_cluster,
        "target_klaster":   current_cluster,
        "ipm_target":       round(target_ipm, 2),
        "rekomendasi":      rekomendasi,
    }


# ── Simulation ────────────────────────────────────────────────────────────────

def simulate(
    rasio_input: dict,
    context: dict,
    cluster_id: int,
    regressors_ipm: dict,
    regressors_kemiskinan: dict,
    cluster_medians: dict,
) -> dict:
    """Prediksi dampak alokasi what-if terhadap ΔIPM dan ΔKemiskinan.

    Args:
        rasio_input     : dict 6 rasio belanja yang diinputkan user
        context         : dict {ipm_lag1, kemiskinan_lag1, pdrb_per_kapita}
        cluster_id      : klaster daerah (untuk pilih model yang tepat)
        regressors_ipm / regressors_kemiskinan : PyCaret finalized pipelines per klaster
        cluster_medians : median per fitur per klaster (untuk imputasi)

    Returns dict:
        prediksi_ipm, prediksi_kemiskinan, delta_ipm, delta_kemiskinan
    """
    medians = cluster_medians.get(cluster_id, {})

    def _val(f):
        return rasio_input.get(f, context.get(f, medians.get(f, 0.0)))

    # DataFrame raw (unscaled) — PyCaret menangani normalisasi secara internal
    X_ipm_df = pd.DataFrame([[_val(f) for f in REGRESSION_FEATURES]],
                             columns=REGRESSION_FEATURES)
    X_kem_df = pd.DataFrame([[_val(f) for f in REGRESSION_FEATURES_KEMISKINAN]],
                             columns=REGRESSION_FEATURES_KEMISKINAN)

    model_ipm = regressors_ipm.get(cluster_id) or next(iter(regressors_ipm.values()))
    model_kem = regressors_kemiskinan.get(cluster_id) or next(iter(regressors_kemiskinan.values()))

    # Model memprediksi delta secara langsung
    prediksi_delta_ipm = float(model_ipm.predict(X_ipm_df)[0])
    prediksi_delta_kem = float(model_kem.predict(X_kem_df)[0])

    ipm_lag1        = float(context.get("ipm_lag1", 0.0))
    kemiskinan_lag1 = float(context.get("kemiskinan_lag1", 0.0))

    return {
        "prediksi_ipm":        round(ipm_lag1 + prediksi_delta_ipm, 4),
        "prediksi_kemiskinan": round(kemiskinan_lag1 + prediksi_delta_kem, 4),
        "delta_ipm":           round(prediksi_delta_ipm, 4),
        "delta_kemiskinan":    round(prediksi_delta_kem, 4),
    }
