import logging
from typing import List
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
# from sqlalchemy.exc import IntegrityError

# from .product import ProductCRUD
from ..models import Inventory
from ..schemas import InventorySchema, InventoryCreateSchema, InventoryUpdateSchema
from ...api.exceptions import BadRequestError, BaseError, DatabaseError, DatabaseIntegrityError, \
    ConflictError, NotFoundError, InternalServerError
# ============================================================================
# Inventory API Services
# ============================================================================

class InventoryCRUD:
    """ =================================
          Inventory CRUD Services Class 
        =================================
    """    
    def __init__(self, db_session: AsyncSession 
                #  product_service: ProductCRUD
                 ):
        self.db_session = db_session
        # self.product_service  = product_service

    async def create_inventory(self, inventory_data: InventoryCreateSchema) -> InventorySchema:
        """
        Create inventory object
        """
        try:
            # db_product = await self.product_service.read_product_by_id(inventory_data.product_id)
            # if not db_product:
            #     raise NotFoundError("Product", inventory_data.product_id, "id")

            db_inventory = self._read_inventory_by_product_id(product_id=inventory_data.product_id)
            if db_inventory:
                raise ConflictError("Inventory", inventory_data.product_id, "product_id")

            if inventory_data.reserved_quantity > inventory_data.quantity:
                raise BadRequestError("Reserved quantity cannot exceed total quantity")
            
            new_inventory = Inventory(
                product_id=inventory_data.product_id,
                quantity=inventory_data.quantity,
                reserved_quantity=inventory_data.reserved_quantity or 0,
                location=inventory_data.location,
            )

            self.db_session.add(new_inventory)
            inventory = await self.db_session.commit()
            await self.db_session.refresh(new_inventory)
            
            # logging.info(
            #     f"Created inventory for product '{db_product.name}' "
            #     f"(Product ID: {db_product.id}, Quantity: {new_inventory.quantity})"
            # )
            
            return inventory
    
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

    async def read_all_inventories(self) -> List[InventorySchema]:
        """
        Get all Inventories objects from db
        """

        result = await self.db_session.execute(
            select(Inventory)
            .options(selectinload(Inventory.product))
            .order_by(Inventory.id)
        )
        inventories = result.scalars().all()
        
        logging.info(f"Retrieved {len(inventories)} inventories.")
        return inventories

    async def read_inventory_by_id(self, inventory_id: UUID) -> InventorySchema:
        """
        Get inventory by id
        """
        try:
            statement = select(Inventory).filter(Inventory.id == inventory_id)
            result = await self.db_session.execute(statement)           
            inventory = result.scalars().one()
            logging.info(f"Retrieved inventory {inventory_id}.")
            return inventory
        except NoResultFound:
            logging.warning(f"Inventory with id {inventory_id} not found.")
            raise NotFoundError("Inventory", inventory_id)         

    async def _read_inventory_by_product_id(self, product_id: UUID) -> InventorySchema:
        """
        Get inventory by product id
        """
        try:
            statement = select(Inventory).filter(Inventory.product_id == product_id)
            result = await self.db_session.execute(statement)           
            inventory = result.scalars().one()
            logging.info(f"Retrieved inventory {product_id}.")
            return inventory
        except NoResultFound:
            logging.warning(f"Inventory with product id {product_id} not found.")
            raise None        

    async def update_inventory(self, inventory_id: UUID, inventory_data: InventoryUpdateSchema) -> InventorySchema:
        """
        Update Inventory by id
        """
        statement = select(Inventory).filter(Inventory.id == inventory_id)

        result = await self.db_session.execute(statement)
        inventory = result.scalars().one_or_none()

        if not inventory:
            logging.warning(f"Inventory {inventory_id} not found.")
            raise NotFoundError("Inventory", inventory_id)
        
        # if "product_id" in data:
        #     inventory.product_id = data["product_id"]
        if "quantity" in inventory_data:
            inventory.quantity = inventory_data["quantity"]

        await self.db_session.commit()
        await self.db_session.refresh(inventory)

        logging.info(f"Successfully updated inventory {inventory_id}.")
        return inventory

    async def delete_inventory(self, inventory_id: UUID) -> bool:
        """delete inventory by id
        """
        stmt = select(Inventory).where(Inventory.id == inventory_id)
        inventory = (await self.db_session.execute(stmt)).scalar_one_or_none()
        
        if not inventory:
            return False

        await self.db_session.delete(inventory)
        await self.db_session.commit()

        logging.info(f"Successfully deleted inventory {inventory_id}.")
        return True

       