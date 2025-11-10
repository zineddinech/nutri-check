from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# data-fields : https://static.openfoodfacts.org/data/data-fields.txt
class ProductResponse(BaseModel):
    id: str = Field(alias="_id")
    product_name: Optional[str] = None
    brands: Optional[str] = None
    nutriscore_score: Optional[int] = None
    ecoscore_score: Optional[int] = None
    categories_tags: Optional[List[str]] = None
    allergens: Optional[List[str]] = None
    url: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, json_encoders={" ObjectId ": str})

    @field_validator("allergens", mode="before")
    def normalize_allergens(cls, value):
        # TODO: afficher les allergens d'un produit de la base openfoodfacts et voir le format exacte
        # Réecrit le format des allergens en liste
        if value in (None, "", [], {}):
            return None
        if isinstance(value, str):
            parts = [v.strip() for v in value.split(",") if v.strip()]
        elif isinstance(value, list):
            parts = value
        else:
            return None

        # Enlever 'en:' ou autre comme fr:, es:, etc
        # Peut etre à modifier dans le futur si on a plusieurs langues
        cleaned = [p.split(":")[-1] for p in parts if p]

        return cleaned if cleaned else None