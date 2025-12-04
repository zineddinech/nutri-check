from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FavoriteCreate(BaseModel):
    user_id: str
    product_id: str

class FavoriteResponse(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    product_id: str
    product_snapshot: dict
    created_at: datetime

    class Config:
        populate_by_name = True
