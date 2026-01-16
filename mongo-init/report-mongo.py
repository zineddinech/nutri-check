import gzip
from collections import Counter
from typing import Any
from pathlib import Path
from pymongo import MongoClient
import os


# ---------------- CONFIG ----------------

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "nutridb")
COLLECTION_NAME = "products"
MAX_PRODUCTS = 2_000_000  # None pour tout analyser

FIELDS_TO_ANALYZE = [
    "_id",
    "_keywords",
    "allergens",
    "allergens_from_ingredients",
    "brands",
    "categories",
    "code",
    "countries",
    "ecoscore_tags",
    "ingredients_text",
    "last_modified_t",
    "nutriments",
    "nutriscore_grade",
    "product_name",
    "product_type",
]


# ---------------- UTILS ----------------

def is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    if isinstance(value, (list, dict)) and len(value) == 0:
        return True
    return False


def extract_values(value: Any):
    if isinstance(value, list):
        return [str(v) for v in value if v is not None]
    if isinstance(value, dict):
        return ["<DICT>"]
    return [str(value)]


# ---------------- MAIN ----------------

# ---------------- MAIN ----------------

def analyze_db():
    stats = {
        field: {
            "total": 0,
            "empty": 0,
            "values": Counter(),
        }
        for field in FIELDS_TO_ANALYZE
    }

    # Se connecter à MongoDB
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    collection = db[COLLECTION_NAME]
    
    print(f"📂 Connexion à {MONGO_URI}/{MONGO_DB_NAME}/{COLLECTION_NAME}")
    
    total_docs = collection.count_documents({})
    print(f"📊 Total documents: {total_docs}")
    
    # Itérer sur les documents
    cursor = collection.find().limit(MAX_PRODUCTS or None)
    
    for idx, product in enumerate(cursor):
        if (idx + 1) % 10_000 == 0:
            print(f"  → {idx + 1} produits analysés")
        
        if not isinstance(product, dict):
            continue

        for field in FIELDS_TO_ANALYZE:
            stats[field]["total"] += 1
            value = product.get(field)

            if is_empty(value):
                stats[field]["empty"] += 1
                continue

            for v in extract_values(value):
                stats[field]["values"][v] += 1

    print(f"\n📊 Résumé: {idx + 1} documents analysés")
    
    client.close()
    return stats


# ---------------- REPORT ----------------

def print_report(stats):
    for field, data in stats.items():
        total = data["total"]
        empty = data["empty"]
        values = data["values"]

        empty_ratio = (empty / total * 100) if total else 0

        print("\n" + "=" * 80)
        print(f"FIELD: {field}")
        print(f"Analyzed products: {total}")
        print(f"Empty values: {empty} ({empty_ratio:.2f}%)")
        print(f"Unique values: {len(values)}")

        print("\nTop 20 values:")
        for value, count in values.most_common(20):
            ratio = count / total * 100
            print(f"  {value[:50]:50s} -> {count:7d} ({ratio:6.2f}%)")


# ---------------- ENTRYPOINT ----------------

if __name__ == "__main__":
    stats = analyze_db()
    print_report(stats)