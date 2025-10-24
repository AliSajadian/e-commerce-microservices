"""
    Auth Services
    =============
    This module contains the services for the auth API.
    It is responsible for the authentication and authorization of users.
    It is also responsible for the refresh token management.
    It is also responsible for the logout of users.
    It is also responsible for the password change of users.
    It is also responsible for the user registration.
    It is also responsible for the user retrieval.
"""
import json
from typing import Annotated
import uuid
import logging
from uuid import UUID

from fastapi import Depends, Response
from fastapi.security import OAuth2PasswordRequestForm #, OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from jose import ExpiredSignatureError, JWTError

from ..crud.user import UserCRUDs
from ..models import Role, User
from ..schemas import LoginResponse, UserResponse, PasswordChange, Token, RegisterUserRequest
from ..exceptions import AuthenticationError, InvalidPasswordError, PasswordMismatchError, \
    RefreshTokenMisMatchError, RefreshTokenMissingError, RefreshTokenTypeInvalidError, \
    RefreshTokenInvalidError, RefreshTokenExpireError, ObjectNotFoundError
from ...utilities.jwt_utils import create_access_token, create_refresh_token, decode_jwt
from ...utilities.password_utils import get_password_hash, verify_password
from ...utilities.redis_utils import redis_client, redis_store_refresh_token, \
    redis_verify_refresh_token
# You would want to store this in an environment variable or a secret manager

# oauth2_bearer = OAuth2PasswordBearer(tokenUrl='/token')

class AuthServices:
    """ 
     ==================== 
     Authors API Services 
     ==================== 
    """
    async def register_user(self, db: AsyncSession, register_user_request: RegisterUserRequest) -> User:
        """Register a new user in the system.
        
        Args:
            db (AsyncSession): Database session for database operations
            register_user_request (RegisterUserRequest): User registration data
            
        Returns:
            User: The newly created user object
            
        Raises:
            Exception: If user registration fails due to database constraints
        """
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
            
            logging.info("Created new user.")
            return create_user_model
        
        except Exception as e:
            logging.error(f"Failed to register user: {register_user_request.username}. Error: {str(e)}")
            db.rollback()
            raise
        

    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> UserResponse:
        """Retrieve a user by their ID from the database.
        
        Args:
            db (AsyncSession): Database session for database operations
            user_id (int): The ID of the user to retrieve
            
        Returns:
            UserResponse: The user object
            
        Raises:
            ObjectNotFoundError: If user with given ID is not found
        """
        result = await db.execute(select(User).filter(User.id == user_id)) 
        user = result.scalar_one_or_none()
        
        if not user:
            logging.warning("User not found with ID: %s", user_id)
            raise ObjectNotFoundError(user_id)
        
        logging.info("Successfully retrieved user with ID: %s", user_id)
        return user


    async def change_password(self, db: AsyncSession, user_id: int, password_change: PasswordChange) -> None:
        """Change user password after verifying current password.
        
        Args:
            db (AsyncSession): Database session for database operations
            user_id (int): The ID of the user changing password
            password_change (PasswordChange): Password change data including current and new passwords
            
        Raises:
            InvalidPasswordError: If current password is incorrect
            PasswordMismatchError: If new passwords do not match
            Exception: If password change fails
        """
        try:
            user_services = UserCRUDs(db)
            user = await user_services.get_by_id(UUID(str(user_id)))
            
            # Verify current password
            if not verify_password(password_change.current_password, user.password_hash):
                logging.warning("Invalid current password provided for user ID: %s", user_id)
                raise InvalidPasswordError()
            
            # Verify new passwords match
            if password_change.new_password != password_change.new_password_confirm:
                logging.warning("Password mismatch during change attempt for user ID: %s", user_id)
                raise PasswordMismatchError()
            
            # Update password
            user.password_hash = get_password_hash(password_change.new_password)
            await db.commit()
            logging.info("Successfully changed password for user ID: %s", user_id)
        except Exception as e:
            logging.error("Error during password change for user ID: %s. Error: %s", user_id, str(e))
            raise


    async def login_user(self, db: AsyncSession, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> tuple[LoginResponse, str]:
        """Authenticate user and generate access and refresh tokens.
        
        Args:
            db (AsyncSession): Database session for user lookup
            form_data (OAuth2PasswordRequestForm): Login credentials (username and password)
            
        Returns:
            tuple[LoginResponse, str]: A tuple containing the login response object and refresh token string
            
        Raises:
            AuthenticationError: If user credentials are invalid
        """
        user = await self.__authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise AuthenticationError()
        
        access_token = create_access_token({
            "sub": str(user.id),
            "email": str(user.email),
            "roles": [role.name for role in user.roles],
            "permissions": [perm.name for role in user.roles for perm in role.permissions]
        })
        
        refresh_jti = str(uuid.uuid4())
        refresh_token = create_refresh_token({
            "sub": str(user.id),
            "jti": refresh_jti
        })
        
        await redis_store_refresh_token(jti=refresh_jti, user_id=str(user.id))
        
        login_response = LoginResponse(
            user_id=user.id,
            full_name=self.__get_full_name(user),
            email=user.email,
            access_token=access_token,
        )
        
        return login_response, refresh_token
    
    
    def __get_full_name(self, user: User) -> str:
        """Get the full name of a user by combining first and last name.
        
        Args:
            user (User): The user object
            
        Returns:
            str: The full name of the user
        """
        return f"{user.first_name} {user.last_name}"
                
                
    async def login_for_access_token(self, form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
                                    db: AsyncSession) -> Token:
        """Authenticate user and return access and refresh tokens.
        
        Args:
            form_data (OAuth2PasswordRequestForm): Login credentials
            db (AsyncSession): Database session for user lookup
            
        Returns:
            Token: Object containing access token, refresh token, and token type
            
        Raises:
            AuthenticationError: If user credentials are invalid
        """
        user = await self.__authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise AuthenticationError()
        
        token_data = {"sub": user.username, "roles": [role.name for role in user.roles]}

        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        return Token(access_token=access_token, refresh_token=refresh_token, token_type='bearer')
    
    
    async def __authenticate_user(self, db: AsyncSession, username: str, password: str) -> User | bool:
        """Authenticate a user by username and password.
        
        Args:
            db (AsyncSession): Database session for user lookup
            username (str): The username to authenticate
            password (str): The password to verify
            
        Returns:
            User | bool: User object if authentication successful, False otherwise
        """
        result = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .filter(User.username == username))
        user = result.scalar_one_or_none()
                              
        if not user or not verify_password(password, user.password_hash):
            logging.warning("Failed authentication attempt for username: %s", username)
            return False
        return user   
    

    async def refresh_token1(self, db: AsyncSession, auth_header: str) -> dict[str, str]:
        """Refresh the access token

        Args:
            db: The database session
            auth_header: The authorization header

        Returns:
            A dictionary containing the new access token and token type

        Raises:
            RefreshTokenMissingError: If the refresh token is missing
            RefreshTokenTypeInvalidError: If the refresh token type is invalid
            RefreshTokenExpireError: If the refresh token has expired
            RefreshTokenInvalidError: If the refresh token is invalid
            RefreshTokenMisMatchError: If the refresh token mismatch
            JWTError: If the JWT error occurs
        """
        if not auth_header or not auth_header.startswith("Bearer "):
            raise RefreshTokenMissingError()

        token = auth_header.split(" ")[1]

        try:
            payload = decode_jwt(token)
            if payload.get("type") != "refresh":
                raise RefreshTokenTypeInvalidError()
            user_id = payload.get("sub")
        except ExpiredSignatureError as exc:
            raise RefreshTokenExpireError() from exc
        except JWTError as exc:
            raise RefreshTokenInvalidError() from exc

        is_valid = await redis_verify_refresh_token(user_id, token)
        if not is_valid:
            raise RefreshTokenExpireError()

        result = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .filter(User.id == user_id))
        user = result.scalar_one_or_none()
        
        # Create new access token
        new_access_token = create_access_token({
            "sub": str(user_id),
            "roles": [role.name for role in user.roles],
            "permissions": [perm.code for role in user.roles for perm in role.permissions]
        })
        return {"access_token": new_access_token, "token_type": "bearer"}


    async def refresh_token(self, db: AsyncSession, token: str) -> dict[str, str]:
        """
        Refresh the access token

        Args:
            db: The database session
            token: The refresh token

        Returns:
            A dictionary containing the new access token and token type

        Raises:
            RefreshTokenMissingError: If the refresh token is missing
            RefreshTokenTypeInvalidError: If the refresh token type is invalid
            RefreshTokenExpireError: If the refresh token has expired
            RefreshTokenInvalidError: If the refresh token is invalid
            RefreshTokenMisMatchError: If the refresh token mismatch
            JWTError: If the JWT error occurs
        """
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
            if redis_value is None:
                raise RefreshTokenExpireError() # Token expired or revoked
            
            redis_user_id = json.loads(redis_value).get("user_id")
            if redis_user_id != user_id:
                raise RefreshTokenMisMatchError()  # Token mismatch

        except JWTError as exc:
            raise RefreshTokenInvalidError() from exc

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
        """Logout the user

        Args:
            token (str): The refresh token

        Returns:
            A response object

        Raises:
            JWTError: If the JWT error occurs
        """
        if token:
            try:
                payload = decode_jwt(token)
                jti = payload.get("jti")
                await redis_client.delete(f"refresh_token:{jti}")
            except JWTError:
                pass

        response = Response()
        response.delete_cookie("refresh_token")
        return response
