import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { OrderModule } from './order/order.module';
import { JwtStrategy } from './auth/jwt.strategy'; // Direct import
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from './product/product.module';
import { ormConfig } from './config/ormconfig';

console.log('📦 AppModule file is being loaded!'); // Add this log

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async () => {
        return ormConfig;
      },
    }),
    PassportModule, // Add this
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        console.log('🏭 JWT Module factory in AppModule called'); // Add this log
        return {
          secret: configService.get<string>('SECRET_KEY'),
          signOptions: {
            expiresIn: `${configService.get<string>('ACCESS_TOKEN_EXPIRE_MINUTES')}m`,
          },
        };
      },
      inject: [ConfigService],
    }),
    OrderModule,
    ProductModule,
  ],
  controllers: [AppController],
  providers: [JwtStrategy, AppService], // Put JwtStrategy back here
})
export class AppModule {
  constructor() {
    console.log('🏗️ AppModule constructor called'); // Add this log
  }
}