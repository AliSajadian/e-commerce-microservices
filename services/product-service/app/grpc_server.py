import logging
import asyncio
from uuid import UUID # Needed for UUID conversion
import grpc
from concurrent import futures
from sqlalchemy import select
from sqlalchemy.orm import selectinload
# from grpc_reflection.v1alpha import reflection # <-- ADD THIS IMPORT
# ADD THIS IMPORT
from generated.product_pb2 import DESCRIPTOR as PRODUCT_DESCRIPTOR
# from .product_service import ProductServiceServicer

from generated import product_pb2, product_pb2_grpc

from app.product.models import Product, Inventory
from app.core.database import AsyncSessionLocal

# Configure logging (ensure this is at the top level of the file)
logging.basicConfig(level=logging.ERROR, format='%(levelname)s:%(name)s:%(message)s')
# If you want to see INFO and DEBUG from SQLAlchemy, uncomment this:
# logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

_grpc_server_instance = None

async def start_grpc_server_background():
    """
    Starts the gRPC server in the background as an asyncio task.
    This function should be called within an existing asyncio event loop.
    """
    global _grpc_server_instance
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    product_pb2_grpc.add_ProductServiceServicer_to_server(ProductServiceServicer(), server)

    # # ADD THESE LINES TO ENABLE REFLECTION
    # SERVICE_NAMES = (
    #     PRODUCT_DESCRIPTOR.name,
    #     reflection.SERVICE_NAME,
    # )
    # reflection.enable_server_reflection(SERVICE_NAMES, server)

    listen_addr = '[::]:50051' # Ensure this is the correct gRPC port for your setup
    server.add_insecure_port(listen_addr)
    logging.info(f"gRPC server starting as a background task on {listen_addr}")

    await server.start()
    _grpc_server_instance = server # Store the server instance for graceful shutdown
    await server.wait_for_termination()

async def stop_grpc_server_background():
    """
    Stops the gRPC server gracefully.
    """
    global _grpc_server_instance
    if _grpc_server_instance:
        logging.info("gRPC server stopping...")
        await _grpc_server_instance.stop(grace=5) # Graceful shutdown with 5 seconds grace period
        _grpc_server_instance = None
        logging.info("gRPC server stopped.")

class ProductServiceServicer(product_pb2_grpc.ProductServiceServicer):
    """
    Implements the gRPC BooksService service.
    """
    async def GetProduct(self, request: product_pb2.GetProductRequest, context: grpc.aio.ServicerContext):
        """
        Handles the GetUserDetails RPC call to retrieve user details by ID.
        """
        try:
            # We are fetching product details, so we expect a product_id in the request.
            # The 'user_id = request.user_id' line was incorrect and has been removed.
            product_id_str = request.product_id
            logging.error(f"DEBUG: Received Book ID (string): {product_id_str}")
            logging.error(f"DEBUG: Type of received Book ID: {type(product_id_str)}")

            try:
                product_id_uuid = UUID(product_id_str)
                logging.error(f"DEBUG: Converted Book ID (UUID): {product_id_uuid}")
                logging.error(f"DEBUG: Type of converted Book ID: {type(product_id_uuid)}")
            except ValueError as ve:
                logging.error(f"ERROR: Invalid UUID format received for product_id: {product_id_str} - {ve}")
                await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Invalid product ID format.")
                return # Important: return after aborting context

            async with AsyncSessionLocal() as session:
                logging.error(f"DEBUG: GetBookDetails - Current Loop (inside DB session): {asyncio.get_running_loop()}")

                stmt = (
                    select(
                        Product.id.label("product_id"),
                        Product.name,
                        Product.description,
                        Product.price,
                        Inventory.quantity.label("stock_quantity")
                    )
                    .join(Inventory, Product.id == Inventory.product_id)
                    .where(Product.id == product_id_uuid)
                )

                result = await session.execute(stmt)
                product = result.first()
                
                if not product:
                    logging.error(f"DEBUG: Product with ID {product_id_str} not found in database.")
                    await context.abort(grpc.StatusCode.NOT_FOUND, "Product not found")
                    return # Important: return after aborting context

                # Safe: access everything you need INSIDE the session context before returning
                # inventory_quantity = product.inventory.quantity if product.inventory else None
                # category_name = product.categories[0].name if product.categories else None
                # tag_name = product.tags[0].name if product.tags else None

                return product_pb2.GetProductResponse(
                    product_id=str(product.product_id),
                    name=product.name,
                    description=product.description,
                    price=product.price,
                    stock_quantity=product.stock_quantity
                    # inventory=inventory_quantity,
                    # category=category_name,
                    # tag=tag_name,
                )

        except Exception as e:
            # Use logging.exception to print the full traceback for better debugging
            logging.exception(f"DEBUG: An unexpected error occurred while fetching product details: {e}")
            await context.abort(grpc.StatusCode.INTERNAL, "Internal error occurred")
            return # Important: return after aborting context

