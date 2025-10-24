from __future__ import annotations
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from pydantic import BaseModel, Field
from enum import Enum

from app.core.database import Base
from app.common.mixins import Timestamp

class RecommendationType(str, Enum):
    COLLABORATIVE = "collaborative"
    CONTENT_BASED = "content_based"
    HYBRID = "hybrid"
    POPULARITY = "popularity"
    TRENDING = "trending"
    SIMILAR_PRODUCTS = "similar_products"
    FREQUENTLY_BOUGHT_TOGETHER = "frequently_bought_together"

class RecommendationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"

class UserBehavior(Base, Timestamp):
    """Track user behavior for recommendation algorithms"""
    __tablename__ = "user_behaviors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Behavior types
    behavior_type: Mapped[str] = mapped_column(String(50), nullable=False)  # view, click, add_to_cart, purchase, like, dislike
    behavior_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # rating, time_spent, etc.
    
    # Context
    session_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Metadata
    metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Timestamps
    behavior_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ProductSimilarity(Base, Timestamp):
    """Store product similarity scores for content-based recommendations"""
    __tablename__ = "product_similarities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    similar_product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    algorithm: Mapped[str] = mapped_column(String(50), nullable=False)  # cosine, jaccard, etc.
    
    # Composite unique constraint
    __table_args__ = (
        {"extend_existing": True}
    )

class UserRecommendation(Base, Timestamp):
    """Store generated recommendations for users"""
    __tablename__ = "user_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Recommendation details
    recommendation_type: Mapped[RecommendationType] = mapped_column(String(50), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Status and metadata
    status: Mapped[RecommendationStatus] = mapped_column(String(20), default=RecommendationStatus.ACTIVE)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Algorithm metadata
    algorithm_version: Mapped[str] = mapped_column(String(50), nullable=True)
    model_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # User interaction tracking
    is_clicked: Mapped[bool] = mapped_column(Boolean, default=False)
    is_purchased: Mapped[bool] = mapped_column(Boolean, default=False)
    clicked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    purchased_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

class ProductFeature(Base, Timestamp):
    """Store product features for content-based filtering"""
    __tablename__ = "product_features"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Feature categories
    category_features: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    text_features: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    numerical_features: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Feature vector (for ML models)
    feature_vector: Mapped[Optional[List[float]]] = mapped_column(JSON, nullable=True)
    
    # Algorithm metadata
    algorithm_version: Mapped[str] = mapped_column(String(50), nullable=True)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class RecommendationModel(Base, Timestamp):
    """Store ML model metadata and performance metrics"""
    __tablename__ = "recommendation_models"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    model_type: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Model configuration
    hyperparameters: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    training_data_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    training_duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Performance metrics
    accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    precision: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recall: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    f1_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Model status
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    
    # File paths
    model_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    preprocessor_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

# Pydantic schemas
class UserBehaviorCreateSchema(BaseModel):
    user_id: uuid.UUID
    product_id: uuid.UUID
    behavior_type: str = Field(..., regex="^(view|click|add_to_cart|purchase|like|dislike|rating)$")
    behavior_value: Optional[float] = None
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class RecommendationRequestSchema(BaseModel):
    user_id: uuid.UUID
    recommendation_type: RecommendationType = RecommendationType.HYBRID
    limit: int = Field(10, ge=1, le=50)
    exclude_purchased: bool = True
    include_categories: Optional[List[str]] = None
    exclude_categories: Optional[List[str]] = None

class RecommendationResponseSchema(BaseModel):
    user_id: uuid.UUID
    recommendations: List[Dict[str, Any]]
    algorithm_used: str
    generated_at: datetime
    expires_at: Optional[datetime] = None

class ProductSimilaritySchema(BaseModel):
    product_id: uuid.UUID
    similar_products: List[Dict[str, Any]]
    algorithm: str
    generated_at: datetime

class ModelTrainingRequestSchema(BaseModel):
    model_type: str
    hyperparameters: Optional[Dict[str, Any]] = None
    training_data_period_days: int = Field(30, ge=1, le=365)
    test_split: float = Field(0.2, ge=0.1, le=0.5)

class ModelPerformanceSchema(BaseModel):
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    training_data_size: int
    last_trained: datetime

