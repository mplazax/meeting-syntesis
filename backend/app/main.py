from fastapi import FastAPI
from .db.mongodb_utils import connect_to_mongo, close_mongo_connection
from .apis.auth_api import router as auth_router

app = FastAPI(title="Meeting Synthesis API")

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(auth_router, prefix="/auth", tags=["auth"])
