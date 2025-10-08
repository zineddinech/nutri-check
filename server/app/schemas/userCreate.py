from datetime import datetime

from pydantic import BaseModel


class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    first_name: str
    last_name: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    first_name: str
    last_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
