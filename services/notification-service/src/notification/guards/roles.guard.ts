import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

// Metadata key for required roles
export const ROLES_KEY = 'roles';

// Decorator to set required roles
export const RequireRoles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      // No roles required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      this.logger.warn('RoleGuard: No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has at least one of the required roles
    const hasRequiredRole = requiredRoles.some(role =>
      user.role_ids.includes(role),
    );

    if (!hasRequiredRole) {
      this.logger.warn('RoleGuard: User does not have required roles', {
        userId: user.sub,
        requiredRoles,
        userRoles: user.role_ids,
      });
      throw new ForbiddenException('Insufficient role permissions');
    }

    this.logger.debug('RoleGuard: Access granted', {
      userId: user.sub,
      requiredRoles,
    });

    return true;
  }
}


