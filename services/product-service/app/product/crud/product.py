import logging
import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload # For eagerly loading relationships

from . import CategoryCRUD, InventoryCRUD, TagCRUD
from app.product.models import Product, Category, Tag, Inventory, ProductImage
from app.product.schemas import ProductCreateSchema, ProductUpdateSchema, \
    ProductSchema, InventorySchema
from ...api.exceptions import BaseError, DatabaseError, DatabaseIntegrityError, \
    InternalServerError, NotFoundError

# ============================================================================
# Product API Services
# ============================================================================

class ProductCRUD:
    """ ===============================
          Product CRUD Services Class
        ===============================
    """
    def __init__(self, db_session: AsyncSession, 
                 category_service: CategoryCRUD, 
                 inventory_service: InventoryCRUD,
                 tag_service: TagCRUD):
        self.db_session = db_session
        self.category_service  = category_service
        self.inventory_service  = inventory_service
        self.tag_service = tag_service

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
                sku=product_in.sku,
                is_active=product_in.is_active,
                category_id=product_in.category_id
            )

            # Handle initial inventory
            db_inventory = Inventory(
                product_id=db_product.id, # Link product to inventory
                quantity=product_in.initial_quantity,
                reserved_quantity=product_in.reserved_quantity,
                warehouse_location=product_in.warehouse_location
            )
            logging.info(f"Created new inventory.")
            self.db_session.add(db_inventory)

            # Handle images <-- ADD THIS SECTION
            if product_in.images:
                db_images = [
                    ProductImage(
                        product_id=db_product.id,
                        url=img.url,
                        alt_text=img.alt_text,
                        is_main=img.is_main
                    ) for img in product_in.images
                ]
                self.db_session.add_all(db_images)
                logging.info(f"Created {len(db_images)} product images.")
            
            # Handle tags
            if product_in.tag_ids:
                tags = await self.db_session.execute(
                    select(Tag).where(Tag.id.in_(product_in.tag_ids))
                )
                db_product.tags.extend(tags.scalars().all())

            self.db_session.add(db_product)
            await self.db_session.commit()
            await self.db_session.refresh(db_product, attribute_names=["inventory", "images", "category", "tags"])
            
            logging.info(f"Created new product.")
            return db_product
        
        except BaseError:
            # Re-raise NotFoundError, ConflictError as-are
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

    async def read_all_products(self, skip: int = 0, limit: int = 100) -> List[ProductSchema]:
        """
        Retrieves a list of all products, eagerly loading relationships.
        """
        result = await self.db_session.execute(
            select(Product)
            .options(selectinload(Product.inventory))
            .options(selectinload(Product.images))
            .options(joinedload(Product.category))
            .options(selectinload(Product.tags))
            .offset(skip)
            .limit(limit)
        )
        return result.unique().scalars().all()
    
    async def read_product_by_id(self, product_id: uuid.UUID) -> Optional[ProductSchema]:
        """
        Retrieves a product by its ID, eagerly loading relationships.
        """
        try:
            result = await self.db_session.execute(
                select(Product)
                .options(selectinload(Product.inventory))
                .options(selectinload(Product.images))
                .options(joinedload(Product.category))
                .options(selectinload(Product.tags))
                .where(Product.id == product_id)
            )
            logging.info(f"Retrieved Product {product_id}.")
            return result.scalars().first()

        except NoResultFound:
            logging.warning(f"Product with id {product_id} not found.")
            raise None
            
    async def read_products_by_category_id(self, category_id: int) -> ProductSchema:
        """
        Get category products by category id
        """
        # First check if the category exists
        category = await self.category_service.read_category_by_id(category_id)
        if not category:
            logging.warning(f"Category with id {category_id} not found.")
            raise NotFoundError("Category", category_id)
        
        # Category exists, now get products
        products_stmt = select(Product).filter(Product.category_id == category_id).order_by(Product.id)
        products_result = await self.db_session.execute(products_stmt)
        products = products_result.scalars().all()
        
        logging.info(f"Retrieved {len(products)} products of category {category_id}.")
        return products   
                
    async def read_products_by_tag_id(self, tag_id: uuid.UUID)-> List[ProductSchema]:
        """
        Get tag by id
        """
        # First check if the tag exists
        db_tag = self.tag_service.read_tag_by_id(tag_id)
        if not db_tag:
            logging.warning(f"Tag with id {tag_id} not found.")
            raise NotFoundError("Tag", tag_id)
        
        # Tag exists, now get products
        products_stmt = select(Product).join(Product.tags).filter(Tag.id == tag_id).order_by(Product.id)
        products_result = await self.db_session.execute(products_stmt)
        db_products = products_result.scalars().all()
        
        logging.info(f"Retrieved {len(db_products)} products of tag {tag_id}.")
        return db_products
            
    async def update_product(self, product_id: uuid.UUID, product_in: ProductUpdateSchema) -> Optional[ProductSchema]:
        """
        Updates an existing product.
        Note: This example only updates direct product fields.
        Updating categories/tags (add/remove) would require more complex logic.
        """
        # check product exists
        db_product = self.read_product_by_id(product_id)
        if not db_product:
            logging.warning(f"Product with id {product_id} not found.")
            raise NotFoundError("Product", product_id)

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
        # First, get the product to ensure it exists and to return the full ProductResponse
        product = await self.read_product_by_id(product_id)
        if not product:
            raise NotFoundError("Product", product_id)

        db_inventory: InventorySchema = self.inventory_service._read_inventory_by_product_id(product_id)
        if not db_inventory:
            logging.warning(f"Inventory with id {product_id} not found.")
            raise NotFoundError("Inventory", product_id, "product_id")
        
        db_inventory.quantity += quantity_change
        if db_inventory.quantity < 0:
            # You might want to raise an error here if stock goes negative
            # For simplicity, we'll just set it to 0 if it goes below zero
            db_inventory.quantity = 0 
        
        await self.db_session.commit()
        await self.db_session.refresh(db_inventory)
        # Refresh the product object to reflect the updated inventory quantity
        await self.db_session.refresh(product, attribute_names=["inventory"])
        logging.info(f"Successfully updated product stock {product_id}.")
        return db_inventory
    
    async def delete_product(self, product_id: uuid.UUID) -> bool:
        """
        Deletes a product by its ID.
        Due to cascade="all, delete-orphan" on inventory relationship,
        the associated inventory record will also be deleted.
        """
        # check product exists
        db_product = await self.read_product_by_id(product_id)
        if not db_product:
            return False

        await self.db_session.delete(db_product)
        await self.db_session.commit()

        logging.info(f"Successfully deleted product {product_id}.")
        return True
    
    # @Injectable()
    # export class SkuService {
    # generateSku(product: Partial<Product>): string {
    #     const prefix = product.category?.substring(0, 3).toUpperCase() || 'PROD';
    #     const baseCode = product.name.substring(0, 3).toUpperCase();
    #     const variantCode = this.getVariantCode(product);
    #     const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        
    #     return `${prefix}-${baseCode}-${variantCode}-${randomSuffix}`;
    # }

    # private getVariantCode(product: Partial<Product>): string {
    #     if (product.color && product.size) {
    #     return `${product.color.substring(0, 2)}${product.size}`.toUpperCase();
    #     }
    #     if (product.color) return product.color.substring(0, 3).toUpperCase();
    #     if (product.size) return `SZ${product.size.toUpperCase()}`;
    #     return 'DEF';
    # }
    # }
   
   
   
    