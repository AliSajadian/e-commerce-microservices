import logging
import re
from uuid import UUID
from typing import List
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.exc import NoResultFound, IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Category
from ..schemas import CategoryDetailSchema, CategoryCreateSchema, CategoryUpdateSchema, CategoryResponseSchema, CategorySchema
from ...api.exceptions import ConflictError, NotFoundError, \
    InternalServerError, DatabaseError, DatabaseIntegrityError

# ============================================================================
# Category API Services
# ============================================================================

class CategoryCRUD:
    """ ================================
          Category CRUD Services Class
        ================================
    """
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def create_category(self, category_data: CategoryCreateSchema) -> CategoryResponseSchema:
        """
        Create category object
        """
        try:      
            # 1. Input validation - check if category exists
            db_category = await self.read_category_by_name(category_name=category_data.name)
            if db_category:
                raise ConflictError("Category", category_data.name, "name")
                
            # 2. Validate parent category if provided
            if category_data.parent_id:
                parent_category = await self.read_category_by_id(category_data.parent_id)
                if not parent_category:
                    NotFoundError("Category", category_data.parent_id, "parent_id")
                    
            # 3. Create the category object
            slug = self._slugify(category_data.name)

            new_category = Category(
                name=category_data.name, 
                slug=slug,
                description=category_data.description if category_data.description else None,
                parent_id=category_data.parent_id if category_data.parent_id else None
            )
            
            # 4. Database operations with proper transaction handling
            self.db_session.add(new_category)
            await self.db_session.commit()
            await self.db_session.refresh(new_category)
            
            # 5. Logging with proper context
            logging.info(
                f"Created new category: {new_category.name} (ID: {new_category.id})"
            )
            
            # 6. Return Pydantic schema for API response
            return new_category
 
        except ConflictError:
            # Re-raise ConflictError as-is
            await self.db_session.rollback()
            raise
          
        except NotFoundError:
            # Re-raise NotFoundError as-is
            await self.db_session.rollback()
            raise
        
        except IntegrityError as e:
            # Handle database constraint violations
            await self.db_session.rollback()
            logging.error(f"Database integrity error creating category: {str(e)}")
            raise DatabaseIntegrityError(str(e))
        
        except SQLAlchemyError as e:
            # Handle other database errors
            await self.db_session.rollback()
            logging.error(f"Database error creating category: {str(e)}")
            raise DatabaseError(str(e))
        
        except Exception as e:
            # Handle unexpected errors
            await self.db_session.rollback()
            logging.error(f"Unexpected error creating category: {str(e)}")
            raise InternalServerError(str(e))
        
    async def read_category_tree(self, parent_id=None) -> List[CategoryDetailSchema]:
        # Load all root-level categories
        stmt = (
            select(Category)
            .where(Category.parent_id.is_(None))
            .options(
                # Eager load all nested children
                joinedload(Category.children).options(
                    # Eager load products for all children
                    selectinload(Category.products)
                ),
                # Eager load products for the root categories
                selectinload(Category.products)
            )
        )
        result = await self.db_session.execute(stmt)
        categories = result.scalars().unique().all()
        return categories

        
        # stmt = (
        #     select(Category)
        #     .options(
        #         joinedload(Category.products),
        #     )
        #     .filter(Category.parent_id == parent_id)
        # )
        # result = await self.db_session.execute(stmt)
        # categories = result.unique().scalars().all()

        # async def build_tree(cat: Category):
        #     # Recursively fetch children from DB
        #     child_stmt = (
        #         select(Category)
        #         .options(joinedload(Category.products))
        #         .filter(Category.parent_id == cat.id)
        #     )
        #     child_result = await self.db_session.execute(child_stmt)
        #     children = child_result.unique().scalars().all()
        #     return {
        #         "id": cat.id,
        #         "name": cat.name,
        #         "parent_id": cat.parent_id,
        #         "products": [
        #             {"id": product.id, "name": product.name, "sku": product.sku, "price": product.price} for product in cat.products
        #         ],
        #         "children": [await build_tree(child) for child in children],
        #     }

        # return [await build_tree(cat) for cat in categories]

    async def read_category_by_name(self, category_name: str) -> CategoryDetailSchema:
        """
        Get category by name
        """
        try:
            statement = select(Category).filter(Category.name == category_name)
            result = await self.db_session.execute(statement)           
            category = result.scalars().first()
            logging.info(f"Retrieved category {category_name}.")
            return category
        except NoResultFound:
            logging.warning(f"Category with name {category_name} not found.")
            return None

    async def read_category_by_id(self, category_id: int) -> CategoryDetailSchema:
        """
        Get category by id
        """
        try:
            statement = (
                select(Category)
                .options(selectinload(Category.children)) # Eagerly load the children
                .where(Category.id == category_id)
            )
            result = await self.db_session.execute(statement)
            category = result.scalar_one_or_none()
            
            logging.info(f"Retrieved category {category_id}.")
            return category
        except NoResultFound:
            logging.warning(f"Category with id {category_id} not found.")
            raise None
            
    async def update_category(self, category_id: UUID, data_category: CategoryUpdateSchema) -> CategoryResponseSchema:
        """
        Update Category by id
        """
        statement = select(Category).filter(Category.id == category_id)

        result = await self.db_session.execute(statement)
        db_category = result.scalars().scalar_one_or_none()

        if not db_category:
            logging.warning(f"Category {category_id} not found.")
            raise NotFoundError("Category", category_id)
        
        # Update direct fields
        for field, value in data_category.model_dump(exclude_unset=True).items():
            if hasattr(db_category, field):
                setattr(db_category, field, value)

        await self.db_session.commit()
        await self.db_session.refresh(db_category)

        logging.info(f"Successfully updated category {category_id}.")
        return db_category

    async def delete_category(self, category_id: UUID) -> bool:
        """delete category by id
        """
        stmt = select(Category).where(Category.id == category_id)
        category = (await self.db_session.execute(stmt)).scalar_one_or_none()
        
        if not category:
            return False

        await self.db_session.delete(category)
        await self.db_session.commit()

        logging.info(f"Successfully deleted category {category_id}.")
        return True
 
        # Helper function to create a URL-friendly slug
    
    def _slugify(self, s: str) -> str:
        """
        Create URL-friendly slug from text.
        
        Args:
            text: Text to slugify
            
        Returns:
            str: URL-friendly slug
        """
        s = s.lower().strip()
        s = re.sub(r'[^\w\s-]', '', s)
        s = re.sub(r'[\s_]+', '-', s)
        return s


       