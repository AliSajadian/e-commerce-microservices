from sqlalchemy import ForeignKey, Table, Column
from ...core.database import Base 
# from .user import User
# from .role import Role
# from .permission import Permission


user_roles = Table(
    'auth_user_roles',
    Base.metadata,
    Column('user_id', ForeignKey('auth_users.id'), primary_key=True), #ondelete="CASCADE", passive_deletes=True 
    Column('role_id', ForeignKey('auth_roles.id'), primary_key=True)
)


role_permissions = Table(
    'auth_role_permissions',
    Base.metadata,
    Column('role_id', ForeignKey('auth_roles.id'), primary_key=True),
    Column('permission_id', ForeignKey('auth_permissions.id'), primary_key=True)
)