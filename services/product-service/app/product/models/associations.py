from sqlalchemy import ForeignKey, Table, Column
from ...core.database import Base 
# from .user import User
# from .role import Role
# from .permission import Permission


# Association table for many-to-many relationship between products and categories
product_category_association = Table(
    'product_category_association',
    Base.metadata,
    Column('product_id', ForeignKey('products.id'), primary_key=True),
    Column('category_id', ForeignKey('categories.id'), primary_key=True)
)

# Association table for many-to-many relationship between products and tags
product_tag_association = Table(
    'product_tag_association',
    Base.metadata,
    Column('product_id', ForeignKey('products.id'), primary_key=True),
    Column('tag_id', ForeignKey('tags.id'), primary_key=True)
)