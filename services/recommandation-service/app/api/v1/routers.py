from fastapi import FastAPI
from ...auth.routers import auth_routers, permission_routers, role_routers, user_routers


def register_routes(app: FastAPI):
    app.include_router(auth_routers, prefix="/api/v1/auth", tags=["Auth"])
    app.include_router(user_routers, prefix="/api/v1/auth/user", tags=["Users"])
    app.include_router(role_routers, prefix="/api/v1/auth/role", tags=["Roles"])
    app.include_router(permission_routers, prefix="/api/v1/auth/permission", tags=["Permissions"])
    
    