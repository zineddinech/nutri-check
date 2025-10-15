from fastapi import APIRouter

from .endpoints import product, user, profil


api_router = APIRouter()

# --- Enregistrement des routeurs ---
api_router.include_router(user.router, prefix="/users", tags=["users"])
api_router.include_router(product.router, prefix="/product", tags=["product"])
api_router.include_router(profil.router, prefix="/profil", tags=["profil"])
api_router.include_router(product.router, prefix="/products", tags=["products"])
