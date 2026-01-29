"""
End-to-End Tests for Product Endpoints

Tests:
- search_local_products (GET /product/search)
- get_products_by_index (GET /product/getByIndex)
- get_product_by_id (GET /product/getById/{product_id})
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.mark.asyncio
async def test_search_products_basic(client):
    """Test basic product search"""
    response = client.get(
        "/product/search", params={"query": "milk", "page": 1, "page_size": 10}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_search_products_with_pagination(client):
    """Test product search with pagination"""
    response = client.get(
        "/product/search", params={"query": "bread", "page": 2, "page_size": 5}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 5


@pytest.mark.asyncio
async def test_search_products_invalid_page(client):
    """Test search with invalid page number"""
    response = client.get(
        "/product/search", params={"query": "cheese", "page": 0, "page_size": 10}
    )

    # Should either fail validation or return 200 with empty results
    assert response.status_code in [200, 422]


@pytest.mark.asyncio
async def test_search_products_invalid_page_size(client):
    """Test search with invalid page size"""
    response = client.get(
        "/product/search", params={"query": "butter", "page": 1, "page_size": 2000}
    )

    # Should either fail validation or limit the page size
    assert response.status_code in [200, 422]


@pytest.mark.asyncio
async def test_get_products_by_index(client):
    """Test getting products sorted by index"""
    response = client.get(
        "/product/getByIndex",
        params={"sort_by": "nutriscore_score_asc", "page": 1, "page_size": 10},
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_products_by_index_desc(client):
    """Test getting products sorted in descending order"""
    response = client.get(
        "/product/getByIndex",
        params={"sort_by": "product_name_desc", "page": 1, "page_size": 20},
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_search_products_with_auth_header(client):
    """Test product search with authorization header (with user allergies filtering)"""
    # Note: This would require a valid JWT token
    response = client.get(
        "/product/search",
        params={"query": "nuts", "page": 1, "page_size": 10},
        headers={"Authorization": "Bearer invalid_token"},
    )

    # Should still return results even with invalid token (graceful degradation)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_products_max_page_size(client):
    """Test getting products with maximum allowed page size"""
    response = client.get(
        "/product/getByIndex",
        params={"sort_by": "nutriscore_score_asc", "page": 1, "page_size": 1000},
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_search_empty_query(client):
    """Test search with empty query string"""
    response = client.get(
        "/product/search", params={"query": "", "page": 1, "page_size": 10}
    )

    # Should either fail validation or return results
    assert response.status_code in [200, 422]


@pytest.mark.asyncio
async def test_products_response_structure(client):
    """Test that product responses have correct structure"""
    response = client.get(
        "/product/search", params={"query": "apple", "page": 1, "page_size": 1}
    )

    assert response.status_code == 200
    data = response.json()

    if data:  # If products returned
        product = data[0]
        # Verify essential fields exist
        assert "id" in product or "_id" in product
