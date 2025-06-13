import os
import shutil
import uuid

from fastapi import UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from .whisper_service import transcribe_audio
from ..crud import crud_meetings
from ..models.audio_file import AudioFile
from ..models.enums.processing_stage import ProcessingStage
from ..models.meeting import Meeting
from ..models.processing_status import ProcessingStatus
from ..models.transcrpion import Transcription
from ..schemas.meeting_schema import MeetingCreate, MeetingUpdate, MeetingCreateForm


#from .whisper_service import transcribe_audio


async def create_new_meeting(db: AsyncIOMotorDatabase, data: MeetingCreate) -> Meeting:
    return await crud_meetings.create_meeting(db, data)


async def get_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> Meeting | None:
    return await crud_meetings.get_meeting_by_id(db, meeting_id)


async def get_meetings(db: AsyncIOMotorDatabase) -> list[Meeting]:
    return await crud_meetings.get_all_meetings(db)


async def get_meetings_for_project(
    db: AsyncIOMotorDatabase, project_id: str
) -> list[Meeting]:
    return await crud_meetings.get_meetings_by_project(db, project_id)


async def update_existing_meeting(
    db: AsyncIOMotorDatabase, meeting_id: str, update_data: MeetingUpdate
) -> Meeting | None:
    return await crud_meetings.update_meeting(db, meeting_id, update_data)


async def delete_existing_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> bool:
    return await crud_meetings.delete_meeting(db, meeting_id)


UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def handle_meeting_upload(
    db: AsyncIOMotorDatabase, meeting_data: MeetingCreateForm, audio_file: UploadFile
) -> Meeting:
    extension = audio_file.filename.split(".")[-1]
    generated_filename = f"{uuid.uuid4().hex}.{extension}"
    storage_path = os.path.join(UPLOAD_DIR, generated_filename)

    # Zapisz plik
    with open(storage_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    # Utwórz instancję AudioFile
    audio_data = AudioFile(
        original_filename=audio_file.filename,
        storage_path_or_url=storage_path,
        mimetype=audio_file.content_type
    )

    # Stwórz MeetingCreate z formularza
    full_data = meeting_data.to_meeting_create(audio_data)

    # Utwórz meeting w bazie
    meeting = await crud_meetings.create_meeting(db, full_data)

    try:
        # Ustaw status PROCESSING
        await crud_meetings.update_meeting(
            db, str(meeting.id),
            MeetingUpdate(processing_status=ProcessingStatus(current_stage=ProcessingStage.PROCESSING))
        )

        # Transkrypcja
        full_text = await transcribe_audio(storage_path)

        # Zaktualizuj dokument Meeting o transkrypcję i status
        updated_meeting = await crud_meetings.update_meeting(
            db, str(meeting.id),
            MeetingUpdate(
                transcription=Transcription(full_text=full_text),
                processing_status=ProcessingStatus(current_stage=ProcessingStage.COMPLETED)
            )
        )
        return updated_meeting or meeting

    except Exception as e:
        # W razie błędu aktualizuj status
        await crud_meetings.update_meeting(
            db, str(meeting.id),
            MeetingUpdate(
                processing_status=ProcessingStatus(
                    current_stage=ProcessingStage.FAILED,
                    error_message=str(e)
                )
            )
        )
        return meeting