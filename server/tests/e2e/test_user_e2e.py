"""
End-to-End Tests for User Endpoints

Tests:
- create_user (POST /users/register)
- login (POST /users/login)
- get_users (GET /users/)
- get_user (GET /users/{user_id})
- update_user (PUT /users/{user_id})
- delete_user (DELETE /users/{user_id})
- add_allergies (POST /users/{user_id}/allergies)
- remove_allergies (DELETE /users/{user_id}/allergies)
- add_countries (POST /users/{user_id}/countries)
- remove_countries (DELETE /users/{user_id}/countries)
"""

import pytest

from app.schemas.user import UserCreate
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_register_user_success(client):
    """Test successful user registration"""
    response = client.post(
        "/users/register",
        json={
            "email": "newuser@example.com",
            "username": "newuser",
            "first_name": "New",
            "last_name": "User",
            "password": "SecurePass123",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert data["is_active"] is True
    assert "password" not in data


@pytest.mark.asyncio
async def test_register_user_weak_password(client):
    """Test registration with weak password"""
    response = client.post(
        "/users/register",
        json={
            "email": "user@example.com",
            "username": "user",
            "first_name": "User",
            "last_name": "Test",
            "password": "weak",
        },
    )

    # Pydantic validation returns 422; app-level validation can return 400
    assert response.status_code in (400, 422)
    data = response.json()
    detail = data.get("detail", "")
    if isinstance(detail, list):
        msgs = " ".join(
            e.get("msg", "") or str(e.get("ctx", ""))
            for e in detail
        ).lower()
        assert "password" in msgs or "caractères" in msgs or "8" in msgs
    else:
        assert "password" in str(detail).lower() or "caractères" in str(detail).lower()


@pytest.mark.asyncio
async def test_login_success(client):
    """Test successful user login"""
    # Create a user first
    user_data = UserCreate(
        email="login@example.com",
        username="loginuser",
        first_name="Login",
        last_name="User",
        password="LoginPass123",
    )
    await UserService.create_user(user_data)

    # Attempt login
    response = client.post(
        "/users/login", data={"username": "loginuser", "password": "LoginPass123"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "jwt_token" in data
    assert data["token_type"] == "Bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = client.post(
        "/users/login", data={"username": "nonexistent", "password": "WrongPassword"}
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_users_pagination(client):
    """Test getting list of users with pagination"""
    response = client.get("/users/", params={"skip": 0, "limit": 10})

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_user_by_id_success(client):
    """Test getting a specific user by ID"""
    # Create a user
    user_data = UserCreate(
        email="getuser@example.com",
        username="getuser",
        first_name="Get",
        last_name="User",
        password="GetPass123",
    )
    created_user = await UserService.create_user(user_data)
    user_id = created_user.id

    # Get the user
    response = client.get(f"/users/{user_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "getuser"


@pytest.mark.asyncio
async def test_get_user_not_found(client):
    """Test getting non-existent user"""
    response = client.get("/users/nonexistent_id")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_user_success(client):
    """Test updating user information"""
    # Create a user
    user_data = UserCreate(
        email="update@example.com",
        username="updateuser",
        first_name="Update",
        last_name="User",
        password="UpdatePass123",
    )
    created_user = await UserService.create_user(user_data)
    user_id = created_user.id

    # Update the user
    response = client.put(
        f"/users/{user_id}", json={"first_name": "Updated", "last_name": "Name"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated"


@pytest.mark.asyncio
async def test_delete_user_success(client):
    """Test deleting a user"""
    # Create a user
    user_data = UserCreate(
        email="delete@example.com",
        username="deleteuser",
        first_name="Delete",
        last_name="User",
        password="DeletePass123",
    )
    created_user = await UserService.create_user(user_data)
    user_id = created_user.id

    # Delete the user
    response = client.delete(f"/users/{user_id}")

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_add_allergies_success(client):
    """Test adding allergies to a user"""
    # Create a user
    user_data = UserCreate(
        email="allergy@example.com",
        username="allergyuser",
        first_name="Allergy",
        last_name="User",
        password="AllergyPass123",
    )
    created_user = await UserService.create_user(user_data)
    user_id = created_user.id

    # Add allergies (API expects raw array)
    response = client.post(
        f"/users/{user_id}/allergies", json=["peanuts", "shellfish"]
    )

    assert response.status_code == 200
    data = response.json()
    assert "peanuts" in data.get("allergies", [])


@pytest.mark.asyncio
async def test_remove_allergies_success(client):
    """Test removing allergies from a user"""
    # Create a user with allergies
    user_data = UserCreate(
        email="removeallergy@example.com",
        username="removeallergy",
        first_name="Remove",
        last_name="Allergy",
        password="RemovePass123",
    )
    created_user = await UserService.create_user(user_data)
    user_id = created_user.id

    # First add allergies
    await UserService.add_allergies(user_id, ["peanuts", "milk"])

    # Remove allergies (API expects raw array; use request for DELETE + json)
    response = client.request(
        "DELETE", f"/users/{user_id}/allergies", json=["peanuts"]
    )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_add_countries_success(client):
    """Test adding countries to a user"""
    # Create a user
    user_data = UserCreate(
        email="country@example.com",
        username="countryuser",
        first_name="Country",
        last_name="User",
        password="CountryPass123",
    )
    created_user = await UserService.create_user(user_data)
    user_id = created_user.id

    # Add countries (API expects raw array)
    response = client.post(
        f"/users/{user_id}/countries", json=["France", "Spain"]
    )

    assert response.status_code == 200 or response.status_code == 201


@pytest.mark.asyncio
async def test_remove_countries_success(client):
    """Test removing countries from a user"""
    # Create a user
    user_data = UserCreate(
        email="removecountry@example.com",
        username="removecountry",
        first_name="Remove",
        last_name="Country",
        password="RemoveCountryPass123",
    )
    created_user = await UserService.create_user(user_data)
    user_id = created_user.id

    # Add countries first
    await UserService.add_countries(user_id, ["France", "Germany"])

    # Remove countries (API expects raw array; use request for DELETE + json)
    response = client.request(
        "DELETE", f"/users/{user_id}/countries", json=["France"]
    )

    assert response.status_code == 200 or response.status_code == 204
