from fastapi import APIRouter

from .endpoints import openfoodfacts, user

api_router = APIRouter()
api_router.include_router(user.router, prefix="/users", tags=["users"])
api_router.include_router(openfoodfacts.router, prefix="/products", tags=["products"])
