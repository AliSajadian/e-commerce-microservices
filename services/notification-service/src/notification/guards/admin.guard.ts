import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      this.logger.warn('AdminGuard: No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has admin role
    const adminRoleId = this.configService.get<string>('ADMIN_ROLE_ID');
    const superAdminRoleId = this.configService.get<string>('SUPER_ADMIN_ROLE_ID');

    const hasAdminRole = user.role_ids.includes(adminRoleId) || 
                        user.role_ids.includes(superAdminRoleId);

    if (!hasAdminRole) {
      this.logger.warn('AdminGuard: User does not have admin permissions', { 
        userId: user.sub, 
        userRoles: user.role_ids 
      });
      throw new ForbiddenException('Admin access required');
    }

    this.logger.debug('AdminGuard: Admin access granted', { 
      userId: user.sub 
    });

    return true;
  }
}
