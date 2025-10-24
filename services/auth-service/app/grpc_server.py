import asyncio
import logging
from concurrent import futures
import grpc
from grpc import aio

# Import generated protobuf files
from generated import auth_pb2_grpc, auth_pb2
from app.auth.services.auth import AuthServices
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

class AuthServiceServicer(auth_pb2_grpc.AuthServiceServicer):
    """gRPC server implementation for Auth Service"""
    
    def __init__(self):
        self.auth_service = AuthServices()
    
    async def ValidateToken(self, request, context):
        """Validate JWT token"""
        try:
            token = request.token
            if not token:
                return auth_pb2.ValidateTokenResponse(
                    valid=False,
                    error_message="Token is required"
                )
            
            # Validate token using existing auth service
            # This would integrate with your existing JWT validation logic
            try:
                # Assuming you have a method to validate token
                user_data = await self._validate_jwt_token(token)
                
                return auth_pb2.ValidateTokenResponse(
                    valid=True,
                    user_id=user_data.get('user_id', ''),
                    username=user_data.get('username', ''),
                    role=user_data.get('role', ''),
                    permissions=user_data.get('permissions', [])
                )
            except Exception as e:
                logger.error(f"Token validation failed: {e}")
                return auth_pb2.ValidateTokenResponse(
                    valid=False,
                    error_message="Invalid token"
                )
                
        except Exception as e:
            logger.error(f"Error in ValidateToken: {e}")
            return auth_pb2.ValidateTokenResponse(
                valid=False,
                error_message="Internal server error"
            )
    
    async def GetUser(self, request, context):
        """Get user information by ID"""
        try:
            user_id = request.user_id
            if not user_id:
                return auth_pb2.GetUserResponse(
                    success=False,
                    error_message="User ID is required"
                )
            
            # Get user from database
            async for db in get_db():
                user = await self.auth_service.get_user_by_id(db, int(user_id))
                
                return auth_pb2.GetUserResponse(
                    success=True,
                    user_id=str(user.id),
                    username=user.username,
                    email=user.email,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    role=user.role,
                    is_active=user.is_active
                )
                
        except Exception as e:
            logger.error(f"Error in GetUser: {e}")
            return auth_pb2.GetUserResponse(
                success=False,
                error_message="User not found"
            )
    
    async def CheckPermission(self, request, context):
        """Check if user has specific permission"""
        try:
            user_id = request.user_id
            permission = request.permission
            
            if not user_id or not permission:
                return auth_pb2.CheckPermissionResponse(
                    has_permission=False,
                    error_message="User ID and permission are required"
                )
            
            # Check permission logic
            # This would integrate with your existing permission system
            has_permission = await self._check_user_permission(user_id, permission)
            
            return auth_pb2.CheckPermissionResponse(
                has_permission=has_permission
            )
            
        except Exception as e:
            logger.error(f"Error in CheckPermission: {e}")
            return auth_pb2.CheckPermissionResponse(
                has_permission=False,
                error_message="Permission check failed"
            )
    
    async def GetUserProfile(self, request, context):
        """Get user profile information"""
        try:
            user_id = request.user_id
            if not user_id:
                return auth_pb2.GetUserProfileResponse(
                    success=False,
                    error_message="User ID is required"
                )
            
            # Get user profile from database
            async for db in get_db():
                user = await self.auth_service.get_user_by_id(db, int(user_id))
                
                return auth_pb2.GetUserProfileResponse(
                    success=True,
                    user_id=str(user.id),
                    username=user.username,
                    email=user.email,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    avatar=getattr(user, 'avatar', ''),
                    is_active=user.is_active,
                    created_at=user.created_at.isoformat() if hasattr(user, 'created_at') else ''
                )
                
        except Exception as e:
            logger.error(f"Error in GetUserProfile: {e}")
            return auth_pb2.GetUserProfileResponse(
                success=False,
                error_message="User profile not found"
            )
    
    async def _validate_jwt_token(self, token: str) -> dict:
        """Validate JWT token and return user data"""
        # This would integrate with your existing JWT validation logic
        # For now, returning a mock implementation
        from jose import jwt
        from app.core.config import settings
        
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return {
                'user_id': payload.get('sub'),
                'username': payload.get('username'),
                'role': payload.get('role'),
                'permissions': payload.get('permissions', [])
            }
        except Exception as e:
            raise Exception(f"Token validation failed: {e}")
    
    async def _check_user_permission(self, user_id: str, permission: str) -> bool:
        """Check if user has specific permission"""
        # This would integrate with your existing permission system
        # For now, returning a mock implementation
        try:
            async for db in get_db():
                user = await self.auth_service.get_user_by_id(db, int(user_id))
                # Check if user has the required permission
                # This would involve checking user roles and permissions
                return True  # Mock implementation
        except Exception:
            return False

# Global server instance
_grpc_server_instance = None

async def start_grpc_server_background():
    """Start gRPC server in background"""
    global _grpc_server_instance
    
    try:
        # Create gRPC server
        server = aio.server(futures.ThreadPoolExecutor(max_workers=10))
        
        # Add servicer
        auth_pb2_grpc.add_AuthServiceServicer_to_server(AuthServiceServicer(), server)
        
        # Configure server
        listen_addr = '[::]:50051'  # Auth service gRPC port
        server.add_insecure_port(listen_addr)
        
        # Start server
        await server.start()
        _grpc_server_instance = server
        
        logger.info(f"Auth gRPC server started on {listen_addr}")
        
        # Keep server running
        await server.wait_for_termination()
        
    except Exception as e:
        logger.error(f"Failed to start Auth gRPC server: {e}")
        raise e

async def stop_grpc_server_background():
    """Stop gRPC server gracefully"""
    global _grpc_server_instance
    
    if _grpc_server_instance:
        try:
            logger.info("Stopping Auth gRPC server...")
            await _grpc_server_instance.stop(grace=5.0)
            logger.info("Auth gRPC server stopped")
        except Exception as e:
            logger.error(f"Error stopping Auth gRPC server: {e}")
        finally:
            _grpc_server_instance = None