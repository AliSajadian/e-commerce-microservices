import * as path from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigModule and ConfigService
import { Algorithm } from 'jsonwebtoken'; // Import the Algorithm type
import { PassportModule } from '@nestjs/passport';

import { OrderModule } from './order/order.module';
import { JwtStrategy } from './auth/jwt.strategy';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from './product/product.module'; // Import the new module
import { ormConfig } from './config/ormconfig';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async () => {
        // Use the centralized ormConfig for the TypeOrmModule
        return ormConfig;
      },
    }),
    OrderModule,
    PassportModule,
    ProductModule,
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
  providers: [JwtStrategy, AppService], // Make sure to add JwtStrategy to the providers list
})
export class AppModule {}