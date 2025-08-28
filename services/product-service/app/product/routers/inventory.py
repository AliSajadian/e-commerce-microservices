from http import HTTPStatus
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, Path

from ..crud import InventoryCRUD
from ..schemas.inventory import InventoryCreateSchema, InventorySchema, InventoryUpdateSchema
from ...api.dependencies.database import get_inventory_service

# ============================================================================
# Inventory router Endpoints
# ============================================================================

routers = APIRouter()

@routers.post("", status_code=HTTPStatus.CREATED)
async def create_inventory(
    inventory_data: InventoryCreateSchema,
    inventory_service: InventoryCRUD = Depends(get_inventory_service)
) -> InventorySchema:
    """API endpoint for creating a inventory resource

    Args:
        inventory_data (InventoryCreate): data for creating a inventory using the inventory schema

    Returns:
        dict: inventory that has been created
    """
    inventory = await inventory_service.create_inventory(inventory_data)
    return InventorySchema.model_validate(inventory)

@routers.get("", response_model=List[InventorySchema])
async def get_all_inventories(
    inventory_service: InventoryCRUD = Depends(get_inventory_service)
) -> List[InventorySchema]:
    """API endpoint for listing all inventory resources
    """
    inventories = await inventory_service.read_all_inventories()
    return [InventorySchema.model_validate(inv) for inv in inventories]

@routers.get("/{inventory_id}")
async def get_inventory_by_id(
    inventory_service: InventoryCRUD = Depends(get_inventory_service), 
    inventory_id: UUID = Path(..., description="The inventory id, you want to find: "),
    # query_param: str = Query(None, max_length=5)
) -> InventorySchema:
    """API endpoint for retrieving a inventory by its ID

    Args:
        inventory_id (int): the ID of the inventory to retrieve

    Returns:
        dict: The retrieved inventory
    """
    inventory = await inventory_service.read_inventory_by_id(inventory_id)
    return InventorySchema.model_validate(inventory)
     
@routers.patch("/{inventory_id}")
async def update_inventory(
    inventory_data: InventoryUpdateSchema, 
    inventory_service: InventoryCRUD = Depends(get_inventory_service), 
    inventory_id: UUID = Path(..., description="The inventory id, you want to update: ")
) -> InventorySchema:
    """Update by ID

    Args:
        inventory_id (UUID): ID of inventory to update
        data (InventoryCreate): data to update inventory

    Returns:
        dict: the updated inventory
    """
    inventory = await inventory_service.update_inventory(
        inventory_id, 
        inventory_data=inventory_data.model_dump(exclude_unset=True)
    )
    return InventorySchema.model_validate(inventory)


@routers.delete("/{inventory_id}", status_code=HTTPStatus.OK)
async def delete_inventory(
    inventory_service: InventoryCRUD = Depends(get_inventory_service), 
    inventory_id: UUID = Path(..., description="The inventory id, you want to delete: ")
) -> bool:
    """
    Delete inventory by id

    Args:
        inventory_id (str): ID of inventory to delete
        
    Return: 
        bool
    """
    return await inventory_service.delete_inventory(inventory_id)

# Custom validation error handler (optional - enhanced version)
# @routers.exception_handler(RequestValidationError)
# async def validation_exception_handler(request, exc: RequestValidationError):
#     """
#     Custom handler for better validation error messages.
#     This handles ALL Pydantic validation errors with better UX.
#     """
#     errors = []
#     for error in exc.errors():
#         field_name = ".".join(str(x) for x in error.get('loc', [])[1:])  # Skip 'body'
#         error_type = error.get('type', '')
#         error_msg = error.get('msg', 'Validation error')
        
#         # Custom messages for specific fields and error types
#         if field_name == 'product_id':
#             if error_type == 'missing':
#                 errors.append({
#                     "field": "product_id",
#                     "message": "Product ID is required"
#                 })
#             elif error_type in ['value_error.number.not_gt', 'value_error']:
#                 errors.append({
#                     "field": "product_id", 
#                     "message": "Product ID must be a positive integer"
#                 })
#             elif error_type == 'type_error.integer':
#                 errors.append({
#                     "field": "product_id",
#                     "message": "Product ID must be an integer"
#                 })
#             else:
#                 errors.append({
#                     "field": "product_id",
#                     "message": "Invalid product ID"
#                 })
#         elif field_name == 'quantity':
#             if error_type == 'missing':
#                 errors.append({
#                     "field": "quantity",
#                     "message": "Quantity is required"
#                 })
#             elif error_type in ['value_error.number.not_ge', 'value_error']:
#                 errors.append({
#                     "field": "quantity",
#                     "message": "Quantity must be zero or positive"
#                 })
#             elif error_type == 'type_error.integer':
#                 errors.append({
#                     "field": "quantity",
#                     "message": "Quantity must be an integer"
#                 })
#             else:
#                 errors.append({
#                     "field": "quantity",
#                     "message": "Invalid quantity"
#                 })
#         elif field_name == 'reserved_quantity':
#             if error_type in ['value_error.number.not_ge', 'value_error']:
#                 errors.append({
#                     "field": "reserved_quantity",
#                     "message": "Reserved quantity must be zero or positive"
#                 })
#             else:
#                 errors.append({
#                     "field": "reserved_quantity",
#                     "message": "Invalid reserved quantity"
#                 })
#         else:
#             # Generic handler for other fields
#             errors.append({
#                 "field": field_name,
#                 "message": error_msg
#             })
    
#     return JSONResponse(
#         status_code=422,
#         content={
#             "detail": "Validation failed",
#             "errors": errors
#         }
#     )


