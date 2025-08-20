from typing import Annotated
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
# from jwt import PyJWTError
# import jwt
import logging
from jose import jwt, JWTError

from ...core.config import settings
from ...auth.schemas import TokenData
from ...auth.exceptions import AuthenticationError

oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')


class AuthHandler:
    def get_current_user(self, token: Annotated[str, Depends(oauth2_bearer)]) -> TokenData:
        return self.__verify_token(token)

    def __verify_token(token: str) -> TokenData:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id: str = payload.get('id')
            return TokenData(user_id=user_id)
        except JWTError as e:
            logging.warning(f"Token verification failed: {str(e)}")
            raise AuthenticationError()
    
    
authHandler = AuthHandler()
CurrentUser = Annotated[TokenData, Depends(authHandler.get_current_user)]

# async def get_current_user( token: str = Depends(oauth2_bearer)):
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     return __verify_token(token, credentials_exception)