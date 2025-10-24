import logging
import asyncio
from uuid import UUID
import grpc
from concurrent import futures
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from typing import Dict
import uuid
import signal

from generated.product_pb2 import DESCRIPTOR as PRODUCT_DESCRIPTOR
from generated import product_pb2, product_pb2_grpc

from app.product.models import Product, Inventory, ProductReservation
from app.core.database import AsyncSessionLocal

# Configure logging
logging.basicConfig(level=logging.ERROR, format='%(levelname)s:%(name)s:%(message)s')

_grpc_server_instance = None
_product_servicer_instance = None

async def start_grpc_server_background():
    """
    Starts the gRPC server in the background as an asyncio task.
    """
    global _grpc_server_instance, _product_servicer_instance
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    _product_servicer_instance = ProductServiceServicer()
    product_pb2_grpc.add_ProductServiceServicer_to_server(_product_servicer_instance, server)

    listen_addr = '[::]:50051'
    server.add_insecure_port(listen_addr)
    logging.info(f"gRPC server starting as a background task on {listen_addr}")

    # Setup signal handlers for graceful shutdown
    def signal_handler(sig, frame):
        logging.info(f"Received signal {sig}, initiating graceful shutdown...")
        asyncio.create_task(stop_grpc_server_background())
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    await server.start()
    _grpc_server_instance = server
    await server.wait_for_termination()

async def stop_grpc_server_background():
    """
    Stops the gRPC server gracefully.
    """
    global _grpc_server_instance, _product_servicer_instance
    
    # First shutdown the product servicer cleanup task
    if _product_servicer_instance:
        logging.info("Shutting down product servicer cleanup task...")
        await _product_servicer_instance.shutdown()
    
    # Then stop the gRPC server
    if _grpc_server_instance:
        logging.info("gRPC server stopping...")
        await _grpc_server_instance.stop(grace=5)
        _grpc_server_instance = None
        _product_servicer_instance = None
        logging.info("gRPC server stopped.")

class ProductServiceServicer(product_pb2_grpc.ProductServiceServicer):
    """
    Implements the gRPC ProductService service.
    """
    
    def __init__(self):
        # Store reservations with expiration times
        self.reservations: Dict[str, Dict] = {}
        self.reservation_lock = asyncio.Lock()  # Use asyncio Lock instead of threading Lock
        self._cleanup_task = None
        
        # Start cleanup task
        self._start_cleanup_task()
    
    def _start_cleanup_task(self):
        """Start async cleanup task for expired reservations"""
        async def cleanup_expired_reservations():
            while True:
                try:
                    async with self.reservation_lock:
                        current_time = datetime.now()
                        expired_reservations = [
                            reservation_id for reservation_id, reservation in self.reservations.items()
                            if current_time > reservation['expires_at']
                        ]
                        
                        for reservation_id in expired_reservations:
                            logging.info(f"Cleaning up expired reservation: {reservation_id}")
                            await self._release_reservation_internal(reservation_id)
                    
                    # Check every minute
                    await asyncio.sleep(60)
                    
                except asyncio.CancelledError:
                    logging.info("Cleanup task cancelled")
                    break
                except Exception as e:
                    logging.error(f"Error in cleanup task: {e}")
                    await asyncio.sleep(60)  # Wait before retrying
        
        # Create the cleanup task
        loop = asyncio.get_event_loop()
        self._cleanup_task = loop.create_task(cleanup_expired_reservations())

    async def GetProduct(self, request, context):
        """
        Handles the GetProduct RPC call to retrieve product details by ID.
        """
        try:
            product_id_str = request.product_id
            logging.error(f"DEBUG: Received Product ID (string): {product_id_str}")

            try:
                product_id_uuid = UUID(product_id_str)
            except ValueError as ve:
                logging.error(f"ERROR: Invalid UUID format received for product_id: {product_id_str} - {ve}")
                await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Invalid product ID format.")
                return

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
        """Reserve products with proper database tracking"""
        try:
            reservation_id = request.reservation_id or str(uuid.uuid4())
            products_to_reserve = request.products
            user_id = request.user_id or None
            
            logging.info(f"Processing reservation request: {reservation_id}")
            
            async with self.reservation_lock:
                results = []
                all_reserved = True
                
                async with AsyncSessionLocal() as session:
                    # Check availability and create reservations
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
                        
                        # Get product and current inventory
                        product_stmt = (
                            select(Product, Inventory)
                            .join(Inventory, Product.id == Inventory.product_id)
                            .where(Product.id == product_id_uuid)
                        )
                        
                        product_result = await session.execute(product_stmt)
                        product_data = product_result.first()
                        
                        if not product_data:
                            result = product_pb2.ProductReservationResult(
                                product_id=product_id_str,
                                success=False,
                                reserved_quantity=0,
                                message=f"Product {product_id_str} not found"
                            )
                            results.append(result)
                            all_reserved = False
                            continue
                        
                        product, inventory = product_data
                        
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
                        
                        # Calculate current reservations
                        current_reservations_stmt = select(ProductReservation.quantity).where(
                            and_(
                                ProductReservation.product_id == product_id_uuid,
                                ProductReservation.status == "ACTIVE"
                            )
                        )
                        current_reservations_result = await session.execute(current_reservations_stmt)
                        current_reserved_quantities = current_reservations_result.scalars().all()
                        total_currently_reserved = sum(current_reserved_quantities) if current_reserved_quantities else 0
                        
                        available_qty = max(0, inventory.quantity - total_currently_reserved)
                        
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
                        
                        # Create reservation record
                        reservation = ProductReservation(
                            reservation_id=reservation_id,
                            product_id=product_id_uuid,
                            quantity=quantity,
                            reserved_by_user_id=user_id,
                            reserved_by_service="order-service",
                            reservation_reason="ORDER",
                            reference_id=reservation_id,  # Could be order ID later
                            status="ACTIVE",
                            expires_at=datetime.now() + timedelta(minutes=15)
                        )
                        
                        session.add(reservation)
                        
                        result = product_pb2.ProductReservationResult(
                            product_id=product_id_str,
                            success=True,
                            reserved_quantity=quantity,
                            message="Successfully reserved"
                        )
                        results.append(result)
                    
                    # If all reservations successful, update inventory reserved quantity and commit
                    if all_reserved:
                        inventory_stmt = select(Inventory).where(Inventory.product_id == product_id_uuid)
                        inventory_result = await session.execute(inventory_stmt)
                        inventory = inventory_result.scalar_one()

                        current_reserved = inventory.reserved_quantity or 0
                        inventory.reserved_quantity = current_reserved + quantity
                        session.add(inventory)
                        await session.commit()
                        logging.info(f"Successfully created reservations for reservation_id: {reservation_id}")
                    else:
                        await session.rollback()
                        logging.warning(f"Reservation partially failed for reservation_id: {reservation_id}")
                
                response = product_pb2.ReserveProductsResponse(
                    all_reserved=all_reserved,
                    results=results,
                    reservation_id=reservation_id
                )
                
                return response
                
        except Exception as e:
            logging.exception(f"Error reserving products: {e}")
            await context.abort(grpc.StatusCode.INTERNAL, "Internal error occurred")
            return

    async def _release_reservation_internal_db(self, session, reservation_id: str):
        """Internal method to release reservations in database"""
        try:
            # Find active reservations for this reservation_id
            reservations_stmt = select(ProductReservation).where(
                and_(
                    ProductReservation.reservation_id == reservation_id,
                    ProductReservation.status == "ACTIVE"
                )
            )
            
            result = await session.execute(reservations_stmt)
            reservations = result.scalars().all()
            
            # Mark as released
            for reservation in reservations:
                reservation.status = "RELEASED"
                session.add(reservation)
                
                inventory_stmt = select(Inventory).where(Inventory.product_id == reservation.product_id) 
                inventory_result = await session.execute(inventory_stmt)
                inventory = inventory_result.scalar_one_or_none()

                if inventory:
                    current_reserved = inventory.reserved_quantity or 0
                    inventory.reserved_quantity = max(0, current_reserved - reservation.quantity)
                    session.add(inventory)

            logging.info(f"Released {len(reservations)} reservations for reservation_id: {reservation_id}")
            
        except Exception as e:
            logging.error(f"Error releasing reservation {reservation_id}: {e}")

    async def ReleaseReservation(self, request, context):
        """Release a product reservation"""
        try:
            reservation_id = request.reservation_id
            logging.info(f"Releasing reservation: {reservation_id}")
            
            async with self.reservation_lock:
                async with AsyncSessionLocal() as session:
                    # Check if reservation exists and is active
                    check_stmt = select(ProductReservation).where(
                        and_(
                            ProductReservation.reservation_id == reservation_id,
                            ProductReservation.status == "ACTIVE"
                        )
                    )
                    
                    result = await session.execute(check_stmt)
                    reservations = result.scalars().all()
                    
                    if not reservations:
                        response = product_pb2.ReleaseReservationResponse(
                            success=False,
                            message=f"Reservation {reservation_id} not found or already released"
                        )
                        return response
                    
                    # Release the reservations
                    await self._release_reservation_internal_db(session, reservation_id)
                    await session.commit()
                    
                    response = product_pb2.ReleaseReservationResponse(
                        success=True,
                        message="Reservation released successfully"
                    )
                    
                    return response
                
        except Exception as e:
            logging.exception(f"Error releasing reservation: {e}")
            await context.abort(grpc.StatusCode.INTERNAL, "Internal error occurred")
            return

    async def shutdown(self):
        """Cleanup method to cancel the cleanup task"""
        if self._cleanup_task and not self._cleanup_task.done():
            logging.info("Shutting down reservation cleanup task...")
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                logging.info("Cleanup task cancelled successfully")
                pass
            except Exception as e:
                logging.error(f"Error during cleanup task shutdown: {e}")

# Context manager for proper resource cleanup
class GrpcServerManager:
    def __init__(self):
        self.server = None
        self.servicer = None
    
    async def __aenter__(self):
        self.server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
        self.servicer = ProductServiceServicer()
        product_pb2_grpc.add_ProductServiceServicer_to_server(self.servicer, self.server)
        
        listen_addr = '[::]:50051'
        self.server.add_insecure_port(listen_addr)
        logging.info(f"gRPC server starting on {listen_addr}")
        
        await self.server.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.servicer:
            await self.servicer.shutdown()
        
        if self.server:
            logging.info("Stopping gRPC server...")
            await self.server.stop(grace=5)
            logging.info("gRPC server stopped")

# Example usage with context manager:
async def run_grpc_server_with_proper_cleanup():
    """
    Example of how to run the server with proper cleanup
    """
    try:
        async with GrpcServerManager() as server_manager:
            logging.info("gRPC server running...")
            await server_manager.server.wait_for_termination()
    except KeyboardInterrupt:
        logging.info("Received interrupt, shutting down gracefully...")
    except Exception as e:
        logging.error(f"Server error: {e}")
        raise