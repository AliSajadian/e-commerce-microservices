import json
from aiokafka import AIOKafkaProducer
from typing import Dict, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class UserEventPublisher:
    def __init__(self, kafka_bootstrap_servers: str = "localhost:9092"):
        self.bootstrap_servers = kafka_bootstrap_servers
        self.producer = None
    
    async def start(self):
        """Initialize Kafka producer"""
        self.producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda v: v.encode('utf-8') if v else None,
        )
        await self.producer.start()
        logger.info("Kafka producer started")
    
    async def stop(self):
        """Stop Kafka producer"""
        if self.producer:
            await self.producer.stop()
            logger.info("Kafka producer stopped")
    
    async def publish_user_event(self, event_type: str, user_data: Dict[str, Any]):
        """Publish user events to Kafka"""
        try:
            if not self.producer:
                await self.start()
            
            # Create event payload
            event_payload = {
                "eventType": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "id": str(user_data["id"]),
                    # "username": user_data.get("username"),
                    "firstName": user_data.get("first_name"),
                    "lastName": user_data.get("last_name"),
                    "email": user_data.get("email"),
                    "avatar": user_data.get("avatar"),
                    "isActive": user_data.get("is_active", True),
                    "preferredLanguage": user_data.get("preferred_language"),
                    "timezone": user_data.get("timezone"),
                }
            }
            
            # Send to Kafka topic
            await self.producer.send_and_wait(
                topic="user-events",
                key=str(user_data["id"]),
                value=event_payload
            )
            
            logger.info(f"Published {event_type} event for user {user_data['id']}")
            
        except Exception as e:
            logger.error(f"Failed to publish user event: {e}")
            raise

