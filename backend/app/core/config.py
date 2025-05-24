import os
from dotenv import load_dotenv

load_dotenv()

MONGO_DETAILS = os.getenv("MONGO_DETAILS", "mongodb://localhost:27017")
DATABASE_NAME = "meeting_synthesis_db"
USER_COLLECTION_NAME = "users"

SECRET_KEY = os.getenv("SECRET_KEY", "super_tajny_klucz")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
