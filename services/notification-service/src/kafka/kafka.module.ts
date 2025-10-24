import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Partitioners } from 'kafkajs';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'USER_EVENTS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get('KAFKA_CLIENT_ID', 'notification-service'),
              brokers: configService.get('KAFKA_BROKERS', 'localhost:9092').split(','),
              connectionTimeout: parseInt(configService.get('KAFKA_CONNECTION_TIMEOUT', '3000')),
              requestTimeout: parseInt(configService.get('KAFKA_REQUEST_TIMEOUT', '30000')),
              retry: {
                initialRetryTime: 100,
                retries: 8
              }
            },
            consumer: {
              groupId: configService.get('KAFKA_CONSUMER_GROUP_ID', 'notification-service-user-sync'),
              allowAutoTopicCreation: true,
              maxWaitTimeInMs: 5000,
              retry: {
                initialRetryTime: 100,
                retries: 8
              }
            },
            // Add producer configuration for sending messages
            producer: {
              maxInFlightRequests: 1,
              idempotent: false, // Set to false to avoid the warning
              allowAutoTopicCreation: true,
              createPartitioner: Partitioners.LegacyPartitioner, // Use legacy partitioner
              retry: {
                initialRetryTime: 100,
                retries: 8
              }
            }
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule {}