import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';


async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try{
    // Create the main NestJS application
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });
    
    // Set up global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Enable CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    });
    
    // Swagger setup (much cleaner!)
    const config = new DocumentBuilder()
      .setTitle('Notification Service API')
      .setDescription('API documentation for the E-commerce Notification Service')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addServer('http://localhost:3002/api/v1', 'Development API v1')
      .addServer('http://localhost:3002', 'Health Checks')
      .build();  

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  
    
    app.setGlobalPrefix('api/v1', {
      exclude: [
        'health',           // Excludes /health
        'health/ready',     // Excludes /health/ready  
        'health/live',      // Excludes /health/live
        'health/deep'       // Excludes /health/deep
      ]
    });

    // Get Kafka configuration from environment
    const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
    const kafkaClientId = process.env.KAFKA_CLIENT_ID || 'notification-service';
    const kafkaGroupId = process.env.KAFKA_CONSUMER_GROUP_ID || 'notification-service-user-sync';

    logger.log(`Connecting to Kafka brokers: ${kafkaBrokers.join(', ')}`);
    
    // Add Kafka microservice with improved configuration
    const microservice = app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: kafkaClientId,
          brokers: kafkaBrokers,
          connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || '10000'),
          requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000'),
          // Remove retry config to use KafkaJS defaults and avoid timing issues
          logLevel: 1,
          // Add explicit socket keepAlive settings
          socketKeepAlive: true,
          socketKeepAliveInitialDelay: 0,
        },
        consumer: {
          groupId: kafkaGroupId,
          allowAutoTopicCreation: true,
          maxWaitTimeInMs: 5000,
          sessionTimeout: 30000,
          heartbeatInterval: 3000,
          // Remove custom retry config
        },
        producer: {
          maxInFlightRequests: 1,
          idempotent: true,
          allowAutoTopicCreation: true,
          transactionTimeout: 30000,
          // Remove custom retry config to use defaults
        }
      },
    });

    const PORT = process.env.PORT || 3002;
    await app.listen(PORT);
    
    logger.log(`🚀 Notification service running on port ${PORT}`);
    logger.log(`📝 Swagger docs at: http://localhost:${PORT}/api`);

    // Start Kafka microservice with timeout handling
    logger.log('🔌 Starting Kafka microservice...');
    
    const kafkaTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Kafka startup timeout')), 30000)
    );

    const kafkaStartup = app.startAllMicroservices();

    try {
      await Promise.race([kafkaStartup, kafkaTimeout]);
      logger.log('✅ Kafka microservice connected successfully');
    } catch (kafkaError) {
      logger.error('❌ Failed to connect to Kafka microservice:', kafkaError.message);
      logger.warn('🔄 Application will continue without Kafka. Check your Kafka setup.');
      logger.warn('💡 Make sure Kafka is running and the topics exist');
      
      // In development, we might want to create the topic
      if (process.env.NODE_ENV === 'development') {
        logger.log('💡 Try running: docker exec -it kafka kafka-topics.sh --create --topic user-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1');
      }
    }

    } catch (error) {
      logger.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }

  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  bootstrap().catch((error) => {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  });
// ================================================================

//     // Start Kafka microservice with improved timeout handling
//     let startTimeout: NodeJS.Timeout | null = null;
    
//     try {
//       // Use a Promise-based approach to avoid timeout issues
//       const kafkaStartup = new Promise<void>((resolve, reject) => {
//         startTimeout = setTimeout(() => {
//           logger.warn('Kafka microservice startup is taking longer than expected...');
//           // Don't reject, just warn - let it continue trying
//         }, 10000);

//         app.startAllMicroservices()
//           .then(() => resolve())
//           .catch((error) => reject(error));
//       });

//       await kafkaStartup;
      
//       // Clear timeout safely
//       if (startTimeout) {
//         clearTimeout(startTimeout);
//         startTimeout = null;
//       }
      
//       logger.log('✅ Kafka microservice connected successfully');
      
//     } catch (kafkaError) {
//       // Clear timeout on error
//       if (startTimeout) {
//         clearTimeout(startTimeout);
//         startTimeout = null;
//       }
      
//       logger.error('❌ Failed to connect to Kafka microservice:', kafkaError.message);
//       logger.warn('🔄 Application will continue without Kafka. Check your Kafka setup.');
//       // Don't exit - let the HTTP server continue running
//     }

//   } catch (error) {
//     logger.error('❌ Failed to start application:', error);
//     process.exit(1);
//   }
// }

// // Add graceful shutdown handling
// process.on('SIGINT', async () => {
//   console.log('Received SIGINT, shutting down gracefully...');
//   process.exit(0);
// });

// process.on('SIGTERM', async () => {
//   console.log('Received SIGTERM, shutting down gracefully...');
//   process.exit(0);
// });

// // Add trace warnings to identify the source of the timeout issue
// process.env.NODE_OPTIONS = '--trace-warnings';

// bootstrap().catch((error) => {
//   console.error('Bootstrap failed:', error);
//   process.exit(1);
// });

// ==========================================
// import express from 'express';
// import cors from 'cors';
// import * as dotenv from 'dotenv';
// import { createApp } from './app';

// dotenv.config();

// async function bootstrap() {
//   const app = createApp();
//   const PORT = process.env.PORT || 3002;

//   app.listen(PORT, () => {
//     console.log(`🚀 Notification service running on port ${PORT}`);
//     console.log(`📧 Mailtrap configuration loaded`);
//   });
// }

// bootstrap().catch(console.error);


