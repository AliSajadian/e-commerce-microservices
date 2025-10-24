from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
import uuid
from enum import Enum

class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    HIDDEN = "hidden"

class ReviewCreateSchema(BaseModel):
    product_id: uuid.UUID
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=10, max_length=2000)
    rating: int = Field(..., ge=1, le=5)
    is_anonymous: bool = False
    images: List[str] = Field(default_factory=list, max_items=5)
    
    @validator('images')
    def validate_images(cls, v):
        if len(v) > 5:
            raise ValueError('Maximum 5 images allowed')
        return v

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
    
    class Config:
        from_attributes = True

class ReviewVoteSchema(BaseModel):
    review_id: uuid.UUID
    is_helpful: bool

class ReviewStatsSchema(BaseModel):
    total_reviews: int
    average_rating: float
    rating_distribution: dict
    verified_purchase_percentage: float

class ReviewModerationSchema(BaseModel):
    status: ReviewStatus
    notes: Optional[str] = Field(None, max_length=500)

class ReviewResponseCreateSchema(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

class ReviewListResponseSchema(BaseModel):
    reviews: List[ReviewResponseSchema]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool

class ReviewSearchSchema(BaseModel):
    product_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[ReviewStatus] = None
    is_verified_purchase: Optional[bool] = None
    sort_by: str = Field("created_at", regex="^(created_at|rating|helpful)$")
    sort_order: str = Field("desc", regex="^(asc|desc)$")
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)

