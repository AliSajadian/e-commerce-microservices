from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from enum import Enum

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

class RecommendationStatsSchema(BaseModel):
    total_recommendations: int
    click_through_rate: float
    conversion_rate: float
    period_days: int

class ProductFeatureSchema(BaseModel):
    product_id: uuid.UUID
    category_features: Optional[Dict[str, Any]] = None
    text_features: Optional[Dict[str, Any]] = None
    numerical_features: Optional[Dict[str, Any]] = None
    feature_vector: Optional[List[float]] = None
    algorithm_version: str = "1.0"

class UserBehaviorSchema(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    product_id: uuid.UUID
    behavior_type: str
    behavior_value: Optional[float]
    session_id: Optional[str]
    metadata: Optional[Dict[str, Any]]
    behavior_at: datetime
    
    class Config:
        from_attributes = True

class UserRecommendationSchema(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    product_id: uuid.UUID
    recommendation_type: RecommendationType
    score: float
    rank: int
    status: RecommendationStatus
    is_clicked: bool
    is_purchased: bool
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ProductSimilarityResponseSchema(BaseModel):
    product_id: uuid.UUID
    similar_product_id: uuid.UUID
    similarity_score: float
    algorithm: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ModelInfoSchema(BaseModel):
    id: uuid.UUID
    model_name: str
    model_type: str
    version: str
    is_active: bool
    accuracy: Optional[float]
    precision: Optional[float]
    recall: Optional[float]
    f1_score: Optional[float]
    training_data_size: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

class RecommendationAnalyticsSchema(BaseModel):
    recommendation_type: RecommendationType
    total_generated: int
    click_through_rate: float
    conversion_rate: float
    average_score: float
    top_performing_products: List[Dict[str, Any]]

class UserPreferenceSchema(BaseModel):
    user_id: uuid.UUID
    preferred_categories: List[str] = []
    preferred_brands: List[str] = []
    price_range: Optional[Dict[str, float]] = None
    search_terms: List[str] = []
    behavior_patterns: Optional[Dict[str, Any]] = None

class RecommendationFeedbackSchema(BaseModel):
    user_id: uuid.UUID
    product_id: uuid.UUID
    feedback_type: str = Field(..., regex="^(like|dislike|not_interested|already_own)$")
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

