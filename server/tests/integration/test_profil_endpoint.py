import pytest

from app.services.profil_service import ProfilService


# ----------------------- Allergens integration tests -----------------------
@pytest.mark.asyncio
async def test_get_allergies_by_name_single_match_integration(
    client, sample_allergens, monkeypatch
):
    """Intégration : recherche qui retourne un seul allergène."""

    async def mock_fetch():
        return sample_allergens

    monkeypatch.setattr(ProfilService, "_fetch_allergens", mock_fetch)

    response = client.get("/api/profil/getAllergiesByName?query=peanut")
    assert response.status_code == 200
    assert response.json() == ["Peanut"]


@pytest.mark.asyncio
async def test_get_allergies_by_name_multiple_matches_integration(
    client, sample_allergens, monkeypatch
):
    """Intégration : recherche qui retourne plusieurs allergènes."""

    async def mock_fetch():
        return sample_allergens

    monkeypatch.setattr(ProfilService, "_fetch_allergens", mock_fetch)

    response = client.get("/api/profil/getAllergiesByName?query=m")
    assert response.status_code == 200
    assert set(response.json()) == {"Matsutake", "Milk"}


@pytest.mark.asyncio
async def test_get_allergies_by_name_no_match_integration(
    client, sample_allergens, monkeypatch
):
    """Intégration : recherche qui ne retourne aucun allergène."""

    async def mock_fetch():
        return sample_allergens

    monkeypatch.setattr(ProfilService, "_fetch_allergens", mock_fetch)

    response = client.get("/api/profil/getAllergiesByName?query=xyz")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_allergies_by_name_case_insensitive_integration(
    client, sample_allergens, monkeypatch
):
    """Intégration : recherche insensible à la casse."""

    async def mock_fetch():
        return sample_allergens

    monkeypatch.setattr(ProfilService, "_fetch_allergens", mock_fetch)

    response = client.get("/api/profil/getAllergiesByName?query=CRUST")
    assert response.status_code == 200
    assert response.json() == ["Crustaceans"]


@pytest.mark.asyncio
async def test_get_allergies_by_name_empty_query_integration(
    client, sample_allergens, monkeypatch
):
    """Intégration : query vide retourne tous les allergènes."""

    async def mock_fetch():
        return sample_allergens

    monkeypatch.setattr(ProfilService, "_fetch_allergens", mock_fetch)

    response = client.get("/api/profil/getAllergiesByName?query=")
    assert response.status_code == 200
    assert set(response.json()) == set(sample_allergens)


# ----------------------- Diet restriction integration tests -----------------------
@pytest.mark.asyncio
async def test_get_diet_restrictions_single_match_integration(client):
    """Intégration : recherche qui retourne une seule restriction alimentaire."""
    response = client.get("/api/profil/getDietRestrictionsByName?query=min proteins")
    assert response.status_code == 200
    expected = [{"name": "Min Proteins", "limit_type": "min", "unit": "g/100g"}]
    assert response.json() == expected


@pytest.mark.asyncio
async def test_get_diet_restrictions_multiple_matches_integration(client):
    """Intégration : recherche qui retourne plusieurs restrictions alimentaires."""
    response = client.get("/api/profil/getDietRestrictionsByName?query=fat")
    assert response.status_code == 200
    expected = [
        {"name": "Max Saturated Fat", "limit_type": "max", "unit": "g/100g"},
        {"name": "Max Fat", "limit_type": "max", "unit": "g/100g"},
    ]
    assert response.json() == expected


@pytest.mark.asyncio
async def test_get_diet_restrictions_no_match_integration(client):
    """Intégration : recherche qui ne retourne aucune restriction alimentaire."""
    response = client.get("/api/profil/getDietRestrictionsByName?query=xyz")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_diet_restrictions_case_insensitive_integration(client):
    """Intégration : recherche insensible à la casse."""
    response = client.get("/api/profil/getDietRestrictionsByName?query=SUGAR")
    assert response.status_code == 200
    expected = [{"name": "Max Sugars", "limit_type": "max", "unit": "g/100g"}]
    assert response.json() == expected


@pytest.mark.asyncio
async def test_get_diet_restrictions_empty_query_integration(client):
    """Intégration : query vide retourne toutes les restrictions alimentaires."""
    response = client.get("/api/profil/getDietRestrictionsByName?query=")
    assert response.status_code == 200

    expected_names = [
        "Max Calories",
        "Min Proteins",
        "Max Proteins",
        "Max Saturated Fat",
        "Max Sugars",
        "Max Fat",
        "Min Fiber",
        "Max Sodium",
        "Max Alcohol",
    ]
    result = response.json()
    assert [r["name"] for r in result] == expected_names
