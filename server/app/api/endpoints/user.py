from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm

from app.schemas.user import Token


from ...schemas.user import UserCreate, UserResponse, UserUpdate
from ...services.user_service import UserService

router = APIRouter()


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def create_user(user_data: UserCreate):
    """
    Créer un nouvel utilisateur (MongoDB)
    """
    try:
        user = await UserService.create_user(user_data)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    token = await UserService.authenticate_user(form_data.username, form_data.password)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"jwt_token": token, "token_type": "Bearer"}


@router.get("/", response_model=List[UserResponse])
async def get_users(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100)):
    """
    Récupérer la liste des utilisateurs avec pagination
    """
    users = await UserService.get_users(skip=skip, limit=limit)
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """
    Récupérer un utilisateur par son ID
    """
    user = await UserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate):
    """
    Mettre à jour un utilisateur
    """
    user = await UserService.update_user(user_id, user_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str):
    """
    Supprimer un utilisateur
    """
    deleted = await UserService.delete_user(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )


@router.get("/email/{email}", response_model=UserResponse)
async def get_user_by_email(email: str):
    """
    Récupérer un utilisateur par son email
    """
    user = await UserService.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )
    return user


@router.get("/username/{username}", response_model=UserResponse)
async def get_user_by_username(username: str):
    """
    Récupérer un utilisateur par son nom d'utilisateur
    """
    user = await UserService.get_user_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )
    return user


@router.post("/{user_id}/allergies", response_model=UserResponse)
async def add_allergies_to_user(user_id: str, allergies: List[str] = Body(...)):
    """
    Ajoute une ou plusieurs allergies à un utilisateur
    """
    user = await UserService.add_allergies(user_id, allergies)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )
    return user


@router.delete("/{user_id}/allergies", response_model=UserResponse)
async def remove_allergies_from_user(user_id: str, allergies: List[str] = Body(...)):
    """
    Supprime une ou plusieurs allergies d’un utilisateur
    """
    user = await UserService.remove_allergies(user_id, allergies)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )
    return user


@router.post("/{user_id}/favorites/{product_id}", response_model=UserResponse)
async def add_favorite(user_id: str, product_id: str):
    """
    Ajoute un produit aux favoris de l’utilisateur
    """
    user = await UserService.add_favorite(user_id, product_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user





