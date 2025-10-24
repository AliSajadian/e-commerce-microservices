console.log('='.repeat(50));
console.log('🚀 MAIN.TS IS RUNNING - THIS SHOULD ALWAYS SHOW');
console.log('='.repeat(50));

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  console.log('🚀 Starting application...');

  try{
  const app = await NestFactory.create(AppModule);

  // Set the global prefix, but exclude the 'health' and 'ready' endpoints
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'ready'],
  });

    // Enable CORS for all origins  
  app.enableCors({
      origin: '*', // Adjust this in production to restrict origins
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
    .setTitle('Order Service API')
    .setDescription('The API documentation for the Order microservice')
    .setVersion('1.0')
    .addTag('orders')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This is the unique name for the security scheme
    )
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('✅ Application is listening on port 3000');
  } catch (error) {
    console.error('❌ Error during bootstrap:', error);
  }
}
bootstrap();