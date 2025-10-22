import pytest
from unittest.mock import patch
from app.services.profil_service import ProfilService

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