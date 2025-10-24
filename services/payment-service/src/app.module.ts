import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentModule } from './payment/payment.module';
import { StripeModule } from './stripe/stripe.module';
import { WebhookModule } from './webhooks/webhook.module';
import { Payment } from './payment/entities/payment.entity';

import { JwtModule } from '@nestjs/jwt';
import { Algorithm } from 'jsonwebtoken'; // Import the Algorithm type
import { PassportModule } from '@nestjs/passport';

import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { ormConfig } from './config/ormconfig';

// Middleware to capture raw body for Stripe webhooks
export class RawBodyMiddleware {
  use(req: any, res: any, next: () => any) {
    if (req.path === '/webhooks/stripe' && req.method === 'POST') {
      let rawBody = '';
      req.setEncoding('utf8');

      req.on('data', (chunk: string) => {
        rawBody += chunk;
      });

      req.on('end', () => {
        req.rawBody = Buffer.from(rawBody, 'utf8');
        next();
      });
    } else {
      next();
    }
  }
}

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async () => {
        // Use the centralized ormConfig for the TypeOrmModule
        return ormConfig;
      },
    }),

    // TypeOrmModule.forRoot({
    //   type: 'postgres', // or 'mysql', 'sqlite', etc.
    //   host: process.env.DB_HOST || 'localhost',
    //   port: parseInt(process.env.DB_PORT) || 5432,
    //   username: process.env.DB_USERNAME || 'postgres',
    //   password: process.env.DB_PASSWORD || 'password',
    //   database: process.env.DB_NAME || 'payment_service',
    //   entities: [Payment],
    //   synchronize: process.env.NODE_ENV !== 'production', // Set to false in production
    //   logging: process.env.NODE_ENV === 'development',
    // }),

    // Modules
    StripeModule,
    PaymentModule,
    WebhookModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule], // Import the ConfigModule
      useFactory: async (configService: ConfigService) => ({
        // Use ConfigService to retrieve values
        secret: configService.get<string>('SECRET_KEY'),
        signOptions: {
          expiresIn: `${configService.get<string>('ACCESS_TOKEN_EXPIRE_MINUTES')}m`,
          // Add the type assertion here to tell TypeScript it's a valid Algorithm
          algorithm: configService.get<string>('ALGORITHM') as Algorithm, 
        },
      }),
      inject: [ConfigService], // Inject ConfigService into the factory
    }),

  ],
  controllers: [AppController],
  providers: [JwtStrategy, AppService]
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes({ path: '/webhooks/stripe', method: RequestMethod.POST });
  }
}


// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//     }),
//     TypeOrmModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: async () => {
//         // Use the centralized ormConfig for the TypeOrmModule
//         return ormConfig;
//       },
//     }),
//     PaymentModule,
//     PassportModule,
//     JwtModule.registerAsync({
//       imports: [ConfigModule], // Import the ConfigModule
//       useFactory: async (configService: ConfigService) => ({
//         // Use ConfigService to retrieve values
//         secret: configService.get<string>('SECRET_KEY'),
//         signOptions: {
//           expiresIn: `${configService.get<string>('ACCESS_TOKEN_EXPIRE_MINUTES')}m`,
//           // Add the type assertion here to tell TypeScript it's a valid Algorithm
//           algorithm: configService.get<string>('ALGORITHM') as Algorithm, 
//         },
//       }),
//       inject: [ConfigService], // Inject ConfigService into the factory
//     }),

//   ],
//   controllers: [AppController],
//   providers: [JwtStrategy, AppService],
// })
// export class AppModule {
//   constructor(private dataSource: DataSource) {}
// }



