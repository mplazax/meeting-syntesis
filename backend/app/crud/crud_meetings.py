from datetime import UTC, datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import re

from ..models.meeting import Meeting
from ..schemas.meeting_schema import MeetingCreate, MeetingUpdate


async def get_meeting_by_id(
    db: AsyncIOMotorDatabase, meeting_id: str
) -> Meeting | None:
    if not ObjectId.is_valid(meeting_id):
        return None
    meeting_doc = await db["meetings"].find_one({"_id": ObjectId(meeting_id)})
    if meeting_doc:
        return Meeting(**meeting_doc)
    return None


async def get_all_meetings(db: AsyncIOMotorDatabase) -> list[Meeting]:
    meetings = []
    cursor = db["meetings"].find()
    async for doc in cursor:
        meetings.append(Meeting(**doc))
    return meetings


async def get_meetings_filtered(
    db: AsyncIOMotorDatabase,
    q: str | None = None,
    project_ids: list[str] | None = None,
    tags: list[str] | None = None,
    sort_by: str = "newest",
) -> list[Meeting]:
    query_conditions = []

    if q:
        # Używamy regex do wyszukiwania case-insensitive
        query_conditions.append({"title": {"$regex": re.escape(q), "$options": "i"}})

    if project_ids:
        # Konwertujemy stringi na ObjectId
        valid_project_ids = [ObjectId(pid) for pid in project_ids if ObjectId.is_valid(pid)]
        if valid_project_ids:
            query_conditions.append({"project_id": {"$in": valid_project_ids}})

    if tags:
        # Wyszukujemy spotkania, które mają którykolwiek z podanych tagów
        query_conditions.append({"tags": {"$in": tags}})

    # Łączymy wszystkie warunki w jedno zapytanie
    query = {"$and": query_conditions} if query_conditions else {}

    # Definiujemy opcje sortowania
    sort_options = {
        "newest": [("meeting_datetime", -1)],
        "oldest": [("meeting_datetime", 1)],
        "duration-desc": [("duration_seconds", -1)],
        "duration-asc": [("duration_seconds", 1)],
    }
    sort_order = sort_options.get(sort_by, sort_options["newest"])
    
    cursor = db["meetings"].find(query).sort(sort_order)
    meetings = []
    async for doc in cursor:
        meetings.append(Meeting(**doc))
    return meetings

async def get_meetings_by_project(
    db: AsyncIOMotorDatabase, project_id: str
) -> list[Meeting]:
    if not ObjectId.is_valid(project_id):
        return []
    cursor = db["meetings"].find({"project_id": ObjectId(project_id)})
    meetings = []
    async for doc in cursor:
        meetings.append(Meeting(**doc))
    return meetings


async def create_meeting(
    db: AsyncIOMotorDatabase, meeting_data: MeetingCreate
) -> Meeting:
    meeting_doc = meeting_data.dict(by_alias=True)
    meeting_doc["uploaded_at"] = datetime.now(UTC)
    meeting_doc["last_updated_at"] = datetime.now(UTC)

    result = await db["meetings"].insert_one(meeting_doc)
    meeting_doc["_id"] = result.inserted_id

    return Meeting(**meeting_doc)


async def update_meeting(
    db: AsyncIOMotorDatabase, meeting_id: str, update_data: MeetingUpdate
) -> Meeting | None:
    if not ObjectId.is_valid(meeting_id):
        return None

    data = {k: v for k, v in update_data.dict(exclude_unset=True).items()}
    if not data:
        return await get_meeting_by_id(db, meeting_id)

    data["last_updated_at"] = datetime.now(UTC)

    result = await db["meetings"].update_one(
        {"_id": ObjectId(meeting_id)}, {"$set": data}
    )
    if result.modified_count == 1:
        return await get_meeting_by_id(db, meeting_id)
    return None


async def delete_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> bool:
    if not ObjectId.is_valid(meeting_id):
        return False
    result = await db["meetings"].delete_one({"_id": ObjectId(meeting_id)})
    return result.deleted_count == 1