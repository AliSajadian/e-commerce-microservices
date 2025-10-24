import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

/**
 * Guard to ensure user can only access their own resources
 * Checks if the :userId parameter matches the authenticated user's ID
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  private readonly logger = new Logger(ResourceOwnerGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      this.logger.warn('ResourceOwnerGuard: No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    // Get userId from route parameters
    const resourceUserId = request.params?.userId;

    if (!resourceUserId) {
      // If no userId parameter, allow access (not applicable for this guard)
      return true;
    }

    // Check if the authenticated user is accessing their own resource
    if (user.sub !== resourceUserId) {
      this.logger.warn('ResourceOwnerGuard: User trying to access another user\'s resource', {
        authenticatedUserId: user.sub,
        requestedUserId: resourceUserId,
      });
      throw new ForbiddenException('You can only access your own resources');
    }

    this.logger.debug('ResourceOwnerGuard: Resource access granted', {
      userId: user.sub,
    });

    return true;
  }
}
