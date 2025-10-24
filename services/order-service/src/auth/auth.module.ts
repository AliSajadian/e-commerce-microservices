// /src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

console.log('📦 Auth module file is being imported!'); // This should show

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        console.log('🏭 JWT Module factory called');
        return {
          secret: configService.get<string>('SECRET_KEY'),
          signOptions: {
            expiresIn: `${configService.get<string>('ACCESS_TOKEN_EXPIRE_MINUTES')}m`,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtStrategy, JwtAuthGuard, PassportModule],
})
export class AuthModule {
  constructor() {
    console.log('🏗️ AuthModule constructor called');
  }
}