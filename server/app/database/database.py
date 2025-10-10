from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
from bson import ObjectId

DATABASE_URL = "mongodb://localhost:27017"
DATABASE_NAME = "my_database"

client = AsyncIOMotorClient(DATABASE_URL)
db = client[DATABASE_NAME]

def get_db():
    return db
