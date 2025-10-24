from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, Text, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from pydantic import BaseModel, Field
from enum import Enum

from app.core.database import Base
from app.common.mixins import Timestamp

class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    HIDDEN = "hidden"

class Review(Base, Timestamp):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Review content
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5 stars
    
    # Review metadata
    status: Mapped[ReviewStatus] = mapped_column(String(20), default=ReviewStatus.PENDING)
    is_verified_purchase: Mapped[bool] = mapped_column(Boolean, default=False)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Helpfulness tracking
    helpful_votes: Mapped[int] = mapped_column(Integer, default=0)
    total_votes: Mapped[int] = mapped_column(Integer, default=0)
    
    # Moderation
    moderator_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    moderated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    moderated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Product relationship
    product = relationship("Product", back_populates="reviews")
    
    # Review images
    images = relationship("ReviewImage", back_populates="review", cascade="all, delete-orphan")
    
    # Review responses (from business)
    responses = relationship("ReviewResponse", back_populates="review", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Review(id={self.id}, product_id={self.product_id}, rating={self.rating})>"

class ReviewImage(Base, Timestamp):
    __tablename__ = "review_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reviews.id"), nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Image metadata
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Relationships
    review = relationship("Review", back_populates="images")

class ReviewResponse(Base, Timestamp):
    __tablename__ = "review_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reviews.id"), nullable=False)
    responder_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)  # Business user ID
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    review = relationship("Review", back_populates="responses")

class ReviewVote(Base, Timestamp):
    __tablename__ = "review_votes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reviews.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    is_helpful: Mapped[bool] = mapped_column(Boolean, nullable=False)  # True for helpful, False for not helpful
    
    # Composite unique constraint
    __table_args__ = (
        {"extend_existing": True}
    )

# Pydantic schemas
class ReviewCreateSchema(BaseModel):
    product_id: uuid.UUID
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=10, max_length=2000)
    rating: int = Field(..., ge=1, le=5)
    is_anonymous: bool = False
    images: List[str] = Field(default_factory=list, max_items=5)

class ReviewUpdateSchema(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=10, max_length=2000)
    rating: Optional[int] = Field(None, ge=1, le=5)

class ReviewResponseSchema(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    content: str
    rating: int
    status: ReviewStatus
    is_verified_purchase: bool
    is_anonymous: bool
    helpful_votes: int
    total_votes: int
    created_at: datetime
    updated_at: datetime
    images: List[str] = []
    responses: List[dict] = []

class ReviewVoteSchema(BaseModel):
    review_id: uuid.UUID
    is_helpful: bool

class ReviewStatsSchema(BaseModel):
    total_reviews: int
    average_rating: float
    rating_distribution: dict  # {1: count, 2: count, ...}
    verified_purchase_percentage: float

