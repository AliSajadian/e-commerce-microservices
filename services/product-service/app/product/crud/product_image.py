import logging
from typing import List
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy.exc import IntegrityError

from . import ProductCRUD
from ..models import ProductImage
from ..schemas import ProductImageSchema, ProductImageCreateSchema, ProductImageUpdateSchema
from ...api.exceptions import BaseError, DatabaseError, DatabaseIntegrityError, InternalServerError, NotFoundError

# ============================================================================
# Product Images API Services
# ============================================================================

class ProductImageCRUD:
    """ ===================================== 
          Product Images CRUD Services Class
        =====================================
    """
    
    def __init__(self, db_session: AsyncSession, 
                 product_service: ProductCRUD):
        self.db_session = db_session
        self.product_service = product_service
        
    async def create_image(self, product_image_data: ProductImageCreateSchema) -> ProductImageSchema:
        """
        Create product image object
        """
        try:
            db_product = await self.product_service.read_product_by_id(product_image_data.product_id)
            if not db_product:
                raise NotFoundError("Product", product_image_data.product_id, "id")

            self.db_session.add(product_image_data)
            db_product_image = await self.db_session.commit()
            await self.db_session.refresh(product_image_data)
            
            logging.info(f"Created new product image.")
            return db_product_image
    
        except BaseError:
            # Re-raise NotFoundError as-are
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
            raise None         

    async def read_images_by_product_id(self, product_id: UUID) -> List[ProductImageSchema]:
        """
        Get product images by product id
        """
        # First check if the product image exists
        product = self.product_service.read_product_by_id(product_id)
        if not product:
            logging.warning(f"Product with id {product_id} not found.")
            raise NotFoundError("Product", product_id)
        
        # Product exists, now get product images
        products_image_stmt = select(ProductImage).filter(ProductImage.product.id == product_id).order_by(ProductImage.id)
        products_image_result = await self.db_session.execute(products_image_stmt)
        product_images = products_image_result.scalars().all()
        
        logging.info(f"Retrieved {len(product_images)} images of product {product_id}.")
        return product_images

    async def update_image(self, product_image_id: UUID, product_image_in: ProductImageUpdateSchema) -> ProductImageSchema:
        """
        Update product image by id
        """
        statement = select(ProductImage).filter(ProductImage.id == product_image_id)
        result = await self.db_session.execute(statement)
        product_image = result.scalars().scalar_one_or_none()

        if not product_image:
            logging.warning(f"Product image {product_image_id} not found.")
            raise NotFoundError("Product image", product_image_id)
        
        # Update direct fields
        for field, value in product_image_in.model_dump(exclude_unset=True).items():
            if hasattr(product_image, field):
                setattr(product_image, field, value)

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

       