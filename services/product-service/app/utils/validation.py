from typing import Optional, TypeVar, Type
from pydantic import BaseModel, ValidationError

T = TypeVar('T', bound=BaseModel)

def safe_validate(schema_class: Type[T], data) -> Optional[T]:
    """Safely validate data against a Pydantic schema, returning None if validation fails."""
    try:
        return schema_class.model_validate(data)
    except (ValidationError, Exception):
        return None