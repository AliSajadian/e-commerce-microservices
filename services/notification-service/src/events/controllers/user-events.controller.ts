// src/events/controllers/user-events.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { UserSyncService } from '../services/user-sync.service';
import { KafkaUserEventData } from '../interfaces/user-event.interface';

@Controller()
export class UserEventsController {
  private readonly logger = new Logger(UserEventsController.name);

  constructor(
    private readonly userSyncService: UserSyncService,
  ) {
    this.logger.log('🎯 UserEventsController initialized and ready to receive Kafka messages');
  }

  @EventPattern('user-events')
  async handleUserEvent(
    @Payload() payload: KafkaUserEventData,
    @Ctx() context: KafkaContext,
  ) {
    this.logger.log(`📨 Received Kafka message: ${JSON.stringify(payload, null, 2)}`);
    
    const message = context.getMessage();
    const topic = context.getTopic();
    const partition = context.getPartition();
    const { offset, timestamp } = message;

    this.logger.log(`Received user event: ${payload.eventType} for user ${payload.data.id}`);
    this.logger.debug(`Kafka message info - Topic: ${topic}, Partition: ${partition}, Offset: ${offset}, Timestamp: ${timestamp}`);

    try {
      // Delegate all business logic to UserSyncService
      await this.userSyncService.handleUserEvent(payload);
      this.logger.log(`✅ Successfully processed ${payload.eventType} for user ${payload.data.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process user event: ${error.message}`, error.stack);
      // Re-throw to trigger Kafka retry mechanism
      throw error;
    }
  }
}