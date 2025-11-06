from fastapi import APIRouter, HTTPException, status
from ...services.favorite_service import FavoriteService
from ...schemas.favorite import FavoriteCreate, FavoriteResponse

router = APIRouter()

@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_favorite(fav: FavoriteCreate):
    fav_id = await FavoriteService.add_favorite(fav.user_id, fav.product_id)
    return {"favorite_id": fav_id}

@router.get("/user/{user_id}", response_model=list[FavoriteResponse])
async def get_user_favorites(user_id: str):
    return await FavoriteService.get_user_favorites(user_id)

@router.delete("/{user_id}/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(user_id: str, product_id: str):
    deleted = await FavoriteService.remove_favorite(user_id, product_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Favori non trouvé")
