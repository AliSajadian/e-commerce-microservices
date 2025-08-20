from jose import ExpiredSignatureError, JWTError, jwt
from datetime import timedelta, datetime, timezone
import uuid

from ..core.config import settings
from ..auth.exceptions import RefreshTokenExpireError, \
    RefreshTokenInvalidError, RefreshTokenTypeInvalidError


def create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    encode = data.copy()
    encode.update({
        'exp': datetime.now(timezone.utc) + expires_delta,
        "type": token_type
    })
    token = jwt.encode(encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    # PyJWT >= 2.0 returns a string, <2.0 returns bytes
    if isinstance(token, bytes): 
        # isinstance(token, bytes), checks whether the JWT token returned by jwt.encode() 
        # is a bytes object (Python 3.6–3.8 with old PyJWT versions),
        token = token.decode("utf-8")
    return token

def create_access_token(data: dict):
    return create_token(data, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), "access")

def create_refresh_token(data: dict):
    return create_token(data, timedelta(minutes=settings.REFRESH_EXPIRE_DAYS), "refresh")
    
   
def verify_jwt_(token):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    
def verify_jwt(token):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise RefreshTokenTypeInvalidError()
        return payload
    except ExpiredSignatureError:
        raise RefreshTokenExpireError()
    except JWTError:
        raise RefreshTokenInvalidError()
        
def decode_jwt(token):
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload 
