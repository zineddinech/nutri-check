from typing import List, Optional

from fastapi import APIRouter, Header, Query

from ...schemas.product import ProductResponse
from ...services.auth_service import get_current_user
from ...services.product_service import ProductService

router = APIRouter()


@router.get("/search", response_model=List[ProductResponse])
async def search_local_products(
    query: str = Query(..., description="Terme de recherche pour les produits"),
    page: int = Query(1, ge=1, description="Numéro de page (index)"),
    page_size: int = Query(
        100, ge=1, le=1000, description="Nombre de résultats par page"
    ),
    authorization: Optional[str] = Header(None),
):
    """
    Ce point de terminaison recherche les produits dans la base de données MongoDB locale
    et filtre optionnellement sur les allergies de l'utilisateur.
    """
    user_allergens = None
    user_countries = None

    if authorization:
        try:
            token = authorization.replace("Bearer ", "")
            user = await get_current_user(token)
            user_allergens = user.allergies or None
            user_countries = user.countries or None
        except Exception:
            pass

    products = await ProductService.search_products(
        query, page, page_size, user_allergens, user_countries
    )
    return products


@router.get("/getByIndex", response_model=List[ProductResponse])
async def get_products_by_index(
    sort_by: str = Query(
        ...,
        description="Condition de tri (ex: 'nutriscore_score_asc', 'product_name_desc')",
    ),
    page: int = Query(1, ge=1, description="Numéro de page (index)"),
    page_size: int = Query(
        100, ge=1, le=1000, description="Nombre de résultats par page"
    ),
    authorization: Optional[str] = Header(None),
):
    """
    Ce point de terminaison récupère les produits triés par une condition donnée
    et filtre optionnellement sur les allergies de l'utilisateur.
    """
    user_allergens = None
    user_countries = None

    if authorization:
        try:
            token = authorization.replace("Bearer ", "")
            user = await get_current_user(token)
            user_allergens = user.allergies or None
            user_countries = user.countries or None
        except Exception:
            pass

    products = await ProductService.get_products_sorted(
        sort_by, page, page_size, user_allergens, user_countries
    )
    return products


@router.get("/getById/{product_id}", response_model=ProductResponse)
async def get_product_by_id(
    product_id: str,
):
    """
    Ce point de terminaison récupère un produit par son ID.
    """
    product = await ProductService.get_product_by_id(product_id)
    if product:
        return product
    return None
