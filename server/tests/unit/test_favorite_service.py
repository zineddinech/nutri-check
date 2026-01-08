from unittest.mock import patch

import pytest
from bson import ObjectId
from fastapi import HTTPException, status

from app.services.favorite_service import FavoriteService


# --- FIXTURE LOCALE D'INJECTION DE LA BASE DE DONNÉES SIMULÉE ---
@pytest.fixture(autouse=True)
def setup_mock_db_favorite_service(monkeypatch, mock_db):
    """
    Force FavoriteService à utiliser le mock_db au lieu de la connexion réelle.
    """
    from app.services import favorite_service

    monkeypatch.setattr(favorite_service, "get_db", lambda: mock_db)


# --- Données de base pour les tests ---
PRODUCT_ID = "3017620424564"
PRODUCT_DATA = {
    "_id": PRODUCT_ID,
    "product_name": "Eau minérale",
    "brands": "Volvic",
    "nutriscore_score": 0,
    "ecoscore_score": 50,
}


@pytest.mark.asyncio
async def test_add_favorite_success(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    await mock_db["products"].insert_one(PRODUCT_DATA)

    favorite_id = await FavoriteService.add_favorite(user_id, PRODUCT_ID)
    assert favorite_id is not None

    fav_doc = await mock_db["favorites"].find_one({"_id": ObjectId(favorite_id)})
    assert fav_doc is not None
    assert fav_doc["user_id"] == user_id
    assert fav_doc["product_id"] == PRODUCT_ID
    assert fav_doc["product_snapshot"]["product_name"] == PRODUCT_DATA["product_name"]


@pytest.mark.asyncio
async def test_add_favorite_duplicate(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    await mock_db["products"].insert_one(PRODUCT_DATA)
    await FavoriteService.add_favorite(user_id, PRODUCT_ID)

    with pytest.raises(HTTPException) as excinfo:
        await FavoriteService.add_favorite(user_id, PRODUCT_ID)

    assert excinfo.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Produit déjà dans les favoris" in excinfo.value.detail


@pytest.mark.asyncio
async def test_add_favorite_user_not_found(mock_db):
    await mock_db["products"].insert_one(PRODUCT_DATA)

    with pytest.raises(HTTPException) as excinfo:
        await FavoriteService.add_favorite(str(ObjectId()), PRODUCT_ID)

    assert excinfo.value.status_code == status.HTTP_404_NOT_FOUND
    assert "Utilisateur introuvable" in excinfo.value.detail


@pytest.mark.asyncio
async def test_add_favorite_product_not_found(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    with pytest.raises(HTTPException) as excinfo:
        await FavoriteService.add_favorite(user_id, "9999999999999")

    assert excinfo.value.status_code == status.HTTP_404_NOT_FOUND
    assert "Produit introuvable" in excinfo.value.detail


@pytest.mark.asyncio
async def test_get_user_favorites(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    product_a = {"_id": "1", "product_name": "A", "nutriscore_score": 1}
    product_b = {"_id": "2", "product_name": "B", "nutriscore_score": 2}
    await mock_db["products"].insert_many([product_a, product_b])

    await FavoriteService.add_favorite(user_id, "1")
    await FavoriteService.add_favorite(user_id, "2")

    favorites = await FavoriteService.get_user_favorites(user_id)

    assert len(favorites) == 2
    assert favorites[0]["product_id"] == "2"
    assert favorites[1]["product_id"] == "1"
    assert isinstance(favorites[0]["_id"], str)


@pytest.mark.asyncio
async def test_remove_favorite_success(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    await mock_db["products"].insert_one(PRODUCT_DATA)
    await FavoriteService.add_favorite(user_id, PRODUCT_ID)

    initial_count = await mock_db["favorites"].count_documents({})
    assert initial_count == 1

    deleted = await FavoriteService.remove_favorite(user_id, PRODUCT_ID)

    assert deleted is True
    final_count = await mock_db["favorites"].count_documents({})
    assert final_count == 0


@pytest.mark.asyncio
async def test_remove_favorite_not_found(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    deleted = await FavoriteService.remove_favorite(user_id, "9999999999999")

    assert deleted is False
