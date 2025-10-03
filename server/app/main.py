from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from server.app.database.database import Base, engine, get_db
from server.app.models.user import User 
from server.app.api.api import api_router


app = FastAPI(
    title="User Management API",
    description="API de gestion des utilisateurs avec persistance SQLAlchemy",
    version="2.0.0",
)

# Création des tables
Base.metadata.create_all(bind=engine)

# Inclusion des routes
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "User Management API - Persistent Storage",
        "version": "2.0.0",
        "documentation": "/docs",
        "note": "Les données sont stockées dans une base de données via SQLAlchemy",
    }


@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Statistiques de l'API"""
    total_users = db.query(User).count()
    last_id = db.query(User.id).order_by(User.id.desc()).first()
    return {
        "total_users": total_users,
        "last_id": last_id[0] if last_id else None
    }
