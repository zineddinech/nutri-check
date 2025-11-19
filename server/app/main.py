from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from fastapi.staticfiles import StaticFiles

from .api.api import api_router
from .database.database import client as db_client
from .database.database import db

# --- Application FastAPI ---
app = FastAPI(
    title="Nutri-Check API",
    description="API pour rechercher des produits alimentaires et gérer les utilisateurs.",
    version="3.0.0",
)

BASE_DIR = Path(__file__).resolve().parents[1]  # /app/app → parents[1] = /app
IMAGES_DIR = BASE_DIR / "compressed_images"

# 🔴 IMPORTANT : créer le dossier s'il n'existe pas
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/images",
    StaticFiles(directory=str(IMAGES_DIR)),
    name="images",
)

# Autoriser CORS pour le dev (ajoute ou adapte les origines si besoin)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # pour dev tu peux mettre ["*"] mais mieux restreindre
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Événements de cycle de vie ---


@app.on_event("startup")
async def startup_db_client():
    """Établir la connexion à MongoDB au démarrage"""
    print("✅ FastAPI application startup complete.")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Fermer la connexion à MongoDB à l’arrêt"""
    db_client.close()
    print("🛑 Connexion MongoDB fermée")


# --- Routes ---

# Inclusion des routes de l'API définies dans api/api.py
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "message": "Welcome to the Nutri-Check API",
        "version": "3.0.0",
        "documentation": "/docs",
        "note": "Les données sont stockées dans une base MongoDB via Motor",
    }


@app.get("/stats")
async def get_stats():
    """Statistiques de l'API"""
    total_users = await db["users"].count_documents({})
    last_user = await db["users"].find_one(sort=[("_id", -1)])
    last_id = str(last_user["_id"]) if last_user else None
    return {"total_users": total_users, "last_id": last_id}
