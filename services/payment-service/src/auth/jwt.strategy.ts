import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config'; // Import ConfigService

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Set to false to automatically check for expiration
      secretOrKey: configService.get<string>('SECRET_KEY'), // Get key from ConfigService
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    const roles = payload.roles;
    const permissions = payload.permissions;

    if (!userId) {
      throw new UnauthorizedException('Token is missing user ID.');
    }
    return { 
      userId: userId,
      roles: roles,
      permissions: permissions
    };
  }
}