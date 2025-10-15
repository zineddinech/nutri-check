from fastapi import FastAPI
from .api.api import api_router
from .database.database import client as db_client, db

# --- Application FastAPI ---
app = FastAPI(
    title="Nutri-Check API",
    description="API pour rechercher des produits alimentaires et gérer les utilisateurs.",
    version="3.0.0",
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
