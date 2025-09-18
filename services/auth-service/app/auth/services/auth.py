import json
from typing import Annotated
import uuid
from fastapi import Depends, Response
from fastapi.security import OAuth2PasswordRequestForm #, OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from jose import ExpiredSignatureError, JWTError
import logging

from ..crud.user import UserCRUDs
from ..models import Role, User
from ..schemas import LoginResponse, UserResponse, PasswordChange, Token, RegisterUserRequest
from ..exceptions import AuthenticationError, InvalidPasswordError, PasswordMismatchError, RefreshTokenExpireError, \
    RefreshTokenInvalidError, RefreshTokenMisMatchError, RefreshTokenMissingError, RefreshTokenTypeInvalidError, ObjectNotFoundError
from ...utilities.jwt_utils import create_access_token, create_refresh_token, decode_jwt
from ...utilities.password_utils import get_password_hash, verify_password
from ...utilities.redis_utils import redis_client, redis_store_refresh_token, redis_verify_refresh_token
# You would want to store this in an environment variable or a secret manager

# oauth2_bearer = OAuth2PasswordBearer(tokenUrl='/token')

class AuthServices:
    """ 
     ==================== 
     Authors API Services 
     ==================== 
    """
    async def register_user(self, db: AsyncSession, register_user_request: RegisterUserRequest) -> User:
        try:
            create_user_model = User(
                username=register_user_request.username,
                first_name=register_user_request.first_name,
                last_name=register_user_request.last_name,
                password_hash=get_password_hash(register_user_request.password),
                email=register_user_request.email,
            )    
            
            db.add(create_user_model)
            await db.commit()
            await db.refresh(create_user_model)
            
            logging.info(f"Created new user.")
            return create_user_model
        
        except Exception as e:
            logging.error(f"Failed to register user: {register_user_request.username}. Error: {str(e)}")
            db.rollback()
            raise
        

    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> UserResponse:
        result = await db.execute(select(User).filter(User.id == user_id)) 
        user = result.scalar_one_or_none()
        
        if not user:
            logging.warning(f"User not found with ID: {user_id}")
            raise ObjectNotFoundError(user_id)
        
        logging.info(f"Successfully retrieved user with ID: {user_id}")
        return user


    async def change_password(self, db: AsyncSession, user_id: int, password_change: PasswordChange) -> None:
        try:
            user_services = UserCRUDs()
            user = await user_services.get_by_id(db, user_id)
            
            # Verify current password
            if not verify_password(password_change.current_password, user.password_hash):
                logging.warning(f"Invalid current password provided for user ID: {user_id}")
                raise InvalidPasswordError()
            
            # Verify new passwords match
            if password_change.new_password != password_change.new_password_confirm:
                logging.warning(f"Password mismatch during change attempt for user ID: {user_id}")
                raise PasswordMismatchError()
            
            # Update password
            user.password_hash = get_password_hash(password_change.new_password)
            await db.commit()
            logging.info(f"Successfully changed password for user ID: {user_id}")
        except Exception as e:
            logging.error(f"Error during password change for user ID: {user_id}. Error: {str(e)}")
            raise


    async def login_user(self, db: AsyncSession, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> tuple[LoginResponse, str]:
        user = await self.__authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise AuthenticationError()
        
        print("================= start create access_token ...")
        access_token = create_access_token({
            "sub": str(user.id),
            "email": str(user.email),
            "roles": [role.name for role in user.roles],
            "permissions": [perm.name for role in user.roles for perm in role.permissions]
        })
        print("================= end create access_token")
        print("================= start create refresh_token ...")
        refresh_jti = str(uuid.uuid4())
        refresh_token = create_refresh_token({
            "sub": str(user.id),
            "jti": refresh_jti
        })
        print("================= end create refresh_token ")
        
        await redis_store_refresh_token(jti=refresh_jti ,user_id=str(user.id))
        print("s================ store created refresh_token in redis")
        
        login_response = LoginResponse(
            user_id=user.id,
            full_name=self.__get_full_name(user),
            email=user.email,
            access_token=access_token,
        )
        
        return login_response, refresh_token
    
    
    def __get_full_name(self, user: User) -> str:
        return f"{user.first_name} {user.last_name}"
                
                
    async def login_for_access_token(self, form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
                                    db: AsyncSession) -> Token:
        user = await self.__authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise AuthenticationError()
        
        token_data = {"sub": user.username, "role": user.role}

        access_token = self.__create_access_token(token_data)
        refresh_token = self.__create_refresh_token(token_data)
        return Token(access_token=access_token, refresh_token=refresh_token, token_type='bearer')
    
    
    async def __authenticate_user(self, db: AsyncSession, username: str, password: str) -> User | bool:
        result = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .filter(User.username == username))
        user = result.scalar_one_or_none()
                              
        if not user or not verify_password(password, user.password_hash):
            logging.warning(f"Failed authentication attempt for username: {username}")
            return False
        return user   
    

    async def refresh_token1(self, db: AsyncSession, auth_header: str):
        if not auth_header or not auth_header.startswith("Bearer "):
            raise RefreshTokenMissingError()

        token = auth_header.split(" ")[1]

        try:
            payload = decode_jwt(token)
            if payload.get("type") != "refresh":
                raise RefreshTokenTypeInvalidError()
            user_id = payload.get("sub")
        except ExpiredSignatureError:
            raise RefreshTokenExpireError()
        except JWTError:
            raise RefreshTokenInvalidError()

        is_valid = await redis_verify_refresh_token(user_id, token)
        if not is_valid:
            raise RefreshTokenExpireError()

        result = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .filter(User.id == user_id))
        user = result.scalar_one_or_none()
        
        # Create new access token
        new_access_token = create_access_token(
            user_id=user_id,
            roles=[role.name for role in user.roles],
            permissions=[perm.code for role in user.roles for perm in role.permissions]
        )
        
        return {"access_token": new_access_token, "token_type": "bearer"}


    async def refresh_token(self, db: AsyncSession, token: str):
        if not token:
            raise RefreshTokenMissingError()
        try:
            payload = decode_jwt(token)
            if payload.get("type") != "refresh":
                raise RefreshTokenTypeInvalidError()
            
            jti = payload.get("jti")
            user_id = payload.get("sub")
            
            if not jti or not user_id:
                raise RefreshTokenInvalidError()
            
            redis_value = await redis_client.get(f"refresh_token:{jti}")
            redis_user_id = await redis_client.get(f"refresh_token:{jti}")
            print("================ user_id: ", user_id)
            print("================ redis_user_id: ", redis_value)
            if redis_value is None:
                raise RefreshTokenExpireError() # Token expired or revoked
            
            redis_user_id = json.loads(redis_value).get("user_id")
            if redis_user_id != user_id:
                raise RefreshTokenMisMatchError()  # Token mismatch

        except JWTError:
            raise RefreshTokenInvalidError()

        result = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .filter(User.id == user_id))
        user = result.scalar_one_or_none()
        
        # Create new access token
        new_access_token = create_access_token({
            "sub": str(user_id),
            "email": str(user.email),
            "roles": [role.name for role in user.roles],
            "permissions": [perm.name for role in user.roles for perm in role.permissions]
        })
        
        return {"access_token": new_access_token, "token_type": "bearer"}


    async def logout(self, token: str):
        if token:
            try:
                payload = decode_jwt(token)
                jti = payload.get("jti")
                await redis_client.delete(f"refresh:{jti}")
            except JWTError:
                pass

        response = Response()
        response.delete_cookie("refresh_token")
        return response
