from fastapi import FastAPI
from ...recommendation.routers import recommendation

def register_routes(app: FastAPI):
    app.include_router(recommendation.router, prefix="/api/v1/recommendations", tags=["Recommendations"])