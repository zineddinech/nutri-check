from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict


# data-fields : https://static.openfoodfacts.org/data/data-fields.txt
class ProductResponse(BaseModel):
    id: str = Field(alias="_id")
    product_name: Optional[str] = None
    brands: Optional[str] = None
    nutriscore_score: Optional[int] = None
    ecoscore_score: Optional[int] = None
    categories_tags: Optional[List[str]] = None
    url: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name = True,
        json_encoders = {
            " ObjectId ": str
        }
    )