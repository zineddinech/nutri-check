from typing import List, Optional

from passlib.context import CryptContext

from ..database.memory_db import db_instance
from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_user(user_data: UserCreate) -> User:
        """Créer un nouvel utilisateur"""
        user_dict = {
            "email": user_data.email,
            "username": user_data.username,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "hashed_password": UserService.hash_password(user_data.password),
        }

        return db_instance.add_user(user_dict)

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[User]:
        return db_instance.get_user_by_id(user_id)

    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        return db_instance.get_user_by_email(email)

    @staticmethod
    def get_user_by_username(username: str) -> Optional[User]:
        return db_instance.get_user_by_username(username)

    @staticmethod
    def get_users(skip: int = 0, limit: int = 100) -> List[User]:
        return db_instance.get_all_users(skip, limit)

    @staticmethod
    def update_user(user_id: int, user_data: UserUpdate) -> Optional[User]:
        update_dict = user_data.model_dump(exclude_unset=True)
        return db_instance.update_user(user_id, update_dict)

    @staticmethod
    def delete_user(user_id: int) -> bool:
        return db_instance.delete_user(user_id)

    @staticmethod
    def authenticate_user(email: str, password: str) -> Optional[User]:
        user = UserService.get_user_by_email(email)
        if not user or not UserService.verify_password(password, user.hashed_password):
            return None
        return user
