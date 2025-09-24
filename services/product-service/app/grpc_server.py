import logging
import asyncio
from uuid import UUID
import grpc
from concurrent import futures
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Dict
import threading
import uuid

# from grpc_reflection.v1alpha import reflection # <-- ADD THIS IMPORT
# ADD THIS IMPORT
from generated.product_pb2 import DESCRIPTOR as PRODUCT_DESCRIPTOR
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

    listen_addr = '[::]:50051'  # Ensure this is the correct gRPC port for your setup
    server.add_insecure_port(listen_addr)
    logging.info(f"gRPC server starting as a background task on {listen_addr}")

    await server.start()
    _grpc_server_instance = server  # Store the server instance for graceful shutdown
    await server.wait_for_termination()

async def stop_grpc_server_background():
    """
    Stops the gRPC server gracefully.
    """
    global _grpc_server_instance
    if _grpc_server_instance:
        logging.info("gRPC server stopping...")
        await _grpc_server_instance.stop(grace=5)  # Graceful shutdown with 5 seconds grace period
        _grpc_server_instance = None
        logging.info("gRPC server stopped.")

class ProductServiceServicer(product_pb2_grpc.ProductServiceServicer):
    """
    Implements the gRPC ProductService service.
    """
    
    def __init__(self):
        # Store reservations with expiration times
        self.reservations: Dict[str, Dict] = {}
        self.reservation_lock = threading.Lock()
        
        # Start cleanup thread for expired reservations
        self._start_cleanup_thread()
    
    def _start_cleanup_thread(self):
        """Start background thread to clean up expired reservations"""
        def cleanup_expired_reservations():
            while True:
                try:
                    with self.reservation_lock:
                        current_time = datetime.now()
                        expired_reservations = [
                            reservation_id for reservation_id, reservation in self.reservations.items()
                            if current_time > reservation['expires_at']
                        ]
                        
                        for reservation_id in expired_reservations:
                            logging.info(f"Cleaning up expired reservation: {reservation_id}")
                            asyncio.create_task(self._release_reservation_internal(reservation_id))
                    
                    # Check every minute
                    threading.Event().wait(60)
                except Exception as e:
                    logging.error(f"Error in cleanup thread: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup_expired_reservations, daemon=True)
        cleanup_thread.start()

    async def GetProduct(self, request, context):
        """
        Handles the GetProduct RPC call to retrieve product details by ID.
        """
        try:
            product_id_str = request.product_id
            logging.error(f"DEBUG: Received Product ID (string): {product_id_str}")
            logging.error(f"DEBUG: Type of received Product ID: {type(product_id_str)}")

            try:
                product_id_uuid = UUID(product_id_str)
                logging.error(f"DEBUG: Converted Product ID (UUID): {product_id_uuid}")
                logging.error(f"DEBUG: Type of converted Product ID: {type(product_id_uuid)}")
            except ValueError as ve:
                logging.error(f"ERROR: Invalid UUID format received for product_id: {product_id_str} - {ve}")
                await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Invalid product ID format.")
                return

            async with AsyncSessionLocal() as session:
                logging.error(f"DEBUG: GetProduct - Current Loop (inside DB session): {asyncio.get_running_loop()}")

                stmt = (
                    select(
                        Product.id.label("product_id"),
                        Product.name,
                        Product.description,
                        Product.price,
                        Product.sku,
                        Product.is_active,
                        Inventory.quantity.label("stock_quantity"),
                        Inventory.reserved_quantity.label("reserved_quantity")
                    )
                    .join(Inventory, Product.id == Inventory.product_id)
                    .where(Product.id == product_id_uuid)
                )

                result = await session.execute(stmt)
                product = result.first()
                
                if not product:
                    logging.error(f"DEBUG: Product with ID {product_id_str} not found in database.")
                    await context.abort(grpc.StatusCode.NOT_FOUND, "Product not found")
                    return

                # Calculate available quantity
                reserved_qty = product.reserved_quantity if product.reserved_quantity else 0
                available_qty = max(0, product.stock_quantity - reserved_qty)

                return product_pb2.GetProductResponse(
                    product_id=str(product.product_id),
                    name=product.name,
                    description=product.description or "",
                    price=float(product.price),
                    stock_quantity=int(product.stock_quantity),
                    reserved_quantity=int(reserved_qty),
                    available_quantity=int(available_qty),
                    is_active=bool(product.is_active) if product.is_active is not None else True,
                    sku=product.sku or ""
                )

        except Exception as e:
            logging.exception(f"DEBUG: An unexpected error occurred while fetching product details: {e}")
            await context.abort(grpc.StatusCode.INTERNAL, "Internal error occurred")
            return

    async def GetMultipleProducts(self, request, context):
        """
        Handles the GetMultipleProducts RPC call to retrieve multiple product details.
        """
        try:
            product_ids_str = request.product_ids
            logging.error(f"DEBUG: Received Product IDs (strings): {product_ids_str}")
            
            # Convert string IDs to UUIDs
            product_ids_uuid = []
            for product_id_str in product_ids_str:
                try:
                    product_id_uuid = UUID(product_id_str)
                    product_ids_uuid.append(product_id_uuid)
                except ValueError as ve:
                    logging.error(f"ERROR: Invalid UUID format received for product_id: {product_id_str} - {ve}")
                    continue

            if not product_ids_uuid:
                return product_pb2.GetMultipleProductsResponse(products=[])

            async with AsyncSessionLocal() as session:
                stmt = (
                    select(
                        Product.id.label("product_id"),
                        Product.name,
                        Product.description,
                        Product.price,
                        Product.sku,
                        Product.is_active,
                        Inventory.quantity.label("stock_quantity"),
                        Inventory.reserved_quantity.label("reserved_quantity")
                    )
                    .join(Inventory, Product.id == Inventory.product_id)
                    .where(Product.id.in_(product_ids_uuid))
                )

                result = await session.execute(stmt)
                products = result.all()
                
                response_products = []
                for product in products:
                    reserved_qty = product.reserved_quantity if product.reserved_quantity else 0
                    available_qty = max(0, product.stock_quantity - reserved_qty)
                    
                    product_response = product_pb2.GetProductResponse(
                        product_id=str(product.product_id),
                        name=product.name,
                        description=product.description or "",
                        price=float(product.price),
                        stock_quantity=int(product.stock_quantity),
                        reserved_quantity=int(reserved_qty),
                        available_quantity=int(available_qty),
                        is_active=bool(product.is_active) if product.is_active is not None else True,
                        sku=product.sku or ""
                    )
                    response_products.append(product_response)

                return product_pb2.GetMultipleProductsResponse(products=response_products)

        except Exception as e:
            logging.exception(f"DEBUG: An unexpected error occurred while fetching multiple products: {e}")
            await context.abort(grpc.StatusCode.INTERNAL, "Internal error occurred")
            return

    async def ReserveProducts(self, request, context):
        """
        Handles the ReserveProducts RPC call to reserve products for an order.
        """
        try:
            reservation_id = request.reservation_id or str(uuid.uuid4())
            products_to_reserve = request.products
            
            logging.error(f"DEBUG: Received ReserveProducts request for reservation_id: {reservation_id}")
            
            with self.reservation_lock:
                results = []
                all_reserved = True
                reserved_items = []
                
                async with AsyncSessionLocal() as session:
                    # Check availability for all products first
                    for item in products_to_reserve:
                        product_id_str = item.product_id
                        quantity = item.quantity
                        
                        try:
                            product_id_uuid = UUID(product_id_str)
                        except ValueError:
                            result = product_pb2.ProductReservationResult(
                                product_id=product_id_str,
                                success=False,
                                reserved_quantity=0,
                                message=f"Invalid product ID format: {product_id_str}"
                            )
                            results.append(result)
                            all_reserved = False
                            continue
                        
                        # Get product and inventory info
                        stmt = (
                            select(Product, Inventory)
                            .join(Inventory, Product.id == Inventory.product_id)
                            .where(Product.id == product_id_uuid)
                        )
                        
                        result_row = await session.execute(stmt)
                        product_inventory = result_row.first()
                        
                        if not product_inventory:
                            result = product_pb2.ProductReservationResult(
                                product_id=product_id_str,
                                success=False,
                                reserved_quantity=0,
                                message=f"Product {product_id_str} not found"
                            )
                            results.append(result)
                            all_reserved = False
                            continue
                        
                        product, inventory = product_inventory
                        
                        if not product.is_active:
                            result = product_pb2.ProductReservationResult(
                                product_id=product_id_str,
                                success=False,
                                reserved_quantity=0,
                                message=f"Product {product_id_str} is not active"
                            )
                            results.append(result)
                            all_reserved = False
                            continue
                        
                        reserved_qty = inventory.reserved_quantity if inventory.reserved_quantity else 0
                        available_qty = max(0, inventory.quantity - reserved_qty)
                        
                        if available_qty < quantity:
                            result = product_pb2.ProductReservationResult(
                                product_id=product_id_str,
                                success=False,
                                reserved_quantity=0,
                                message=f"Insufficient stock. Available: {available_qty}, Requested: {quantity}"
                            )
                            results.append(result)
                            all_reserved = False
                            continue
                        
                        # If we get here, the reservation is possible
                        result = product_pb2.ProductReservationResult(
                            product_id=product_id_str,
                            success=True,
                            reserved_quantity=quantity,
                            message="Successfully reserved"
                        )
                        results.append(result)
                        reserved_items.append({
                            "product_id": product_id_uuid, 
                            "product_id_str": product_id_str,
                            "quantity": quantity
                        })
                    
                    # If all reservations are successful, actually reserve the products
                    if all_reserved and reserved_items:
                        for item in reserved_items:
                            product_id_uuid = item["product_id"]
                            quantity = item["quantity"]
                            
                            # Update inventory reserved quantity
                            inventory_stmt = select(Inventory).where(Inventory.product_id == product_id_uuid)
                            inventory_result = await session.execute(inventory_stmt)
                            inventory = inventory_result.scalar_one()
                            
                            current_reserved = inventory.reserved_quantity if inventory.reserved_quantity else 0
                            inventory.reserved_quantity = current_reserved + quantity
                            
                            session.add(inventory)
                        
                        await session.commit()
                        
                        # Store reservation with expiration (15 minutes from now)
                        self.reservations[reservation_id] = {
                            "items": reserved_items,
                            "created_at": datetime.now(),
                            "expires_at": datetime.now() + timedelta(minutes=15)
                        }
                        
                        logging.info(f"Successfully reserved products for reservation_id: {reservation_id}")
                
                response = product_pb2.ReserveProductsResponse(
                    all_reserved=all_reserved,
                    results=results,
                    reservation_id=reservation_id
                )
                
                return response
                
        except Exception as e:
            logging.exception(f"DEBUG: An unexpected error occurred while reserving products: {e}")
            await context.abort(grpc.StatusCode.INTERNAL, "Internal error occurred")
            return

    async def _release_reservation_internal(self, reservation_id: str):
        """Internal method to release a reservation"""
        if reservation_id in self.reservations:
            reservation = self.reservations[reservation_id]
            
            async with AsyncSessionLocal() as session:
                for item in reservation["items"]:
                    product_id_uuid = item["product_id"]
                    quantity = item["quantity"]
                    
                    # Update inventory reserved quantity
                    inventory_stmt = select(Inventory).where(Inventory.product_id == product_id_uuid)
                    inventory_result = await session.execute(inventory_stmt)
                    inventory = inventory_result.scalar_one_or_none()
                    
                    if inventory:
                        current_reserved = inventory.reserved_quantity if inventory.reserved_quantity else 0
                        inventory.reserved_quantity = max(0, current_reserved - quantity)
                        session.add(inventory)
                
                await session.commit()
            
            del self.reservations[reservation_id]

    async def ReleaseReservation(self, request, context):
        """
        Handles the ReleaseReservation RPC call to release a product reservation.
        """
        try:
            reservation_id = request.reservation_id
            logging.error(f"DEBUG: Received ReleaseReservation request for reservation_id: {reservation_id}")
            
            with self.reservation_lock:
                if reservation_id not in self.reservations:
                    response = product_pb2.ReleaseReservationResponse(
                        success=False,
                        message=f"Reservation {reservation_id} not found or already expired"
                    )
                    return response
                
                await self._release_reservation_internal(reservation_id)
                
                logging.info(f"Successfully released reservation: {reservation_id}")
                response = product_pb2.ReleaseReservationResponse(
                    success=True,
                    message="Reservation released successfully"
                )
                
                return response
                
        except Exception as e:
            logging.exception(f"DEBUG: An unexpected error occurred while releasing reservation: {e}")
            await context.abort(grpc.StatusCode.INTERNAL, "Internal error occurred")
            return
        
        
        