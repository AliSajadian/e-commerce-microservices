import asyncio
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the new background server functions
from app.grpc_server import start_grpc_server_background, stop_grpc_server_background
from .api.v1.routers import register_routes
        
from app.core.database import init_db_connection # If you have this for DB lifespan
from app.core.rabbitmq import connect_rabbitmq, disconnect_rabbitmq # NEW

# Configure logging at the top level
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define the lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database connection
    logger.info("Starting up database connection...")
    await init_db_connection() # Assuming you have this function
    logger.info("Database connection established.")

    # Connect to RabbitMQ
    logger.info("Connecting to RabbitMQ...")
    await connect_rabbitmq()
    logger.info("RabbitMQ connected.")
    
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
    
    logger.info("Disconnecting from RabbitMQ...")
    await disconnect_rabbitmq()
    logger.info("RabbitMQ disconnected.")

    logger.info("Application shutdown complete.")

tags_metadata = [
    {
        "name": "Recommendations", 
        "description": "Routes for operations related to product recommendations and ML"
    },
    {
        "name": "Analytics",
        "description": "Routes for recommendation analytics and model management"
    },
]

# Pass the lifespan context manager to the FastAPI app
app = FastAPI(
    title="Recommendation Service API", 
    description="This is a ML-based recommendation service for e-commerce products", 
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

# ... your other FastAPI routes and code ...
@app.get("/")
async def read_root():
    return {"message": "Recommendation Service REST API is running"}

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
