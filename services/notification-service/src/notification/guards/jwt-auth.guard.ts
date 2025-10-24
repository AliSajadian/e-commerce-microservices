import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No token provided in request');
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Verify and decode the JWT token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Validate required fields in payload
      if (!payload.sub || !payload.email) {
        this.logger.warn('Invalid token payload: missing required fields', { payload });
        throw new UnauthorizedException('Invalid token payload');
      }

      // Attach user information to request
      request.user = {
        sub: payload.sub, // user_id
        email: payload.email,
        role_ids: payload.role_ids || [],
        permission_ids: payload.permission_ids || [],
        iat: payload.iat,
        exp: payload.exp,
      };

      this.logger.debug('User authenticated successfully', { 
        userId: payload.sub, 
        email: payload.email 
      });

      return true;
    } catch (error) {
      this.logger.warn('Token verification failed', { 
        error: error.message,
        token: token.substring(0, 20) + '...' // Log only first 20 chars for security
      });

      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid access token');
      }
      
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token has expired');
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: AuthenticatedRequest): string | undefined {
    // Support both Bearer token and custom header formats
    const authHeader = request.headers.authorization;
    const accessTokenHeader = request.headers['x-access-token'] as string;

    // Check Authorization header first (Bearer token)
    if (authHeader) {
      const [type, token] = authHeader.split(' ') ?? [];
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    // Check custom X-Access-Token header
    if (accessTokenHeader) {
      return accessTokenHeader;
    }

    // Check query parameter (less secure, use only if needed)
    const queryToken = request.query.access_token as string;
    if (queryToken) {
      return queryToken;
    }

    return undefined;
  }
}
