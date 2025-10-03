from datetime import datetime
from typing import Dict, List, Optional

from ..models.user import User


class InMemoryDatabase:
    """Base de données en mémoire pour les utilisateurs"""

    def __init__(self):
        self.users: Dict[int, User] = {}
        self.next_id = 1
        self.email_index: Dict[str, int] = {}  # Index pour recherche rapide par email
        self.username_index: Dict[str, int] = (
            {}
        )  # Index pour recherche rapide par username

    def add_user(self, user_data: dict) -> User:
        """Ajouter un utilisateur"""
        user = User(
            id=self.next_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            **user_data
        )

        # Vérifier les contraintes d'unicité
        if user.email in self.email_index:
            raise ValueError("Email déjà existant")
        if user.username in self.username_index:
            raise ValueError("Nom d'utilisateur déjà existant")

        # Stocker l'utilisateur et mettre à jour les index
        self.users[self.next_id] = user
        self.email_index[user.email] = self.next_id
        self.username_index[user.username] = self.next_id

        self.next_id += 1
        return user

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Récupérer un utilisateur par ID"""
        return self.users.get(user_id)

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Récupérer un utilisateur par email"""
        user_id = self.email_index.get(email)
        return self.users.get(user_id) if user_id else None

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Récupérer un utilisateur par nom d'utilisateur"""
        user_id = self.username_index.get(username)
        return self.users.get(user_id) if user_id else None

    def get_all_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Récupérer tous les utilisateurs avec pagination"""
        users_list = list(self.users.values())
        return users_list[skip : skip + limit]

    def update_user(self, user_id: int, update_data: dict) -> Optional[User ]:
        """Mettre à jour un utilisateur"""
        user = self.users.get(user_id)
        if not user:
            return None

        # Créer une copie des données actuelles
        user_dict = user.model_dump()

        # Vérifier les contraintes d'unicité pour email/username si modifiés
        if "email" in update_data and update_data["email"] != user.email:
            if update_data["email"] in self.email_index:
                raise ValueError("Email déjà existant")

        if "username" in update_data and update_data["username"] != user.username:
            if update_data["username"] in self.username_index:
                raise ValueError("Nom d'utilisateur déjà existant")

        # Nettoyer les anciens index si email/username changent
        old_email = user.email
        old_username = user.username

        # Appliquer les modifications
        user_dict.update(update_data)
        user_dict["updated_at"] = datetime.utcnow()

        # Créer le nouvel utilisateur
        updated_user = user(**user_dict)

        # Mettre à jour les index si nécessaire
        if "email" in update_data and update_data["email"] != old_email:
            del self.email_index[old_email]
            self.email_index[updated_user.email] = user_id

        if "username" in update_data and update_data["username"] != old_username:
            del self.username_index[old_username]
            self.username_index[updated_user.username] = user_id

        # Stocker l'utilisateur mis à jour
        self.users[user_id] = updated_user
        return updated_user

    def delete_user(self, user_id: int) -> bool:
        """Supprimer un utilisateur"""
        user = self.users.get(user_id)
        if not user:
            return False

        # Nettoyer les index
        del self.email_index[user.email]
        del self.username_index[user.username]
        del self.users[user_id]

        return True

    def clear(self):
        """Vider la base de données (utile pour les tests)"""
        self.users.clear()
        self.email_index.clear()
        self.username_index.clear()
        self.next_id = 1


# Instance globale de la base de données en mémoire
db_instance = InMemoryDatabase()
