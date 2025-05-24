from pydantic import BaseModel, EmailStr, Field, GetJsonSchemaHandler, ConfigDict
from pydantic_core import core_schema, PydanticCustomError
from typing import Optional, Annotated, Any, Dict
from bson import ObjectId

class PyObjectId(ObjectId):

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type: Any, _handler: Any) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            python_schema=core_schema.with_info_plain_validator_function(cls._pyobjectid_validate),
            json_schema=core_schema.str_schema(),
            serialization=core_schema.plain_serializer_function_ser_schema(str),
        )

    @classmethod
    def _pyobjectid_validate(cls, value: Any, info: core_schema.ValidationInfo) -> ObjectId:
        # 'info' to dodatkowy argument przekazywany przez Pydantic
        # Nie używamy go tutaj, ale musi być w sygnaturze
        if isinstance(value, ObjectId):
            return value
        if isinstance(value, str) and ObjectId.is_valid(value):
            return ObjectId(value)
        raise PydanticCustomError("invalid_object_id", "Invalid ObjectId")

    @classmethod
    def __get_pydantic_json_schema__(
        cls, core_schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> Dict[str, Any]:
        json_schema = handler(core_schema)
        json_schema.update(type="string", example="5eb7cf5a86d9755df3a6c590")
        return json_schema

# MODELE Pydantic
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    # Field z aliasem do mapowania _id z MongoDB
    # Używamy Annotated, jak już to robisz, to dobra praktyka
    id: Optional[Annotated[PyObjectId, Field(alias="_id")]]

    # Użyj ConfigDict dla Pydantic v2
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        from_attributes=True # Dodałem z powrotem from_attributes=True, to jest zalecane dla modeli używanych z bazami danych.
    )

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None