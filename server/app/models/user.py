from typing import List, Optional

from bson import ObjectId
from pydantic import BaseModel, Field


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


class User(BaseModel):
    id: Optional[str] = Field(alias="_id")
    email: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    hashed_password: str
    is_active: bool = True
    allergies: List[str] = []
    countries: List[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
