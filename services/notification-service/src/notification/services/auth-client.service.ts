import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  avatar?: string;
  is_active: boolean;
  preferred_language?: string;
  timezone?: string;
}

@Injectable()
export class AuthClientService {
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL', 'http://localhost:8000');
  }

  async getUser(userId: string): Promise<AuthUser> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/users/${userId}`)
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new HttpException('User not found', 404);
      }
      throw new HttpException('Failed to fetch user from auth service', 500);
    }
  }

  async validateUser(userId: string): Promise<boolean> {
    try {
      await this.getUser(userId);
      return true;
    } catch (error) {
      return false;
    }
  }
}