from fastapi import APIRouter, Query
from app.services.openfoodfacts_service import search_products

router = APIRouter()

@router.get("/search")
def get_products(query: str = Query("chocolat"), page: int = 1, page_size: int = 10):
    """
    Endpoint pour rechercher des produits via OpenFoodFacts
    """
    products = search_products(query=query, page=page, page_size=page_size)
    return {"query": query, "page": page, "products": products}
