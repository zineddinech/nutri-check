from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient

from .api.api import api_router

app = FastAPI(
    title="User Management API",
    description="API de gestion des utilisateurs avec persistance MongoDB (Motor)",
    version="3.0.0",
)

# Connexion à MongoDB
MONGO_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_URL)
db = client["nutri_check"]

# Inclusion des routes
app.include_router(api_router, prefix="/api")


@app.on_event("startup")
async def startup_db_client():
    """Établir la connexion à MongoDB au démarrage"""
    app.mongodb_client = AsyncIOMotorClient(MONGO_URL)
    app.mongodb = app.mongodb_client["nutri_check"]
    print("✅ Connexion MongoDB établie")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Fermer la connexion à MongoDB à l’arrêt"""
    app.mongodb_client.close()
    print("🛑 Connexion MongoDB fermée")


@app.get("/")
async def root():
    return {
        "message": "User Management API - MongoDB Storage",
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
