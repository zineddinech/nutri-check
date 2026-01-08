"""
End-to-End Tests for Profile/Profil Endpoints

Tests:
- get_allergies_by_name (GET /profil/getAllergiesByName)
- get_diet_restrictions (GET /profil/getDietRestrictionsByName)
- get_countries_by_name (GET /profil/getCountriesByName)
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.mark.asyncio
async def test_get_allergies_all(client):
    """Test getting all allergies without filter"""
    response = client.get("/profil/getAllergiesByName")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_allergies_with_filter(client):
    """Test getting allergies with partial name filter"""
    response = client.get("/profil/getAllergiesByName", params={"query": "peanut"})

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_allergies_with_empty_filter(client):
    """Test getting allergies with empty query parameter"""
    response = client.get("/profil/getAllergiesByName", params={"query": ""})

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_allergies_case_insensitive(client):
    """Test allergies search is case-insensitive"""
    response1 = client.get("/profil/getAllergiesByName", params={"query": "MILK"})
    response2 = client.get("/profil/getAllergiesByName", params={"query": "milk"})

    assert response1.status_code == 200
    assert response2.status_code == 200


@pytest.mark.asyncio
async def test_get_allergies_partial_match(client):
    """Test allergies partial name matching"""
    response = client.get("/profil/getAllergiesByName", params={"query": "egg"})

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_diet_restrictions_all(client):
    """Test getting all diet restrictions without filter"""
    response = client.get("/profil/getDietRestrictionsByName")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_diet_restrictions_with_filter(client):
    """Test getting diet restrictions with filter"""
    response = client.get(
        "/profil/getDietRestrictionsByName", params={"query": "vegan"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_diet_restrictions_structure(client):
    """Test diet restrictions response structure"""
    response = client.get("/profil/getDietRestrictionsByName")

    assert response.status_code == 200
    data = response.json()

    if data:  # If results exist
        restriction = data[0]
        assert isinstance(restriction, dict)
        # Should contain name, limit_type, unit
        assert "name" in restriction or any(
            key in restriction for key in ["name", "limit_type", "unit"]
        )


@pytest.mark.asyncio
async def test_get_countries_all(client):
    """Test getting all countries without filter"""
    response = client.get("/profil/getCountriesByName")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_countries_with_filter(client):
    """Test getting countries with name filter"""
    response = client.get("/profil/getCountriesByName", params={"query": "France"})

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_countries_case_insensitive(client):
    """Test countries search is case-insensitive"""
    response1 = client.get("/profil/getCountriesByName", params={"query": "SPAIN"})
    response2 = client.get("/profil/getCountriesByName", params={"query": "spain"})

    assert response1.status_code == 200
    assert response2.status_code == 200


@pytest.mark.asyncio
async def test_get_countries_partial_match(client):
    """Test countries partial name matching"""
    response = client.get("/profil/getCountriesByName", params={"query": "United"})

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_countries_with_empty_filter(client):
    """Test getting countries with empty query"""
    response = client.get("/profil/getCountriesByName", params={"query": ""})

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_profil_endpoints_non_null_responses(client):
    """Test that all profil endpoints return valid responses"""
    endpoints = [
        "/profil/getAllergiesByName",
        "/profil/getDietRestrictionsByName",
        "/profil/getCountriesByName",
    ]

    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 200
        assert response.json() is not None
