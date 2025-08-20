from __future__ import annotations
import uuid
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from typing import List

from app.core.database import Base
from app.common.mixins import Timestamp
from .associations import product_tag_association


class Tag(Base, Timestamp):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)

    # Many-to-many relationship with Product
    products: Mapped[List["Product"]] = relationship( # type: ignore
        secondary=product_tag_association,
        back_populates="tags"
    )

    def __repr__(self):
        return f"<Tag(id={self.id}, name='{self.name}')>"
    
    
    