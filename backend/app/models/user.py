from typing import Optional
from bson import ObjectId

class User:
    def __init__(self, username: str, email: str, hashed_password: str, id: Optional[ObjectId] = None):
        self.id = id
        self.username = username
        self.email = email
        self.hashed_password = hashed_password
