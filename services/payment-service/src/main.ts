import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set the global prefix, but exclude the 'health' and 'ready' endpoints
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'ready'],
  });

  // Add the global exception filter & logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: false
  }));

  // Enable CORS for all origins  
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Add your frontend URLs
    credentials: true,
    // origin: '*', // Adjust this in production to restrict origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
  });

  // // Enable Helmet for security headers
  // const helmet = require('helmet');
  // app.use(helmet());

  // // Enable rate limiting
  // const rateLimit = require('express-rate-limit');
  // app.use(rateLimit({ 
  //     windowMs: 15 * 60 * 1000, // 15 minutes
  //     max: 100, // Limit each IP to 100 requests per windowMs
  //     }));

  // // Enable CSRF protection   
  // const csurf = require('csurf');
  // app.use(csurf({ cookie: true })); // Use cookies for CSRF token storage

  // Enable logging for all requests
  const morgan = require('morgan');
  app.use(morgan('combined')); // Use 'combined' format for detailed logging

  // Set up Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Payment Service API')
    .setDescription('Payment service with Stripe integration')
    .setVersion('1.0')
    .addTag('payments')
    .addTag('webhooks')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Connect gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'order',
      protoPath: join(__dirname, '../proto/order.proto'),
      url: '0.0.0.0:50051',
    },
  });

  // Connect Kafka microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'order-service',
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      },
      consumer: {
        groupId: 'order-service-group',
      },
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Payment Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log(`🔗 Webhook endpoint: http://localhost:${port}/webhooks/stripe`);
}
bootstrap();