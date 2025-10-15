from typing import List
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
