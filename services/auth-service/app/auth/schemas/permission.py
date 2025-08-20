from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict  #, EmailStr


# ---------------------
# Permission Schemas
# ---------------------

class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None  # unique permission code (e.g., 'view_users')

class PermissionCreateModel(PermissionBase):
    pass

class PermissionModel(PermissionBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)