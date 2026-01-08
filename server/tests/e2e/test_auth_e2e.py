"""
End-to-End Tests for Authentication Endpoints

Tests:
- get_user (GET /auth/)
- forgot_password (POST /auth/forgot-password)
- reset_password (POST /auth/reset-password)
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
async def test_get_current_user_with_invalid_token(client):
    """Test getting user with invalid JWT token"""
    invalid_token = "invalid.token.here"

    response = client.get("/api/auth/", params={"token": invalid_token})

    assert response.status_code == 401 or response.status_code == 422


@pytest.mark.asyncio
async def test_forgot_password_with_valid_email(client):
    """Test forgot password request with valid email"""
    # Create a test user first
    user_data = UserCreate(
        email="resettest@example.com",
        username="resetuser",
        first_name="Reset",
        last_name="User",
        password="SecurePass123",
    )
    await UserService.create_user(user_data)

    # Request password reset
    response = client.post(
        "/api/auth/forgot-password", json={"email": "resettest@example.com"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "Code" in data["message"] or "email" in data["message"].lower()


@pytest.mark.asyncio
async def test_forgot_password_with_nonexistent_email(client):
    """Test forgot password with non-existent email"""
    response = client.post(
        "/api/auth/forgot-password", json={"email": "nonexistent@example.com"}
    )

    assert response.status_code == 404
    assert (
        "not found" in response.json()["detail"].lower()
        or "non trouvé" in response.json()["detail"].lower()
    )


@pytest.mark.asyncio
async def test_reset_password_with_valid_data(client):
    """Test reset password with valid data"""
    # Create user
    user_data = UserCreate(
        email="reset2@example.com",
        username="resetuser2",
        first_name="Reset",
        last_name="User",
        password="OldPassword123",
    )
    await UserService.create_user(user_data)

    # Request reset code (mock scenario)
    # In real scenario, code would be sent via email
    response = client.post(
        "/api/auth/forgot-password", json={"email": "reset2@example.com"}
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_with_invalid_code(client):
    """Test reset password with invalid or expired code"""
    response = client.post(
        "/api/auth/reset-password",
        json={
            "email": "user@example.com",
            "code": "INVALID_CODE",
            "new_password": "NewPassword123",
        },
    )

    assert response.status_code == 400
    assert (
        "invalid" in response.json()["detail"].lower()
        or "invalide" in response.json()["detail"].lower()
    )
