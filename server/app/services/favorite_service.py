from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from ..database.database import get_db


class FavoriteService:
    @staticmethod
    async def add_favorite(user_id: str, product_id: str):
        db = get_db()

        user = await db["users"].find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")

        product = await db["products"].find_one({"_id": product_id})
        if not product:
            raise HTTPException(status_code=404, detail="Produit introuvable")

        existing = await db["favorites"].find_one(
            {"user_id": user_id, "product_id": product_id}
        )
        if existing:
            raise HTTPException(status_code=400, detail="Produit déjà dans les favoris")

        snapshot = {
            "product_name": product.get("product_name"),
            "brands": product.get("brands"),
            "nutriscore_score": product.get("nutriscore_score"),
            "ecoscore_score": product.get("ecoscore_score"),
        }

        fav_doc = {
            "user_id": user_id,
            "product_id": product_id,
            "product_snapshot": snapshot,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        result = await db["favorites"].insert_one(fav_doc)
        return str(result.inserted_id)

    @staticmethod
    async def get_user_favorites(user_id: str):
        db = get_db()
        favorites_cursor = (
            db["favorites"].find({"user_id": user_id}).sort("created_at", -1)
        )
        favorites = await favorites_cursor.to_list(length=None)
        for f in favorites:
            f["_id"] = str(f["_id"])
        return favorites

    @staticmethod
    async def remove_favorite(user_id: str, product_id: str) -> bool:
        db = get_db()
        result = await db["favorites"].delete_one(
            {"user_id": user_id, "product_id": product_id}
        )
        return result.deleted_count == 1
