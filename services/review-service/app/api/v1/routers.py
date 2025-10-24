from fastapi import FastAPI
from ...review.routers import review

def register_routes(app: FastAPI):
    app.include_router(review.router, prefix="/api/v1/reviews", tags=["Reviews"])