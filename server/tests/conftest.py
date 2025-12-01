"""
conftest.py — Fichier commun à tous les tests (unitaires, intégration, E2E).

Contient :
- Une base MongoDB simulée (mongomock)
- Un client FastAPI pour les tests d’API
- Des données de test communes
"""

import mongomock
import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.main import app

# ============================================================
#   FIXTURE 1 — Base MongoDB simulée
# ============================================================


class AsyncMongoCollection:
    """
    Wrapper pour rendre les méthodes MongoDB awaitables.
    """

    def __init__(self, collection):
        self._collection = collection

    def __getattr__(self, item):
        attr = getattr(self._collection, item)
        if callable(attr):
            # Rend la fonction awaitable
            async def async_func(*args, **kwargs):
                return attr(*args, **kwargs)

            return async_func
        return attr


class AsyncMongoDB:
    """
    Wrapper pour rendre toutes les collections awaitables automatiquement.
    """

    def __init__(self, db):
        self._db = db

    def __getitem__(self, item):
        return AsyncMongoCollection(self._db[item])

    def __getattr__(self, item):
        return getattr(self._db, item)


@pytest.fixture(scope="function")
def mock_db():
    client = mongomock.MongoClient()
    db = client["test_database"]
    async_db = AsyncMongoDB(db)
    try:
        yield async_db
    finally:
        client.close()


@pytest.fixture(autouse=True)
def override_db(monkeypatch, mock_db):
    """
    Force tous les services à utiliser la base mockée pendant les tests.
    """
    from app.services import user_service

    monkeypatch.setattr(user_service, "get_db", lambda: mock_db)


# ============================================================
#   FIXTURE 2 — Base Mongo réelle
# ============================================================


@pytest.fixture(scope="session")
def real_db():
    """
    Connexion à une vraie instance MongoDB.
    """
    mongo_url = "mongodb://localhost:27017"
    client = MongoClient(mongo_url)
    db = client["nutri_check"]
    try:
        yield db
    finally:
        client.close()


# ============================================================
#   FIXTURE 3 — Client FastAPI
# ============================================================


@pytest.fixture(scope="module")
def client():
    """
    Crée un client HTTP de test pour l’API FastAPI.
    """
    test_client = TestClient(app)
    yield test_client


# ============================================================
#   FIXTURE 4 — Données de test communes
# ============================================================


@pytest.fixture
async def sample_user(mock_db):
    """
    Crée un utilisateur factice dans la base MongoDB simulée.
    Retourne son document complet (avec _id).
    """
    user = {
        "email": "test@example.com",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": "hashed_pw",
        "is_active": True,
        "created_at": "2025-10-31T00:00:00Z",
        "updated_at": None,
        "allergies": [],
    }
    result = await mock_db["users"].insert_one(user)  # <--- await ici
    user["_id"] = str(result.inserted_id)
    return user


@pytest.fixture
def sample_allergens():
    """
    Exemple de liste d'allergènes simulée.
    """
    return ["Crustaceans", "Peanut", "Matsutake", "Milk", "Eggs"]
