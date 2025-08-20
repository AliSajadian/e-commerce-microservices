import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from .permission import PermissionModel


# ---------------------
# Role Schemas
# ---------------------

class RoleBase(BaseModel):
    name: str

class RoleCreateModel(RoleBase):
    permission_ids: Optional[List[uuid.UUID]] = Field(default_factory=list)

class RoleModel(RoleBase):
    id: uuid.UUID
    permissions: List[PermissionModel] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)