from sqlalchemy.ext.asyncio import AsyncSession

from ..schemas import InventorySchema, InventoryCreateSchema
from ..crud import ProductCRUD, InventoryCRUD

class InventoryService:
    """
    Alternative: Composite service that orchestrates multiple CRUD operations
    """
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.product_crud = ProductCRUD(db_session)
        self.inventory_crud = InventoryCRUD(db_session, self.product_crud)
    
    async def create_inventory_item(self, inventory_data: InventoryCreateSchema) -> InventorySchema:
        """High-level service method that orchestrates inventory creation."""
        return await self.inventory_crud.create_inventory(inventory_data)
    
    async def get_product_with_inventory(self, product_id: int):
        """Example of cross-entity operation."""
        product = await self.product_crud.read_product_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        inventory = await self.inventory_crud._read_inventory_by_product_id(product_id)
        
        return {
            "product": product,
            "inventory": inventory
        }
