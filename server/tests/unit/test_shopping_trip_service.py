from unittest.mock import patch

import pytest
from bson import ObjectId
from fastapi import HTTPException, status

from app.schemas.shopping_trip import ShoppingTripCreate, ShoppingTripItem
from app.services.shopping_trip_service import ShoppingTripService


# --- FIXTURE LOCALE D'INJECTION DE LA BASE DE DONNÉES SIMULÉE ---
@pytest.fixture(autouse=True)
def setup_mock_db_shopping_trip_service(monkeypatch, mock_db):
    """
    Force ShoppingTripService à utiliser le mock_db au lieu de la connexion réelle.
    """
    from app.services import shopping_trip_service

    monkeypatch.setattr(shopping_trip_service, "get_db", lambda: mock_db)


# --- Données de base pour les tests ---
PRODUCT_A_ID = "111"
PRODUCT_B_ID = "222"
PRODUCT_C_NO_SCORE_ID = "333"

PRODUCT_A = {
    "_id": PRODUCT_A_ID,
    "product_name": "Bon Produit A",
    "nutriscore_score": 1,
    "brands": "Brand A",
}

PRODUCT_B = {
    "_id": PRODUCT_B_ID,
    "product_name": "Mauvais Produit B",
    "nutriscore_score": 15,
    "brands": "Brand B",
}

PRODUCT_C_NO_SCORE = {
    "_id": PRODUCT_C_NO_SCORE_ID,
    "product_name": "Produit C (sans score)",
    "brands": "Brand C",
    "nutriscore_score": None,
}


@pytest.mark.asyncio
async def test_create_shopping_trip_success_with_average(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    await mock_db["products"].insert_many([PRODUCT_A, PRODUCT_B])

    trip_data = ShoppingTripCreate(
        user_id=user_id,
        name="Courses du mois",
        products=[
            ShoppingTripItem(product_id=PRODUCT_A_ID, quantity=1),
            ShoppingTripItem(product_id=PRODUCT_B_ID, quantity=1),
        ],
    )

    result = await ShoppingTripService.create_shopping_trip(trip_data)

    assert result["shopping_trip_id"] is not None
    assert result["average_nutriscore_score"] == 8.00
    assert result["average_nutriscore_grade"] == "C"
    assert result["nutriscore_count"] == 2
    assert result["total_products"] == 2


@pytest.mark.asyncio
async def test_create_shopping_trip_product_not_found(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    trip_data = ShoppingTripCreate(
        user_id=user_id,
        name="Test Erreur",
        products=[ShoppingTripItem(product_id="404NOTFOUND", quantity=1)],
    )

    with pytest.raises(HTTPException) as excinfo:
        await ShoppingTripService.create_shopping_trip(trip_data)

    assert excinfo.value.status_code == status.HTTP_404_NOT_FOUND
    assert "Produit 404NOTFOUND introuvable" in excinfo.value.detail


@pytest.mark.asyncio
async def test_create_shopping_trip_mixed_nutriscore(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    await mock_db["products"].insert_many([PRODUCT_A, PRODUCT_C_NO_SCORE])

    trip_data = ShoppingTripCreate(
        user_id=user_id,
        name="Produits mixtes",
        products=[
            ShoppingTripItem(product_id=PRODUCT_A_ID, quantity=1),
            ShoppingTripItem(product_id=PRODUCT_C_NO_SCORE_ID, quantity=1),
        ],
    )

    result = await ShoppingTripService.create_shopping_trip(trip_data)

    assert result["average_nutriscore_score"] == 1.00
    assert result["average_nutriscore_grade"] == "B"
    assert result["nutriscore_count"] == 1
    assert result["total_products"] == 2


def test_get_nutriscore_letter_mapping():
    assert ShoppingTripService._get_nutriscore_letter(-5) == "A"
    assert ShoppingTripService._get_nutriscore_letter(0) == "A"
    assert ShoppingTripService._get_nutriscore_letter(1) == "B"
    assert ShoppingTripService._get_nutriscore_letter(2) == "B"
    assert ShoppingTripService._get_nutriscore_letter(3) == "C"
    assert ShoppingTripService._get_nutriscore_letter(10) == "C"
    assert ShoppingTripService._get_nutriscore_letter(11) == "D"
    assert ShoppingTripService._get_nutriscore_letter(18) == "D"
    assert ShoppingTripService._get_nutriscore_letter(19) == "E"
    assert ShoppingTripService._get_nutriscore_letter(25) == "E"


@pytest.mark.asyncio
async def test_get_shopping_trips_by_user(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    trip_doc_a = {
        "user_id": user_id,
        "name": "Trip A",
        "created_at": "2024-01-01T00:00:00Z",
        "products": [],
        "_id": ObjectId(),
    }
    trip_doc_b = {
        "user_id": user_id,
        "name": "Trip B",
        "created_at": "2024-01-10T00:00:00Z",
        "products": [],
        "_id": ObjectId(),
    }
    await mock_db["shopping_trips"].insert_many([trip_doc_a, trip_doc_b])

    trips = await ShoppingTripService.get_shopping_trips_by_user(user_id)

    assert len(trips) == 2
    assert trips[0]["name"] == "Trip B"
    assert trips[1]["name"] == "Trip A"
    assert isinstance(trips[0]["_id"], str)


@pytest.mark.asyncio
async def test_get_shopping_trip_by_id_for_user(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    trip_id = str(ObjectId())
    trip_doc = {
        "_id": ObjectId(trip_id),
        "user_id": user_id,
        "name": "Mon Trip",
        "products": [],
    }
    await mock_db["shopping_trips"].insert_one(trip_doc)

    retrieved_trip = await ShoppingTripService.get_shopping_trip_by_id_for_user(
        trip_id, user_id
    )
    assert retrieved_trip is not None
    assert retrieved_trip["_id"] == trip_id

    retrieved_trip_wrong_user = (
        await ShoppingTripService.get_shopping_trip_by_id_for_user(
            trip_id, str(ObjectId())
        )
    )
    assert retrieved_trip_wrong_user is None


@pytest.mark.asyncio
async def test_delete_shopping_trip_for_user(mock_db, sample_user):
    user = await sample_user
    user_id = user["_id"]

    trip_id = str(ObjectId())
    trip_doc = {
        "_id": ObjectId(trip_id),
        "user_id": user_id,
        "name": "À Supprimer",
        "products": [],
    }
    await mock_db["shopping_trips"].insert_one(trip_doc)

    deleted = await ShoppingTripService.delete_shopping_trip_for_user(trip_id, user_id)
    assert deleted is True

    assert (
        await mock_db["shopping_trips"].count_documents({"_id": ObjectId(trip_id)}) == 0
    )
