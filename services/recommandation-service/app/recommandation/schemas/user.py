import uuid
from typing import Annotated, List, Optional
from pydantic import BaseModel, ConfigDict, Field, StringConstraints  #, EmailStr

from .role import RoleModel


# ---------------------
# User Schemas
# ---------------------

class UserBase(BaseModel):
    username: str
    first_name: str
    last_name: str

PasswordStr = Annotated[str, StringConstraints(min_length=8)]
class UserCreateModel(UserBase):
    password: PasswordStr
    role_ids: Optional[List[uuid.UUID]] = Field(default_factory=list)

class UserResponse(UserBase):
    id: uuid.UUID

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    new_password_confirm: str

class UserModel(UserBase):
    id: uuid.UUID
    roles: List[RoleModel] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class UserLoginModel(BaseModel):
    username: str
    password: str

    model_config = ConfigDict(from_attributes=True)