import json
import redis.asyncio as redis
from ..core.config import settings


redis_client = redis.Redis(
    host=settings.REDIS_HOST, 
    port=settings.REDIS_PORT, 
    password=settings.REDIS_PASSWORD,
    decode_responses=True
)

async def redis_store_refresh_token(jti: str, user_id: str):
    """
    Store a refresh token in Redis.

    Args:
        redis: aioredis.Redis client instance
        jti (str): JWT ID (unique identifier for the token)
        user_id (int): User's ID
        expires_in (int): Expiry in seconds
    """
    key = f"refresh_token:{jti}"
    value = json.dumps({"user_id": user_id})
    await redis_client.set(key, value, ex=5 * 60) #60 * 60 * 24 * 7)  # 7 days


async def redis_verify_refresh_token(user_id: str, token: str) -> bool:
    key = f"refresh:{user_id}"
    stored = await redis_client.get(key)
    return stored and stored.decode() == token


async def redis_retrieve_refresh_token(user_id: str):
    key = f"refresh:{user_id}"
    stored_token = await redis_client.get(key)
    return stored_token


