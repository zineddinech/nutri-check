from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.schemas.user import UserResponse
from app.services.user_service import UserService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserResponse:
    payload = UserService.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("email")
    print(payload)
    if not email:
        raise HTTPException(status_code=401, detail="Token invalide")

    user = await UserService.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")

    return user
