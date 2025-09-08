import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set the global prefix, but exclude the 'health' and 'ready' endpoints
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'ready'],
  });

    // Enable CORS for all origins  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: false
  }));

  // Enable CORS for all origins  
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3003'], // Add your frontend URLs
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
    .setTitle('Notification Service API')
    .setDescription('The API documentation for the notification microservice')
    .setVersion('1.0')
    .addTag('notification')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  
  console.log(`🚀 Notification Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log(`🔗 Webhook endpoint: http://localhost:${port}/webhooks/stripe`);
}
bootstrap();