from dataclasses import dataclass

@dataclass(frozen=True)
class Slug:
    """URL slug value object"""
    value: str
    
    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise ValueError("Slug cannot be empty")
        
        # Normalize slug (lowercase, hyphens only)
        import re
        normalized = re.sub(r'[^a-z0-9-]', '', self.value.lower().strip())
        normalized = re.sub(r'-+', '-', normalized).strip('-')
        
        if not normalized:
            raise ValueError("Slug cannot be empty after normalization")
        
        object.__setattr__(self, 'value', normalized)
    
    def __str__(self) -> str:
        return self.value
