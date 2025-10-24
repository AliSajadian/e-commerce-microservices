import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config'; // Import ConfigService

console.log('📄 JWT Strategy file is being imported!'); 

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: (request) => {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
        console.log('🎯 Extracted token from request:', token ? 'TOKEN_EXISTS' : 'NO_TOKEN');
        console.log('🎯 Authorization header:', request.headers?.authorization);
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SECRET_KEY'),
    });
    
    console.log('JWT Strategy initialized successfully');
  }

  async validate(payload: any) {
    console.log('JWT Payload:', payload);

    const userId = payload.sub;
    const roles = payload.roles;
    const permissions = payload.permissions;

    if (!userId) {
      throw new UnauthorizedException('Token is missing user ID.');
    }
    const user = {
      userId: userId,
      roles: roles,
      permissions: permissions
    };
    
    console.log('Validated user:', user);
    return user;  
  }
}