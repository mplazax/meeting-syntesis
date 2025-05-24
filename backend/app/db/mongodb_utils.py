from motor.motor_asyncio import AsyncIOMotorClient
from ..core.config import MONGO_DETAILS, DATABASE_NAME

class MongoDB:
    client: AsyncIOMotorClient = None

db = MongoDB()

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(MONGO_DETAILS)

async def close_mongo_connection():
    db.client.close()

async def get_database():
    if db.client is None:
        await connect_to_mongo()
    return db.client[DATABASE_NAME]
