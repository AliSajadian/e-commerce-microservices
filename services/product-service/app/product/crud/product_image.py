import logging
from typing import List
from uuid import UUID
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy.exc import IntegrityError

from ..models import ProductImage
from ..schemas import ProductImageSchema, ProductImageCreateSchema, ProductImageUpdateSchema
from ..exceptions import ObjectVerificationError, ObjectCreationError, ObjectNotFoundError

# ============================================================================
# Product Images API Services
# ============================================================================

class ProductImageCRUD:
    """ ===================================== 
          Produc Images CRUD Services Class
        =====================================
    """
    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        
    async def create_image(self, data: ProductImageCreateSchema) -> ProductImageSchema:
        """
        Create product image object
        """
        try:
            self.db_session.add(data)
            product_image = await self.db_session.commit()
            await self.db_session.refresh(data)
            
            logging.info(f"Created new product image.")
            return product_image
    
        except ValidationError as e:
            logging.error(f"Failed to the product image data verification. Error: {str(e)}")
            await self.db_session.rollback()
            raise ObjectVerificationError("Product Image", str(e))
        except Exception as e:
            logging.error(f"Failed to create product image. Error: {str(e)}")
            await self.db_session.rollback()
            raise ObjectCreationError(str(e))        

    async def read_all_images(self) -> List[ProductImageSchema]:
        """
        Get all product images objects from db
        """
        statement = select(ProductImage).order_by(ProductImage.id)

        result = await self.db_session.execute(statement)
        product_images = result.scalars().all()
        
        logging.info(f"Retrieved {len(product_images)} product images.")
        return product_images

    async def read_image_by_id(self, product_image_id: UUID) -> ProductImageSchema:
        """
        Get product image by id
        """
        try:
            statement = select(ProductImage).filter(ProductImage.id == product_image_id)
            result = await self.db_session.execute(statement)           
            product_image = result.scalars().one()
            logging.info(f"Retrieved product image {product_image_id}.")
            return product_image
        except NoResultFound:
            logging.warning(f"Product image with id {product_image_id} not found.")
            raise ObjectNotFoundError("Product image", product_image_id)
         
    async def update_image(self, product_image_id: UUID, data: ProductImageUpdateSchema) -> ProductImageSchema:
        """
        Update product image by id
        """
        statement = select(ProductImage).filter(ProductImage.id == product_image_id)

        result = await self.db_session.execute(statement)
        product_image = result.scalars().scalar_one_or_none()

        if not product_image:
            logging.warning(f"Product image {product_image_id} not found.")
            raise ObjectNotFoundError("Product image", product_image_id)
        
        product_image.name = data["name"]

        await self.db_session.commit()
        await self.db_session.refresh(product_image)

        logging.info(f"Successfully updated product image {product_image_id}.")
        return product_image

    async def delete_image(self, product_image_id: UUID) -> bool:
        """delete product image by id
        """
        stmt = select(ProductImage).where(ProductImage.id == product_image_id)
        product_image = (await self.db_session.execute(stmt)).scalar_one_or_none()
        
        if not product_image:
            return False

        await self.db_session.delete(product_image)
        await self.db_session.commit()

        logging.info(f"Successfully deleted product image {product_image_id}.")
        return True

       