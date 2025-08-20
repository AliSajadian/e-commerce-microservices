from typing import List, Optional
import uuid
from pydantic import BaseModel


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