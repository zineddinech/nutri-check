from fastapi import APIRouter

from .endpoints import product, profil, user, shopping_trip, favorite

api_router = APIRouter()

# --- Enregistrement des routeurs ---

api_router.include_router(user.router, prefix="/users", tags=["users"])
api_router.include_router(product.router, prefix="/product", tags=["product"])
api_router.include_router(profil.router, prefix="/profil", tags=["profil"])
api_router.include_router(product.router, prefix="/products", tags=["products"])
api_router.include_router(profil.router, prefix="/profil", tags=["profil"])
api_router.include_router(shopping_trip.router, prefix="/shoppingTrips", tags=["shoppingTrips"])
api_router.include_router(favorite.router, prefix="/favorites", tags=["favorites"])
