// src/controllers/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-01-15T10:30:00.000Z' },
        uptime: { type: 'number', example: 12345.678 },
        service: { type: 'string', example: 'notification-api' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'notification-api',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
  })
  getReadiness() {
    // Add database connection checks, external service checks, etc.
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected', // You can add actual DB connection check here
        redis: 'connected', // Add Redis check if you use it
        mailtrap: 'connected', // Add email service check
      },
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('deep')  // ✅ This handles GET /health/deep
  getDeep() {
    // Add database, Redis, external service checks here
    return { 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString()
    };
  }
}