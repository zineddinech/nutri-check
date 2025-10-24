import pytest
from fastapi.testclient import TestClient # Utilisé pour la vérification du type dans les fixtures, non obligatoire

# ------------------------------------------------------------
# 1. Exemple de test d'API (Utilise la fixture 'client' de conftest.py)
# ------------------------------------------------------------

def test_api_root_endpoint_status(client: TestClient):
    """
    Vérifie si le point de terminaison racine ('/') de l'application
    FastAPI retourne le code d'état HTTP 200.
    (Utilise la fixture 'client' synchrone définie dans conftest.py)
    """
    # Simuler l'envoi d'une requête GET au point de terminaison racine
    # Supposons que votre app.main ait une route @app.get("/")
    response = client.get("/")

    # Assertion: Vérifier que le code d'état est 200
    assert response.status_code == 200, "Root endpoint did not return 200 OK"

    # Affichage optionnel pour la console (en anglais)
    print(f"Test passed: Root endpoint returned {response.status_code}")


# ------------------------------------------------------------
# 2. Exemple de test de la fixture de base de données simulée (mock_db)
# ------------------------------------------------------------

def test_mock_db_is_functional(mock_db):
    """
    Vérifie que la fixture de base de données simulée (mongomock)
    est correctement créée et utilisable.
    """
    # Tenter d'insérer un document dans la base de données simulée
    collection = mock_db["test_collection"]
    document = {"name": "test_document", "value": 101}
    inserted_id = collection.insert_one(document).inserted_id

    # Assertion: S'assurer que le document a été inséré
    assert inserted_id is not None, "Document insertion failed in mock_db"

    # Assertion: S'assurer qu'il peut être retrouvé
    found_doc = collection.find_one({"name": "test_document"})
    assert found_doc["value"] == 101, "Retrieved document value is incorrect"

    # Affichage optionnel pour la console (en anglais)
    print(f"Test passed: Mock DB is operational and found value {found_doc['value']}")


# ------------------------------------------------------------
# 3. Exemple de test simple (pour valider la collecte)
# ------------------------------------------------------------

def test_pytest_is_collecting():
    """
    Un test minimaliste pour confirmer que Pytest collecte et exécute
    les fichiers de test.
    """
    # Assertion simple qui doit toujours réussir
    assert 5 * 5 == 25

    # Affichage optionnel pour la console (en anglais)
    print("Test passed: Pytest collecting is confirmed.")