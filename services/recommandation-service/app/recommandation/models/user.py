import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from ...core.database import Base  
from .associations import user_roles

class User(Base):
    __tablename__ = 'auth_users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    # role = Column(Enum(Role))
    def __repr__(self):
        return f"<User(username='{self.username}', first_name='{self.first_name}', last_name='{self.last_name}')>"
    
    roles = relationship("Role", secondary=user_roles, lazy="selectin", back_populates="users")#cascade="all, delete-orphan",
