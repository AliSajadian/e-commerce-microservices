from __future__ import annotations
import uuid # Enable postponed evaluation of type annotations
from sqlalchemy import Boolean, ForeignKey, String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.common.mixins import Timestamp
from .tag import product_tag_association

class Product(Base, Timestamp):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(1000), nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    sku: Mapped[String] = mapped_column(String, nullable=False, unique=True, index=True) # Stock Keeping Unit
    is_active: Mapped[Boolean] = mapped_column(Boolean, default=True) 

    # Category relationship
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("product_categories.id"), nullable=False, index=True)

    # One-to-one relationship with Inventory
    inventory = relationship("Inventory", back_populates="product")
    # inventory: Mapped[Optional["Inventory"]] = relationship(
    #     back_populates="product",
    #     cascade="all, delete-orphan", # Deletes inventory when product is deleted
    # )
        
    # One-to-Many with ProductImage
    images = relationship("ProductImage", back_populates="product")
    # images: Mapped[List["ProductImage"]] = relationship(
    #     back_populates="product",
    #     cascade="all, delete-orphan"
    # )    
        
    # Many-to-many relationship with Category
    category = relationship("Category", back_populates="products")
    # categories: Mapped[List["Category"]] = relationship(
    #     back_populates="products"
    # )

    # Many-to-many relationship with Tag
    tags = relationship("Tag", secondary=product_tag_association, lazy="selectin", back_populates="products")
    # tags: Mapped[List["Tag"]] = relationship(
    #     secondary=product_tag_association,
    #     back_populates="products"
    # )

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', price={self.price})>"