import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigModule and ConfigService
import { Algorithm } from 'jsonwebtoken'; // Import the Algorithm type
import { PassportModule } from '@nestjs/passport';

import { NotificationModule } from './notification/notification.module';
import { KafkaModule } from './kafka/kafka.module';
import { ProductModule } from './product/product.module'; // Import the new module
import { ProvidersModule } from './providers/providers.module';

import { JwtStrategy } from './auth/jwt.strategy';
import { AppController } from './app.controller';
import { HealthController } from './controllers/health.controller';
import { AppService } from './app.service';
import { ormConfig } from './config/ormconfig';
import { EventsModule } from './events/event.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async () => {
        // Use the centralized ormConfig for the TypeOrmModule
        return ormConfig;
      },
      inject: [ConfigService],
    }),

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
      global: true
    }),

    ClientsModule.register([
      {
        name: 'PRODUCT_PACKAGE', // This is the name we'll inject later
        transport: Transport.GRPC,
        options: {
          url: 'localhost:50051', // The address of the product-service gRPC server
          package: 'product',
          protoPath: join(__dirname, 'proto/product.proto'),
        },
      },
    ]),    

    KafkaModule,
    EventsModule,
    NotificationModule,
    PassportModule,
    ProductModule,
    ProvidersModule,
  ],

  controllers: [
    AppController, 
    HealthController],

  providers: [
    JwtStrategy, 
    AppService
  ], // Make sure to add JwtStrategy to the providers list
})
export class AppModule {}


