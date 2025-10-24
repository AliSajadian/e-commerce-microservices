#  /app/api/dependencies/auth_utils.py
from typing import Annotated, Optional, List
from fastapi import Depends, HTTPException, Header, Request, status
from fastapi.security import OAuth2PasswordBearer
# from jwt import PyJWTError
# import jwt
import logging
from jose import jwt, JWTError

from .schemas import TokenData
from ..exceptions import AuthenticationError
from ...core.config import settings

oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')

async def get_current_user_id(Authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependency to validate the JWT token and extract the user ID.
    """
    if not Authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract the token from the 'Bearer <token>' string
    token_parts = Authorization.split()
    if len(token_parts) != 2 or token_parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = token_parts[1]
    
    try:
        # Decode and verify the token locally
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        roles: List[str] = payload.get("roles", [])
        permissions: List[str] = payload.get("permissions", [])
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is missing user ID",
            )
        
        # You can add more checks here, e.g., token expiration, etc.
        
        return { 
            "userId": user_id,
            "roles": roles,
            "permissions": permissions
        }
    
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]) -> TokenData:
    '''
    Return current user
    '''
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get('id')
        return TokenData(user_id=user_id)
    except JWTError as e:
        logging.warning(f"Token verification failed: {str(e)}")
        raise AuthenticationError()
   
    
async def verify_token(request: Request):
    print("verify_token  started ...")
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid token")
        token = auth_header.split(" ")[1]
        
        jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        print("verify_token  finished")
    except JWTError:
        print("verify_token  got JWT error")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
def has_permission(required_permission: str):
    def permission_checker(claims: dict = Depends(get_current_user_id)):
        user_permissions: List[str] = claims.get("permissions", [])
        if required_permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return claims
    return permission_checker

CurrentUser = Annotated[TokenData, Depends(get_current_user)]
VerifyToken = Annotated[TokenData, Depends(verify_token)]
