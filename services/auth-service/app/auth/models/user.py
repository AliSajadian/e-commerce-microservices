import uuid
import asyncio
import logging
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import relationship
from sqlalchemy import event

from ...core.database import Base  
from .associations import user_roles
from ...events.user_events import UserEventPublisher

class User(Base):
    __tablename__ = 'auth_users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    
    avatar = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    preferred_language = Column(String, nullable=True)
    timezone = Column(String, nullable=True)
    
    roles = relationship("Role", secondary=user_roles, lazy="selectin", back_populates="users")#cascade="all, delete-orphan",

    def __repr__(self):
        return f"<User(username='{self.username}', first_name='{self.first_name}', last_name='{self.last_name}')>"

# Global publisher instance
user_event_publisher = UserEventPublisher()

@event.listens_for(User, 'after_insert')
def user_created(mapper, connection, target):
    """Trigger after user creation"""
    logging.info("-------- start publish_user_event --------")
    asyncio.create_task(
        user_event_publisher.publish_user_event("user.created", {
            "id": target.id,
            "email": target.email,
            "first_name": target.first_name,
            "last_name": target.last_name,
            "avatar": getattr(target, 'avatar', None),
            "is_active": getattr(target, 'is_active', True),
            "preferred_language": getattr(target, 'preferred_language', None),
            "timezone": getattr(target, 'timezone', None),
        })
    )
    logging.info("-------- end publish_user_event --------")


@event.listens_for(User, 'after_update')
def user_updated(mapper, connection, target):
    """Trigger after user update"""
    asyncio.create_task(
        user_event_publisher.publish_user_event("user.updated", {
            "id": target.id,
            # "username": target.username,
            "first_name": target.first_name,
            "last_name": target.last_name,
            "email": target.email,
            "avatar": getattr(target, 'avatar', None),
            "is_active": getattr(target, 'is_active', True),
            "preferred_language": getattr(target, 'preferred_language', None),
            "timezone": getattr(target, 'timezone', None),
        })
    )

@event.listens_for(User, 'after_delete')
def user_deleted(mapper, connection, target):
    """Trigger after user deletion"""
    asyncio.create_task(
        user_event_publisher.publish_user_event("user.deleted", {
            "id": target.id,
        })
    )

    
