import asyncio
import json
import logging
from typing import Any, Dict, Optional
from aio_pika import connect_robust, Message, DeliveryMode
from aio_pika.abc import AbstractConnection, AbstractChannel, AbstractExchange
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class RabbitMQPublisher:
    """RabbitMQ message publisher for event-driven communication"""
    
    def __init__(self, connection_url: str):
        self.connection_url = connection_url
        self.connection: Optional[AbstractConnection] = None
        self.channel: Optional[AbstractChannel] = None
        self.exchanges: Dict[str, AbstractExchange] = {}
    
    async def connect(self):
        """Establish connection to RabbitMQ"""
        try:
            self.connection = await connect_robust(self.connection_url)
            self.channel = await self.connection.channel()
            
            # Declare exchanges
            await self._declare_exchanges()
            
            logger.info("RabbitMQ publisher connected successfully")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise e
    
    async def disconnect(self):
        """Close RabbitMQ connection"""
        try:
            if self.connection and not self.connection.is_closed:
                await self.connection.close()
                logger.info("RabbitMQ publisher disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting from RabbitMQ: {e}")
    
    async def _declare_exchanges(self):
        """Declare required exchanges"""
        exchanges = [
            "order.events",
            "payment.events", 
            "user.events",
            "product.events",
            "notification.events",
            "review.events",
            "recommendation.events"
        ]
        
        for exchange_name in exchanges:
            exchange = await self.channel.declare_exchange(
                exchange_name,
                type="topic",
                durable=True
            )
            self.exchanges[exchange_name] = exchange
    
    async def publish_event(
        self, 
        exchange_name: str, 
        routing_key: str, 
        event: BaseModel,
        priority: int = 0
    ) -> bool:
        """Publish an event to RabbitMQ"""
        try:
            if not self.channel:
                await self.connect()
            
            # Get exchange
            exchange = self.exchanges.get(exchange_name)
            if not exchange:
                logger.error(f"Exchange {exchange_name} not found")
                return False
            
            # Serialize event
            message_body = event.json().encode('utf-8')
            
            # Create message
            message = Message(
                message_body,
                delivery_mode=DeliveryMode.PERSISTENT,
                priority=priority,
                headers={
                    'event_type': event.event_type,
                    'timestamp': event.created_at.isoformat() if hasattr(event, 'created_at') else None
                }
            )
            
            # Publish message
            await exchange.publish(message, routing_key=routing_key)
            
            logger.info(f"Published event {event.event_type} to {exchange_name}/{routing_key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish event {event.event_type}: {e}")
            return False
    
    async def publish_order_created(self, event: 'OrderCreatedEvent') -> bool:
        """Publish order created event"""
        return await self.publish_event(
            "order.events",
            "order.created",
            event
        )
    
    async def publish_order_updated(self, event: 'OrderUpdatedEvent') -> bool:
        """Publish order updated event"""
        return await self.publish_event(
            "order.events",
            "order.updated",
            event
        )
    
    async def publish_order_cancelled(self, event: 'OrderCancelledEvent') -> bool:
        """Publish order cancelled event"""
        return await self.publish_event(
            "order.events",
            "order.cancelled",
            event
        )
    
    async def publish_order_completed(self, event: 'OrderCompletedEvent') -> bool:
        """Publish order completed event"""
        return await self.publish_event(
            "order.events",
            "order.completed",
            event
        )
    
    async def publish_payment_succeeded(self, event: 'PaymentSucceededEvent') -> bool:
        """Publish payment succeeded event"""
        return await self.publish_event(
            "payment.events",
            "payment.succeeded",
            event
        )
    
    async def publish_payment_failed(self, event: 'PaymentFailedEvent') -> bool:
        """Publish payment failed event"""
        return await self.publish_event(
            "payment.events",
            "payment.failed",
            event
        )
    
    async def publish_payment_refunded(self, event: 'PaymentRefundedEvent') -> bool:
        """Publish payment refunded event"""
        return await self.publish_event(
            "payment.events",
            "payment.refunded",
            event
        )
    
    async def publish_user_registered(self, event: 'UserRegisteredEvent') -> bool:
        """Publish user registered event"""
        return await self.publish_event(
            "user.events",
            "user.registered",
            event
        )
    
    async def publish_user_password_reset(self, event: 'UserPasswordResetEvent') -> bool:
        """Publish user password reset event"""
        return await self.publish_event(
            "user.events",
            "user.password_reset",
            event
        )
    
    async def publish_product_inventory_updated(self, event: 'ProductInventoryUpdatedEvent') -> bool:
        """Publish product inventory updated event"""
        return await self.publish_event(
            "product.events",
            "product.inventory_updated",
            event
        )
    
    async def publish_product_reserved(self, event: 'ProductReservedEvent') -> bool:
        """Publish product reserved event"""
        return await self.publish_event(
            "product.events",
            "product.reserved",
            event
        )
    
    async def publish_product_reservation_released(self, event: 'ProductReservationReleasedEvent') -> bool:
        """Publish product reservation released event"""
        return await self.publish_event(
            "product.events",
            "product.reservation_released",
            event
        )
    
    async def publish_notification_sent(self, event: 'NotificationSentEvent') -> bool:
        """Publish notification sent event"""
        return await self.publish_event(
            "notification.events",
            "notification.sent",
            event
        )
    
    async def publish_review_created(self, event: 'ReviewCreatedEvent') -> bool:
        """Publish review created event"""
        return await self.publish_event(
            "review.events",
            "review.created",
            event
        )
    
    async def publish_review_moderated(self, event: 'ReviewModeratedEvent') -> bool:
        """Publish review moderated event"""
        return await self.publish_event(
            "review.events",
            "review.moderated",
            event
        )
    
    async def publish_recommendation_generated(self, event: 'RecommendationGeneratedEvent') -> bool:
        """Publish recommendation generated event"""
        return await self.publish_event(
            "recommendation.events",
            "recommendation.generated",
            event
        )
    
    async def publish_recommendation_clicked(self, event: 'RecommendationClickedEvent') -> bool:
        """Publish recommendation clicked event"""
        return await self.publish_event(
            "recommendation.events",
            "recommendation.clicked",
            event
        )

