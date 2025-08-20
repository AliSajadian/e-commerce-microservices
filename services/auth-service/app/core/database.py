from sqlalchemy import MetaData#, create_engine
from sqlalchemy.orm import declarative_base# sessionmaker, 
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession, create_async_engine

from .config import settings

# engine = create_engine(url=settings.DATABASE_URL, echo=True, future=True)

async_engine = create_async_engine(url=settings.ASYNC_DATABASE_URL, echo=True, future=True)

# SessionLocal = sessionmaker(
#     autocommit=False,
#     autoflush=False,
#     bind=engine,
#     future=True
# )

AsyncSessionLocal = async_sessionmaker(
    async_engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

Base = declarative_base()

# This is the 'init_db_connection' function that main.py is trying to import
# It will create all tables defined with Base.metadata
async def init_db_connection():
    """Initializes the database connection and creates tables if they don't exist."""
    async with async_engine.begin() as conn:
        # This will create all tables defined by Base.metadata
        await conn.run_sync(Base.metadata.create_all)
    print("Database connection initialized and tables created.")

# You might also have a function to close the connection if needed for shutdown
async def close_db_connection():
    """Closes the database connection."""
    # Depending on your engine configuration, you might not explicitly need to close it.
    # The engine manages its connection pool.
    print("Database connection gracefully closed (if applicable).")


#CORE
# Metadata = MetaData()
# Metadata.reflect(bind=async_engine)

# stmt = select(users_table).where(users_table.c.username == "admin")
# with engine.connect() as conn:
#     result = conn.execute(stmt)
#     rows = result.fetchall()

#ORM
# Your ORM model
# class User(Base):
#     __tablename__ = "users"
#     id = Column(Integer, primary_key=True)
#     username = Column(String)
# Manual mapping
# table_model_map = {
#     "users": User,
#     # Add more mappings if needed
# }

# model = table_model_map.get("users")
# stmt = select(model).where(model.username == "admin")
