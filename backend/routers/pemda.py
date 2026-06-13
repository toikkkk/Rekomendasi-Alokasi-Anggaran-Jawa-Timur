from fastapi import APIRouter, HTTPException
from backend.services import predictor
from backend.models.schemas import (
    PemdaListResponse,
    PemdaDetailResponse,
    ClusterResponse,
    PerbandinganResponse,
)

router = APIRouter()


@router.get("/pemda", response_model=PemdaListResponse)
def list_pemda():
    """List 38 kab/kota beserta klaster dan data tahun terakhir."""
    return predictor.get_all_pemda()


@router.get("/pemda/{nama_pemda}", response_model=PemdaDetailResponse)
def detail_pemda(nama_pemda: str):
    """Profil lengkap + historis APBD & sosek satu daerah."""
    data = predictor.get_pemda_detail(nama_pemda)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Pemda '{nama_pemda}' tidak ditemukan")
    return data


@router.get("/cluster", response_model=ClusterResponse)
def cluster_info():
    """Statistik tiap klaster: rata-rata IPM, kemiskinan, dan daftar anggota."""
    return predictor.get_cluster_info()


@router.get("/perbandingan", response_model=PerbandinganResponse)
def perbandingan():
    """Rekomendasi alokasi vs realisasi historis untuk seluruh daerah."""
    return predictor.get_perbandingan()
