from typing import List

from fastapi import APIRouter, HTTPException, Query, status

from ...schemas.user import UserCreate, UserResponse, UserUpdate
from ...services.user_service import UserService

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate):
    """
    Créer un nouvel utilisateur
    """
    try:
        user = UserService.create_user(user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[UserResponse])
def get_users(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100)):
    """
    Récupérer la liste des utilisateurs avec pagination
    """
    users = UserService.get_users(skip=skip, limit=limit)
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    """
    Récupérer un utilisateur par son ID
    """
    user = UserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_data: UserUpdate):
    """
    Mettre à jour un utilisateur
    """
    try:
        user = UserService.update_user(user_id, user_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
            )
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int):
    """
    Supprimer un utilisateur
    """
    if not UserService.delete_user(user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )


@router.get("/email/{email}", response_model=UserResponse)
def get_user_by_email(email: str):
    """
    Récupérer un utilisateur par son email
    """
    user = UserService.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )
    return user


@router.get("/username/{username}", response_model=UserResponse)
def get_user_by_username(username: str):
    """
    Récupérer un utilisateur par son nom d'utilisateur
    """
    user = UserService.get_user_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
        )
    return user
