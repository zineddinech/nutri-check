from fastapi import APIRouter, Query

from ...schemas.user import UserResponse
from ...services.auth_service import get_current_user

router = APIRouter()


# fait une api de la fonction get_current_user
# must have parameter token


@router.get("/", response_model=UserResponse)
async def get_user(
    token: str = Query(..., description="JWT token of the user"),
):
    """
    Retourne les informations de l'utilisateur actuel basé sur le token JWT fourni.
    """
    user = await get_current_user(token)
    return user
