from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from ...db.mongodb_utils import get_database
from ...schemas.user_schema import UserResponse
from ...crud import crud_users
from ...dependencies import get_current_user
from ...models.user import User


router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_user)
):
    return current_user 

@router.get("/", response_model=List[UserResponse])
async def read_users(
    current_user_auth_check: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    all_users = await crud_users.get_all_users(db)
    return all_users