import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

K_RANGE = range(2, 9)
RANDOM_STATE = 42
N_INIT = 20

PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
MODELS_DIR = Path(__file__).parent.parent / "backend" / "models"


MIN_CLUSTER_SIZE = 15


def find_optimal_k(X_scaled: np.ndarray) -> dict:
    """Hitung inertia dan silhouette score untuk setiap K dalam K_RANGE.

    Mengembalikan juga fitted models agar select_optimal_k bisa reuse tanpa fit ulang.
    """
    ks, inertias, silhouettes, models = [], [], [], []
    for k in K_RANGE:
        km = KMeans(n_clusters=k, init="k-means++", n_init=N_INIT, random_state=RANDOM_STATE)
        km.fit(X_scaled)
        ks.append(k)
        inertias.append(km.inertia_)
        silhouettes.append(silhouette_score(X_scaled, km.labels_))
        models.append(km)
    result = {"k": ks, "inertia": inertias, "silhouette": silhouettes, "models": models}
    print("[Clustering] Distribusi klaster per K:")
    for k, km in zip(ks, models):
        sizes = sorted(np.bincount(km.labels_).tolist())
        print(f"[Clustering]   K={k}: {sizes}")
    return result


MIN_K = 3  # minimal 3 klaster agar segmentasi bermakna


def select_optimal_k(search_result: dict) -> tuple[int, KMeans]:
    """Pilih K dengan silhouette tertinggi yang memenuhi kriteria:
    - K >= MIN_K
    - Boleh ada tepat 1 micro-cluster (outlier natural seperti Kota Surabaya)
    - Semua klaster non-micro >= MIN_CLUSTER_SIZE
    """
    ranked = sorted(
        zip(search_result["k"], search_result["silhouette"], search_result["models"]),
        key=lambda x: x[1],
        reverse=True,
    )
    for k, _, km in ranked:
        if k < MIN_K:
            continue
        sizes = sorted(np.bincount(km.labels_).tolist())
        # izinkan 1 micro-cluster; cek sisanya >= MIN_CLUSTER_SIZE
        non_micro = sizes[1:]
        if min(non_micro) >= MIN_CLUSTER_SIZE:
            return k, km
    # fallback: K terkecil >= MIN_K
    for k, _, km in sorted(ranked, key=lambda x: x[0]):
        if k >= MIN_K:
            return k, km
    return ranked[0][0], ranked[0][2]


def assign_clusters(df: pd.DataFrame, kmeans: KMeans) -> pd.DataFrame:
    """Tambahkan kolom 'klaster' ke DataFrame sesuai label KMeans."""
    df = df.copy()
    df["klaster"] = kmeans.labels_
    return df


def build_cluster_profiles(df: pd.DataFrame) -> pd.DataFrame:
    """Hitung statistik ringkasan (mean) per klaster untuk semua kolom numerik."""
    return df.groupby("klaster").mean(numeric_only=True).round(4)


def save_artifacts(df_with_clusters: pd.DataFrame, kmeans: KMeans, profiles: pd.DataFrame) -> None:
    """Simpan KMeans model, df_with_clusters, cluster_profiles, dan label 2018 ke disk."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    with open(MODELS_DIR / "kmeans.pkl", "wb") as f:
        pickle.dump(kmeans, f)

    df_with_clusters.to_csv(PROCESSED_DIR / "df_with_clusters.csv", index=False, encoding="utf-8-sig")
    profiles.to_csv(PROCESSED_DIR / "cluster_profiles.csv", encoding="utf-8-sig")

    # Label klaster daerah untuk tahun terakhir (2018) — dipakai backend
    labels_2018 = (
        df_with_clusters[df_with_clusters["tahun"] == 2018][["nama_pemda", "klaster"]]
        .reset_index(drop=True)
    )
    labels_2018.to_csv(PROCESSED_DIR / "cluster_labels_2018.csv", index=False, encoding="utf-8-sig")

    print(f"[Clustering] Artifact disimpan ke: {PROCESSED_DIR} dan {MODELS_DIR}")


def print_summary(search_result: dict, k_optimal: int, df_with_clusters: pd.DataFrame) -> None:
    """Print ringkasan hasil clustering ke stdout."""
    best_idx = search_result["k"].index(k_optimal)
    print(f"[Clustering] K dievaluasi     : {list(K_RANGE)}")
    print(f"[Clustering] Silhouette scores: {[round(s, 4) for s in search_result['silhouette']]}")
    print(f"[Clustering] K optimal        : {k_optimal} (silhouette={search_result['silhouette'][best_idx]:.4f})")
    dist = df_with_clusters["klaster"].value_counts().sort_index()
    for klaster, count in dist.items():
        print(f"[Clustering]   Klaster {klaster}: {count} baris")
    print(f"[Clustering] OK Clustering selesai")


def run_clustering(preprocessing_result: dict) -> dict:
    """Orkestrasi full clustering pipeline; dipanggil oleh ml/train.py."""
    X_scaled: np.ndarray = preprocessing_result["X_cluster"]
    df: pd.DataFrame = preprocessing_result["df"]

    print("[Clustering] Mencari K optimal...")
    search_result = find_optimal_k(X_scaled)
    k_optimal, kmeans = select_optimal_k(search_result)

    print(f"[Clustering] Fitting KMeans K={k_optimal}...")
    df_with_clusters = assign_clusters(df, kmeans)
    profiles = build_cluster_profiles(df_with_clusters)

    save_artifacts(df_with_clusters, kmeans, profiles)
    print_summary(search_result, k_optimal, df_with_clusters)

    return {
        "kmeans": kmeans,
        "k": k_optimal,
        "df_with_clusters": df_with_clusters,
        "cluster_profiles": profiles,
        "search_result": search_result,
    }


if __name__ == "__main__":
    from ml.preprocessing import run_preprocessing

    prep = run_preprocessing()
    run_clustering(prep)
