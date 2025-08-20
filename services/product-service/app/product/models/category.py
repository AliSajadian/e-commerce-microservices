from __future__ import annotations
import uuid
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from typing import List

from app.core.database import Base, uuid_pk
from app.common.mixins import Timestamp
from .associations import product_category_association

class Category(Base, Timestamp):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True) # A URL-friendly name
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    # This is the key change for the hierarchical structure
    parent_id: Mapped[uuid_pk] = mapped_column(ForeignKey('categories.id'), nullable=True, index=True)

    # Relationships
    # Self-referencing relationship for hierarchy
    parent = relationship("Category", remote_side=[id], back_populates="children", uselist=False)
    children = relationship("Category", back_populates="parent", cascade="all, delete-orphan")

    # Many-to-many relationship with Product
    products: Mapped[List["Product"]] = relationship( # type: ignore
        secondary=product_category_association,
        back_populates="categories"
    )

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"