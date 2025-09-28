from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class User(BaseModel):
    id: int
    email: str
    username: str
    hashed_password: str
    first_name: str
    last_name: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
