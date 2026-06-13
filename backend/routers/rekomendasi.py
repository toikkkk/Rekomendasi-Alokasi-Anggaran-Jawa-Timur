from fastapi import APIRouter
from backend.services import predictor
from backend.models.schemas import RekomendasiRequest, RekomendasiResponse

router = APIRouter()


@router.post("/rekomendasi", response_model=RekomendasiResponse)
def get_rekomendasi(body: RekomendasiRequest):
    """Hitung rekomendasi alokasi belanja optimal (delta_ipm tertinggi)."""
    return predictor.recommend(body)
