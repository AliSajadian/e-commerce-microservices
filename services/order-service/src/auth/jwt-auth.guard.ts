// /src/auth/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('🛡️ JwtAuthGuard.canActivate called');
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    console.log('🛡️ JwtAuthGuard.handleRequest - err:', err);
    console.log('🛡️ JwtAuthGuard.handleRequest - user:', user);
    console.log('🛡️ JwtAuthGuard.handleRequest - info:', info);
    
    if (err || !user) {
      console.log('🚨 Authentication failed:', err || info);
      throw err || new Error('Authentication failed');
    }
    return user;
  }
}