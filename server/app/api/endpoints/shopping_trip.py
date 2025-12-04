from fastapi import APIRouter, HTTPException, status

from ...schemas.shopping_trip import ShoppingTripCreate
from ...services.shopping_trip_service import ShoppingTripService

router = APIRouter()


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_shopping_trip(trip_data: ShoppingTripCreate):
    trip_id = await ShoppingTripService.create_shopping_trip(trip_data)
    if not trip_id:
        raise HTTPException(
            status_code=500, detail="Échec de la création du shopping trip"
        )
    return {"shopping_trip_id": trip_id}


@router.get("/user/{user_id}", status_code=status.HTTP_200_OK)
async def get_shopping_trips_by_user(user_id: str):
    trips = await ShoppingTripService.get_shopping_trips_by_user(user_id)
    return trips


@router.get("/{trip_id}/user/{user_id}", status_code=status.HTTP_200_OK)
async def get_shopping_trip_for_user(trip_id: str, user_id: str):
    trip = await ShoppingTripService.get_shopping_trip_by_id_for_user(trip_id, user_id)
    if not trip:
        raise HTTPException(
            status_code=404, detail="Shopping trip non trouvé pour cet utilisateur"
        )
    return trip


@router.delete("/{trip_id}/user/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shopping_trip(trip_id: str, user_id: str):
    deleted = await ShoppingTripService.delete_shopping_trip_for_user(trip_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=404, detail="Shopping trip non trouvé ou déjà supprimé"
        )