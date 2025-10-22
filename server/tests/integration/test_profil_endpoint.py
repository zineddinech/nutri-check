import pytest
from app.services.profil_service import ProfilService

@pytest.mark.asyncio
async def test_get_allergies_by_name_single_match_integration(client, sample_allergens, monkeypatch):
    """Intégration : recherche qui retourne un seul allergène."""
    async def mock_fetch():
        return sample_allergens
    monkeypatch.setattr(ProfilService, "_fetch_allergens", mock_fetch)

    response = client.get("/api/profil/getAllergiesByName?query=peanut")
    assert response.status_code == 200
    assert response.json() == ["Peanut"]

@pytest.mark.asyncio
async def test_get_allergies_by_name_multiple_matches_integration(client, sample_allergens, monkeypatch):
    """Intégration : recherche qui retourne plusieurs allergènes."""
    async def mock_fetch():
        return sample_allergens
    monkeypatch.setattr(ProfilService, "_fetch_allergens", mock_fetch)

    response = client.get("/api/profil/getAllergiesByName?query=m")
    assert response.status_code == 200
    assert set(response.json()) == {"Matsutake", "Milk"}

@pytest.mark.asyncio
async def test_get_allergies_by_name_no_match_integration(client, sample_allergens, monkeypatch):
    """Intégration : recherche qui ne retourne aucun allergène."""
    async def mock_fetch():
        return sample_allergens
    monkeypatch.setattr(ProfilService, "_fetch_allergens", mock_fetch)

    response = client.get("/api/profil/getAllergiesByName?query=xyz")
    assert response.status_code == 200
    assert response.json() == []

@pytest.mark.asyncio
async def test_get_allergies_by_name_case_insensitive_integration(client, sample_allergens, monkeypatch):
    """Intégration : recherche insensible à la casse."""
    async def mock_fetch():
        return sample_allergens
    monkeypatch.setattr(ProfilService, "_fetch_allergens", mock_fetch)

    response = client.get("/api/profil/getAllergiesByName?query=CRUST")
    assert response.status_code == 200
    assert response.json() == ["Crustaceans"]

@pytest.mark.asyncio
async def test_get_allergies_by_name_empty_query_integration(client, sample_allergens, monkeypatch):
    """Intégration : query vide retourne tous les allergènes."""
    async def mock_fetch():
        return sample_allergens
    monkeypatch.setattr(ProfilService, "_fetch_allergens", mock_fetch)

    response = client.get("/api/profil/getAllergiesByName?query=")
    assert response.status_code == 200
    assert set(response.json()) == set(sample_allergens)
