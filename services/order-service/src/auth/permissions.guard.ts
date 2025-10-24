import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    console.log('Required permissions:', requiredPermissions);

    if (!requiredPermissions) {
      return true; // No permissions required, access granted
    }

    const { user } = context.switchToHttp().getRequest();
    console.log('User from request:', user);
    console.log('User permissions:', user?.permissions);
    
    // Assuming the JWT payload is attached to req.user by your JwtStrategy
    const userPermissions: string[] = user?.permissions || [];

    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    console.log('Has permission:', hasPermission);
    return hasPermission;

  }
}