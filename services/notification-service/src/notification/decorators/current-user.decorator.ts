// decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface JwtPayload {
  sub: string; // user_id
  email: string;
  role_ids: string[];
  permission_ids: string[];
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

/**
 * Extract current user information from JWT token
 * Usage:
 * - @CurrentUser() user: JwtPayload - Get full user object
 * - @CurrentUser('sub') userId: string - Get user ID
 * - @CurrentUser('email') email: string - Get user email
 * - @CurrentUser('role_ids') roleIds: string[] - Get user roles
 * - @CurrentUser('permission_ids') permissionIds: string[] - Get user permissions
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | any => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return null;
    }

    // If no specific property is requested, return the full user object
    if (!data) {
      return user;
    }

    // Return specific property
    return user[data];
  },
);

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user?.sub;
  },
);

/*
// Usage examples in controllers:

@Controller('notifications')
@UseGuards(JwtAuthGuard) // Require authentication for all routes
export class NotificationController {

  // Basic user info extraction
  @Get('me')
  async getMyNotifications(
    @CurrentUser('sub') userId: string,
    @CurrentUser('email') email: string,
    @CurrentUser() fullUser: JwtPayload,
  ) {
    // userId, email, and fullUser are available
  }

  // Admin only route
  @Post('admin/broadcast')
  @UseGuards(AdminGuard)
  async broadcastNotification() {
    // Only admins can access this
  }

  // Permission-based access
  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('notification:delete')
  async deleteNotification() {
    // Only users with 'notification:delete' permission can access
  }

  // Role-based access
  @Get('analytics')
  @UseGuards(RoleGuard)
  @RequireRoles('admin', 'analyst')
  async getAnalytics() {
    // Users with 'admin' OR 'analyst' role can access
  }

  // Resource ownership check
  @Get('user/:userId')
  @UseGuards(ResourceOwnerGuard)
  async getUserNotifications(
    @Param('userId') userId: string,
    @CurrentUser('sub') currentUserId: string,
  ) {
    // User can only access their own notifications
    // userId === currentUserId is guaranteed by the guard
  }

  // Multiple guards can be combined
  @Put('user/:userId/preferences')
  @UseGuards(JwtAuthGuard, ResourceOwnerGuard)
  async updateUserPreferences() {
    // Must be authenticated AND accessing own resource
  }
}
*/