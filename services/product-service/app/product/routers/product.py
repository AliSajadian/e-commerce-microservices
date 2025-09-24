from http import HTTPStatus
from fastapi import APIRouter, Path, status, Depends
from typing import List
import uuid

from app.api.dependencies.database import get_product_service
from app.api.dependencies.auth_utils import has_permission
from app.utils.validation import safe_validate
from app.product.schemas import ProductCreateSchema, ProductUpdateSchema, ProductSchema, InventorySchema
from app.product.crud import ProductCRUD

# ============================================================================
# Product router Endpoints
# ============================================================================

routers = APIRouter()

@routers.post("/", response_model=ProductSchema, status_code=status.HTTP_201_CREATED)
async def create_product( 
    product_in: ProductCreateSchema,
    product_service: ProductCRUD = Depends(get_product_service)
) -> ProductSchema:
    """
    Create a new product with initial stock and link to categories/tags.
    """
    product = await product_service.create_product(product_in)
    return ProductSchema.model_validate(product)

@routers.get("/", response_model=List[ProductSchema])
async def get_all_products(
    product_service: ProductCRUD = Depends(get_product_service),
    skip: int = 0, 
    limit: int = 100
) -> List[ProductSchema]:
    """
    Retrieve a list of all products.
    """
    # products = await product_service.read_all_products(skip=skip, limit=limit)
    # return [p for prd in products if (p := safe_validate(ProductSchema, prd))]
    products = await product_service.read_all_products(skip=skip, limit=limit)
    print(f"Found {len(products)} products in database")
    
    validated = []
    for prd in products:
        try:
            p = ProductSchema.model_validate(prd)
            validated.append(p)
            print(f"✓ Successfully validated product: {prd.name}")
        except Exception as e:
            print(f"✗ Failed to validate product {prd.name}: {e}")
    
    return validated
    
    # try:
    #     products = await product_service.read_all_products(skip=skip, limit=limit)
        
    #     result = []
    #     for product in products:
    #         try:
    #             # Validate each product individually to catch specific validation errors
    #             product_schema = ProductSchema.model_validate(product)
    #             result.append(product_schema)
    #         except ValidationError as e:
    #             # Log the specific validation error for debugging
    #             print(f"Validation error for product {product.id}: {e}")
    #             # Skip invalid products or re-raise depending on your requirements
    #             continue
                
    #     return result
        
    # except Exception as e:
    #     print(f"Error in get_all_products: {e}")
    #     raise HTTPException(
    #         status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    #         detail=f"Error retrieving products: {str(e)}"
    #     )

@routers.get("/{product_id}", response_model=ProductSchema)
async def get_product(
    product_id: uuid.UUID, 
    product_service: ProductCRUD = Depends(get_product_service),
    claims: dict = Depends(has_permission("product:read"))
) -> ProductSchema:
    """
    Retrieve a product by its ID.
    """
    product = await product_service.read_product_by_id(product_id)
    return ProductSchema.model_validate(product)

@routers.get("/{category_id}/products")
async def get_category_products(    
    product_service: ProductCRUD = Depends(get_product_service),
    category_id: uuid.UUID = Path(..., description="The category id, you want to find: "),
    # query_param: str = Query(None, max_length=5)
) -> List[ProductSchema]:
    """API endpoint for retrieving a category by its ID

    Args:
        category_id (UUID): the ID of the category to retrieve

    Returns:
        dict: The retrieved roles
    """
    products = await product_service.read_products_by_category_id(category_id)
    return [p for prd in products if (p := safe_validate(ProductSchema, prd))]

@routers.get("/{tag_id}/products")
async def get_tag_products(    
    product_service: ProductCRUD = Depends(get_product_service),
    tag_id: uuid.UUID = Path(..., description="The category id, you want to find: "),
    # query_param: str = Query(None, max_length=5)
) -> List[ProductSchema]:
    """API endpoint for retrieving a category by its ID

    Args:
        tag_id (UUID): the ID of the category to retrieve

    Returns:
        dict: The retrieved roles
    """
    products = await product_service.read_products_by_tag_id(tag_id)
    return [p for prd in products if (p := safe_validate(ProductSchema, prd))]

@routers.put("/{product_id}", response_model=ProductSchema)
async def update_product(
    product_id: uuid.UUID, 
    product_in: ProductUpdateSchema,
    product_service: ProductCRUD = Depends(get_product_service) 
) -> ProductSchema:
    """
    Update an existing product by its ID.
    """
    product = await product_service.update_product(product_id, product_in)
    return ProductSchema.model_validate(product)

@routers.patch("/{product_id}/stock", response_model=ProductSchema)
async def update_product_stock(
    quantity_change: int, 
    product_service: ProductCRUD = Depends(get_product_service),
    product_id: uuid.UUID = Path(..., description="The tag id, you want to update: ")
) -> InventorySchema:
    """
    Update the stock quantity of a product.
    Provide a positive number to add stock, or a negative number to remove stock.
    """
    # Update the stock via the CRUD method
    updated_inventory = await product_service.update_product_stock(product_id, quantity_change)
    return updated_inventory

@routers.delete("/{product_id}", status_code=HTTPStatus.OK)
async def delete_product(
    product_service: ProductCRUD = Depends(get_product_service),
    product_id: uuid.UUID = Path(..., description="The tag id, you want to delete: ")
) -> bool:
    """
    Delete a product by its ID.
    """
    return await product_service.delete_product(product_id)



