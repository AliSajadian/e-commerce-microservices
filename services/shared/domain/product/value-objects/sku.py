from dataclasses import dataclass

@dataclass(frozen=True)
class SKU:
    """SKU value object with validation"""
    value: str
    
    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise ValueError("SKU cannot be empty")
        
        # Normalize SKU (uppercase, no spaces)
        normalized = self.value.strip().upper().replace(' ', '-')
        object.__setattr__(self, 'value', normalized)
        
        # Validate format (alphanumeric + hyphens)
        import re
        if not re.match(r'^[A-Z0-9-]+$', self.value):
            raise ValueError(f"Invalid SKU format: {self.value}")
    
    def __str__(self) -> str:
        return self.value