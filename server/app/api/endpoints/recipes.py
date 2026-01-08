import json
import os
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

if not GOOGLE_API_KEY:
    raise ValueError(
        "GOOGLE_API_KEY n'est pas définie dans les variables d'environnement"
    )


class RecipeRequest(BaseModel):
    recipe: str


class Ingredient(BaseModel):
    name: str
    quantity: str
    calories: int


class RecipeResponse(BaseModel):
    recipeName: str
    totalCalories: int
    ingredients: list[Ingredient]
    steps: list[str]


async def call_gemini(prompt_text: str, timeout: int = 30):
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": GOOGLE_API_KEY,
    }
    payload = {"contents": [{"parts": [{"text": prompt_text}]}]}

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(MODEL_URL, headers=headers, json=payload)  # type: ignore
        resp.raise_for_status()
        return resp.json()


@router.post("/analyze", response_model=RecipeResponse)
async def analyze_recipe(request: RecipeRequest):
    """
    Analyse une recette avec l'IA Claude et extrait les ingrédients
    """
    try:
        prompt = f"""
Crée cette recette avec des produits de supermarché et retourne un JSON avec la structure suivante:
{{
  "recipeName": "Nom de la recette",
  "totalCalories": nombre total de calories,
  "ingredients": [
    {{"name": "Nom simplifié du produit", "quantity": "Quantité", "calories": nombre de calories}},
    ...
  ],
  "steps": ["Étape 1", "Étape 2", ...]
}}

IMPORTANT pour les noms des ingrédients:
- Utilise UNIQUEMENT le nom du produit principal et simplifié
- Exemples: "cuisse de poulet fermier" → "poulet"
- Exemples: "lait demi-écrémé 1L" → "lait"
- Exemples: "riz basmati blanc" → "riz"
- Exemples: "oeufs fermiers calibre moyen" → "oeufs"
- Exemples: "sel fin iodé" → "sel"
- Utilise le singulier ou pluriel selon le contexte naturel
- Pas de spécifications inutiles (marque, type, origine, emballage, etc.)

Recette à analyser:
{request.recipe}

Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire.
"""

        # Appeler Gemini
        data = await call_gemini(prompt)

        # Extraire et parser le JSON renvoyé par la LLM.
        # On essaie plusieurs champs fréquemment utilisés par Gemini/GLA.
        def _collect_candidate_texts(d: Any) -> list[str]:
            texts: list[str] = []
            if not isinstance(d, dict):
                return texts

            # 1) candidates -> content -> text (or candidates -> content -> parts -> text)
            if "candidates" in d and isinstance(d["candidates"], list):
                for c in d["candidates"]:
                    if isinstance(c, dict):
                        # Case 1a: content is a list (older style)
                        if "content" in c and isinstance(c["content"], list):
                            for part in c["content"]:
                                if isinstance(part, dict) and "text" in part:
                                    texts.append(part["text"])
                        # Case 1b: content is a dict with "parts" list (newer Gemini style)
                        elif "content" in c and isinstance(c["content"], dict):
                            content = c["content"]
                            if "parts" in content and isinstance(
                                content["parts"], list
                            ):
                                for part in content["parts"]:
                                    if isinstance(part, dict) and "text" in part:
                                        texts.append(part["text"])

                        # some shapes place output/content one level deeper
                        if "output" in c and isinstance(c["output"], list):
                            for out in c["output"]:
                                if isinstance(out, dict) and "content" in out:
                                    for part in out["content"]:
                                        if isinstance(part, dict) and "text" in part:
                                            texts.append(part["text"])

            # 2) top-level output -> content -> text
            if "output" in d and isinstance(d["output"], dict):
                out = d["output"]
                if "content" in out and isinstance(out["content"], list):
                    for part in out["content"]:
                        if isinstance(part, dict) and "text" in part:
                            texts.append(part["text"])

            # 3) sometimes the model returns a simple 'text' field
            if "text" in d and isinstance(d["text"], str):
                texts.append(d["text"])

            return texts

        def _try_parse_json_from_texts(texts: list[str]) -> dict:
            # Try direct JSON parse for each candidate text. Also try to extract
            # a JSON substring delimited by the first '{' and the last '}'.
            # Handle markdown code blocks like ```json ... ```.
            for t in texts:
                if not isinstance(t, str):
                    continue
                s = t.strip()

                # Remove markdown code block delimiters if present
                if s.startswith("```"):
                    # Remove opening ``` or ```json
                    lines = s.split("\n")
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    # Remove closing ```
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    s = "\n".join(lines).strip()

                # Direct parse attempt
                try:
                    return json.loads(s)
                except json.JSONDecodeError:
                    pass

                # Try to find a JSON object inside the text
                first = s.find("{")
                last = s.rfind("}")
                if first != -1 and last != -1 and last > first:
                    candidate = s[first : last + 1]
                    try:
                        return json.loads(candidate)
                    except json.JSONDecodeError:
                        pass

            # Nothing parsed
            return {}

        candidate_texts = _collect_candidate_texts(data)
        recipe_data = _try_parse_json_from_texts(candidate_texts)

        # Si on n'a pas obtenu le JSON attendu, fournir une erreur claire
        if not recipe_data or not isinstance(recipe_data, dict):
            # Inclure un extrait de la réponse brute pour faciliter le debug
            raw_preview = json.dumps(data)[:1000]
            raise HTTPException(
                status_code=502,
                detail=(
                    "Impossible d'extraire un JSON structuré depuis la réponse du modèle. "
                    f"Réponse brute (troncée): {raw_preview}"
                ),
            )

        # Valider et construire la réponse
        return RecipeResponse(
            recipeName=recipe_data.get("recipeName", "Ma recette"),
            totalCalories=recipe_data.get("totalCalories", 0),
            ingredients=[
                Ingredient(
                    name=ing.get("name", ""),
                    quantity=ing.get("quantity", ""),
                    calories=ing.get("calories", 0),
                )
                for ing in recipe_data.get("ingredients", [])
            ],
            steps=recipe_data.get("steps", []),
        )

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=500, detail=f"Erreur HTTP Gemini: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erreur lors de l'analyse de la recette: {str(e)}"
        )
