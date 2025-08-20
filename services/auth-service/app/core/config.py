from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    DATABASE_URL: str
    ASYNC_DATABASE_URL: str
    
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_EXPIRE_DAYS: float
    
    REDIS_HOST: str
    REDIS_PORT: int 
    # REDIS_PASSWORD: str

    RABBITMQ_USER: str
    RABBITMQ_PASS: str
    RABBITMQ_URL: str
    USER_EVENTS_EXCHANGE_NAME: str

    class Config:
        env_file = ".env"

settings = Settings()