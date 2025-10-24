"""
conftest.py — Fichier commun à tous les tests (unitaires, intégration, E2E).

Contient :
- Une base MongoDB simulée (mongomock)
- Un client FastAPI pour les tests d’API
- Des données de test communes
"""

import mongomock
import pytest
from app.main import app
from fastapi.testclient import TestClient
from pymongo import MongoClient

# ============================================================
#   FIXTURE 1 — Base MongoDB simulée
# ============================================================


@pytest.fixture(scope="function")
def mock_db():
    """
    Crée une base MongoDB simulée avec mongomock.
    """
    client = mongomock.MongoClient()
    db = client["test_database"]
    try:
        yield db  # Accessible dans les tests via 'mock_db'
    finally:
        client.close()


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
def sample_product():
    """
    Exemple de produit simulé.
    """
    return {
        "code": "123456789",
        "product_name": "Nutella",
        "brands": "Ferrero",
        "categories": "snacks,biscuits",
        "nutriscore_grade": "E",
        "energy_100g": 530.0,
        "fat_100g": 30.0,
        "sugars_100g": 56.0,
        "proteins_100g": 6.0,
        "salt_100g": 0.1,
    }

@pytest.fixture
def sample_allergens():
    """
    Exemple de liste d'allergènes simulée.
    """
    return ["Crustaceans", "Peanut", "Matsutake", "Milk", "Eggs"]
