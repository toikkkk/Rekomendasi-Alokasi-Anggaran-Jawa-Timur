from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from backend.routers import pemda, rekomendasi, simulasi

load_dotenv()

app = FastAPI(
    title="Rekomendasi Alokasi Anggaran Daerah",
    description="API sistem rekomendasi komposisi belanja APBD berbasis kondisi sosial-ekonomi",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pemda.router, prefix="/api")
app.include_router(rekomendasi.router, prefix="/api")
app.include_router(simulasi.router, prefix="/api")


@app.get("/")
def health_check():
    return {"status": "ok", "version": "0.1.0"}
