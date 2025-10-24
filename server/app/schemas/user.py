from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError(
                "Le mot de passe doit contenir au moins 8 caractères")
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: Optional[str] = Field(alias="_id", default=None)
    is_active: bool = True
    created_at: Optional[datetime] = None   # ✅ accepte un datetime
    updated_at: Optional[datetime] = None   # ✅ idem

    class Config:
        populate_by_name = True
        # ✅ sérialisation propre
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}


class Token(BaseModel):
    jwt_token: str
    token_type: str
