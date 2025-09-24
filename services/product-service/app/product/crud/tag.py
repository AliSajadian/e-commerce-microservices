import logging
from typing import List
import uuid
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Tag
from ..schemas import TagSchema, TagCreateSchema, TagUpdateSchema
from ...api.exceptions import DatabaseError, DatabaseIntegrityError, InternalServerError, NotFoundError

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
        
    async def create_tag(self, tag_data: TagCreateSchema) -> TagSchema:
        """
        Create tag object
        """
        try:
            tag_dict = tag_data.model_dump(exclude_unset=True)
            tag = Tag(**tag_dict)
            
            self.db_session.add(tag)
            await self.db_session.commit()
            await self.db_session.refresh(tag)
            
            logging.info(f"Created new tag.")
            return tag
              
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

    async def read_all_tags(self) -> List[TagSchema]:
        """
        Get all Tags objects from db
        """
        statement = select(Tag).order_by(Tag.id)

        result = await self.db_session.execute(statement) # --> crud/tag.py line 60
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
            raise None

    async def update_tag(self, tag_id, tag_in: TagUpdateSchema) -> TagSchema:
        """
        Update Tag by id
        """
        # Check tag  exists
        db_tag = self.read_tag_by_id(tag_id)
        if not db_tag:
            logging.warning(f"Tag {tag_id} not found.")
            raise NotFoundError("Tag", tag_id)
        
        # Update direct fields
        for field, value in tag_in.model_dump(exclude_unset=True).items():
            if hasattr(db_tag, field):
                setattr(db_tag, field, value)

        await self.db_session.commit()
        await self.db_session.refresh(db_tag)

        logging.info(f"Successfully updated tag {tag_id}.")
        return db_tag

    async def delete_tag(self, tag_id: uuid.UUID) -> bool:
        """delete tag by id
        """
        db_tag = await self.read_tag_by_id(tag_id)       
        if not db_tag:
            return False

        await self.db_session.delete(db_tag)
        await self.db_session.commit()

        logging.info(f"Successfully deleted tag {tag_id}.")
        return True

       