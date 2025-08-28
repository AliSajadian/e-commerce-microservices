from __future__ import annotations
import uuid # Enable postponed evaluation of type annotations

from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base # Assuming you have a Base declarative_base
from app.common.mixins import Timestamp

class ProductImage(Base, Timestamp):
    __tablename__ = 'product_images'   

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    url: Mapped[str] = mapped_column(String(255), nullable=False)
    alt_text: Mapped[str] = mapped_column(String(100), nullable=True)
    is_main: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # This is the foreign key for the one-to-many relationship
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('products.id'), nullable=False, index=True)
    
    # This is the relationship back to the Product model
    # product: Mapped["Product"] = relationship(back_populates="images")
    product = relationship("Product", back_populates="images")

    def __repr__(self):
        return f"<ProductImage(id='{self.id}', url='{self.url}')>"
