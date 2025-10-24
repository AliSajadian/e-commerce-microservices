# import asyncio
# from datetime import datetime
# import logging
# from typing import Optional
# import json
# import aio_pika
# from aio_pika import Connection, Channel, Message, ExchangeType

# from app.core.config import settings

# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
# logger = logging.getLogger(__name__)

# # Global variables to store the connection and channel
# _rabbitmq_connection: Optional[Connection] = None
# _rabbitmq_channel: Optional[Channel] = None
# _user_events_exchange: Optional[aio_pika.Exchange] = None
# MAX_RETRIES = 10
# RETRY_DELAY = 5 # seconds

# async def connect_rabbitmq():
#     """Establishes a connection to RabbitMQ."""
#     global _rabbitmq_connection, _rabbitmq_channel, _user_events_exchange
#     for i in range(MAX_RETRIES):
#         try:
#             if _rabbitmq_connection and not _rabbitmq_connection.is_closed:
#                 logger.info("RabbitMQ connection already active.")
#                 return
            
#             logger.info(f"Attempting to connect to RabbitMQ at {settings.RABBITMQ_URL}(attempt {i+1}/{MAX_RETRIES})...")
#             _rabbitmq_connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
#             _rabbitmq_channel = await _rabbitmq_connection.channel()
#             logger.info("RabbitMQ connection and channel established.")

#             # Declare the exchange for user events
#             # fanout: sends to all bound queues. Direct: sends to specific queues based on routing key.
#             # For simplicity, let's use direct, but fanout is also common for events.
#             _user_events_exchange = await _rabbitmq_channel.declare_exchange(
#                 settings.USER_EVENTS_EXCHANGE_NAME, 
#                 ExchangeType.DIRECT, 
#                 durable=True
#             )
#             logger.info(f"Exchange '{settings.USER_EVENTS_EXCHANGE_NAME}' declared.")
#             return
        
#         except aio_pika.exceptions.AMQPConnectionError as e:
#             print(f"Connection failed: {e}. Retrying in {RETRY_DELAY} seconds.")
#             await asyncio.sleep(RETRY_DELAY)
#         except Exception as e:
#             logger.error(f"Failed to connect to RabbitMQ: {e}")
#             await asyncio.sleep(RETRY_DELAY)
#             # In a real app, you might want to implement retry logic or raise the exception.

# async def disconnect_rabbitmq():
#     """Closes the RabbitMQ connection."""
#     global _rabbitmq_connection, _rabbitmq_channel
#     if _rabbitmq_channel and not _rabbitmq_channel.is_closed:
#         await _rabbitmq_channel.close()
#         logger.info("RabbitMQ channel closed.")
#     if _rabbitmq_connection and not _rabbitmq_connection.is_closed:
#         await _rabbitmq_connection.close()
#         logger.info("RabbitMQ connection closed.")

# async def publish_user_registered_event(user_id: str, email: str, username: str):
#     """Publishes a 'UserRegistered' event to RabbitMQ."""
#     if not _user_events_exchange:
#         logger.error("RabbitMQ user_events exchange not initialized. Cannot publish event.")
#         return

#     message_body = {
#         "event_type": "UserRegistered",
#         "user_id": user_id,
#         "email": email,
#         "username": username,
#         "timestamp": datetime.now().isoformat() #asyncio.current_task().loop.time()
#     }
    
#     # We'll use "user.registered" as a routing key for the direct exchange
#     routing_key = "user.registered" 

#     message = Message(
#         body=json.dumps(message_body).encode('utf-8'),
#         content_type="application/json",
#         delivery_mode=aio_pika.DeliveryMode.PERSISTENT # Make message persistent
#     )

#     try:
#         await _user_events_exchange.publish(
#             message, 
#             routing_key=routing_key
#         )
#         logger.info(f"Published 'UserRegistered' event for user {username} to '{settings.USER_EVENTS_EXCHANGE_NAME}' with routing key '{routing_key}'.")
#     except Exception as e:
#         logger.error(f"Failed to publish message to RabbitMQ: {e}")