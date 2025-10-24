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
    email: str
    avatar: Optional[str] = None
    is_active: Optional[bool] = None
    preferred_language: Optional[str] = None
    timezone: Optional[str] = None

PasswordStr = Annotated[str, StringConstraints(min_length=8)]
class UserCreateModel(UserBase):
    password: PasswordStr
    role_ids: Optional[List[uuid.UUID]] = Field(default_factory=list)

class UserUpdateModel(BaseModel):
    """Schema for updating user information (includes roles, excludes password)"""
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None
    is_active: Optional[bool] = None
    preferred_language: Optional[str] = None
    timezone: Optional[str] = None
    role_ids: Optional[List[uuid.UUID]] = Field(default_factory=list)

class UserRoleUpdateModel(BaseModel):
    """Schema for updating user roles (admin endpoint)"""
    role_ids: List[uuid.UUID]

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