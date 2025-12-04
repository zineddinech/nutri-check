from httpx import AsyncClient
import pytest
from bson import ObjectId
from fastapi import status

from app.main import app
from server.app.database.database import get_db
from server.app.services.user_service import UserService


# ----------------------- Add allergens to user integration tests -----------------------
@pytest.mark.asyncio
async def test_add_allergies(client, sample_user):
    """
    Ajoute un allergène via l'endpoint.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    response = client.post(f"/api/users/{user_id}/allergies", json=["Milk"])
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "Milk" in data["allergies"]
    assert len(data["allergies"]) == old_allergies_amount + 1
    assert data["username"] == username


@pytest.mark.asyncio
async def test_add_multiple_allergies(client, sample_user):
    """
    Ajoute plusieurs allergènes via l'endpoint.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    response = client.post(
        f"/api/users/{user_id}/allergies", json=["Peanut", "Milk"])
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "Peanut" in data["allergies"]
    assert "Milk" in data["allergies"]
    assert len(data["allergies"]) == old_allergies_amount + 2
    assert data["username"] == username


@pytest.mark.asyncio
async def test_add_duplicated_allergies(client, sample_user):
    """
    Ajoute deux fois le même allergène via l'endpoint.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    response = client.post(f"/api/users/{user_id}/allergies", json=["Milk"])
    assert response.status_code == status.HTTP_200_OK

    response = client.post(f"/api/users/{user_id}/allergies", json=["Milk"])
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "Milk" in data["allergies"]
    assert len(data["allergies"]) == old_allergies_amount + 1
    assert data["username"] == username
    assert data["allergies"].count("Milk") == 1


@pytest.mark.asyncio
async def test_add_empty_allergy_list(client, sample_user):
    """
    Ajout d’une liste vide d’allergènes, ne change rien.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    response = client.post(f"/api/users/{user_id}/allergies", json=[])
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data["allergies"]) == old_allergies_amount
    assert data["username"] == username


@pytest.mark.asyncio
async def test_add_allergy_to_nonexistent_user_raises(client):
    """
    Ajout à un utilisateur inexistant via l'endpoint.
    """
    response = client.post(
        f"/api/users/{str(ObjectId())}/allergies", json=["Milk"])
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Utilisateur non trouvé" in response.json()["detail"]


# ----------------------- Remove allergens to user integration tests -----------------------
@pytest.mark.asyncio
async def test_remove_allergy(client, sample_user):
    """
    Supprime un allergène via l'endpoint.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    response = client.post(
        f"/api/users/{user_id}/allergies", json=["Peanut", "Milk"])
    data = response.json()
    old_allergies_amount = len(data["allergies"])

    response = client.request(
        "DELETE", f"/api/users/{user_id}/allergies", json=["Peanut"]
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "Peanut" not in data["allergies"]
    assert "Milk" in data["allergies"]
    assert len(data["allergies"]) == old_allergies_amount - 1
    assert data["username"] == username


@pytest.mark.asyncio
async def test_remove_multiple_allergies(client, sample_user):
    """
    Supprime plusieurs allergènes d’un coup via l'endpoint.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    response = client.post(
        f"/api/users/{user_id}/allergies", json=["Milk", "Peanut", "Eggs"]
    )
    data = response.json()
    old_allergies_amount = len(data["allergies"])

    response = client.request(
        "DELETE", f"/api/users/{user_id}/allergies", json=["Peanut", "Eggs"]
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "Peanut" not in data["allergies"]
    assert "Eggs" not in data["allergies"]
    assert "Milk" in data["allergies"]
    assert len(data["allergies"]) == old_allergies_amount - 2
    assert data["username"] == username


@pytest.mark.asyncio
async def test_remove_allergy_not_in_user(client, sample_user):
    """
    Supprime un allergène que l’utilisateur n’a pas, ne change rien via l'endpoint.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    response = client.post(f"/api/users/{user_id}/allergies", json=["Milk"])
    data = response.json()
    old_allergies_amount = len(data["allergies"])

    response = client.request(
        "DELETE", f"/api/users/{user_id}/allergies", json=["Peanut"]
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "Milk" in data["allergies"]
    assert len(data["allergies"]) == old_allergies_amount
    assert data["username"] == username


@pytest.mark.asyncio
async def test_remove_allergies_empty_list(client, sample_user):
    """
    Supprime une liste vide d’allergènes, ne change rien via l'endpoint.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    response = client.post(f"/api/users/{user_id}/allergies", json=["Milk"])
    data = response.json()
    old_allergies_amount = len(data["allergies"])

    response = client.request(
        "DELETE", f"/api/users/{user_id}/allergies", json=[])
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "Milk" in data["allergies"]
    assert len(data["allergies"]) == old_allergies_amount
    assert data["username"] == username


@pytest.mark.asyncio
async def test_remove_allergy_from_nonexistent_user(client):
    """
    Supprime un allergène chez un utilisateur inexistant via l'endpoint.
    """
    response = client.request(
        "DELETE", f"/api/users/{str(ObjectId())}/allergies", json=["Milk"]
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Utilisateur non trouvé" in response.json()["detail"]


@pytest.mark.asyncio
async def test_forgot_password_integration(sample_user):

    async with AsyncClient(app=app, base_url="http://api") as client:

        # 1. Create a user first
        user = await sample_user

        # 2. Send forgot password
        response = await client.post("/auth/forgot-password", json={
            "email": user["email"]
        })

        assert response.status_code == 200
        assert response.json()["message"] == "Code envoyé par email"


@pytest.mark.asyncio
async def test_reset_password_integration(sample_user):

    async with AsyncClient(app=app, base_url="http://api") as client:

        user = await sample_user

        db = get_db()

        user = await db["users"].find_one({"email": user["email"]})
        code = user["reset_code"]

        response = await client.post("/auth/reset-password", json={
            "email": user["email"],
            "code": code,
            "new_password": "NewTest123!"
        })

        assert response.status_code == 200
