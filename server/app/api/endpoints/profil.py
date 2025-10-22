from fastapi import APIRouter, Query
from typing import List, Optional
from ...services.profil_service import ProfilService

router = APIRouter()

@router.get("/getAllergiesByName", response_model=List[str])
async def get_allergies_by_name(query: Optional[str] = Query(None, description="Partial allergen name to search for")):
    """
    Retourne la liste des allergènes filtrés par query (partial match).
    Si query est vide, retourne tous les allergènes.
    """
    results = await ProfilService.get_allergies_by_name(query or "")
    return results
