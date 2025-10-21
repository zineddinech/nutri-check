from fastapi import APIRouter

from .endpoints import product
from .endpoints import user

api_router = APIRouter()

# --- Enregistrement des routeurs ---
api_router.include_router(user.router, prefix="/profil", tags=["users"])
api_router.include_router(
    product.router, prefix="/products", tags=["products"])
api_router.include_router(user.router, prefix="/users", tags=["users"])
api_router.include_router(product.router, prefix="/product", tags=["product"])
