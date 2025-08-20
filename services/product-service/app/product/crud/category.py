import logging
from typing import List
from pydantic import ValidationError
from sqlalchemy import UUID, select
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy.exc import IntegrityError

from ..models import Category, Product
from ..schemas import CategorySchema, ProductSchema, CategoryCreateSchema
from ..exceptions import ObjectVerificationError, ObjectCreationError, ObjectNotFoundError

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

    async def create_category(self, data: CategoryCreateSchema) -> CategorySchema:
        """
        Create category object
        """
        try:
            self.db_session.add(data)
            category = await self.db_session.commit()
            await self.db_session.refresh(data)
            
            logging.info(f"Created new category.")
            return category
    
        except ValidationError as e:
            logging.error(f"Failed to the category data verification. Error: {str(e)}")
            await self.db_session.rollback()
            raise ObjectVerificationError("Category", str(e))
        except Exception as e:
            logging.error(f"Failed to create category. Error: {str(e)}")
            await self.db_session.rollback()
            raise ObjectCreationError(str(e))        

    async def read_category_tree(self, parent_id=None) -> List[CategorySchema]:
        stmt = (
            select(Category)
            .options(
                joinedload(Category.products),
            )
            .filter(Category.parent_id == parent_id)
        )
        result = await self.db_session.execute(stmt)
        categories = result.unique().scalars().all()

        async def build_tree(cat: Category):
            # Recursively fetch children from DB
            child_stmt = (
                select(Category)
                .options(joinedload(Category.products))
                .filter(Category.parent_id == cat.id)
            )
            child_result = await self.db_session.execute(child_stmt)
            children = child_result.unique().scalars().all()
            return {
                "id": cat.id,
                "name": cat.name,
                "parent_id": cat.parent_id,
                "products": [
                    {"id": product.id, "name": product.name, "sku": product.sku, "price": product.price} for product in cat.products
                ],
                "children": [await build_tree(child) for child in children],
            }

        return [await build_tree(cat) for cat in categories]

    async def read_category_by_id(self, category_id: int) -> CategorySchema:
        """
        Get category by id
        """
        try:
            statement = select(Category).filter(Category.id == category_id)
            result = await self.db_session.execute(statement)           
            category = result.scalars().first()
            logging.info(f"Retrieved category {category_id}.")
            return category
        except NoResultFound:
            logging.warning(f"Category with id {category_id} not found.")
            raise ObjectNotFoundError("Category", category_id)
            
    async def read_products_by_category_id(self, category_id: int) -> ProductSchema:
        """
        Get category products by category id
        """
        # First check if the category exists
        category_stmt = select(Category).filter(Category.id == category_id)
        category_result = await self.db_session.execute(category_stmt)
        category = category_result.scalar_one_or_none()

        if not category:
            logging.warning(f"Category with id {category_id} not found.")
            raise ObjectNotFoundError("Category", category_id)
        
        # Category exists, now get products
        products_stmt = select(Product).filter(Product.category_id == category_id).order_by(Product.id)
        products_result = await self.db_session.execute(products_stmt)
        products = products_result.scalars().all()
        
        logging.info(f"Retrieved {len(products)} products of category {category_id}.")
        return products
            
    async def update_category(self, category_id, data) -> CategorySchema:
        """
        Update Category by id
        """
        statement = select(Category).filter(Category.id == category_id)

        result = await self.db_session.execute(statement)
        category = result.scalars().scalar_one_or_none()

        if not category:
            logging.warning(f"Category {category_id} not found.")
            raise ObjectNotFoundError("Category", category_id)
        
        category.name = data["name"]

        await self.db_session.commit()
        await self.db_session.refresh(category)

        logging.info(f"Successfully updated category {category_id}.")
        return category

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


       