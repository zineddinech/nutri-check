import pytest
from fastapi.testclient import TestClient

# ------------------------------------------------------------
# 1. Exemple de test d'API (client FastAPI)
# ------------------------------------------------------------


def test_api_root_endpoint_status(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    print(f"Test passed: Root endpoint returned {response.status_code}")


# ------------------------------------------------------------
# 2. Exemple de test de la fixture de base de données simulée (mock_db)
# ------------------------------------------------------------


@pytest.mark.asyncio
async def test_mock_db_is_functional(mock_db):
    """
    Vérifie que la fixture de base de données simulée est opérationnelle
    et que ses méthodes sont awaitables.
    """
    collection = mock_db["test_collection"]
    document = {"name": "test_document", "value": 101}

    # Insert async
    inserted_result = await collection.insert_one(document)
    inserted_id = inserted_result.inserted_id
    assert inserted_id is not None, "Document insertion failed in mock_db"

    # Find async
    found_doc = await collection.find_one({"name": "test_document"})
    assert found_doc["value"] == 101, "Retrieved document value is incorrect"

    print(f"Test passed: Mock DB is operational and found value {found_doc['value']}")


# ------------------------------------------------------------
# 3. Exemple de test simple
# ------------------------------------------------------------


def test_pytest_is_collecting():
    assert 5 * 5 == 25
    print("Test passed: Pytest collecting is confirmed.")
