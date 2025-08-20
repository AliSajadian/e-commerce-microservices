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



