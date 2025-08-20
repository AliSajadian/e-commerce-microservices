from fastapi import Depends, FastAPI
from ...product.routers import category_routers, inventory_routers, tag_routers, product_routers, product_image_routers
# from ..dependencies.auth_utils import verify_token , dependencies=[Depends(verify_token)])


def register_routes(app: FastAPI):
    app.include_router(inventory_routers, prefix="/api/v1/inventory", tags=["Product Inventory"], 
                       responses={404: {"description": "Not found"}})
    app.include_router(category_routers, prefix="/api/v1/category", tags=["Product Categories"], 
                       responses={404: {"description": "Not found"}})
    app.include_router(tag_routers, prefix="/api/v1/tag", tags=["Product Tags"], 
                       responses={404: {"description": "Not found"}})
    app.include_router(product_routers, prefix="/api/v1/product", tags=["Product"], 
                       responses={404: {"description": "Not found"}})
    app.include_router(product_image_routers, prefix="/api/v1/product-image", tags=["Product Images"], 
                       responses={404: {"description": "Not found"}})
    
    
    
    