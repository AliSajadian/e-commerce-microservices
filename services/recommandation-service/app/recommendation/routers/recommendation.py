from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.recommendation.crud.recommendation import RecommendationCRUD
from app.recommendation.services.ml_service import MLRecommendationService
from app.recommendation.schemas.recommendation import (
    UserBehaviorCreateSchema,
    RecommendationRequestSchema,
    RecommendationResponseSchema,
    ProductSimilaritySchema,
    ModelTrainingRequestSchema,
    ModelPerformanceSchema,
    RecommendationStatsSchema,
    ProductFeatureSchema,
    UserBehaviorSchema,
    UserRecommendationSchema,
    ProductSimilarityResponseSchema,
    ModelInfoSchema,
    RecommendationAnalyticsSchema,
    UserPreferenceSchema,
    RecommendationFeedbackSchema
)
from app.api.dependencies.auth_utils import get_current_user

router = APIRouter()

@router.post("/behavior", response_model=UserBehaviorSchema, status_code=status.HTTP_201_CREATED)
async def track_behavior(
    behavior_data: UserBehaviorCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Track user behavior for recommendation algorithms"""
    recommendation_crud = RecommendationCRUD()
    behavior = await recommendation_crud.track_user_behavior(db, behavior_data)
    return behavior

@router.post("/generate", response_model=RecommendationResponseSchema)
async def generate_recommendations(
    request: RecommendationRequestSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate recommendations for a user"""
    recommendation_crud = RecommendationCRUD()
    ml_service = MLRecommendationService()
    
    # Get user behaviors
    user_behaviors = await recommendation_crud.get_user_behaviors(
        db, request.user_id, days=30
    )
    
    # Convert to dict format for ML service
    behaviors_data = [
        {
            'user_id': str(behavior.user_id),
            'product_id': str(behavior.product_id),
            'behavior_type': behavior.behavior_type,
            'behavior_value': behavior.behavior_value,
            'created_at': behavior.behavior_at
        }
        for behavior in user_behaviors
    ]
    
    # Generate recommendations based on type
    if request.recommendation_type.value == "collaborative":
        recommendations = await ml_service.generate_collaborative_recommendations(
            behaviors_data, str(request.user_id), request.limit
        )
    elif request.recommendation_type.value == "content_based":
        # Get product features (simplified)
        product_features = []  # Would fetch from product service
        user_preferences = {}  # Would fetch user preferences
        recommendations = await ml_service.generate_content_based_recommendations(
            product_features, user_preferences, request.limit
        )
    elif request.recommendation_type.value == "hybrid":
        collaborative_recs = await ml_service.generate_collaborative_recommendations(
            behaviors_data, str(request.user_id), request.limit
        )
        content_recs = await ml_service.generate_content_based_recommendations(
            [], {}, request.limit
        )
        recommendations = await ml_service.generate_hybrid_recommendations(
            collaborative_recs, content_recs
        )
    elif request.recommendation_type.value == "popularity":
        # Get product stats (simplified)
        product_stats = []  # Would fetch from product service
        recommendations = await ml_service.generate_popularity_recommendations(
            product_stats, request.limit
        )
    elif request.recommendation_type.value == "trending":
        recent_behaviors = behaviors_data[-100:]  # Last 100 behaviors
        recommendations = await ml_service.generate_trending_recommendations(
            recent_behaviors, request.limit
        )
    else:
        # Default to hybrid
        collaborative_recs = await ml_service.generate_collaborative_recommendations(
            behaviors_data, str(request.user_id), request.limit
        )
        content_recs = await ml_service.generate_content_based_recommendations(
            [], {}, request.limit
        )
        recommendations = await ml_service.generate_hybrid_recommendations(
            collaborative_recs, content_recs
        )
    
    # Store recommendations
    await recommendation_crud.store_recommendations(
        db, request.user_id, recommendations, request.recommendation_type
    )
    
    return RecommendationResponseSchema(
        user_id=request.user_id,
        recommendations=recommendations,
        algorithm_used=request.recommendation_type.value,
        generated_at=datetime.utcnow()
    )

@router.get("/user/{user_id}", response_model=List[UserRecommendationSchema])
async def get_user_recommendations(
    user_id: uuid.UUID,
    recommendation_type: Optional[str] = Query(None, description="Filter by recommendation type"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get stored recommendations for a user"""
    recommendation_crud = RecommendationCRUD()
    
    rec_type = None
    if recommendation_type:
        try:
            rec_type = RecommendationType(recommendation_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid recommendation type"
            )
    
    recommendations = await recommendation_crud.get_user_recommendations(
        db, user_id, rec_type, limit
    )
    return recommendations

@router.post("/interaction", status_code=status.HTTP_200_OK)
async def track_recommendation_interaction(
    user_id: uuid.UUID,
    product_id: uuid.UUID,
    interaction_type: str = Query(..., regex="^(click|purchase)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Track user interaction with recommendations"""
    recommendation_crud = RecommendationCRUD()
    success = await recommendation_crud.update_recommendation_interaction(
        db, user_id, product_id, interaction_type
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    return {"message": "Interaction tracked successfully"}

@router.get("/similar/{product_id}", response_model=List[ProductSimilarityResponseSchema])
async def get_similar_products(
    product_id: uuid.UUID,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get similar products for a given product"""
    recommendation_crud = RecommendationCRUD()
    similarities = await recommendation_crud.get_similar_products(
        db, product_id, limit
    )
    return similarities

@router.post("/similarity/calculate", status_code=status.HTTP_200_OK)
async def calculate_product_similarity(
    product_ids: List[uuid.UUID],
    algorithm: str = Query("cosine", regex="^(cosine|jaccard|euclidean)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Calculate similarity between products"""
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    recommendation_crud = RecommendationCRUD()
    ml_service = MLRecommendationService()
    
    # Get product features
    product_features = []
    for product_id in product_ids:
        features = await recommendation_crud.get_product_features(db, product_id)
        if features:
            product_features.append({
                'product_id': str(product_id),
                'category_features': features.category_features,
                'text_features': features.text_features,
                'numerical_features': features.numerical_features
            })
    
    # Calculate similarities
    similarities = await ml_service.calculate_product_similarity(
        product_features, algorithm
    )
    
    # Store similarities
    await recommendation_crud.store_product_similarities(db, similarities)
    
    return {"message": f"Calculated {len(similarities)} similarity pairs"}

@router.post("/model/train", response_model=ModelPerformanceSchema)
async def train_model(
    training_request: ModelTrainingRequestSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Train a recommendation model"""
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    recommendation_crud = RecommendationCRUD()
    ml_service = MLRecommendationService()
    
    # Get training data
    training_data = await recommendation_crud.get_all_behaviors(
        db, days=training_request.training_data_period_days
    )
    
    # Convert to dict format
    training_data_dict = [
        {
            'user_id': str(behavior.user_id),
            'product_id': str(behavior.product_id),
            'behavior_type': behavior.behavior_type,
            'behavior_value': behavior.behavior_value,
            'created_at': behavior.behavior_at
        }
        for behavior in training_data
    ]
    
    # Train model
    model_info = await ml_service.train_model(
        training_data_dict, 
        training_request.model_type,
        training_request.hyperparameters
    )
    
    # Store model info
    model = await recommendation_crud.store_model(db, model_info)
    
    # Evaluate model
    evaluation_metrics = await ml_service.evaluate_model(
        training_data_dict[-100:],  # Use last 100 as test data
        model_info['model_path']
    )
    
    return ModelPerformanceSchema(
        model_name=model.model_name,
        accuracy=evaluation_metrics.get('accuracy', 0.0),
        precision=evaluation_metrics.get('precision', 0.0),
        recall=evaluation_metrics.get('recall', 0.0),
        f1_score=evaluation_metrics.get('f1_score', 0.0),
        training_data_size=len(training_data_dict),
        last_trained=datetime.utcnow()
    )

@router.get("/stats", response_model=RecommendationStatsSchema)
async def get_recommendation_stats(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get recommendation statistics"""
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    recommendation_crud = RecommendationCRUD()
    stats = await recommendation_crud.get_recommendation_stats(db, days)
    return stats

@router.get("/models", response_model=List[ModelInfoSchema])
async def get_models(
    model_type: Optional[str] = Query(None, description="Filter by model type"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all recommendation models"""
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # This would be implemented in the CRUD layer
    return []

@router.post("/feedback", status_code=status.HTTP_200_OK)
async def submit_recommendation_feedback(
    feedback: RecommendationFeedbackSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Submit feedback on recommendations"""
    # Track feedback as user behavior
    behavior_data = UserBehaviorCreateSchema(
        user_id=feedback.user_id,
        product_id=feedback.product_id,
        behavior_type=feedback.feedback_type,
        behavior_value=1.0 if feedback.feedback_type in ['like'] else -1.0,
        metadata=feedback.metadata
    )
    
    recommendation_crud = RecommendationCRUD()
    await recommendation_crud.track_user_behavior(db, behavior_data)
    
    return {"message": "Feedback recorded successfully"}

