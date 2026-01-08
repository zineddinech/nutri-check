"""
End-to-End Tests for Favorite Endpoints

Tests:
- add_favorite (POST /favorites/)
- get_user_favorites (GET /favorites/user/{user_id})
- remove_favorite (DELETE /favorites/{user_id}/{product_id})
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.user import UserCreate
from app.services.user_service import UserService


@pytest.fixture
def client():
    return TestClient(app)


@pytest.mark.asyncio
async def test_add_favorite_success(client):
    """Test adding a product to favorites"""
    # Create a test user
    user_data = UserCreate(
        email="favuser@example.com",
        username="favuser",
        first_name="Fav",
        last_name="User",
        password="FavPass123",
    )
    user = await UserService.create_user(user_data)

    # Add a favorite
    response = client.post(
        "/api/favorites/", json={"user_id": user.id, "product_id": "test_product_id"}
    )

    assert response.status_code == 201
    data = response.json()
    assert "favorite_id" in data


@pytest.mark.asyncio
async def test_add_favorite_with_invalid_product(client):
    """Test adding invalid product to favorites"""
    # Create a test user
    user_data = UserCreate(
        email="favuser2@example.com",
        username="favuser2",
        first_name="Fav",
        last_name="User",
        password="FavPass123",
    )
    user = await UserService.create_user(user_data)

    # Try to add favorite with non-existent product
    response = client.post(
        "/api/favorites/",
        json={"user_id": user.id, "product_id": "nonexistent_product"},
    )

    # Might succeed with creation or fail with 404
    assert response.status_code in [201, 404]


@pytest.mark.asyncio
async def test_get_user_favorites_success(client):
    """Test getting user's favorites"""
    # Create a test user
    user_data = UserCreate(
        email="favuser3@example.com",
        username="favuser3",
        first_name="Fav",
        last_name="User",
        password="FavPass123",
    )
    user = await UserService.create_user(user_data)

    # Get favorites
    response = client.get(f"/api/favorites/user/{user.id}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_user_favorites_empty(client):
    """Test getting favorites for user with no favorites"""
    # Create a new user
    user_data = UserCreate(
        email="newfavuser@example.com",
        username="newfavuser",
        first_name="New",
        last_name="FavUser",
        password="NewFavPass123",
    )
    user = await UserService.create_user(user_data)

    # Get favorites (should be empty)
    response = client.get(f"/api/favorites/user/{user.id}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


@pytest.mark.asyncio
async def test_get_favorites_nonexistent_user(client):
    """Test getting favorites for non-existent user"""
    response = client.get("/api/favorites/user/nonexistent_user_id")

    # Should return empty list or 404
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_remove_favorite_success(client):
    """Test removing a favorite"""
    # Create a user and add a favorite first
    user_data = UserCreate(
        email="removefav@example.com",
        username="removefav",
        first_name="Remove",
        last_name="Fav",
        password="RemoveFavPass123",
    )
    user = await UserService.create_user(user_data)

    # Add a favorite first
    client.post(
        "/api/favorites/", json={"user_id": user.id, "product_id": "test_product_123"}
    )

    # Remove the favorite
    response = client.delete(f"/api/favorites/{user.id}/test_product_123")

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_remove_favorite_not_found(client):
    """Test removing a non-existent favorite"""
    # Create a user
    user_data = UserCreate(
        email="nofav@example.com",
        username="nofav",
        first_name="No",
        last_name="Fav",
        password="NoFavPass123",
    )
    user = await UserService.create_user(user_data)

    # Try to remove non-existent favorite
    response = client.delete(f"/api/favorites/{user.id}/nonexistent_product")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_favorite_workflow(client):
    """Test complete favorite workflow: add -> get -> remove"""
    # Create a user
    user_data = UserCreate(
        email="workflow@example.com",
        username="workflow",
        first_name="Work",
        last_name="Flow",
        password="WorkFlowPass123",
    )
    user = await UserService.create_user(user_data)

    # Add favorite
    response1 = client.post(
        "/api/favorites/", json={"user_id": user.id, "product_id": "workflow_product"}
    )
    assert response1.status_code == 201

    # Get favorites
    response2 = client.get(f"/api/favorites/user/{user.id}")
    assert response2.status_code == 200

    # Remove favorite
    response3 = client.delete(f"/api/favorites/{user.id}/workflow_product")
    assert response3.status_code == 204

    # Verify it's removed
    response4 = client.get(f"/api/favorites/user/{user.id}")
    favorites = response4.json()
    product_ids = [fav.get("product_id") for fav in favorites]
    assert "workflow_product" not in product_ids
