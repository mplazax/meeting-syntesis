from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db.mongodb_utils import get_database
from ...schemas.user_schema import Token, UserCreate, UserLogin, UserResponse
from ...services import user_service

router = APIRouter()


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register_user(
    user_in: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await user_service.register_new_user(db=db, user_data=user_in)


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await user_service.authenticate_user(db=db, form_data=form_data)
