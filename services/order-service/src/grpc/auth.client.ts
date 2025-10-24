import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

interface AuthService {
  validateToken(data: { token: string }): any;
  getUser(data: { user_id: string }): any;
  checkPermission(data: { user_id: string; permission: string }): any;
  getUserProfile(data: { user_id: string }): any;
}

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  private authService: AuthService;

  constructor(@Inject('AUTH_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthService>('AuthService');
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    user_id?: string;
    username?: string;
    role?: string;
    permissions?: string[];
    error_message?: string;
  }> {
    try {
      const response = await lastValueFrom(
        this.authService.validateToken({ token })
      );
      return response;
    } catch (error) {
      console.error('Auth gRPC validation error:', error);
      return {
        valid: false,
        error_message: 'Authentication service unavailable'
      };
    }
  }

  /**
   * Get user information
   */
  async getUser(userId: string): Promise<{
    success: boolean;
    user_id?: string;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    is_active?: boolean;
    error_message?: string;
  }> {
    try {
      const response = await lastValueFrom(
        this.authService.getUser({ user_id: userId })
      );
      return response;
    } catch (error) {
      console.error('Auth gRPC get user error:', error);
      return {
        success: false,
        error_message: 'Failed to get user information'
      };
    }
  }

  /**
   * Check user permission
   */
  async checkPermission(userId: string, permission: string): Promise<{
    has_permission: boolean;
    error_message?: string;
  }> {
    try {
      const response = await lastValueFrom(
        this.authService.checkPermission({ 
          user_id: userId, 
          permission: permission 
        })
      );
      return response;
    } catch (error) {
      console.error('Auth gRPC permission check error:', error);
      return {
        has_permission: false,
        error_message: 'Permission check failed'
      };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<{
    success: boolean;
    user_id?: string;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    is_active?: boolean;
    created_at?: string;
    error_message?: string;
  }> {
    try {
      const response = await lastValueFrom(
        this.authService.getUserProfile({ user_id: userId })
      );
      return response;
    } catch (error) {
      console.error('Auth gRPC get profile error:', error);
      return {
        success: false,
        error_message: 'Failed to get user profile'
      };
    }
  }
}

