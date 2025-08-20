import logging
from typing import List
import uuid
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy.exc import IntegrityError

from ..models import Tag, Product
from ..schemas import TagSchema, TagCreateSchema, TagUpdateSchema, ProductSchema
from ..exceptions import ObjectVerificationError, ObjectCreationError, ObjectNotFoundError

# ============================================================================
# Tag API Services
# ============================================================================

class TagCRUD:
    """ ============================
          Tags CRUD Services Class
        ============================
    """
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        
    async def create_tag(self, data: TagCreateSchema) -> TagSchema:
        """
        Create tag object
        """
        try:
            self.db_session.add(data)
            tag = await self.db_session.commit()
            await self.db_session.refresh(data)
            
            logging.info(f"Created new tag.")
            return tag
    
        except ValidationError as e:
            logging.error(f"Failed to the tag data verification. Error: {str(e)}")
            await self.db_session.rollback()
            raise ObjectVerificationError("Tag", str(e))
        except Exception as e:
            logging.error(f"Failed to create tag. Error: {str(e)}")
            await self.db_session.rollback()
            raise ObjectCreationError(str(e))        

    async def read_all_tags(self) -> List[TagSchema]:
        """
        Get all Tags objects from db
        """
        statement = select(Tag).order_by(Tag.id)

        result = await self.db_session.execute(statement)
        tags = result.scalars().all()
        
        logging.info(f"Retrieved {len(tags)} tags.")
        return tags

    async def read_tag_by_id(self, tag_id: uuid.UUID) -> TagSchema:
        """
        Get tag by id
        """
        try:
            statement = select(Tag).filter(Tag.id == tag_id)
            result = await self.db_session.execute(statement)           
            tag = result.scalars().one()
            logging.info(f"Retrieved tag {tag_id}.")
            return tag
        except NoResultFound:
            logging.warning(f"Tag with id {tag_id} not found.")
            raise ObjectNotFoundError("Tag", tag_id)
                
    async def read_products_by_tag_id(self, tag_id: uuid.UUID)-> List[ProductSchema]:
        """
        Get tag by id
        """
        # First check if the tag exists
        tag_stmt = select(Tag).filter(Tag.id == tag_id)
        tag_result = await self.db_session.execute(tag_stmt)
        tag = tag_result.scalar_one_or_none()

        if not tag:
            logging.warning(f"Tag with id {tag_id} not found.")
            raise ObjectNotFoundError("Tag", tag_id)
        
        # Tag exists, now get products
        products_stmt = select(Product).filter(Product.tag_id == tag_id).order_by(Product.id)
        products_result = await self.db_session.execute(products_stmt)
        products = products_result.scalars().all()
        
        logging.info(f"Retrieved {len(products)} products of tag {tag_id}.")
        return products
            
    async def update_tag(self, tag_id, data: TagUpdateSchema) -> TagSchema:
        """
        Update Tag by id
        """
        statement = select(Tag).filter(Tag.id == tag_id)

        result = await self.db_session.execute(statement)
        tag = result.scalars().scalar_one_or_none()

        if not tag:
            logging.warning(f"Tag {tag_id} not found.")
            raise ObjectNotFoundError("Tag", tag_id)
        
        tag.name = data["name"]

        await self.db_session.commit()
        await self.db_session.refresh(tag)

        logging.info(f"Successfully updated tag {tag_id}.")
        return tag

    async def delete_tag(self, db: AsyncSession, tag_id: uuid.UUID) -> bool:
        """delete tag by id
        """
        stmt = select(Tag).where(Tag.id == tag_id)
        tag = (await self.db_session.execute(stmt)).scalar_one_or_none()
        
        if not tag:
            return False

        await self.db_session.delete(tag)
        await self.db_session.commit()

        logging.info(f"Successfully deleted tag {tag_id}.")
        return True

       