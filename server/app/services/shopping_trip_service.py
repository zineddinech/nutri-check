from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from ..database.database import get_db


class ShoppingTripService:
    @staticmethod
    async def create_shopping_trip(data):
        """
        Crée un nouveau shopping trip pour un utilisateur.
        Calcule automatiquement le NutriScore moyen des produits.
        """
        db = get_db()

        valid_products = []
        nutri_scores = []

        for item in data.products:
            product = await db["products"].find_one({"_id": item.product_id})
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Produit {item.product_id} introuvable",
                )

            nutri_value = product.get("nutriscore_score")
            if isinstance(nutri_value, (int, float)):
                nutri_scores.append(nutri_value)

            valid_products.append(
                {
                    "product_id": item.product_id,
                    "product_name": product.get("product_name"),
                    "brands": product.get("brands"),
                    "nutriscore_score": nutri_value,
                    "ecoscore_score": product.get("ecoscore_score"),
                    "quantity": item.quantity,
                }
            )

        if nutri_scores:
            avg_score = round(sum(nutri_scores) / len(nutri_scores), 2)
            avg_letter = ShoppingTripService._get_nutriscore_letter(avg_score)
        else:
            avg_score = None
            avg_letter = None

        trip_doc = {
            "user_id": data.user_id,
            "name": data.name,
            "products": valid_products,
            "average_nutriscore_score": avg_score,
            "average_nutriscore_grade": avg_letter,
            "nutriscore_count": len(nutri_scores),
            "total_products": len(valid_products),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        result = await db["shopping_trips"].insert_one(trip_doc)

        return {
            "shopping_trip_id": str(result.inserted_id),
            "name": data.name,
            "average_nutriscore_score": avg_score,
            "average_nutriscore_grade": avg_letter,
            "nutriscore_count": len(nutri_scores),
            "total_products": len(valid_products),
        }

    @staticmethod
    def _get_nutriscore_letter(score: float) -> str:
        if score <= 0:
            return "A"
        elif score <= 2:
            return "B"
        elif score <= 10:
            return "C"
        elif score <= 18:
            return "D"
        else:
            return "E"

    @staticmethod
    async def get_shopping_trips_by_user(user_id: str):
        db = get_db()
        trips_cursor = (
            db["shopping_trips"].find({"user_id": user_id}).sort("created_at", -1)
        )
        trips = await trips_cursor.to_list(length=None)
        for t in trips:
            t["_id"] = str(t["_id"])
        return trips

    @staticmethod
    async def get_shopping_trip_by_id_for_user(trip_id: str, user_id: str):
        db = get_db()
        trip = await db["shopping_trips"].find_one(
            {"_id": ObjectId(trip_id), "user_id": user_id}
        )
        if trip:
            trip["_id"] = str(trip["_id"])
        return trip

    @staticmethod
    async def delete_shopping_trip_for_user(trip_id: str, user_id: str) -> bool:
        db = get_db()
        result = await db["shopping_trips"].delete_one(
            {"_id": ObjectId(trip_id), "user_id": user_id}
        )
        return result.deleted_count == 1
