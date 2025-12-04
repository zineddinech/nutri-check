import asyncio
import os
from io import BytesIO
from pathlib import Path

import requests
from motor.motor_asyncio import AsyncIOMotorClient
from PIL import Image

# --- Config Mongo ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "nutridb")

# --- API OFF ---
API_URL = "https://world.openfoodfacts.org/api/v2/product/{code}.json"

# --- Dossiers (côté serveur) ---
# /app (racine Docker) -> utils/scripts/fetchAndCompressImages.py
# parents[1] = /app
BASE_DIR = Path(__file__).resolve().parents[2]  # /app
COMPRESSED_DIR = BASE_DIR / "compressed_images"
COMPRESSED_DIR.mkdir(exist_ok=True)

# --- Compression ---
MAX_SIZE = (200, 200)  # max 200x200
JPEG_QUALITY = 80


async def get_all_products():
    """
    Récupère tous les produits depuis Mongo.
    On ne garde que 'code' et 'product_name'.
    """
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    cursor = db["products"].find({}, {"code": 1, "product_name": 1})
    return await cursor.to_list(length=None)


def fetch_image_url(barcode: str) -> str | None:
    """
    Va chercher l'URL d'image sur OFF pour un code-barres donné.
    (synchronement avec requests)
    """
    url = API_URL.format(code=barcode)
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            return None
        data = resp.json()
    except Exception:
        return None

    product = data.get("product", {})

    return (
        product.get("image_front_url")
        or product.get("image_front_small_url")
        or product.get("image_url")
    )


def download_image(url: str) -> bytes | None:
    """
    Télécharge les octets bruts de l'image (synchronement).
    """
    try:
        resp = requests.get(url, timeout=20)
        if resp.status_code != 200:
            return None
        return resp.content
    except Exception:
        return None


def compress_image(raw_bytes: bytes, out_path: Path):
    """
    Compresse/redimensionne l'image en mémoire, puis l'enregistre en JPEG.
    """
    img = Image.open(BytesIO(raw_bytes))

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # Redimensionne en gardant le ratio, max 300x300
    img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="JPEG", quality=JPEG_QUALITY, optimize=True)


async def main():
    print("\n=== FETCH & COMPRESS IMAGES ===\n")

    print("📡 Lecture MongoDB...")
    products = await get_all_products()
    print(f"👉 {len(products)} produits récupérés\n")

    for idx, p in enumerate(products, start=1):
        code = p.get("code")
        if not code:
            print(f"❌ Skip (no barcode): {p.get('_id')}")
            continue

        compressed_path = COMPRESSED_DIR / f"{code}.jpg"

        # Si déjà présent → on saute
        if compressed_path.exists():
            print(f"[{idx}] ✔ Déjà présent : {code}")
            continue

        print(f"[{idx}] 🔍 {code} ...")

        image_url = fetch_image_url(code)
        if not image_url:
            print(f"   ❌ Aucune image pour {code}")
            continue

        raw = download_image(image_url)
        if not raw:
            print(f"   ❌ Impossible de télécharger {image_url}")
            continue

        try:
            compress_image(raw, compressed_path)
            print(f"   🔧 Compression OK → {compressed_path.name}")
        except Exception as e:
            print(f"   ❌ Erreur compression pour {code} : {e}")

    print("\n🎉 Terminé !")
    print(f" - Compressés → {COMPRESSED_DIR}\n")


if __name__ == "__main__":
    asyncio.run(main())
