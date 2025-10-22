import httpx
from typing import List


class ProfilService:
    ALLERGENS_URL = "https://static.openfoodfacts.org/data/taxonomies/allergens.json"
    _cached_allergens: List[str] = []

    @classmethod
    async def _fetch_allergens(cls) -> List[str]:
        """
        Télécharge la liste des allergènes depuis OpenFoodFacts
        et la met en cache pour éviter les appels répétés.
        """
        if cls._cached_allergens:
            return cls._cached_allergens

        async with httpx.AsyncClient() as client:
            response = await client.get(cls.ALLERGENS_URL)
            response.raise_for_status()
            data = response.json()

        # Pour le moment on extrait uniquement les noms en anglais
        allergens = []
        for item in data.values():
            name_dict = item.get("name", {})
            if "en" in name_dict:
                allergens.append(name_dict["en"])

        cls._cached_allergens = allergens
        return allergens

    @classmethod
    async def get_allergies_by_name(cls, query: str) -> List[str]:
        """
        Filtre la liste des allergènes par une correspondance partielle.
        """
        allergens = await cls._fetch_allergens()
        query_lower = query.lower()
        filtered = [a for a in allergens if query_lower in a.lower()]
        return filtered
