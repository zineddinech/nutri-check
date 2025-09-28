from fastapi import FastAPI
from .api.api import api_router as api_router

app = FastAPI(
    title="User Management API - In Memory",
    description="API de gestion des utilisateurs avec stockage en mémoire",
    version="1.0.0"
)

# Inclusion des routes
app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "User Management API - In Memory Storage",
        "version": "1.0.0",
        "documentation": "/docs",
        "note": "Les données sont stockées en mémoire et seront perdues au redémarrage"
    }

@app.get("/stats")
def get_stats():
    """Statistiques de l'API"""
    from .database.memory_db import db_instance
    return {
        "total_users": len(db_instance.users),
        "next_id": db_instance.next_id
    }