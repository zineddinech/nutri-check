import os
from motor.motor_asyncio import AsyncIOMotorClient

# Lit l'URI de connexion depuis les variables d'environnement.
# Fournit une valeur par défaut pour le développement local sans Docker.
DATABASE_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")
# Lit le NOM de la base de données depuis les variables d'environnement.
DATABASE_NAME = os.getenv("MONGO_DB_NAME", "nutridb")

client = AsyncIOMotorClient(DATABASE_URL)
db = client[DATABASE_NAME]

def get_db():
    return db
