// import * as express from 'express';
// import * as cors from 'cors';
// import helmet from 'helmet';
// import * as morgan from 'morgan';
// import rateLimit from 'express-rate-limit';
// import { AppController } from './app.controller';
// import { errorHandler, notFoundHandler } from './middleware';
// // import { HealthController } from './controllers/health.controller';
// import * as swaggerUi from 'swagger-ui-express';
// import * as swaggerJSDoc from 'swagger-jsdoc';

// export function createApp(): express.Application {
//   const app = express();

//   const appController = new AppController();

//   // Swagger setup
//   const swaggerOptions = {
//     definition: {
//       openapi: '3.0.0',
//       info: {
//         title: 'Notification Service API',
//         version: '1.0.0',
//         description: 'API documentation for the E-commerce Notification Service.',
//       },
//       servers: [
//         {
//           url: 'http://localhost:3002/api/v1',
//           description: 'Development server',
//         },
//       ],
//     },
//     // apis: ['./src/**/*.ts', './dist/**/*.js']
//     apis: ['./src/controllers/*.ts', './src/controllers/*.ts', './src/app.controller.ts'], // Path to your API files
//   };
//   const swaggerSpec = swaggerJSDoc(swaggerOptions);
//   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//   // Security middleware
//   app.use(helmet());
//   app.use(cors({
//     origin: ['http://localhost:3000', 'http://localhost:3002'],
//     credentials: true,
//   }));

//   // Rate limiting
//   app.use(rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100,
//     message: 'Too many requests from this IP'
//   }));

//   // Logging
//   app.use(morgan('combined'));

//   // Body parsing
//   app.use(express.json({ limit: '10mb' }));
//   app.use(express.urlencoded({ extended: true }));

//   // Routes
//   app.use('/api/v1', appController.getRouter());

//   // Error handling
//   app.use(errorHandler);
//   app.use(notFoundHandler);

//   return app;
// }
