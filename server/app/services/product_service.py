from typing import List
from pymongo import ASCENDING, DESCENDING
from ..database.database import get_db

class ProductService:
    @staticmethod
    async def search_products(query: str, page: int, page_size: int) -> List[dict]:
        """
        Recherche des produits dans la collection locale MongoDB.
        """
        db = get_db()
        skip = (page - 1) * page_size
        # Utilise une recherche de texte simple sur le nom du produit.
        products_cursor = db["products"].find(
            {"product_name": {"$regex": query, "$options": "i"}}
        ).skip(skip).limit(page_size)

        products = await products_cursor.to_list(length=page_size)
        return products


    @staticmethod
    async def get_products_sorted(sort_by: str, page: int, page_size: int) -> List[dict]:
        """
        Récupère les produits triés et paginés depuis MongoDB.
        Le tri est basé sur la chaîne sort_by (ex: 'product_name_asc', 'nutriscore_score_desc').
        """
        db = get_db()
        skip = (page - 1) * page_size

        # Analyser la condition de tri (sort_by)
        try:
            parts = sort_by.split('_')

            # Vérifier si la *dernière* partie est une direction
            last_part = parts[-1].lower() if len(parts) > 1 else ""

            if last_part == 'desc':
                order = DESCENDING
                # Le champ est tout ce qui précède la dernière partie
                field = '_'.join(parts[:-1])
            elif last_part == 'asc':
                order = ASCENDING
                # Le champ est tout ce qui précède la dernière partie
                field = '_'.join(parts[:-1])
            else:
                # Aucune direction valide trouvée à la fin,
                # donc la chaîne entière est le nom du champ
                order = ASCENDING # Par défaut en ascendant
                field = sort_by

        except Exception:
            # Si le format est invalide ou vide, utilise un tri par défaut (par _id)
            field = "_id"
            order = ASCENDING

        # Critère de tri pour MongoDB
        sort_criteria = [(field, order)]

        # Exécuter la requête
        # Nous utilisons find({}) pour récupérer tous les documents,
        # car ce point de terminaison n'implique pas de recherche par terme.
        products_cursor = db["products"].find(
            {}
        ).sort(sort_criteria).skip(skip).limit(page_size)

        products = await products_cursor.to_list(length=page_size)
        return products