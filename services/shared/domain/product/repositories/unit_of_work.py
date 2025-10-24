"""
Unit of Work pattern abstract base class.
"""
from abc import ABC, abstractmethod
from typing import Any


class UnitOfWork(ABC):
    """
    Abstract base class for Unit of Work pattern.
    
    The Unit of Work pattern maintains a list of objects affected by a business transaction
    and coordinates writing out changes and resolving concurrency problems.
    """
    
    def __enter__(self):
        """Enter the unit of work context."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the unit of work context."""
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()
    
    @property
    @abstractmethod
    def products(self):
        """Get the products repository."""
        raise NotImplementedError
    
    @property
    @abstractmethod
    def categories(self):
        """Get the categories repository."""
        raise NotImplementedError
    
    @property
    @abstractmethod
    def inventory(self):
        """Get the inventory repository."""
        raise NotImplementedError
    
    @property
    @abstractmethod
    def tags(self):
        """Get the tags repository."""
        raise NotImplementedError
    
    @property
    @abstractmethod
    def product_images(self):
        """Get the product images repository."""
        raise NotImplementedError
    
    @abstractmethod
    def commit(self):
        """Commit the current transaction."""
        raise NotImplementedError
    
    @abstractmethod
    def rollback(self):
        """Rollback the current transaction."""
        raise NotImplementedError
    
    def flush(self):
        """Flush pending changes without committing (optional method)."""
        pass
    
    def refresh(self, instance: Any):
        """Refresh an instance from the database (optional method)."""
        pass
    
    def clear_cache(self):
        """Clear the session cache (optional method)."""
        pass