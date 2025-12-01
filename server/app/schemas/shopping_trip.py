from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class ShoppingTripItem(BaseModel):
    product_id: str
    quantity: int = 1


class ShoppingTripCreate(BaseModel):
    user_id: str
    name: str
    products: List[ShoppingTripItem]


class ShoppingTripResponse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    name: str
    products: List[ShoppingTripItem]
    created_at: datetime

    class Config:
        populate_by_name = True
