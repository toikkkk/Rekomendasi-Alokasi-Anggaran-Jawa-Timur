# models/schemas.py
# Pydantic request/response models untuk seluruh endpoint FastAPI.
# Semua field mengikuti nama kolom dataset_final_jatim.csv.

from pydantic import BaseModel, Field
from typing import Optional


# ── Pemda ────────────────────────────────────────────────────────────────────

class PemdaSummary(BaseModel):
    nama_pemda: str
    klaster: int
    ipm: Optional[float]
    kemiskinan_pct: Optional[float]
    tahun_terakhir: int


class PemdaHistoris(BaseModel):
    tahun: int
    pendapatan_total: Optional[float]
    belanja_total: Optional[float]
    rasio_pegawai_pct: Optional[float]
    rasio_modal_pct: Optional[float]
    rasio_barang_jasa_pct: Optional[float]
    ipm: Optional[float]
    kemiskinan_pct: Optional[float]


class PemdaDetailResponse(BaseModel):
    nama_pemda: str
    klaster: int
    historis: list[PemdaHistoris]


class PemdaListResponse(BaseModel):
    total: int
    data: list[PemdaSummary]


# ── Cluster ───────────────────────────────────────────────────────────────────

class ClusterInfo(BaseModel):
    klaster: int
    jumlah_daerah: int
    rata_ipm: float
    rata_kemiskinan: float
    anggota: list[str]


class ClusterResponse(BaseModel):
    data: list[ClusterInfo]


# ── Rekomendasi ───────────────────────────────────────────────────────────────

class RekomendasiRequest(BaseModel):
    nama_pemda: str
    tahun: int
    rasio_pegawai_pct: float = Field(..., ge=0, le=100)
    rasio_modal_pct: float = Field(..., ge=0, le=100)
    rasio_barang_jasa_pct: float = Field(..., ge=0, le=100)
    rasio_bansos_pct: float = Field(..., ge=0, le=100)
    rasio_hibah_pct: float = Field(..., ge=0, le=100)
    rasio_bantuan_keu_pct: float = Field(..., ge=0, le=100)
    ipm: float
    kemiskinan_pct: float
    pdrb_per_kapita: float


class SektorRekomendasi(BaseModel):
    sektor: str
    label: str
    gap_pct: float
    prioritas: float
    arah: str  # "naik" | "turun"


class RekomendasiResponse(BaseModel):
    nama_pemda: str
    klaster_saat_ini: int
    target_klaster: int
    ipm_target: float
    rekomendasi: list[SektorRekomendasi]


# ── Simulasi ──────────────────────────────────────────────────────────────────

class SimulasiRequest(BaseModel):
    ipm_lag1: float
    kemiskinan_lag1: float
    pdrb_per_kapita: float
    rasio_pegawai_pct: float = Field(..., ge=0, le=100)
    rasio_modal_pct: float = Field(..., ge=0, le=100)
    rasio_barang_jasa_pct: float = Field(..., ge=0, le=100)
    rasio_bansos_pct: float = Field(..., ge=0, le=100)
    rasio_hibah_pct: float = Field(..., ge=0, le=100)
    rasio_bantuan_keu_pct: float = Field(..., ge=0, le=100)


class SimulasiResponse(BaseModel):
    prediksi_ipm: float
    prediksi_kemiskinan: float
    delta_ipm: float
    delta_kemiskinan: float


# ── Perbandingan ──────────────────────────────────────────────────────────────

class PerbandinganItem(BaseModel):
    nama_pemda: str
    tahun: int
    rasio_realisasi: dict
    rasio_rekomendasi: dict
    ipm_aktual: float
    ipm_prediksi: float


class PerbandinganResponse(BaseModel):
    data: list[PerbandinganItem]
