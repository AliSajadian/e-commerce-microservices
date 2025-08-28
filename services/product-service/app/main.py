import asyncio
from contextlib import asynccontextmanager
from http.client import HTTPException
import logging
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

import app.product.models
from app.grpc_server import start_grpc_server_background, stop_grpc_server_background
from app.core.database import init_db_connection
from .api.v1.routers import register_routes
from .api.exceptions import validation_exception_handler, http_exception_handler, general_exception_handler

# Configure logging at the top level
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define the lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up database connection...")
    await init_db_connection() # Assuming you have this function
    logger.info("Database connection established.")
    
    logger.info("Application startup: Initializing gRPC server...")
    # Start the gRPC server as a background task in the main event loop
    asyncio.create_task(start_grpc_server_background())
    logger.info("Application startup: gRPC server background task initiated.")
    
    # Yield control to the application, which will handle requests
    yield
    
    # This code runs on shutdown
    logger.info("Application shutdown: Stopping gRPC server...")
    await stop_grpc_server_background()
    logger.info("Application shutdown: gRPC server stopped.")
        
tags_metadata = [
    # {
    #     "name": "Authentication", 
    #     "description": "Routes for operations related to Authentication"
    # },
    # {
    #     "name": "Book Authors",
    #     "description": "Routes for operations related to authors",
    # },
    # {
    #     "name": "Books",
    #     "description": "Routes for operations related to books",
    # },
]

app = FastAPI(
    title="Product API", 
    description="This is a simple product service", 
    version="0.0.1", 
    contact={
        "name": "Ali Sajadian",
        "username": "a.sajadian" 
    } ,
    license_info={
        "name": "MIT"    
    },
    docs_url="/",
    openapi_tags=tags_metadata,
    lifespan=lifespan
)

# Register custom exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# ... your other FastAPI routes and code ...
@app.get("/")
async def read_root():
    return {"message": "Auth Service REST API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/ready")
async def ready():
    return {"status": "ready"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=[]
)

register_routes(app)

