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

// Metadata key for required permissions
export const PERMISSIONS_KEY = 'permissions';

// Decorator to set required permissions
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // No permissions required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      this.logger.warn('PermissionGuard: No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission =>
      user.permission_ids.includes(permission),
    );

    if (!hasAllPermissions) {
      this.logger.warn('PermissionGuard: User lacks required permissions', {
        userId: user.sub,
        requiredPermissions,
        userPermissions: user.permission_ids,
      });
      throw new ForbiddenException('Insufficient permissions');
    }

    this.logger.debug('PermissionGuard: Access granted', {
      userId: user.sub,
      requiredPermissions,
    });

    return true;
  }
}

