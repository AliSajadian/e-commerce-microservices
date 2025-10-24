from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.review.crud.review import ReviewCRUD
from app.review.schemas.review import (
    ReviewCreateSchema, 
    ReviewUpdateSchema, 
    ReviewResponseSchema,
    ReviewVoteSchema,
    ReviewStatsSchema,
    ReviewModerationSchema,
    ReviewResponseCreateSchema,
    ReviewListResponseSchema,
    ReviewSearchSchema
)
from app.api.dependencies.auth_utils import get_current_user

router = APIRouter()

@router.post("/", response_model=ReviewResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new review"""
    review_crud = ReviewCRUD()
    
    # Check if user already reviewed this product
    existing_review = await review_crud.get_product_reviews(
        db, review_data.product_id, user_id=current_user["user_id"]
    )
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product"
        )
    
    review = await review_crud.create_review(db, review_data, current_user["user_id"])
    return review

@router.get("/product/{product_id}", response_model=ReviewListResponseSchema)
async def get_product_reviews(
    product_id: uuid.UUID,
    status: Optional[str] = Query("approved", description="Review status filter"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get reviews for a specific product"""
    review_crud = ReviewCRUD()
    
    reviews = await review_crud.get_product_reviews(
        db, product_id, status=status, limit=limit, offset=offset, 
        sort_by=sort_by, sort_order=sort_order
    )
    
    # Get total count for pagination
    total_result = await db.execute(
        select(func.count(Review.id)).filter(Review.product_id == product_id)
    )
    total = total_result.scalar() or 0
    
    return ReviewListResponseSchema(
        reviews=reviews,
        total=total,
        page=offset // limit + 1,
        limit=limit,
        has_next=offset + limit < total,
        has_prev=offset > 0
    )

@router.get("/user/{user_id}", response_model=List[ReviewResponseSchema])
async def get_user_reviews(
    user_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get reviews by a specific user"""
    review_crud = ReviewCRUD()
    reviews = await review_crud.get_user_reviews(db, user_id, limit, offset)
    return reviews

@router.get("/{review_id}", response_model=ReviewResponseSchema)
async def get_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific review by ID"""
    review_crud = ReviewCRUD()
    review = await review_crud.get_review_by_id(db, review_id)
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    return review

@router.put("/{review_id}", response_model=ReviewResponseSchema)
async def update_review(
    review_id: uuid.UUID,
    update_data: ReviewUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a review (only by the original author)"""
    review_crud = ReviewCRUD()
    review = await review_crud.update_review(
        db, review_id, current_user["user_id"], update_data
    )
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found or you don't have permission to edit it"
        )
    
    return review

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a review (only by the original author)"""
    review_crud = ReviewCRUD()
    success = await review_crud.delete_review(db, review_id, current_user["user_id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found or you don't have permission to delete it"
        )

@router.post("/{review_id}/vote", status_code=status.HTTP_200_OK)
async def vote_on_review(
    review_id: uuid.UUID,
    vote_data: ReviewVoteSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Vote on a review (helpful/not helpful)"""
    review_crud = ReviewCRUD()
    success = await review_crud.vote_on_review(
        db, review_id, current_user["user_id"], vote_data.is_helpful
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    return {"message": "Vote recorded successfully"}

@router.get("/product/{product_id}/stats", response_model=ReviewStatsSchema)
async def get_product_review_stats(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get review statistics for a product"""
    review_crud = ReviewCRUD()
    stats = await review_crud.get_review_stats(db, product_id)
    return stats

@router.post("/{review_id}/moderate", status_code=status.HTTP_200_OK)
async def moderate_review(
    review_id: uuid.UUID,
    moderation_data: ReviewModerationSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Moderate a review (admin/moderator only)"""
    # Check if user has moderator permissions
    if not current_user.get("is_moderator", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    review_crud = ReviewCRUD()
    success = await review_crud.moderate_review(
        db, review_id, moderation_data.status, 
        current_user["user_id"], moderation_data.notes
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    return {"message": "Review moderated successfully"}

@router.get("/moderation/pending", response_model=List[ReviewResponseSchema])
async def get_pending_reviews(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get pending reviews for moderation (admin/moderator only)"""
    if not current_user.get("is_moderator", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    review_crud = ReviewCRUD()
    reviews = await review_crud.get_pending_reviews(db, limit, offset)
    return reviews

@router.post("/{review_id}/respond", response_model=dict)
async def add_review_response(
    review_id: uuid.UUID,
    response_data: ReviewResponseCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a business response to a review"""
    # Check if user has business permissions
    if not current_user.get("is_business", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    review_crud = ReviewCRUD()
    response = await review_crud.add_review_response(
        db, review_id, current_user["user_id"], response_data.content
    )
    
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    return {"message": "Response added successfully", "response_id": response.id}

