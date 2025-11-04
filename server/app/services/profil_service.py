from typing import Dict, List, Optional

import httpx


class ProfilService:

    # ----------------------- ALLERGENS -----------------------
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
        if not query:
            return allergens

        query_lower = query.lower()
        filtered = [a for a in allergens if query_lower in a.lower()]
        return filtered

    # ----------------------- DIET RESTRICTIONS -----------------------
    _cached_diet_restrictions: List[Dict[str, str]] = []

    @classmethod
    def _init_diet_restrictions(cls) -> List[Dict[str, str]]:
        """
        Initialise la liste des restrictions diététiques.
        """
        if cls._cached_diet_restrictions:
            return cls._cached_diet_restrictions

        # Liste de champs nutritionnels avec limite max/min
        restrictions = [
            {"name": "Max Calories", "limit_type": "max", "unit": "kcal/100g"},
            {"name": "Min Proteins", "limit_type": "min", "unit": "g/100g"},
            {"name": "Max Proteins", "limit_type": "max", "unit": "g/100g"},
            {"name": "Max Saturated Fat", "limit_type": "max", "unit": "g/100g"},
            {"name": "Max Sugars", "limit_type": "max", "unit": "g/100g"},
            {"name": "Max Fat", "limit_type": "max", "unit": "g/100g"},
            {"name": "Min Fiber", "limit_type": "min", "unit": "g/100g"},
            {"name": "Max Sodium", "limit_type": "max", "unit": "mg/100g"},
            {"name": "Max Alcohol", "limit_type": "max", "unit": "% vol/100g"},
            # On peut compléter cette liste selon les champs CSV pertinents,
            # voir: https://static.openfoodfacts.org/data/data-fields.txt
        ]

        cls._cached_diet_restrictions = restrictions
        return restrictions

    @classmethod
    async def get_diet_restrictions_by_name(
        cls, query: Optional[str]
    ) -> List[Dict[str, str]]:
        """
        Filtre la liste des restrictions diététiques par correspondance partielle.
        Si query est vide ou None, retourne toutes les restrictions.
        """
        restrictions = cls._init_diet_restrictions()
        if not query:
            return restrictions

        query_lower = query.lower()
        filtered = [r for r in restrictions if query_lower in r["name"].lower()]
        return filtered
