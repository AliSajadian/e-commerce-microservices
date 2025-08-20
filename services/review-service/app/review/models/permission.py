import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from ...core.database import Base  
from .associations import role_permissions

class Permission(Base):
    __tablename__ = 'auth_permissions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True)
    description = Column(String)

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

