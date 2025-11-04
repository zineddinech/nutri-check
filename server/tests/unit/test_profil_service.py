from unittest.mock import patch

import pytest

from app.services.profil_service import ProfilService


# ----------------------- Allergens tests -----------------------
@pytest.mark.asyncio
async def test_get_allergies_by_name_single_match(sample_allergens):
    """
    Recherche qui retourne un seul allergène.
    """
    with patch.object(ProfilService, "_fetch_allergens", return_value=sample_allergens):
        result = await ProfilService.get_allergies_by_name("peanut")
        assert result == ["Peanut"]


@pytest.mark.asyncio
async def test_get_allergies_by_name_multiple_matches(sample_allergens):
    """
    Recherche qui retourne plusieurs allergènes.
    """
    with patch.object(ProfilService, "_fetch_allergens", return_value=sample_allergens):
        result = await ProfilService.get_allergies_by_name("m")
        assert set(result) == {"Matsutake", "Milk"}


@pytest.mark.asyncio
async def test_get_allergies_by_name_no_match(sample_allergens):
    """
    Recherche qui ne retourne aucun allergène.
    """
    with patch.object(ProfilService, "_fetch_allergens", return_value=sample_allergens):
        result = await ProfilService.get_allergies_by_name("xyz")
        assert result == []


@pytest.mark.asyncio
async def test_get_allergies_by_name_case_insensitive(sample_allergens):
    """
    Recherche insensible à la casse.
    """
    with patch.object(ProfilService, "_fetch_allergens", return_value=sample_allergens):
        result = await ProfilService.get_allergies_by_name("CRUST")
        assert result == ["Crustaceans"]


@pytest.mark.asyncio
async def test_get_allergies_by_name_empty_query(sample_allergens):
    """Query vide retourne tous les allergènes."""
    with patch.object(ProfilService, "_fetch_allergens", return_value=sample_allergens):
        result = await ProfilService.get_allergies_by_name("")
        assert set(result) == set(sample_allergens)


# ----------------------- Diet restriction tests -----------------------
@pytest.mark.asyncio
async def test_get_diet_restrictions_single_match():
    """
    Recherche qui retourne une seule restriction alimentaire.
    """
    result = await ProfilService.get_diet_restrictions_by_name("min proteins")
    expected = [{"name": "Min Proteins", "limit_type": "min", "unit": "g/100g"}]
    assert result == expected


@pytest.mark.asyncio
async def test_get_diet_restrictions_multiple_matches():
    """
    Recherche qui retourne plusieurs restrictions alimentaires.
    """
    result = await ProfilService.get_diet_restrictions_by_name("fat")
    expected = [
        {"name": "Max Saturated Fat", "limit_type": "max", "unit": "g/100g"},
        {"name": "Max Fat", "limit_type": "max", "unit": "g/100g"},
    ]
    assert result == expected


@pytest.mark.asyncio
async def test_get_diet_restrictions_no_match():
    """
    Recherche qui ne retourne aucune restriction alimentaire.
    """
    result = await ProfilService.get_diet_restrictions_by_name("xyz")
    assert result == []


@pytest.mark.asyncio
async def test_get_diet_restrictions_case_insensitive():
    """
    Recherche insensible à la casse.
    """
    result = await ProfilService.get_diet_restrictions_by_name("SUGAR")
    assert result == [{"name": "Max Sugars", "limit_type": "max", "unit": "g/100g"}]


@pytest.mark.asyncio
async def test_get_diet_restrictions_empty_query():
    """
    Query vide retourne toutes les restrictions alimentaires.
    """
    result = await ProfilService.get_diet_restrictions_by_name("")
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
    assert [r["name"] for r in result] == expected_names
