from typing import List, Optional

from bson import ObjectId
from pymongo import ASCENDING, DESCENDING

from ..database.database import get_db


class ProductService:
    @staticmethod
    def extract_nutrition_from_nutriments(nutriments: dict) -> dict:
        """
        Extrait les valeurs nutritionnelles du champ 'nutriments' de MongoDB.
        Convertit les valeurs en float pour normaliser les types.
        
        Example:
            nutriments = {
                "sugars_100g": 0,
                "proteins_100g": 0,
                "salt_100g": 1.34,
                "fat_100g": 57.14,
                "energy_100g": 2389
            }
            
            Retourne: {
                "sugars_100g": 0.0,
                "proteins_100g": 0.0,
                "salt_100g": 1.34,
                "fat_100g": 57.14,
                "energy_100g": 2389.0
            }
        """
        nutrition = {}
        
        if not nutriments or not isinstance(nutriments, dict):
            return nutrition
        
        # Champs nutritionnels à extraire
        nutrition_fields = [
            "energy_100g",
            "fat_100g",
            "sugar_100g",
            "sugars_100g",  # Alias pour sugar_100g
            "proteins_100g",
            "salt_100g"
        ]
        
        for field in nutrition_fields:
            if field in nutriments:
                value = nutriments[field]
                # Convertir en float, gérer les cas None/null
                try:
                    nutrition[field] = float(value) if value is not None else None
                except (ValueError, TypeError):
                    nutrition[field] = None
        
        # Si 'sugars_100g' existe mais pas 'sugar_100g', créer un alias
        if "sugars_100g" in nutrition and "sugar_100g" not in nutrition:
            nutrition["sugar_100g"] = nutrition["sugars_100g"]
        
        return nutrition

    @staticmethod
    def enrich_product_with_nutrition(product: Optional[dict]) -> Optional[dict]:
        """
        Enrichit un produit avec les valeurs nutritionnelles extraites de 'nutriments'.
        """
        if not product:
            return product
        
        # Si le produit a un champ 'nutriments', extraire les valeurs
        if "nutriments" in product and product["nutriments"]:
            nutrition = ProductService.extract_nutrition_from_nutriments(
                product["nutriments"]
            )
            # Mettre à jour le produit avec les valeurs nutritionnelles
            product.update(nutrition)
        
        return product
    @staticmethod
    async def search_products(
        query: str,
        page: int,
        page_size: int,
        user_allergens: List[str] | None = None,
        user_countries: List[str] | None = None,
    ) -> List[dict]:
        """
        Recherche des produits avec tri par pertinence (compatibilité).
        Score de pertinence basé sur product_name :
        - 3 : correspondance exacte (nom = query)
        - 2 : commence par la query (préfixe)
        - 1 : contient la query quelque part
        """
        import re
        db = get_db()
        skip = (page - 1) * page_size

        # Échapper les caractères spéciaux regex dans la query
        escaped_query = re.escape(query)

        # Construire le filtre de base sur product_name (toujours string)
        match_stage: dict = {
            "product_name": {"$regex": escaped_query, "$options": "i"}
        }

        # Filtre optionnel sur les allergens
        if user_allergens:
            expanded_allergens = []
            for a in user_allergens:
                a_lower = a.lower()
                expanded_allergens.append(a_lower)
                expanded_allergens.append(f"en:{a_lower}")
            match_stage["allergens"] = {"$not": {"$in": expanded_allergens}}

        # Filtre optionnel sur les pays
        if user_countries:
            match_stage["countries"] = {"$in": user_countries}

        # Pipeline d'agrégation avec score de pertinence
        pipeline = [
            # Match : product_name contient la query (insensible à la casse)
            {"$match": match_stage},
            # Ajouter score de pertinence basé sur product_name
            {
                "$addFields": {
                    "relevance_score": {
                        "$switch": {
                            "branches": [
                                # Score 3 : correspondance exacte
                                {
                                    "case": {
                                        "$regexMatch": {
                                            "input": "$product_name",
                                            "regex": f"^{escaped_query}$",
                                            "options": "i",
                                        }
                                    },
                                    "then": 3,
                                },
                                # Score 2 : commence par la query
                                {
                                    "case": {
                                        "$regexMatch": {
                                            "input": "$product_name",
                                            "regex": f"^{escaped_query}",
                                            "options": "i",
                                        }
                                    },
                                    "then": 2,
                                },
                            ],
                            # Score 1 : contient la query
                            "default": 1,
                        }
                    }
                }
            },
            # Tri par pertinence décroissante, puis alphabétique
            {"$sort": {"relevance_score": -1, "product_name": 1}},
            # Pagination
            {"$skip": skip},
            {"$limit": page_size},
            # Supprimer le champ temporaire
            {"$unset": "relevance_score"},
        ]

        products = await db["products"].aggregate(pipeline).to_list(length=page_size)

        # Enrichir chaque produit avec les valeurs nutritionnelles
        enriched_products = [
            ProductService.enrich_product_with_nutrition(product)
            for product in products
        ]

        return enriched_products

    @staticmethod
    async def search_products_by_category(
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
        filter_query = {
            "_keywords": {
                "$regex": f"^{query}",
                "$options": "i"
            }
        }
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

        # Enrichir chaque produit avec les valeurs nutritionnelles
        enriched_products = [
            ProductService.enrich_product_with_nutrition(product)
            for product in products
        ]

        return enriched_products

    @staticmethod
    async def search_products_exact(
        query: str,
        page: int = 1,
        page_size: int = 10,
    ) -> List[dict]:
        """
        Recherche des produits avec correspondance STRICTEMENT exacte sur le nom.
        Seuls les produits dont le product_name est exactement égal à la query sont retournés.
        La comparaison est insensible à la casse.

        Exemple:
        - "ail" → trouve "Ail", "ail", "AIL"
        - "ail" → ne trouve PAS "Ails", "ail blanc", "huile d'ail"
        """
        db = get_db()
        skip = (page - 1) * page_size

        # Normaliser la query
        normalized_query = query.lower().strip()

        # Utiliser l'agrégation avec $toLower et $trim pour une comparaison stricte
        pipeline = [
            {
                "$match": {
                    "$expr": {
                        "$eq": [
                            {"$toLower": {"$trim": {"input": "$product_name"}}},
                            normalized_query
                        ]
                    }
                }
            },
            {"$skip": skip},
            {"$limit": page_size},
        ]

        products = await db["products"].aggregate(pipeline).to_list(length=page_size)

        # Enrichir chaque produit avec les valeurs nutritionnelles
        enriched_products = [
            ProductService.enrich_product_with_nutrition(product)
            for product in products
        ]

        return enriched_products

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
        
        # Enrichir chaque produit avec les valeurs nutritionnelles
        enriched_products = [
            ProductService.enrich_product_with_nutrition(product)
            for product in products
        ]
        
        return enriched_products

    @staticmethod
    async def get_product_by_id(product_id: str) -> Optional[dict]:
        """
        Récupère un produit par son ID depuis MongoDB.
        Enrichit le produit avec les valeurs nutritionnelles extraites de 'nutriments'.
        """
        db = get_db()
        product = await db["products"].find_one({"_id": product_id})
        
        # Enrichir le produit avec les valeurs nutritionnelles
        enriched_product = ProductService.enrich_product_with_nutrition(product)
        
        return enriched_product
