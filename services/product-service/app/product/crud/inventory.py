import logging
from typing import List
from uuid import UUID
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
# from sqlalchemy.exc import IntegrityError

from ..models import Inventory
from ..schemas import InventorySchema, InventoryCreateSchema, InventoryUpdateSchema
from ..exceptions import ObjectVerificationError, ObjectCreationError, ObjectNotFoundError

# ============================================================================
# Inventory API Services
# ============================================================================

class InventoryCRUD:
    """ =================================
          Inventory CRUD Services Class 
        =================================
    """    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def create_inventory(self, data: InventoryCreateSchema) -> InventorySchema:
        """
        Create inventory object
        """
        try:
            self.db_session.add(data)
            inventory = await self.db_session.commit()
            await self.db_session.refresh(data)
            
            logging.info(f"Created new inventory.")
            return inventory
    
        except ValidationError as e:
            logging.error(f"Failed to the inventory data verification. Error: {str(e)}")
            await self.db_session.rollback()
            raise ObjectVerificationError("Inventory", str(e))
        except Exception as e:
            logging.error(f"Failed to create inventory. Error: {str(e)}")
            await self.db_session.rollback()
            raise ObjectCreationError(str(e))        

    async def read_all_inventories(self) -> List[InventorySchema]:
        """
        Get all Inventorys objects from db
        """

        result = await self.db_session.execute(
            select(Inventory)
            .options(selectinload(Inventory.product))
            .order_by(Inventory.id)
        )
        inventorys = result.scalars().all()
        
        logging.info(f"Retrieved {len(inventorys)} inventorys.")
        return inventorys

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
            raise ObjectNotFoundError("Inventory", inventory_id)         

    async def update_inventory(self, inventory_id: UUID, data: InventoryUpdateSchema) -> InventorySchema:
        """
        Update Inventory by id
        """
        statement = select(Inventory).filter(Inventory.id == inventory_id)

        result = await self.db_session.execute(statement)
        inventory = result.scalars().one_or_none()

        if not inventory:
            logging.warning(f"Inventory {inventory_id} not found.")
            raise ObjectNotFoundError("Inventory", inventory_id)
        
        # if "product_id" in data:
        #     inventory.product_id = data["product_id"]
        if "quantity" in data:
            inventory.quantity = data["quantity"]

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

       