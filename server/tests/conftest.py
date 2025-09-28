import pytest
from fastapi.testclient import TestClient

from app.database.memory_db import db_instance
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_database():
    """Vider la base de données avant chaque test"""
    db_instance.clear()
    yield
    db_instance.clear()


@pytest.fixture
def sample_user_data():
    return {
        "email": "test@example.com",
        "username": "testuser",
        "first_name": "John",
        "last_name": "Doe",
        "password": "strongpassword123",
    }
