"""Unit tests for the recipes analyze endpoint.

This test mocks the LLM call (`call_gemini`) so no external API key is required.
The module under test reads `GOOGLE_API_KEY` at import time, so the test sets
an env var before importing the endpoint module.
"""

import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

SAMPLE_RECIPE = (
    "Poulet rôti avec pommes de terre et ail\n"
    "Ingrédients: poulet 500g, pommes de terre 1kg, ail 3 gousses, huile d'olive 2 c.à.s.\n"
    "Instructions: rôtir au four, servir chaud."
)


def make_fake_gemini_json(payload_json_str: str):
    """Retourne une structure ressemblant à la réponse Gemini attendue.

    La fonction `extract_text` dans `recipes.py` cherche `candidates` -> `content` -> `text`.
    On renvoie donc ce shape.
    """
    return {"candidates": [{"content": [{"text": payload_json_str}]}]}


@pytest.fixture()
def test_app(monkeypatch):
    # Définir une variable d'environnement factice avant l'import du module
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")

    # Importer le module après avoir posé la variable d'env
    from app.api.endpoints import recipes as recipes_module

    # Monkeypatcher la fonction call_gemini pour éviter tout appel réseau
    async def fake_call_gemini(prompt_text: str, timeout: int = 30):
        # Construire un JSON que l'endpoint attendra
        resp_obj = {
            "recipeName": "Poulet rôti",
            "totalCalories": 800,
            "ingredients": [
                {"name": "poulet", "quantity": "500g", "calories": 600},
                {"name": "pommes de terre", "quantity": "1kg", "calories": 150},
                {"name": "huile d'olive", "quantity": "2 c.à.s.", "calories": 50},
            ],
            "steps": ["Préchauffer le four", "Rôtir 1h", "Servir chaud"],
        }
        json_str = json.dumps(resp_obj, ensure_ascii=False)
        return make_fake_gemini_json(json_str)

    monkeypatch.setattr(recipes_module, "call_gemini", fake_call_gemini)

    # Créer une app FastAPI de test et inclure le router
    app = FastAPI()
    app.include_router(recipes_module.router, prefix="/recipes")
    return TestClient(app)


def test_analyze_recipe_success(test_app):
    payload = {"recipe": SAMPLE_RECIPE}
    resp = test_app.post("/recipes/analyze", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["recipeName"] == "Poulet rôti"
    assert body["totalCalories"] == 800
    assert isinstance(body["ingredients"], list)
    assert len(body["ingredients"]) == 3
    assert "steps" in body and isinstance(body["steps"], list)
