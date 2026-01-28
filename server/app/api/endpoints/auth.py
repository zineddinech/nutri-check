from fastapi import APIRouter, HTTPException, Query

from ...schemas.passwordReset import ForgotPasswordRequest, ResetPasswordRequest
from ...schemas.user import UserResponse
from ...services.auth_service import get_current_user
from ...services.user_service import UserService

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


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    success = await UserService.request_password_reset(data.email)

    if not success:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    return {"message": "Code envoyé par email"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    success = await UserService.reset_password(data.email, data.code, data.new_password)

    if not success:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")

    return {"message": "Mot de passe mis à jour avec succès"}
