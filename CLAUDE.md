# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Gambaran Proyek

**Nama:** Sistem Rekomendasi Alokasi Belanja APBD Berbasis K-Means Clustering dan Random Forest untuk Peningkatan IPM Kabupaten/Kota di Jawa Timur
**Tujuan:** Merekomendasikan komposisi belanja APBD optimal untuk 38 kab/kota Jawa Timur berdasarkan kondisi sosial-ekonomi daerah, menggunakan pendekatan K-Means clustering + Random Forest regression.
**Dataset:** `data/dataset_final_jatim.csv` — 228 baris × 30 kolom (38 pemda × 6 tahun: 2013–2018)
**Stack:** scikit-learn · FastAPI · React + Recharts + TailwindCSS

---

## Commands

```bash
# Python dependencies
pip install -r requirements.txt

# Full ML training (wajib dijalankan sebelum backend)
python -m ml.train
# → backend/models/ml_models.pkl  (artifact utama)
# → data/processed/*.csv, *.pkl

# Test modul ML secara mandiri
python -m ml.preprocessing      # verifikasi 190 baris, 0 NaN
python -m ml.clustering         # verifikasi K optimal + distribusi klaster
python -m ml.regression         # verifikasi R² per klaster

# Backend FastAPI
uvicorn backend.main:app --reload
# → http://localhost:8000  |  docs: http://localhost:8000/docs

# Frontend React (Vite)
cd frontend && npm install && npm run dev
# → http://localhost:5173

cd frontend && npm run build     # production build
cd frontend && npm run preview   # preview production build
```

---

## ML Pipeline

### Training (`python -m ml.train`)

```
preprocessing.py  →  clustering.py  →  regression.py  →  ml_models.pkl
```

`ml/train.py` memanggil ketiga modul secara berurutan. Modul `ml/scoring.py` **tidak** dijalankan saat training — ia digunakan saat inferensi oleh `backend/services/predictor.py`.

**Penting:** `ml/feature_engineering.py` belum diimplementasikan. Fitur lag dan rasio sudah ada di dataset mentah, sehingga preprocessing.py langsung memakainya tanpa modul terpisah.

### `ml/preprocessing.py`

- Konstanta `CLUSTER_FEATURES` (10 kolom) dan `REGRESSION_FEATURES` (12 kolom) didefinisikan di sini dan diimpor oleh semua modul lain.
- `REGRESSION_FEATURES_KEMISKINAN` = `REGRESSION_FEATURES` tanpa `delta_kemiskinan` (leakage prevention).
- **Target regression saat ini:** `ipm` level langsung (bukan `delta_ipm`). Konstanta: `TARGET_REG = "ipm"`, `TARGET_KEMISKINAN = "kemiskinan_pct"`. Pemilihan ini disengaja (R² lebih tinggi, simulasi lebih akurat).
- `run_preprocessing()` mengembalikan dict dengan key: `df`, `df_2013`, `X_cluster`, `X_reg`, `y_reg`, `scaler_cluster`, `scaler_reg`, `cluster_feature_names`, `regression_feature_names`, `df_reg_index`.

### `ml/clustering.py`

- K-Means `init='k-means++'`, `n_init=20`, `random_state=42`, K range 2–8.
- `select_optimal_k()`: pilih K dengan silhouette tertinggi yang memenuhi `K >= 3` dan boleh ada tepat 1 micro-cluster; semua klaster non-micro harus ≥ 15 anggota.
- Kota Surabaya dan Kota Kediri kemungkinan membentuk micro-cluster (outlier natural PDRB).

### `ml/regression.py`

- Melatih **dua** Random Forest per klaster: `regressors_ipm` (target: `ipm`) dan `regressors_kemiskinan` (target: `kemiskinan_pct`).
- RF params: `n_estimators=200`, `min_samples_leaf=2`, `random_state=42`.
- Klaster dengan < 8 sampel dilatih tanpa test split (full fit).

### Artifact `backend/models/ml_models.pkl`

```python
{
    "scaler_cluster":        RobustScaler,
    "scaler_reg":            RobustScaler,
    "kmeans":                KMeans,
    "k":                     int,
    "regressors_ipm":        {cluster_id: RandomForestRegressor},
    "regressors_kemiskinan": {cluster_id: RandomForestRegressor},
    "cluster_profiles":      DataFrame,
    "df_clustered":          DataFrame,   # 190 baris + kolom 'klaster'
    "feature_names":         {"cluster": [...], "regression": [...]},
    "metrics":               {cluster_id: {"ipm": {...}, "kemiskinan": {...}}},
    "importances":           {cluster_id: {feature_name: importance}},
    "cluster_medians":       {cluster_id: {feature_name: median}},
}
```

### `ml/scoring.py` (inferensi, bukan training)

- `generate_recommendation()`: bandingkan rasio aktual daerah vs median klaster terbaik (IPM tertinggi, ≥ 3 daerah unik); prioritaskan gap × feature importance.
- `simulate()`: prediksi level IPM dan kemiskinan dari alokasi what-if, lalu hitung delta vs lag1.
- `RASIO_COLS` = 6 kolom rasio belanja — konstanta ini diimpor oleh `predictor.py`.

---

## Backend Architecture

**Entry point:** `backend/main.py` — CORS dikonfigurasi via `FRONTEND_URL` env var.

### Layer inference: `backend/services/predictor.py`

Singleton loader: `_artifact` global di-load sekali via `_load_artifact()` (lazy, pertama kali dipanggil). Semua router memanggil fungsi dari modul ini — **jangan akses pkl langsung dari router**.

Fungsi utama:
- `get_all_pemda()` — ambil baris tahun terakhir per pemda dari `df_clustered`
- `get_pemda_detail(nama)` — historis satu pemda
- `get_cluster_info()` — statistik per klaster (satu baris per pemda, tahun terakhir)
- `get_perbandingan()` — realisasi vs rekomendasi untuk semua baris `df_clustered`
- `recommend(request)` — panggil `scoring.generate_recommendation()`
- `run_simulate(request)` — panggil `scoring.simulate()`
- `_predict_cluster()` — KMeans predict untuk daerah yang tidak ada di df_clustered; `tpt` di-impute dengan rata-rata global

### Routers

| File | Prefix | Endpoints |
|---|---|---|
| `backend/routers/pemda.py` | `/api` | GET `/pemda`, GET `/pemda/{nama}`, GET `/cluster`, GET `/perbandingan` |
| `backend/routers/rekomendasi.py` | `/api` | POST `/rekomendasi` |
| `backend/routers/simulasi.py` | `/api` | POST `/simulasi` |

### Schemas (`backend/models/schemas.py`)

Semua request/response Pydantic ada di sini. `RekomendasiRequest` membutuhkan 6 rasio + `ipm`, `kemiskinan_pct`, `pdrb_per_kapita`. `SimulasiRequest` membutuhkan `ipm_lag1`, `kemiskinan_lag1`, `pdrb_per_kapita` + 6 rasio.

---

## Frontend Architecture

**Routing** (`frontend/src/App.jsx`): `BrowserRouter` dengan 5 routes.

| Path | Halaman |
|---|---|
| `/` | Dashboard |
| `/daerah/:nama` | DetailDaerah |
| `/rekomendasi` | Rekomendasi |
| `/simulasi` | Simulasi |
| `/perbandingan` | Perbandingan |

**API layer** (`frontend/src/services/api.js`): semua calls ke backend via axios, `baseURL` dari `VITE_API_URL` (default `http://localhost:8000/api`). Gunakan fungsi yang sudah ada (`getAllPemda`, `getPemdaDetail`, `getClusterInfo`, `getPerbandingan`, `getRekomendasi`, `runSimulasi`) — jangan buat axios call langsung di komponen.

---

## Dataset — Isu Kritis

1. **[KRITIS] `pembiayaan` Kab. Banyuwangi tahun 2018 = -17.890.035 miliar Rp** → sudah ditangani di `preprocessing.py:load_and_clean()` dengan impute median per pemda. Jangan fix di data mentah.

2. **NaN di kolom lag tahun 2013** — by design; `preprocessing.py` drop tahun 2013. Training set = **190 baris** (2014–2018).

3. **`blj_tdk_langsung + blj_langsung ≠ belanja_total`** di 3 kota 2018 (Madiun, Malang, Mojokerto) → pakai `rasio_*_pct` sebagai fitur utama, bukan nominal absolut.

4. **PDRB Kota Kediri & Surabaya adalah outlier natural** — wajib RobustScaler, bukan StandardScaler.

5. **`rasio_sum` berkisar 73–109%** — normal karena `blj_bagi_hasil` tidak masuk kolom rasio.

---

## Aturan Kritis

- **Jangan modifikasi** `data/dataset_final_jatim.csv` — semua fix dilakukan di `ml/preprocessing.py`.
- **Target variabel regression adalah `ipm` level** (bukan `delta_ipm`) — ini keputusan desain final yang sudah diimplementasikan. ΔIPM dihitung sebagai `prediksi_ipm - ipm_lag1` di scoring.
- Saat menambah fitur ke `REGRESSION_FEATURES`, hapus juga dari `REGRESSION_FEATURES_KEMISKINAN` jika fitur tersebut menyebabkan leakage (seperti `delta_kemiskinan`).
- `backend/models/ml_models.pkl` di-load **sekali saat startup** melalui `predictor._load_artifact()`.
- Gunakan `python -m ml.<modul>` dari root project (bukan `python ml/<modul>.py`).
- Jangan hardcode path — gunakan `Path(__file__).parent`.
- File `.env` tidak boleh di-commit — gunakan `.env.example` sebagai template.

---

## Environment Variables

```
DATASET_PATH=data/dataset_final_jatim.csv
MODEL_PATH=backend/models/ml_models.pkl
PROCESSED_DIR=data/processed
API_HOST=0.0.0.0
API_PORT=8000
FRONTEND_URL=http://localhost:5173
```
