from fastapi import APIRouter
from backend.services import predictor
from backend.models.schemas import SimulasiRequest, SimulasiResponse

router = APIRouter()


@router.post("/simulasi", response_model=SimulasiResponse)
def run_simulasi(body: SimulasiRequest):
    """Simulasi what-if: prediksi ΔIPM dan ΔKemiskinan dari alokasi yang diinputkan."""
    return predictor.run_simulate(body)
