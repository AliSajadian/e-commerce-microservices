from typing import Annotated
from fastapi import APIRouter, Depends, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from starlette import status

from ..schemas import Token, LoginResponse, UserResponse, RegisterUserRequest, PasswordChange
from ..services.auth import AuthServices
from ...api.dependencies.auth import CurrentUser
from ...api.dependencies.database import AsyncDbSession
from ...utilities.rate_limiter import limiter


""" ===================== """
""" Auth router endpoints """
""" ===================== """
routers = APIRouter()
auth_services = AuthServices()

@routers.post("/register", status_code=status.HTTP_201_CREATED, response_model=None)
async def register_user(db: AsyncDbSession, register_user_request: RegisterUserRequest):
                        # db: AsyncSession = Depends(async_get_db)):
    """ Register user """
    author = await auth_services.register_user(db, register_user_request)
    return author
    
    
@routers.post("/login", response_model=LoginResponse)
# @limiter.limit("5/hour")
async def login(request: Request, db: AsyncDbSession, form_data: OAuth2PasswordRequestForm = Depends()):
    """ User login """
    login_response, refresh_token = await auth_services.login_user(db, form_data)
    response = JSONResponse(content=jsonable_encoder(login_response))
    # Set the HttpOnly cookie here!
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,  # You will need to return this from service if you can't create cookie inside it
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=4 * 60 #60 * 60 * 24 * 0.002777,
        # Optional: path="/refresh" to limit cookie scope
    )
    return response
    
    
@routers.post("/token", response_model=Token)
async def login_for_access_token(db: AsyncDbSession, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """ Login for access token """
    token = await auth_services.login_for_access_token(form_data, db)
    return token
    # return service.login_for_access_token(form_data, db)
    

@routers.post("/refresh1")
async def refresh_token1(request: Request, db: AsyncDbSession):
    auth_header = request.headers.get("Authorization")
    return auth_services.refresh_token1(db, auth_header)


@routers.post("/refresh")
async def refresh_token(request: Request, db: AsyncDbSession):
    token = request.cookies.get("refresh_token")
    return await auth_services.refresh_token(db, token)
    

@routers.post("/logout")
async def logout(request: Request):
    token = request.cookies.get("refresh_token")
    return auth_services.logout(token)


@routers.get("/me", response_model=UserResponse)
def get_current_user(db: AsyncDbSession, current_user: CurrentUser):
    """ Get current user """
    return auth_services.get_user_by_id(db, current_user.get_id())


@routers.put("/change-password", status_code=status.HTTP_200_OK)
def change_password(    
    db: AsyncDbSession, 
    password_change: PasswordChange,
    current_user: CurrentUser
):
    """ Change password """
    auth_services.change_password(db, current_user.get_id(), password_change)







