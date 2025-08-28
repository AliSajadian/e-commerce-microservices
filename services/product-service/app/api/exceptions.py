import logging
from typing import Any, Dict, Optional
from fastapi import HTTPException, status, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Configure logging
logger = logging.getLogger(__name__)

class BaseError(HTTPException):
    """Base exception for application-related errors"""
    def __init__(self, status_code: int, detail: str, headers: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        # Log the error when it's created
        logger.error(f"Exception raised: {self.__class__.__name__} - {detail}")

class NotFoundError(BaseError):
    """Raised when a requested resource is not found"""
    def __init__(self, resource: str, identifier: Any = None, by_field: str = "id"):
        if identifier is None:
            message = f"{resource} not found"
        else:
            message = f"{resource} with {by_field} '{identifier}' not found"
        
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=message
        )

class BadRequestError(BaseError):
    """Raised when the request is malformed or invalid"""
    def __init__(self, message: str = "the request is malformed or invalid"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=message
        )
        
class ConflictError(BaseError):
    """Raised when a resource already exists"""
    def __init__(self, resource: str, identifier: str, by_field: str = "name"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT, 
            detail=f"{resource} with {by_field} '{identifier}' already exists"
        )

class BusinessLogicError(BaseError):
    """Raised when business rules are violated"""
    def __init__(self, message: str = "business rules are violated"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail=message
        )

class DatabaseIntegrityError(BaseError):
    """Raised when database constraints are violated"""
    def __init__(self, message: str = "Database constraint violation"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=message        
        )

class DatabaseError(BaseError):
    """Raised when database operations fail"""
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=message
        )
        
class InternalServerError(BaseError):
    """Raised for unexpected server errors"""
    def __init__(self, message: str = "Internal server error occurred"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=message
        )

class AuthenticationError(HTTPException):
    """Raised when authentication fails"""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=message,
            headers={"WWW-Authenticate": "Bearer"}
        )

class AuthorizationError(HTTPException):
    """Raised when user doesn't have permission"""
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=message
        )

class RateLimitError(BaseError):
    """Raised when rate limit is exceeded"""
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message
        )

def _get_user_friendly_message(field_name: str, error_type: str, error_msg: str) -> str:
    """
    Generate user-friendly error messages based on error type patterns.
    This approach is scalable and doesn't require field-specific hardcoding.
    """
    # Clean field name for display
    display_field = field_name.replace('_', ' ').title()
    
    # Common error type mappings
    error_patterns = {
        'missing': f"{display_field} is required",
        'type_error.integer': f"{display_field} must be an integer",
        'type_error.str': f"{display_field} must be a string",
        'type_error.bool': f"{display_field} must be true or false",
        'type_error.float': f"{display_field} must be a number",
        'value_error.number.not_gt': f"{display_field} must be greater than 0",
        'value_error.number.not_ge': f"{display_field} must be 0 or greater",
        'value_error.number.not_lt': f"{display_field} must be less than the maximum allowed",
        'value_error.number.not_le': f"{display_field} must be less than or equal to the maximum allowed",
        'value_error.any_str.max_length': f"{display_field} is too long",
        'value_error.any_str.min_length': f"{display_field} is too short",
        'value_error.email': f"{display_field} must be a valid email address",
        'value_error.url': f"{display_field} must be a valid URL",
        'value_error.uuid': f"{display_field} must be a valid UUID",
        'value_error.datetime': f"{display_field} must be a valid date and time",
        'value_error.date': f"{display_field} must be a valid date",
        'value_error.list.min_items': f"{display_field} must contain at least one item",
        'value_error.list.max_items': f"{display_field} contains too many items",
    }
    
    # Return pattern match or clean up the original message
    return error_patterns.get(
        error_type, 
        error_msg.replace('ensure this value', display_field.lower())
    )

async def validation_exception_handler(
    request: Request, 
    exc: RequestValidationError
) -> JSONResponse:
    """
    Global validation error handler that works for ALL schemas.
    Uses generic pattern matching instead of field-specific hardcoding.
    """
    errors = []
    
    for error in exc.errors():
        # Handle nested field paths properly
        field_path = error.get('loc', ())
        if len(field_path) > 1:
            field_name = ".".join(str(x) for x in field_path[1:])  # Skip 'body'
        else:
            field_name = str(field_path[0]) if field_path else "unknown"
            
        error_type = error.get('type', '')
        error_msg = error.get('msg', 'Validation error')
        
        # Use generic pattern matching for user-friendly messages
        user_message = _get_user_friendly_message(field_name, error_type, error_msg)
        
        errors.append({
            "field": field_name,
            "message": user_message,
            "type": error_type,  # Include for debugging
            "input": error.get('input')  # Show what was actually received
        })
    
    # Log validation errors for monitoring (with more context)
    logger.warning(
        f"Validation error on {request.method} {request.url.path}: "
        f"{len(errors)} field(s) failed validation. "
        f"Client IP: {request.client.host if request.client else 'unknown'}"
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation failed",
            "errors": errors,
            "type": "validation_error"
        }
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Global handler for HTTP exceptions.
    Provides consistent error response format.
    """
    logger.error(
        f"HTTP exception on {request.method} {request.url.path}: "
        f"{exc.status_code} - {exc.detail}"
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "type": "http_error",
            "status_code": exc.status_code
        },
        headers=getattr(exc, 'headers', None)
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for unexpected exceptions.
    Logs the full error but returns a generic message to the user.
    """
    logger.exception(
        f"Unexpected error on {request.method} {request.url.path}: {str(exc)}"
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred",
            "type": "internal_error"
        }
    )