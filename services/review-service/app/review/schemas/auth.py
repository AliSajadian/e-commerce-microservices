import uuid
from pydantic import BaseModel  #, EmailStr
from typing import List, Optional


# ---------------------
# Auth-Related Schemas
# ---------------------

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"

class TokenData(BaseModel):
    sub: str  # username or user ID
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    
    def get_uuid(self) -> uuid.UUID | None:
        if self.user_id:
            return self.user_id
        return None
    
class LoginResponse(BaseModel):
    user_id: uuid.UUID
    full_name: str
    access_token: str
    # refresh_token: str
    permissions: Optional[List[str]] = None  # Flattened list
    
class RegisterUserRequest(BaseModel):
    username: str
    first_name: str
    last_name: str
    password: str

