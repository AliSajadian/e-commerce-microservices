from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime, timedelta

from app.recommendation.models.recommendation import (
    UserBehavior, ProductSimilarity, UserRecommendation, 
    ProductFeature, RecommendationModel, RecommendationType, RecommendationStatus
)
from app.recommendation.schemas.recommendation import (
    UserBehaviorCreateSchema, RecommendationRequestSchema, 
    RecommendationResponseSchema, ProductSimilaritySchema
)

class RecommendationCRUD:
    """Recommendation CRUD operations"""
    
    async def track_user_behavior(
        self, 
        db: AsyncSession, 
        behavior_data: UserBehaviorCreateSchema
    ) -> UserBehavior:
        """Track user behavior for recommendation algorithms"""
        behavior = UserBehavior(
            user_id=behavior_data.user_id,
            product_id=behavior_data.product_id,
            behavior_type=behavior_data.behavior_type,
            behavior_value=behavior_data.behavior_value,
            session_id=behavior_data.session_id,
            metadata=behavior_data.metadata
        )
        
        db.add(behavior)
        await db.commit()
        await db.refresh(behavior)
        return behavior
    
    async def get_user_behaviors(
        self, 
        db: AsyncSession, 
        user_id: uuid.UUID,
        days: int = 30,
        behavior_types: Optional[List[str]] = None
    ) -> List[UserBehavior]:
        """Get user behaviors for recommendation generation"""
        query = select(UserBehavior).filter(
            and_(
                UserBehavior.user_id == user_id,
                UserBehavior.behavior_at >= datetime.utcnow() - timedelta(days=days)
            )
        )
        
        if behavior_types:
            query = query.filter(UserBehavior.behavior_type.in_(behavior_types))
        
        query = query.order_by(desc(UserBehavior.behavior_at))
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_product_behaviors(
        self, 
        db: AsyncSession, 
        product_id: uuid.UUID,
        days: int = 30
    ) -> List[UserBehavior]:
        """Get behaviors for a specific product"""
        result = await db.execute(
            select(UserBehavior).filter(
                and_(
                    UserBehavior.product_id == product_id,
                    UserBehavior.behavior_at >= datetime.utcnow() - timedelta(days=days)
                )
            ).order_by(desc(UserBehavior.behavior_at))
        )
        return result.scalars().all()
    
    async def get_all_behaviors(
        self, 
        db: AsyncSession, 
        days: int = 30,
        limit: int = 1000
    ) -> List[UserBehavior]:
        """Get all behaviors for model training"""
        result = await db.execute(
            select(UserBehavior).filter(
                UserBehavior.behavior_at >= datetime.utcnow() - timedelta(days=days)
            ).order_by(desc(UserBehavior.behavior_at)).limit(limit)
        )
        return result.scalars().all()
    
    async def store_recommendations(
        self, 
        db: AsyncSession, 
        user_id: uuid.UUID,
        recommendations: List[Dict[str, Any]],
        recommendation_type: RecommendationType,
        algorithm_version: str = "1.0"
    ) -> List[UserRecommendation]:
        """Store generated recommendations"""
        # Clear existing recommendations for this user and type
        await db.execute(
            select(UserRecommendation).filter(
                and_(
                    UserRecommendation.user_id == user_id,
                    UserRecommendation.recommendation_type == recommendation_type
                )
            )
        )
        
        stored_recommendations = []
        for i, rec in enumerate(recommendations):
            recommendation = UserRecommendation(
                user_id=user_id,
                product_id=rec['product_id'],
                recommendation_type=recommendation_type,
                score=rec['score'],
                rank=i + 1,
                algorithm_version=algorithm_version,
                model_metadata=rec.get('metadata', {}),
                expires_at=datetime.utcnow() + timedelta(days=7)  # 7-day expiry
            )
            
            db.add(recommendation)
            stored_recommendations.append(recommendation)
        
        await db.commit()
        return stored_recommendations
    
    async def get_user_recommendations(
        self, 
        db: AsyncSession, 
        user_id: uuid.UUID,
        recommendation_type: Optional[RecommendationType] = None,
        limit: int = 10
    ) -> List[UserRecommendation]:
        """Get stored recommendations for a user"""
        query = select(UserRecommendation).filter(
            and_(
                UserRecommendation.user_id == user_id,
                UserRecommendation.status == RecommendationStatus.ACTIVE,
                UserRecommendation.expires_at > datetime.utcnow()
            )
        )
        
        if recommendation_type:
            query = query.filter(UserRecommendation.recommendation_type == recommendation_type)
        
        query = query.order_by(asc(UserRecommendation.rank)).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def update_recommendation_interaction(
        self, 
        db: AsyncSession, 
        user_id: uuid.UUID,
        product_id: uuid.UUID,
        interaction_type: str
    ) -> bool:
        """Update recommendation interaction (click, purchase)"""
        recommendation = await db.execute(
            select(UserRecommendation).filter(
                and_(
                    UserRecommendation.user_id == user_id,
                    UserRecommendation.product_id == product_id
                )
            )
        )
        recommendation = recommendation.scalar_one_or_none()
        
        if not recommendation:
            return False
        
        if interaction_type == "click":
            recommendation.is_clicked = True
            recommendation.clicked_at = datetime.utcnow()
        elif interaction_type == "purchase":
            recommendation.is_purchased = True
            recommendation.purchased_at = datetime.utcnow()
        
        await db.commit()
        return True
    
    async def store_product_similarities(
        self, 
        db: AsyncSession, 
        similarities: List[Dict[str, Any]]
    ) -> List[ProductSimilarity]:
        """Store product similarity scores"""
        stored_similarities = []
        
        for sim in similarities:
            similarity = ProductSimilarity(
                product_id=sim['product_id'],
                similar_product_id=sim['similar_product_id'],
                similarity_score=sim['similarity_score'],
                algorithm=sim['algorithm']
            )
            
            db.add(similarity)
            stored_similarities.append(similarity)
        
        await db.commit()
        return stored_similarities
    
    async def get_similar_products(
        self, 
        db: AsyncSession, 
        product_id: uuid.UUID,
        limit: int = 10
    ) -> List[ProductSimilarity]:
        """Get similar products for a given product"""
        result = await db.execute(
            select(ProductSimilarity).filter(
                ProductSimilarity.product_id == product_id
            ).order_by(desc(ProductSimilarity.similarity_score)).limit(limit)
        )
        return result.scalars().all()
    
    async def store_product_features(
        self, 
        db: AsyncSession, 
        product_id: uuid.UUID,
        features: Dict[str, Any],
        algorithm_version: str = "1.0"
    ) -> ProductFeature:
        """Store product features for content-based filtering"""
        # Check if features already exist
        existing = await db.execute(
            select(ProductFeature).filter(ProductFeature.product_id == product_id)
        )
        existing = existing.scalar_one_or_none()
        
        if existing:
            # Update existing features
            existing.category_features = features.get('category_features')
            existing.text_features = features.get('text_features')
            existing.numerical_features = features.get('numerical_features')
            existing.feature_vector = features.get('feature_vector')
            existing.algorithm_version = algorithm_version
            existing.last_updated = datetime.utcnow()
            
            await db.commit()
            await db.refresh(existing)
            return existing
        else:
            # Create new features
            feature = ProductFeature(
                product_id=product_id,
                category_features=features.get('category_features'),
                text_features=features.get('text_features'),
                numerical_features=features.get('numerical_features'),
                feature_vector=features.get('feature_vector'),
                algorithm_version=algorithm_version
            )
            
            db.add(feature)
            await db.commit()
            await db.refresh(feature)
            return feature
    
    async def get_product_features(
        self, 
        db: AsyncSession, 
        product_id: uuid.UUID
    ) -> Optional[ProductFeature]:
        """Get product features"""
        result = await db.execute(
            select(ProductFeature).filter(ProductFeature.product_id == product_id)
        )
        return result.scalar_one_or_none()
    
    async def get_all_product_features(
        self, 
        db: AsyncSession, 
        limit: int = 1000
    ) -> List[ProductFeature]:
        """Get all product features for model training"""
        result = await db.execute(
            select(ProductFeature).limit(limit)
        )
        return result.scalars().all()
    
    async def store_model(
        self, 
        db: AsyncSession, 
        model_info: Dict[str, Any]
    ) -> RecommendationModel:
        """Store model metadata"""
        model = RecommendationModel(
            model_name=model_info['model_name'],
            model_type=model_info['model_type'],
            hyperparameters=model_info.get('hyperparameters'),
            training_data_size=model_info.get('training_data_size'),
            training_duration=model_info.get('training_duration'),
            accuracy=model_info.get('accuracy'),
            precision=model_info.get('precision'),
            recall=model_info.get('recall'),
            f1_score=model_info.get('f1_score'),
            version=model_info.get('version', '1.0'),
            model_path=model_info.get('model_path'),
            preprocessor_path=model_info.get('preprocessor_path')
        )
        
        db.add(model)
        await db.commit()
        await db.refresh(model)
        return model
    
    async def get_active_model(
        self, 
        db: AsyncSession, 
        model_type: str
    ) -> Optional[RecommendationModel]:
        """Get the active model for a given type"""
        result = await db.execute(
            select(RecommendationModel).filter(
                and_(
                    RecommendationModel.model_type == model_type,
                    RecommendationModel.is_active == True
                )
            ).order_by(desc(RecommendationModel.created_at))
        )
        return result.scalar_one_or_none()
    
    async def get_recommendation_stats(
        self, 
        db: AsyncSession, 
        days: int = 30
    ) -> Dict[str, Any]:
        """Get recommendation statistics"""
        # Total recommendations generated
        total_recs = await db.execute(
            select(func.count(UserRecommendation.id)).filter(
                UserRecommendation.created_at >= datetime.utcnow() - timedelta(days=days)
            )
        )
        total_recommendations = total_recs.scalar() or 0
        
        # Click-through rate
        clicked_recs = await db.execute(
            select(func.count(UserRecommendation.id)).filter(
                and_(
                    UserRecommendation.created_at >= datetime.utcnow() - timedelta(days=days),
                    UserRecommendation.is_clicked == True
                )
            )
        )
        clicked_count = clicked_recs.scalar() or 0
        ctr = (clicked_count / total_recommendations * 100) if total_recommendations > 0 else 0
        
        # Purchase conversion rate
        purchased_recs = await db.execute(
            select(func.count(UserRecommendation.id)).filter(
                and_(
                    UserRecommendation.created_at >= datetime.utcnow() - timedelta(days=days),
                    UserRecommendation.is_purchased == True
                )
            )
        )
        purchased_count = purchased_recs.scalar() or 0
        conversion_rate = (purchased_count / total_recommendations * 100) if total_recommendations > 0 else 0
        
        return {
            'total_recommendations': total_recommendations,
            'click_through_rate': round(ctr, 2),
            'conversion_rate': round(conversion_rate, 2),
            'period_days': days
        }

