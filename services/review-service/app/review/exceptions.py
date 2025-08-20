from fastapi import HTTPException

from fastapi import HTTPException

class ObjectError(HTTPException):
    """Base exception for author-related errors"""
    pass

class ObjectNotFoundError(ObjectError):
    def __init__(self, name: str, book_id=None):
        message = f"{name} not found" if book_id is None else f"{name} with id {book_id} not found"
        super().__init__(status_code=404, detail=message)

class ObjectCreationError(ObjectError):
    def __init__(self, error: str):
        super().__init__(status_code=409, detail=["the request could not be completed due to a conflict with the current state of the target resource.", f"Error: {error}"])

class ObjectVerificationError(ObjectError):
    def __init__(self, name: str, error: str):
        super().__init__(status_code=422, detail=f"Failed to the {name} data verification: {error}")

class UserError(HTTPException):
    """Base exception for user-related errors"""
    pass

class ObjectAlreadyRegistered(ObjectError):
    def __init__(self, name: str):
        message = f"{name} already registered"
        super().__init__(status_code=409, detail=message)

class PasswordMismatchError(UserError):
    def __init__(self):
        super().__init__(status_code=400, detail="New passwords do not match")

class InvalidPasswordError(UserError):
    def __init__(self):
        super().__init__(status_code=401, detail="Current password is incorrect")

class AuthenticationError(HTTPException):
    def __init__(self, message: str = "Could not validate user"):
        super().__init__(status_code=401, detail=message)


class RefreshTokenMissingError(HTTPException):
    def __init__(self, message: str = "Refresh token missing"):
        super().__init__(status_code=401, detail=message)
        
class RefreshTokenTypeInvalidError(HTTPException):
    def __init__(self, message: str = "Invalid token type"):
        super().__init__(status_code=403, detail=message)

class RefreshTokenInvalidError(HTTPException):
    def __init__(self, message: str = "Invalid refresh token"):
        super().__init__(status_code=403, detail=message)
        
class RefreshTokenExpireError(HTTPException):
    def __init__(self, message: str = "Token expired or revoked"):
        super().__init__(status_code=403, detail=message)
        
class RefreshTokenMisMatchError(HTTPException):
    def __init__(self, message: str = "Token mismatched"):
        super().__init__(status_code=403, detail=message)
        