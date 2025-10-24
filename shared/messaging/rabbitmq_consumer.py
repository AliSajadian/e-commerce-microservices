import asyncio
import json
import logging
from typing import Callable, Dict, Any, Optional
from aio_pika import connect_robust, Message
from aio_pika.abc import AbstractConnection, AbstractChannel, AbstractQueue
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class RabbitMQConsumer:
    """RabbitMQ message consumer for event-driven communication"""
    
    def __init__(self, connection_url: str, service_name: str):
        self.connection_url = connection_url
        self.service_name = service_name
        self.connection: Optional[AbstractConnection] = None
        self.channel: Optional[AbstractChannel] = None
        self.queues: Dict[str, AbstractQueue] = {}
        self.consumers: Dict[str, Any] = {}
    
    async def connect(self):
        """Establish connection to RabbitMQ"""
        try:
            self.connection = await connect_robust(self.connection_url)
            self.channel = await self.connection.channel()
            
            # Set QoS
            await self.channel.set_qos(prefetch_count=10)
            
            logger.info(f"RabbitMQ consumer connected for {self.service_name}")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise e
    
    async def disconnect(self):
        """Close RabbitMQ connection"""
        try:
            # Cancel all consumers
            for consumer_tag, consumer in self.consumers.items():
                await consumer.cancel()
            
            if self.connection and not self.connection.is_closed:
                await self.connection.close()
                logger.info(f"RabbitMQ consumer disconnected for {self.service_name}")
        except Exception as e:
            logger.error(f"Error disconnecting from RabbitMQ: {e}")
    
    async def subscribe_to_exchange(
        self, 
        exchange_name: str, 
        routing_pattern: str,
        handler: Callable[[BaseModel], None],
        queue_name: Optional[str] = None
    ):
        """Subscribe to events from an exchange"""
        try:
            if not self.channel:
                await self.connect()
            
            # Declare exchange
            exchange = await self.channel.declare_exchange(
                exchange_name,
                type="topic",
                durable=True
            )
            
            # Create queue name if not provided
            if not queue_name:
                queue_name = f"{self.service_name}.{exchange_name}"
            
            # Declare queue
            queue = await self.channel.declare_queue(
                queue_name,
                durable=True
            )
            
            # Bind queue to exchange
            await queue.bind(exchange, routing_pattern)
            
            # Start consuming
            consumer = await queue.consume(
                lambda message: asyncio.create_task(
                    self._handle_message(message, handler)
                )
            )
            
            self.queues[queue_name] = queue
            self.consumers[f"{exchange_name}.{routing_pattern}"] = consumer
            
            logger.info(f"Subscribed to {exchange_name}/{routing_pattern} with queue {queue_name}")
            
        except Exception as e:
            logger.error(f"Failed to subscribe to {exchange_name}/{routing_pattern}: {e}")
            raise e
    
    async def _handle_message(self, message: Message, handler: Callable[[BaseModel], None]):
        """Handle incoming message"""
        try:
            # Parse message body
            body = message.body.decode('utf-8')
            event_data = json.loads(body)
            
            # Get event type from headers
            event_type = message.headers.get('event_type', 'unknown')
            
            logger.info(f"Received event: {event_type}")
            
            # Call handler
            await handler(event_data)
            
            # Acknowledge message
            await message.ack()
            
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            # Reject message and don't requeue
            await message.reject(requeue=False)
    
    async def subscribe_to_order_events(self, handler: Callable[[Dict[str, Any]], None]):
        """Subscribe to order events"""
        await self.subscribe_to_exchange(
            "order.events",
            "order.*",
            handler
        )
    
    async def subscribe_to_payment_events(self, handler: Callable[[Dict[str, Any]], None]):
        """Subscribe to payment events"""
        await self.subscribe_to_exchange(
            "payment.events",
            "payment.*",
            handler
        )
    
    async def subscribe_to_user_events(self, handler: Callable[[Dict[str, Any]], None]):
        """Subscribe to user events"""
        await self.subscribe_to_exchange(
            "user.events",
            "user.*",
            handler
        )
    
    async def subscribe_to_product_events(self, handler: Callable[[Dict[str, Any]], None]):
        """Subscribe to product events"""
        await self.subscribe_to_exchange(
            "product.events",
            "product.*",
            handler
        )
    
    async def subscribe_to_notification_events(self, handler: Callable[[Dict[str, Any]], None]):
        """Subscribe to notification events"""
        await self.subscribe_to_exchange(
            "notification.events",
            "notification.*",
            handler
        )
    
    async def subscribe_to_review_events(self, handler: Callable[[Dict[str, Any]], None]):
        """Subscribe to review events"""
        await self.subscribe_to_exchange(
            "review.events",
            "review.*",
            handler
        )
    
    async def subscribe_to_recommendation_events(self, handler: Callable[[Dict[str, Any]], None]):
        """Subscribe to recommendation events"""
        await self.subscribe_to_exchange(
            "recommendation.events",
            "recommendation.*",
            handler
        )

# Event handlers for different services
class OrderEventHandler:
    """Handle order events in various services"""
    
    @staticmethod
    async def handle_order_created(event_data: Dict[str, Any]):
        """Handle order created event"""
        logger.info(f"Order created: {event_data.get('order_id')}")
        # Implementation for handling order created event
        # This would be implemented in each service that needs to react to order creation
    
    @staticmethod
    async def handle_order_updated(event_data: Dict[str, Any]):
        """Handle order updated event"""
        logger.info(f"Order updated: {event_data.get('order_id')}")
        # Implementation for handling order updated event
    
    @staticmethod
    async def handle_order_cancelled(event_data: Dict[str, Any]):
        """Handle order cancelled event"""
        logger.info(f"Order cancelled: {event_data.get('order_id')}")
        # Implementation for handling order cancelled event
    
    @staticmethod
    async def handle_order_completed(event_data: Dict[str, Any]):
        """Handle order completed event"""
        logger.info(f"Order completed: {event_data.get('order_id')}")
        # Implementation for handling order completed event

class PaymentEventHandler:
    """Handle payment events in various services"""
    
    @staticmethod
    async def handle_payment_succeeded(event_data: Dict[str, Any]):
        """Handle payment succeeded event"""
        logger.info(f"Payment succeeded: {event_data.get('payment_id')}")
        # Implementation for handling payment succeeded event
    
    @staticmethod
    async def handle_payment_failed(event_data: Dict[str, Any]):
        """Handle payment failed event"""
        logger.info(f"Payment failed: {event_data.get('payment_id')}")
        # Implementation for handling payment failed event
    
    @staticmethod
    async def handle_payment_refunded(event_data: Dict[str, Any]):
        """Handle payment refunded event"""
        logger.info(f"Payment refunded: {event_data.get('payment_id')}")
        # Implementation for handling payment refunded event

class UserEventHandler:
    """Handle user events in various services"""
    
    @staticmethod
    async def handle_user_registered(event_data: Dict[str, Any]):
        """Handle user registered event"""
        logger.info(f"User registered: {event_data.get('user_id')}")
        # Implementation for handling user registered event
    
    @staticmethod
    async def handle_user_password_reset(event_data: Dict[str, Any]):
        """Handle user password reset event"""
        logger.info(f"User password reset: {event_data.get('user_id')}")
        # Implementation for handling user password reset event

class ProductEventHandler:
    """Handle product events in various services"""
    
    @staticmethod
    async def handle_product_inventory_updated(event_data: Dict[str, Any]):
        """Handle product inventory updated event"""
        logger.info(f"Product inventory updated: {event_data.get('product_id')}")
        # Implementation for handling product inventory updated event
    
    @staticmethod
    async def handle_product_reserved(event_data: Dict[str, Any]):
        """Handle product reserved event"""
        logger.info(f"Product reserved: {event_data.get('product_id')}")
        # Implementation for handling product reserved event
    
    @staticmethod
    async def handle_product_reservation_released(event_data: Dict[str, Any]):
        """Handle product reservation released event"""
        logger.info(f"Product reservation released: {event_data.get('product_id')}")
        # Implementation for handling product reservation released event

