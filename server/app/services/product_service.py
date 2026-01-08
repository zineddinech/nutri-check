from typing import List

from bson import ObjectId
from pymongo import ASCENDING, DESCENDING

from ..database.database import get_db


class ProductService:
    @staticmethod
    async def search_products(
        query: str,
        page: int,
        page_size: int,
        user_allergens: List[str] | None = None,
        user_countries: List[str] | None = None,
    ) -> List[dict]:
        """
        Recherche des produits optionnellement filtrés dans la collection locale MongoDB.
        Utilise une recherche au début du nom du produit pour éviter les faux positifs.
        Exemple: 'poivre' trouve 'Poivre noir' mais pas 'Saucisse au poivre'.
        """
        db = get_db()
        skip = (page - 1) * page_size

        # Utilise une recherche au DÉBUT du nom du produit (ancre ^)
        # case-insensitive pour être flexible
        filter_query = {"product_name": {"$regex": f"^{query}", "$options": "i"}}

        # Filtre optionnel sur les allergens
        if user_allergens:
            # FIXME: solution temporaire car le format des allergens peut varier dans la db actuellement
            expanded_allergens = []
            for a in user_allergens:
                # Normaliser en minuscules pour matcher les produits
                a_lower = a.lower()
                expanded_allergens.append(a_lower)
                expanded_allergens.append(f"en:{a_lower}")
            filter_query["allergens"] = {"$not": {"$in": expanded_allergens}}  # type: ignore

        # Filtre optionnel sur les pays
        if user_countries:
            # FIXME: attention,  le format des pays peut varier dans la db actuellement
            filter_query["countries"] = {"$in": user_countries}  # type: ignore

        products_cursor = db["products"].find(filter_query).skip(skip).limit(page_size)

        products = await products_cursor.to_list(length=page_size)
        return products

    @staticmethod
    async def get_products_sorted(
        sort_by: str,
        page: int,
        page_size: int,
        user_allergens: List[str] | None = None,
        user_countries: List[str] | None = None,
    ) -> List[dict]:
        """
        Récupère les produits triés, paginés et optionnellement filtrés depuis MongoDB.
        Le tri est basé sur la chaîne sort_by (ex: 'product_name_asc', 'nutriscore_score_desc').
        """
        db = get_db()
        skip = (page - 1) * page_size

        filter_query = {"product_name": {"$exists": True, "$nin": [None, ""]}}

        # Filtre optionnel sur les allergens
        if user_allergens:
            # FIXME: solution temporaire car le format des allergens peut varier dans la db actuellement
            expanded_allergens = []
            for a in user_allergens:
                # Normaliser en minuscules pour matcher les produits
                a_lower = a.lower()
                expanded_allergens.append(a_lower)
                expanded_allergens.append(f"en:{a_lower}")
            filter_query["allergens"] = {"$not": {"$in": expanded_allergens}}

        # Filtre optionnel sur les pays
        if user_countries:
            # FIXME: attention,  le format des pays peut varier dans la db actuellement
            filter_query["countries"] = {"$in": user_countries}

        # Analyser la condition de tri (sort_by)
        try:
            parts = sort_by.split("_")

            # Vérifier si la *dernière* partie est une direction
            last_part = parts[-1].lower() if len(parts) > 1 else ""

            if last_part == "desc":
                order = DESCENDING
                # Le champ est tout ce qui précède la dernière partie
                field = "_".join(parts[:-1])
            elif last_part == "asc":
                order = ASCENDING
                # Le champ est tout ce qui précède la dernière partie
                field = "_".join(parts[:-1])
            else:
                # Aucune direction valide trouvée à la fin,
                # donc la chaîne entière est le nom du champ
                order = ASCENDING  # Par défaut en ascendant
                field = sort_by

        except Exception:
            # Si le format est invalide ou vide, utilise un tri par défaut (par _id)
            field = "_id"
            order = ASCENDING

        # Critère de tri pour MongoDB
        sort_criteria = [(field, order)]

        # Exécuter la requête
        products_cursor = (
            db["products"]
            .find(filter_query)
            .sort(sort_criteria)
            .skip(skip)
            .limit(page_size)
        )
        products = await products_cursor.to_list(length=page_size)
        return products

    @staticmethod
    async def get_product_by_id(product_id: str) -> dict:
        """
        Récupère un produit par son ID depuis MongoDB.
        """
        db = get_db()
        product = await db["products"].find_one({"_id": product_id})
        return product
