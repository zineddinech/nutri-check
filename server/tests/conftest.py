"""
conftest.py — Fichier commun à tous les tests (unitaires, intégration, E2E).

Contient :
- Une base MongoDB simulée (mongomock)
- Un client FastAPI pour les tests d’API
- Des données de test communes
"""

import mongomock
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.main import app

# Configuration de pytest-asyncio
pytest_plugins = ("pytest_asyncio",)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test session."""
    import asyncio

    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ============================================================
#   FIXTURE 1 — Base MongoDB simulée
# ============================================================


class AsyncMongoCollection:
    """
    Wrapper pour rendre les méthodes MongoDB awaitables.
    """

    def __init__(self, collection):
        self._collection = collection

    def find(self, *args, **kwargs):
        cursor = self._collection.find(*args, **kwargs)
        return AsyncMongoCursor(cursor)

    def aggregate(self, pipeline, *args, **kwargs):
        """
        Aggregate returns a cursor directly (not a coroutine), matching Motor behavior.
        This allows chaining .to_list() on the result.
        """
        cursor = self._collection.aggregate(pipeline, *args, **kwargs)
        return AsyncMongoCursor(cursor)

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
    from app.services import (
        favorite_service,
        product_service,
        shopping_trip_service,
        user_service,
    )

    # Tous les services doivent pointer vers la même base Mongo simulée.
    monkeypatch.setattr(user_service, "get_db", lambda: mock_db)
    monkeypatch.setattr(favorite_service, "get_db", lambda: mock_db)
    monkeypatch.setattr(product_service, "get_db", lambda: mock_db)
    monkeypatch.setattr(shopping_trip_service, "get_db", lambda: mock_db)


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


class JSONFriendlyTestClient(TestClient):
    """
    Extension de TestClient pour accepter l'argument `json` sur delete().

    Certaines versions de httpx / TestClient ne permettent pas de passer
    json= directement à delete(), alors que nos tests e2e le font.
    Cette classe harmonise le comportement en déléguant à request().
    """

    def delete(self, url, **kwargs):
        return super().request("DELETE", url, **kwargs)


@pytest.fixture(scope="module")
def client():
    """
    Crée un client HTTP de test pour l’API FastAPI.
    """
    test_client = JSONFriendlyTestClient(app)
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


FAVORITE_E2E_PRODUCTS = [
    {"_id": "test_product_id", "product_name": "Test Product", "brands": "Test", "nutriscore_score": 0, "ecoscore_score": 50},
    {"_id": "test_product_123", "product_name": "Test Product 123", "brands": "Test", "nutriscore_score": 0, "ecoscore_score": 50},
    {"_id": "workflow_product", "product_name": "Workflow Product", "brands": "Test", "nutriscore_score": 0, "ecoscore_score": 50},
]


@pytest_asyncio.fixture
async def seed_favorite_products(mock_db):
    """Insert products required by favorite e2e tests into mock_db."""
    for p in FAVORITE_E2E_PRODUCTS:
        try:
            await mock_db["products"].insert_one(p.copy())
        except Exception:
            pass
    return mock_db


class AsyncMongoCursor:
    def __init__(self, cursor):
        self.cursor = cursor

    def sort(self, *args, **kwargs):
        self.cursor = self.cursor.sort(*args, **kwargs)
        return self

    def skip(self, n):
        self.cursor = self.cursor.skip(n)
        return self

    def limit(self, n):
        self.cursor = self.cursor.limit(n)
        return self

    async def to_list(self, length=None):
        if length is not None:
            return list(self.cursor)[:length]
        return list(self.cursor)
