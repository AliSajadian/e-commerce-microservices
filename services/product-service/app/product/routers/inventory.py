from http import HTTPStatus
from typing import List
from uuid import UUID
from fastapi import APIRouter, Path

from ..crud import InventoryCRUD
from ..schemas.inventory import InventoryCreateSchema, InventorySchema, InventoryUpdateSchema
from ...api.dependencies.database import AsyncDbSession

# ============================================================================
# Inventory router Endpoints
# ============================================================================

routers = APIRouter()

@routers.post("", status_code=HTTPStatus.CREATED)
async def create_inventory(db: AsyncDbSession, inventory_data: InventoryCreateSchema) -> InventorySchema:
    """API endpoint for creating a inventory resource

    Args:
        inventory_data (InventoryCreate): data for creating a inventory using the inventory schema

    Returns:
        dict: inventory that has been created
    """
    new_inventory = InventorySchema(
        name=inventory_data.name, 
    )
    inventory_services = InventoryCRUD(db)
    inventory = await inventory_services.create_inventory(new_inventory)
    return inventory

@routers.get("", response_model=List[InventorySchema])
async def get_all_inventorys(db: AsyncDbSession) -> List[InventorySchema]:
    """API endpoint for listing all inventory resources
    """
    inventory_services = InventoryCRUD(db)
    inventorys = await inventory_services.read_all_inventories()
    return inventorys

@routers.get("/{inventory_id}")
async def get_inventory_by_id(db: AsyncDbSession, 
    inventory_id: UUID = Path(..., description="The inventory id, you want to find: "),
    # query_param: str = Query(None, max_length=5)
) -> InventorySchema:
    """API endpoint for retrieving a inventory by its ID

    Args:
        inventory_id (int): the ID of the inventory to retrieve

    Returns:
        dict: The retrieved inventory
    """
    inventory_services = InventoryCRUD(db)
    inventory = await inventory_services.read_inventory_by_id(inventory_id)
    return inventory

@routers.patch("/{inventory_id}")
async def update_inventory(db: AsyncDbSession, data: InventoryUpdateSchema, 
    inventory_id: UUID = Path(..., description="The inventory id, you want to update: ")) -> InventorySchema:
    """Update by ID

    Args:
        inventory_id (UUID): ID of inventory to update
        data (InventoryCreate): data to update inventory

    Returns:
        dict: the updated inventory
    """
    inventory_services = InventoryCRUD(db)
    inventory = await inventory_services.update_inventory(
        inventory_id, 
        data=data.model_dump(exclude_unset=True)
    )
    return inventory

@routers.delete("/{inventory_id}", status_code=HTTPStatus.NO_CONTENT)
async def delete_inventory(db: AsyncDbSession, inventory_id: UUID = Path(..., description="The inventory id, you want to delete: ")) -> None:
    """
    Delete inventory by id

    Args:
        inventory_id (str): ID of inventory to delete
    """
    inventory_services = InventoryCRUD(db)
    result = await inventory_services.delete_inventory(inventory_id)
    return result
