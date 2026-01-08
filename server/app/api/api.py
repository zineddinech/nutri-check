from fastapi import APIRouter

from .endpoints import (auth, favorite, product, profil, recipes,
                        shopping_trip, user)

api_router = APIRouter()

# --- Enregistrement des routeurs ---

api_router.include_router(user.router, prefix="/users", tags=["users"])
api_router.include_router(product.router, prefix="/product", tags=["product"])
api_router.include_router(profil.router, prefix="/profil", tags=["profil"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(
    shopping_trip.router, prefix="/shoppingTrips", tags=["shoppingTrips"]
)
api_router.include_router(favorite.router, prefix="/favorites", tags=["favorites"])
api_router.include_router(recipes.router, prefix="/recipes", tags=["recipes"])
