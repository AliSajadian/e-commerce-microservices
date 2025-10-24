from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime, timedelta

from app.review.models.review import Review, ReviewImage, ReviewResponse, ReviewVote, ReviewStatus
from app.review.schemas.review import ReviewCreateSchema, ReviewUpdateSchema, ReviewResponseSchema, ReviewStatsSchema

class ReviewCRUD:
    """Review CRUD operations"""
    
    async def create_review(self, db: AsyncSession, review_data: ReviewCreateSchema, user_id: uuid.UUID) -> Review:
        """Create a new review"""
        review = Review(
            product_id=review_data.product_id,
            user_id=user_id,
            title=review_data.title,
            content=review_data.content,
            rating=review_data.rating,
            is_anonymous=review_data.is_anonymous,
            status=ReviewStatus.PENDING
        )
        
        db.add(review)
        await db.commit()
        await db.refresh(review)
        
        # Add images if provided
        if review_data.images:
            for i, image_url in enumerate(review_data.images):
                image = ReviewImage(
                    review_id=review.id,
                    image_url=image_url,
                    is_primary=(i == 0)
                )
                db.add(image)
        
        await db.commit()
        return review
    
    async def get_review_by_id(self, db: AsyncSession, review_id: uuid.UUID) -> Optional[Review]:
        """Get a review by ID with all relationships"""
        result = await db.execute(
            select(Review)
            .options(
                selectinload(Review.images),
                selectinload(Review.responses)
            )
            .filter(Review.id == review_id)
        )
        return result.scalar_one_or_none()
    
    async def get_product_reviews(
        self, 
        db: AsyncSession, 
        product_id: uuid.UUID,
        status: Optional[ReviewStatus] = ReviewStatus.APPROVED,
        limit: int = 20,
        offset: int = 0,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> List[Review]:
        """Get reviews for a product with pagination and sorting"""
        query = select(Review).options(
            selectinload(Review.images),
            selectinload(Review.responses)
        ).filter(Review.product_id == product_id)
        
        if status:
            query = query.filter(Review.status == status)
        
        # Apply sorting
        if sort_by == "rating":
            order_func = desc(Review.rating) if sort_order == "desc" else asc(Review.rating)
        elif sort_by == "helpful":
            order_func = desc(Review.helpful_votes) if sort_order == "desc" else asc(Review.helpful_votes)
        else:  # created_at
            order_func = desc(Review.created_at) if sort_order == "desc" else asc(Review.created_at)
        
        query = query.order_by(order_func).offset(offset).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_user_reviews(
        self, 
        db: AsyncSession, 
        user_id: uuid.UUID,
        limit: int = 20,
        offset: int = 0
    ) -> List[Review]:
        """Get reviews by a specific user"""
        result = await db.execute(
            select(Review)
            .options(
                selectinload(Review.images),
                selectinload(Review.responses)
            )
            .filter(Review.user_id == user_id)
            .order_by(desc(Review.created_at))
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def update_review(
        self, 
        db: AsyncSession, 
        review_id: uuid.UUID, 
        user_id: uuid.UUID,
        update_data: ReviewUpdateSchema
    ) -> Optional[Review]:
        """Update a review (only by the original author)"""
        review = await db.execute(
            select(Review).filter(
                and_(Review.id == review_id, Review.user_id == user_id)
            )
        )
        review = review.scalar_one_or_none()
        
        if not review:
            return None
        
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(review, field, value)
        
        await db.commit()
        await db.refresh(review)
        return review
    
    async def delete_review(self, db: AsyncSession, review_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a review (only by the original author)"""
        review = await db.execute(
            select(Review).filter(
                and_(Review.id == review_id, Review.user_id == user_id)
            )
        )
        review = review.scalar_one_or_none()
        
        if not review:
            return False
        
        await db.delete(review)
        await db.commit()
        return True
    
    async def vote_on_review(
        self, 
        db: AsyncSession, 
        review_id: uuid.UUID, 
        user_id: uuid.UUID, 
        is_helpful: bool
    ) -> bool:
        """Vote on a review (helpful/not helpful)"""
        # Check if user already voted
        existing_vote = await db.execute(
            select(ReviewVote).filter(
                and_(ReviewVote.review_id == review_id, ReviewVote.user_id == user_id)
            )
        )
        existing_vote = existing_vote.scalar_one_or_none()
        
        if existing_vote:
            # Update existing vote
            existing_vote.is_helpful = is_helpful
        else:
            # Create new vote
            vote = ReviewVote(
                review_id=review_id,
                user_id=user_id,
                is_helpful=is_helpful
            )
            db.add(vote)
        
        # Update review vote counts
        review = await db.execute(select(Review).filter(Review.id == review_id))
        review = review.scalar_one_or_none()
        
        if review:
            # Recalculate vote counts
            votes_result = await db.execute(
                select(ReviewVote).filter(ReviewVote.review_id == review_id)
            )
            votes = votes_result.scalars().all()
            
            helpful_count = sum(1 for vote in votes if vote.is_helpful)
            total_count = len(votes)
            
            review.helpful_votes = helpful_count
            review.total_votes = total_count
            
            await db.commit()
            return True
        
        return False
    
    async def get_review_stats(self, db: AsyncSession, product_id: uuid.UUID) -> ReviewStatsSchema:
        """Get review statistics for a product"""
        # Total reviews
        total_result = await db.execute(
            select(func.count(Review.id)).filter(
                and_(Review.product_id == product_id, Review.status == ReviewStatus.APPROVED)
            )
        )
        total_reviews = total_result.scalar() or 0
        
        # Average rating
        avg_result = await db.execute(
            select(func.avg(Review.rating)).filter(
                and_(Review.product_id == product_id, Review.status == ReviewStatus.APPROVED)
            )
        )
        average_rating = float(avg_result.scalar() or 0)
        
        # Rating distribution
        distribution_result = await db.execute(
            select(Review.rating, func.count(Review.id))
            .filter(and_(Review.product_id == product_id, Review.status == ReviewStatus.APPROVED))
            .group_by(Review.rating)
        )
        rating_distribution = {str(rating): count for rating, count in distribution_result.all()}
        
        # Verified purchase percentage
        verified_result = await db.execute(
            select(func.count(Review.id)).filter(
                and_(
                    Review.product_id == product_id, 
                    Review.status == ReviewStatus.APPROVED,
                    Review.is_verified_purchase == True
                )
            )
        )
        verified_count = verified_result.scalar() or 0
        verified_percentage = (verified_count / total_reviews * 100) if total_reviews > 0 else 0
        
        return ReviewStatsSchema(
            total_reviews=total_reviews,
            average_rating=round(average_rating, 2),
            rating_distribution=rating_distribution,
            verified_purchase_percentage=round(verified_percentage, 2)
        )
    
    async def moderate_review(
        self, 
        db: AsyncSession, 
        review_id: uuid.UUID, 
        status: ReviewStatus,
        moderator_id: uuid.UUID,
        notes: Optional[str] = None
    ) -> bool:
        """Moderate a review (approve/reject)"""
        review = await db.execute(select(Review).filter(Review.id == review_id))
        review = review.scalar_one_or_none()
        
        if not review:
            return False
        
        review.status = status
        review.moderated_at = datetime.utcnow()
        review.moderated_by = moderator_id
        review.moderator_notes = notes
        
        await db.commit()
        return True
    
    async def get_pending_reviews(
        self, 
        db: AsyncSession, 
        limit: int = 20, 
        offset: int = 0
    ) -> List[Review]:
        """Get pending reviews for moderation"""
        result = await db.execute(
            select(Review)
            .options(
                selectinload(Review.images),
                selectinload(Review.responses)
            )
            .filter(Review.status == ReviewStatus.PENDING)
            .order_by(asc(Review.created_at))
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def add_review_response(
        self, 
        db: AsyncSession, 
        review_id: uuid.UUID, 
        responder_id: uuid.UUID,
        content: str
    ) -> Optional[ReviewResponse]:
        """Add a business response to a review"""
        response = ReviewResponse(
            review_id=review_id,
            responder_id=responder_id,
            content=content
        )
        
        db.add(response)
        await db.commit()
        await db.refresh(response)
        return response

