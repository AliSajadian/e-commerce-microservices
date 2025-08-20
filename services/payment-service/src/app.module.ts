import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigModule and ConfigService
import { Algorithm } from 'jsonwebtoken'; // Import the Algorithm type
import { PassportModule } from '@nestjs/passport';

import { PaymentModule } from './payment/payment.module';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtStrategy } from './auth/jwt.strategy';
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
    PaymentModule,
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
  providers: [JwtStrategy, AppService],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}



