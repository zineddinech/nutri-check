from typing import List
from fastapi import APIRouter, Query
from ...services.product_service import ProductService
from ...schemas.product import ProductResponse

router = APIRouter()

@router.get("/search", response_model=List[ProductResponse])
async def search_local_products(
        query: str = Query(..., description="Terme de recherche pour les produits"),
        page: int = Query(1, ge=1, description="Numéro de page (index)"),
        page_size: int = Query(100, ge=1, le=1000, description="Nombre de résultats par page")
):
    """
    Ce point de terminaison recherche les produits
    dans la base de données MongoDB locale.
    """
    products = await ProductService.search_products(query, page, page_size)
    return products


@router.get("/getByIndex", response_model=List[ProductResponse])
async def get_products_by_index(
        sort_by: str = Query(..., description="Condition de tri (ex: 'nutriscore_score_asc', 'product_name_desc')"),
        page: int = Query(1, ge=1, description="Numéro de page (index)"),
        page_size: int = Query(100, ge=1, le=1000, description="Nombre de résultats par page")
):
    """
    Ce point de terminaison récupère les produits triés par une condition donnée.
    """
    products = await ProductService.get_products_sorted(
        sort_by=sort_by,
        page=page,
        page_size=page_size
    )
    return products
