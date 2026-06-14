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

# Konfigurasi CORS yang lebih fleksibel
origins = ["http://localhost:5173", "http://localhost:3000"]
frontend_url_env = os.getenv("FRONTEND_URL")
if frontend_url_env:
    # Memisahkan berdasarkan koma jika ada banyak URL, menghapus spasi, dan menghapus trailing slash '/'
    for url in frontend_url_env.split(","):
        clean_url = url.strip().rstrip("/")
        if clean_url and clean_url not in origins:
            origins.append(clean_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
