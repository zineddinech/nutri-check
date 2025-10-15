from typing import List
from fastapi import APIRouter, Query
from ...services.product_service import ProductService
from ...schemas.product import ProductResponse

router = APIRouter()

@router.get("/search", response_model=List[ProductResponse])
async def search_local_products(
        query: str = Query(..., description="Terme de recherche pour les produits"),
        page: int = Query(1, ge=1, description="Numéro de page"),
        page_size: int = Query(10, ge=1, le=100, description="Nombre de résultats par page")
):
    """
    Ce point de terminaison recherche les produits
    dans la base de données MongoDB locale.
    """
    products = await ProductService.search_products(query, page, page_size)
    return products
