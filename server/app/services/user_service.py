import random
import string
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from passlib.context import CryptContext

from utils.email import send_reset_email

from ..core.config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM, JWT_SECRET_KEY
from ..database.database import get_db
from ..schemas.user import UserCreate, UserResponse, UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _to_object_id(s: str):
    """Return ObjectId(s) or None if invalid."""
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


class UserService:

    @staticmethod
    def create_access_token(
        data: dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_access_token(token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def hash_password(password: str) -> str:
        if not password:
            raise ValueError("Password cannot be empty")
        password = password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        truncated = plain_password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
        return pwd_context.verify(truncated, hashed_password)

    @staticmethod
    async def create_user(user_data: UserCreate) -> UserResponse:
        db = get_db()
        hashed_pw = UserService.hash_password(user_data.password)
        user = {
            "email": user_data.email,
            "username": user_data.username,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "hashed_password": hashed_pw,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None,
            "allergies": [],
        }

        result = await db["users"].insert_one(user)
        created_user = await db["users"].find_one({"_id": result.inserted_id})

        created_user["_id"] = str(created_user["_id"])
        return UserResponse(**created_user)

    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[UserResponse]:
        oid = _to_object_id(user_id)
        if oid is None:
            return None
        db = get_db()
        user = await db["users"].find_one({"_id": oid})
        if user:
            user["_id"] = str(user["_id"])
            return UserResponse(**user)
        return None

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[UserResponse]:
        db = get_db()
        user = await db["users"].find_one({"email": email})
        if user:
            user["_id"] = str(user["_id"])
            return UserResponse(**user)
        return None

    @staticmethod
    async def get_user_by_username(username: str) -> Optional[UserResponse]:
        db = get_db()
        user = await db["users"].find_one({"username": username})
        if user:
            user["_id"] = str(user["_id"])
            return UserResponse(**user)
        return None

    @staticmethod
    async def get_users(skip: int = 0, limit: int = 100) -> List[UserResponse]:
        db = get_db()
        users_cursor = db["users"].find().skip(skip).limit(limit)
        users = await users_cursor.to_list(length=limit)
        for u in users:
            u["_id"] = str(u["_id"])
        return [UserResponse(**u) for u in users]

    @staticmethod
    async def update_user(
        user_id: str, user_data: UserUpdate
    ) -> Optional[UserResponse]:
        oid = _to_object_id(user_id)
        if oid is None:
            return None
        db = get_db()
        update_data = {
            k: v for k, v in user_data.model_dump().items() if v is not None
        }
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        await db["users"].update_one({"_id": oid}, {"$set": update_data})

        updated_user = await db["users"].find_one({"_id": oid})
        if updated_user:
            updated_user["_id"] = str(updated_user["_id"])
            return UserResponse(**updated_user)
        return None

    @staticmethod
    async def delete_user(user_id: str) -> bool:
        oid = _to_object_id(user_id)
        if oid is None:
            return False
        db = get_db()
        result = await db["users"].delete_one({"_id": oid})
        return result.deleted_count == 1

    @staticmethod
    async def authenticate_user(username_or_email: str, password: str) -> str | None:
        db = get_db()
        user = await db["users"].find_one({"email": username_or_email})
        if not user:
            user = await db["users"].find_one({"username": username_or_email})
        if not user or not UserService.verify_password(
            password, user["hashed_password"]
        ):
            return None
        access_token = UserService.create_access_token(
            data={"email": str(user["email"])}
        )
        return access_token

    @staticmethod
    async def add_allergies(user_id: str, allergies: list[str]):
        oid = _to_object_id(user_id)
        if oid is None:
            return None
        db = get_db()
        user = await db["users"].find_one({"_id": oid})
        if not user:
            return None

        existing = set(user.get("allergies", []))
        updated = list(existing.union(allergies))

        await db["users"].update_one(
            {"_id": oid},
            {
                "$set": {
                    "allergies": updated,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        user["allergies"] = updated
        user["_id"] = str(user["_id"])
        return UserResponse(**user)

    @staticmethod
    async def remove_allergies(user_id: str, allergies: list[str]):
        oid = _to_object_id(user_id)
        if oid is None:
            return None
        db = get_db()
        user = await db["users"].find_one({"_id": oid})
        if not user:
            return None

        current = set(user.get("allergies", []))
        updated = [a for a in current if a not in allergies]

        await db["users"].update_one(
            {"_id": oid},
            {
                "$set": {
                    "allergies": updated,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        user["allergies"] = updated
        user["_id"] = str(user["_id"])
        return UserResponse(**user)

    @staticmethod
    async def add_countries(user_id: str, countries: list[str]):
        oid = _to_object_id(user_id)
        if oid is None:
            return None
        db = get_db()
        user = await db["users"].find_one({"_id": oid})
        if not user:
            return None

        existing = set(user.get("countries", []))
        updated = list(existing.union(countries))

        await db["users"].update_one(
            {"_id": oid},
            {
                "$set": {
                    "countries": updated,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        user["countries"] = updated
        user["_id"] = str(user["_id"])
        return UserResponse(**user)

    @staticmethod
    async def remove_countries(user_id: str, countries: list[str]):
        oid = _to_object_id(user_id)
        if oid is None:
            return None
        db = get_db()
        user = await db["users"].find_one({"_id": oid})
        if not user:
            return None

        current = set(user.get("countries", []))
        updated = [c for c in current if c not in countries]

        await db["users"].update_one(
            {"_id": oid},
            {
                "$set": {
                    "countries": updated,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        user["countries"] = updated
        user["_id"] = str(user["_id"])
        return UserResponse(**user)

    @staticmethod
    def generate_reset_code(length: int = 6) -> str:
        return "".join(random.choices(string.digits, k=length))

    @staticmethod
    async def request_password_reset(email: str) -> bool:
        db = get_db()

        user = await db["users"].find_one({"email": email})
        if not user:
            return False

        code = UserService.generate_reset_code()
        expires = datetime.now(timezone.utc) + timedelta(minutes=15)

        await db["users"].update_one(
            {"email": email},
            {
                "$set": {
                    "reset_code": code,
                    "reset_expires": expires.isoformat(),
                }
            },
        )
        send_reset_email(email, code)

        return True

    @staticmethod
    async def reset_password(email: str, code: str, new_password: str) -> bool:
        db = get_db()

        user = await db["users"].find_one({"email": email})
        if not user:
            return False

        if "reset_code" not in user or "reset_expires" not in user:
            return False

        if user["reset_code"] != code:
            return False

        if datetime.now(timezone.utc) > datetime.fromisoformat(user["reset_expires"]):
            return False

        new_hashed = UserService.hash_password(new_password)

        await db["users"].update_one(
            {"email": email},
            {
                "$set": {
                    "hashed_password": new_hashed,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                "$unset": {"reset_code": "", "reset_expires": ""},
            },
        )

        return True
