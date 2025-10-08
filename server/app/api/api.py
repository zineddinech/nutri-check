from fastapi import APIRouter

from .endpoints import openfoodfacts

api_router = APIRouter()
api_router.include_router(openfoodfacts.router, prefix="/products", tags=["products"])
