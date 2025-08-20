import logging
from pydantic import ValidationError
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload # For eagerly loading relationships
from typing import List, Optional
import uuid

from app.product.models import Product, Category, Tag, Inventory, ProductImage
from app.product.schemas import ProductCreateSchema, ProductUpdateSchema, ProductSchema, InventorySchema, ProductImageSchema
from ..exceptions import ObjectVerificationError, ObjectCreationError, ObjectNotFoundError

# ============================================================================
# Product API Services
# ============================================================================

class ProductCRUD:
    """ ===============================
          Producs CRUD Services Class
        ===============================
    """
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def create_product(self, product_in: ProductCreateSchema) -> ProductSchema:
        """
        Creates a new product, its initial inventory, and links categories/tags.
        """
        try:
            # Create the product instance
            db_product = Product(
                name=product_in.name,
                description=product_in.description,
                price=product_in.price,
            )

            # Handle initial inventory
            db_inventory = Inventory(
                product=db_product, # Link product to inventory
                quantity=product_in.initial_stock
            )
            logging.info(f"Created new inventory.")
            self.db_session.add(db_inventory)

            # Handle images <-- ADD THIS SECTION
            if product_in.images:
                db_images = [
                    ProductImage(
                        product=db_product,
                        url=img.url,
                        alt_text=img.alt_text,
                        is_main=img.is_main
                    ) for img in product_in.images
                ]
                self.db_session.add_all(db_images)
                logging.info(f"Created {len(db_images)} product images.")
            
            # Handle categories
            if product_in.category_ids:
                categories = await self.db_session.execute(
                    select(Category).where(Category.id.in_(product_in.category_ids))
                )
                db_product.categories.extend(categories.scalars().all())

            # Handle tags
            if product_in.tag_ids:
                tags = await self.db_session.execute(
                    select(Tag).where(Tag.id.in_(product_in.tag_ids))
                )
                db_product.tags.extend(tags.scalars().all())

            self.db_session.add(db_product)
            await self.db_session.commit()
            await self.db_session.refresh(db_product, attribute_names=["inventory", "images", "categories", "tags"])
            logging.info(f"Created new product.")
            return db_product
        
        except ValidationError as e:
            logging.error(f"Failed to the product data verification. Error: {str(e)}")
            await self.db_session.rollback()
            raise ObjectVerificationError("Category", str(e))
        except Exception as e:
            logging.error(f"Failed to create product. Error: {str(e)}")
            await self.db_session.rollback()
            raise ObjectCreationError(str(e)) 

    async def read_all_products(self, skip: int = 0, limit: int = 100) -> List[ProductSchema]:
        """
        Retrieves a list of all products, eagerly loading relationships.
        """
        result = await self.db_session.execute(
            select(Product)
            .options(selectinload(Product.inventory))
            .options(selectinload(Product.images))
            .options(selectinload(Product.categories))
            .options(selectinload(Product.tags))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def read_product_by_id(self, product_id: uuid.UUID) -> Optional[ProductSchema]:
        """
        Retrieves a product by its ID, eagerly loading relationships.
        """
        try:
            result = await self.db_session.execute(
                select(Product)
                .options(selectinload(Product.inventory))
                .options(selectinload(Product.images))
                .options(selectinload(Product.categories))
                .options(selectinload(Product.tags))
                .where(Product.id == product_id)
            )
            logging.info(f"Retrieved Product {product_id}.")
            return result.scalars().first()

        except NoResultFound:
            logging.warning(f"Product with id {product_id} not found.")
            raise ObjectNotFoundError("Product", product_id)

    async def read_images_by_product_id(self, product_id: uuid.UUID) -> List[ProductImageSchema]:
        """
        Get product images by product id
        """
        # First check if the product image exists
        product_stmt = select(Product).filter(Product.id == product_id)
        product_result = await self.db.execute(product_stmt)
        product = product_result.scalar_one_or_none()

        if not product:
            logging.warning(f"Product with id {product_id} not found.")
            raise ObjectNotFoundError("Product", product_id)
        
        # Product exists, now get product images
        products_image_stmt = select(ProductImage).filter(ProductImage.product.id == product_id).order_by(ProductImage.id)
        products_image_result = await self.db.execute(products_image_stmt)
        product_images = products_image_result.scalars().all()
        
        logging.info(f"Retrieved {len(product_images)} images of product {product_id}.")
        return product_images
   
    async def update_product(self, product_id: uuid.UUID, product_in: ProductUpdateSchema) -> Optional[ProductSchema]:
        """
        Updates an existing product.
        Note: This example only updates direct product fields.
        Updating categories/tags (add/remove) would require more complex logic.
        """
        stmt = select(Product).where(Product.id == product_id)
        result = await self.db_session.execute(stmt)
        db_product = result.scalars().first()

        if not db_product:
            logging.warning(f"Product with id {product_id} not found.")
            raise ObjectNotFoundError("Product", product_id)

        # Update direct fields
        for field, value in product_in.model_dump(exclude_unset=True).items():
            if hasattr(db_product, field):
                setattr(db_product, field, value)

        # Handle images update (example: replace all images)
        if product_in.images is not None:
                # Get current images from the database
                current_images = {img.url: img for img in db_product.images}
                
                # Get incoming images from the request
                incoming_images_urls = {img.url for img in product_in.images}
                
                # Determine images to delete
                images_to_delete = [
                    img for url, img in current_images.items() 
                    if url not in incoming_images_urls
                ]
                for img in images_to_delete:
                    await self.db_session.delete(img)
                    
                # Determine images to add or update
                for img_data in product_in.images:
                    if img_data.url in current_images:
                        # Update existing image
                        db_image = current_images[img_data.url]
                        db_image.alt_text = img_data.alt_text
                        db_image.is_main = img_data.is_main
                    else:
                        # Add new image
                        new_image = ProductImage(
                            product=db_product,
                            url=img_data.url,
                            alt_text=img_data.alt_text,
                            is_main=img_data.is_main
                        )
                        self.db_session.add(new_image)

        # Handle categories update (example: replace all categories)
        if product_in.category_ids is not None:
            db_product.categories.clear() # Clear existing
            if product_in.category_ids:
                categories = await self.db_session.execute(
                    select(Category).where(Category.id.in_(product_in.category_ids))
                )
                db_product.categories.extend(categories.scalars().all())
        
        # Handle tags update (example: replace all tags)
        if product_in.tag_ids is not None:
            db_product.tags.clear() # Clear existing
            if product_in.tag_ids:
                tags = await self.db_session.execute(
                    select(Tag).where(Tag.id.in_(product_in.tag_ids))
                )
                db_product.tags.extend(tags.scalars().all())

        await self.db_session.commit()
        await self.db_session.refresh(db_product, attribute_names=["inventory", "images", "categories", "tags"])
        logging.info(f"Successfully updated product {product_id}.")
        return db_product

    async def update_product_stock(self, product_id: uuid.UUID, quantity_change: int) -> Optional[InventorySchema]:
        """
        Updates the stock quantity of a product's inventory.
        quantity_change can be positive (add stock) or negative (remove stock).
        """
        stmt = select(Inventory).where(Inventory.product_id == product_id)
        result = await self.db_session.execute(stmt)
        db_inventory = result.scalars().first()

        if not db_inventory:
            logging.warning(f"Product with id {product_id} not found.")
            raise ObjectNotFoundError("Product", product_id)
        
        db_inventory.quantity += quantity_change
        if db_inventory.quantity < 0:
            # You might want to raise an error here if stock goes negative
            # For simplicity, we'll just set it to 0 if it goes below zero
            db_inventory.quantity = 0 
        
        await self.db_session.commit()
        await self.db_session.refresh(db_inventory)
        logging.info(f"Successfully updated product stock {product_id}.")
        return db_inventory
    
    async def delete_product(self, product_id: uuid.UUID) -> bool:
        """
        Deletes a product by its ID.
        Due to cascade="all, delete-orphan" on inventory relationship,
        the associated inventory record will also be deleted.
        """
        stmt = delete(Product).where(Product.id == product_id)
        result = await self.db_session.execute(stmt)
        await self.db_session.commit()
        logging.info(f"Successfully deleted product_id {product_id}")
        return result.rowcount > 0 # Returns True if a row was deleted
    
    
    