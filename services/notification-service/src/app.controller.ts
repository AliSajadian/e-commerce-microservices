import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Router } from 'express';

@ApiTags('Application')
@Controller()
export class AppController {
  private router: Router;
  constructor() {
    this.router = Router();  
  }

  @Get()
  @ApiOperation({ 
    summary: 'Application root endpoint',
    description: 'Returns basic application information and welcome message'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Application information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Notification Service' },
        version: { type: 'string', example: '1.0.0' },
        description: { type: 'string', example: 'Multi-provider notification service supporting email, SMS, and push notifications' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 12345 },
        endpoints: {
          type: 'object',
          properties: {
            health: { type: 'string', example: '/health' },
            notifications: { type: 'string', example: '/notification' },
            providers: { type: 'string', example: '/providers' },
            webhooks: { type: 'string', example: '/webhooks' },
            docs: { type: 'string', example: '/api/docs' }
          }
        }
      }
    }
  })
  getRoot(): any {
    return {
      name: 'Notification Service',
      version: '1.0.0',
      description: 'Multi-provider notification service supporting email, SMS, and push notifications',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      endpoints: {
        health: '/health',
        notifications: '/notification',
        providers: '/providers',
        webhooks: '/webhooks',
        docs: '/api/docs'
      },
      providers: {
        email: ['mailtrap'],
        sms: ['twilio'],
        push: ['firebase']
      }
    };
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Health check endpoint',
    description: 'Returns the health status of the notification service and its dependencies'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy'], example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 12345 },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'development' },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['connected', 'disconnected'], example: 'connected' },
            type: { type: 'string', example: 'postgresql' }
          }
        },
        providers: {
          type: 'object',
          properties: {
            mailtrap: { type: 'string', enum: ['operational', 'down'], example: 'operational' },
            twilio: { type: 'string', enum: ['operational', 'down'], example: 'operational' },
            firebase: { type: 'string', enum: ['operational', 'down'], example: 'operational' }
          }
        },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'string', example: '45.2 MB' },
            total: { type: 'string', example: '128 MB' },
            percentage: { type: 'number', example: 35.3 }
          }
        }
      }
    }
  })
  getHealth(): any {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'connected', // You can enhance this with actual DB health check
        type: 'postgresql'
      },
      providers: {
        mailtrap: 'operational', // You can enhance this with actual provider health checks
        twilio: 'operational',
        firebase: 'operational'
      },
      memory: {
        used: `${Math.round(usedMemory / 1024 / 1024 * 100) / 100} MB`,
        total: `${Math.round(totalMemory / 1024 / 1024 * 100) / 100} MB`,
        percentage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  @Get('health/deep')
  @ApiOperation({ 
    summary: 'Deep health check endpoint',
    description: 'Performs comprehensive health checks including database and provider connectivity'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Deep health check completed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                responseTime: { type: 'number' },
                error: { type: 'string', nullable: true }
              }
            },
            providers: {
              type: 'object',
              properties: {
                mailtrap: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' },
                    error: { type: 'string', nullable: true }
                  }
                },
                twilio: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' },
                    error: { type: 'string', nullable: true }
                  }
                },
                firebase: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' },
                    error: { type: 'string', nullable: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  async getDeepHealth(): Promise<any> {
    const startTime = Date.now();
    
    // TODO: Implement actual health checks for each service
    // This is a template - you should inject actual services and test them
    
    const checks = {
      database: await this.checkDatabaseHealth(),
      providers: {
        mailtrap: await this.checkProviderHealth('mailtrap'),
        twilio: await this.checkProviderHealth('twilio'),
        firebase: await this.checkProviderHealth('firebase')
      }
    };

    const allHealthy = this.determineOverallHealth(checks);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      totalTime: Date.now() - startTime,
      checks
    };
  }

  @Get('version')
  @ApiOperation({ 
    summary: 'Get application version',
    description: 'Returns version information and build details'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Version information retrieved successfully'
  })
  getVersion(): any {
    return {
      version: '1.0.0',
      buildDate: new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  @Get('metrics')
  @ApiOperation({ 
    summary: 'Get application metrics',
    description: 'Returns basic application metrics and statistics'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Metrics retrieved successfully'
  })
  getMetrics(): any {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100 // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  // Private helper methods for health checks
  private async checkDatabaseHealth(): Promise<any> {
    try {
      const startTime = Date.now();
      
      // TODO: Implement actual database health check
      // Example: await this.dataSource.query('SELECT 1');
      
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        error: null
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        error: error.message
      };
    }
  }

  private async checkProviderHealth(provider: string): Promise<any> {
    try {
      const startTime = Date.now();
      
      // TODO: Implement actual provider health checks
      // Example: Call provider's health/status endpoint
      
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        error: null
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        error: error.message
      };
    }
  }

  private determineOverallHealth(checks: any): boolean {
    // Check if database is healthy
    if (checks.database.status !== 'healthy') {
      return false;
    }

    // Check if at least one provider is healthy
    const providerStatuses = Object.values(checks.providers).map((p: any) => p.status);
    const hasHealthyProvider = providerStatuses.some(status => status === 'healthy');
    
    return hasHealthyProvider;
  }

  public getRouter(): Router {
    return this.router;
  }
}
//=====================================================================================
// import { Router, Request, Response } from 'express';

// export class AppController {
//   private router: Router;

//   constructor() {
//     this.router = Router();
//     this.setupRoutes();
//   }

//   private setupRoutes(): void {
//     /**
//      * @swagger
//      * /:
//      *   get:
//      *     tags:
//      *       - Application
//      *     summary: Application root endpoint
//      *     description: Returns basic application information and welcome message
//      *     responses:
//      *       200:
//      *         description: Application information retrieved successfully
//      *         content:
//      *           application/json:
//      *             schema:
//      *               type: object
//      *               properties:
//      *                 name:
//      *                   type: string
//      *                   example: Notification Service
//      *                 version:
//      *                   type: string
//      *                   example: 1.0.0
//      *                 description:
//      *                   type: string
//      *                   example: Multi-provider notification service supporting email, SMS, and push notifications
//      *                 timestamp:
//      *                   type: string
//      *                   format: date-time
//      *                 uptime:
//      *                   type: number
//      *                   example: 12345
//      */
//     this.router.get('/', this.getRoot.bind(this));

//     /**
//      * @swagger
//      * /health:
//      *   get:
//      *     tags:
//      *       - Health
//      *     summary: Health check endpoint
//      *     description: Returns the health status of the notification service and its dependencies
//      *     responses:
//      *       200:
//      *         description: Service is healthy
//      *         content:
//      *           application/json:
//      *             schema:
//      *               type: object
//      *               properties:
//      *                 status:
//      *                   type: string
//      *                   enum: [healthy, unhealthy]
//      *                   example: healthy
//      *                 timestamp:
//      *                   type: string
//      *                   format: date-time
//      *                 uptime:
//      *                   type: number
//      *                   example: 12345
//      */
//     this.router.get('/health', this.getHealth.bind(this));

//     /**
//      * @swagger
//      * /health/deep:
//      *   get:
//      *     tags:
//      *       - Health
//      *     summary: Deep health check endpoint
//      *     description: Performs comprehensive health checks including database and provider connectivity
//      *     responses:
//      *       200:
//      *         description: Deep health check completed
//      *         content:
//      *           application/json:
//      *             schema:
//      *               type: object
//      *               properties:
//      *                 status:
//      *                   type: string
//      *                   enum: [healthy, degraded, unhealthy]
//      *                 timestamp:
//      *                   type: string
//      *                   format: date-time
//      */
//     this.router.get('/health/deep', this.getDeepHealth.bind(this));

//     /**
//      * @swagger
//      * /version:
//      *   get:
//      *     tags:
//      *       - Application
//      *     summary: Get application version
//      *     description: Returns version information and build details
//      *     responses:
//      *       200:
//      *         description: Version information retrieved successfully
//      */
//     this.router.get('/version', this.getVersion.bind(this));

//     /**
//      * @swagger
//      * /metrics:
//      *   get:
//      *     tags:
//      *       - Application
//      *     summary: Get application metrics
//      *     description: Returns basic application metrics and statistics
//      *     responses:
//      *       200:
//      *         description: Metrics retrieved successfully
//      */
//     this.router.get('/metrics', this.getMetrics.bind(this));
//   }

//   private getRoot(req: Request, res: Response): void {
//     res.json({
//       name: 'Notification Service',
//       version: '1.0.0',
//       description: 'Multi-provider notification service supporting email, SMS, and push notifications',
//       timestamp: new Date().toISOString(),
//       uptime: process.uptime(),
//       endpoints: {
//         health: '/api/v1/health',
//         healthDeep: '/api/v1/health/deep',
//         version: '/api/v1/version',
//         metrics: '/api/v1/metrics',
//         docs: '/api-docs'
//       },
//       providers: {
//         email: ['mailtrap'],
//         sms: ['twilio'],
//         push: ['firebase']
//       }
//     });
//   }

//   private getHealth(req: Request, res: Response): void {
//     const memoryUsage = process.memoryUsage();
//     const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
//     const usedMemory = memoryUsage.heapUsed;
    
//     res.json({
//       status: 'healthy',
//       timestamp: new Date().toISOString(),
//       uptime: process.uptime(),
//       version: '1.0.0',
//       environment: process.env.NODE_ENV || 'development',
//       database: {
//         status: 'connected', // You can enhance this with actual DB health check
//         type: 'postgresql'
//       },
//       providers: {
//         mailtrap: 'operational', // You can enhance this with actual provider health checks
//         twilio: 'operational',
//         firebase: 'operational'
//       },
//       memory: {
//         used: `${Math.round(usedMemory / 1024 / 1024 * 100) / 100} MB`,
//         total: `${Math.round(totalMemory / 1024 / 1024 * 100) / 100} MB`,
//         percentage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100
//       },
//       node: {
//         version: process.version,
//         platform: process.platform,
//         arch: process.arch
//       }
//     });
//   }

//   private async getDeepHealth(req: Request, res: Response): Promise<void> {
//     const startTime = Date.now();
    
//     // TODO: Implement actual health checks for each service
//     // This is a template - you should inject actual services and test them
    
//     const checks = {
//       database: await this.checkDatabaseHealth(),
//       providers: {
//         mailtrap: await this.checkProviderHealth('mailtrap'),
//         twilio: await this.checkProviderHealth('twilio'),
//         firebase: await this.checkProviderHealth('firebase')
//       }
//     };

//     const allHealthy = this.determineOverallHealth(checks);
    
//     res.json({
//       status: allHealthy ? 'healthy' : 'degraded',
//       timestamp: new Date().toISOString(),
//       totalTime: Date.now() - startTime,
//       checks
//     });
//   }

//   private getVersion(req: Request, res: Response): void {
//     res.json({
//       version: '1.0.0',
//       buildDate: new Date().toISOString(),
//       gitCommit: process.env.GIT_COMMIT || 'unknown',
//       environment: process.env.NODE_ENV || 'development',
//       nodeVersion: process.version,
//       platform: process.platform
//     });
//   }

//   private getMetrics(req: Request, res: Response): void {
//     const memoryUsage = process.memoryUsage();
//     const cpuUsage = process.cpuUsage();
    
//     res.json({
//       timestamp: new Date().toISOString(),
//       uptime: process.uptime(),
//       memory: {
//         rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
//         heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
//         heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
//         external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100 // MB
//       },
//       cpu: {
//         user: cpuUsage.user,
//         system: cpuUsage.system
//       },
//       process: {
//         pid: process.pid,
//         version: process.version,
//         platform: process.platform,
//         arch: process.arch
//       }
//     });
//   }

//   // Private helper methods for health checks
//   private async checkDatabaseHealth(): Promise<any> {
//     try {
//       const startTime = Date.now();
      
//       // TODO: Implement actual database health check
//       // Example: await this.dataSource.query('SELECT 1');
      
//       return {
//         status: 'healthy',
//         responseTime: Date.now() - startTime,
//         error: null
//       };
//     } catch (error) {
//       return {
//         status: 'unhealthy',
//         responseTime: 0,
//         error: error.message
//       };
//     }
//   }

//   private async checkProviderHealth(provider: string): Promise<any> {
//     try {
//       const startTime = Date.now();
      
//       // TODO: Implement actual provider health checks
//       // Example: Call provider's health/status endpoint
      
//       return {
//         status: 'healthy',
//         responseTime: Date.now() - startTime,
//         error: null
//       };
//     } catch (error) {
//       return {
//         status: 'unhealthy',
//         responseTime: 0,
//         error: error.message
//       };
//     }
//   }

//   private determineOverallHealth(checks: any): boolean {
//     // Check if database is healthy
//     if (checks.database.status !== 'healthy') {
//       return false;
//     }

//     // Check if at least one provider is healthy
//     const providerStatuses = Object.values(checks.providers).map((p: any) => p.status);
//     const hasHealthyProvider = providerStatuses.some(status => status === 'healthy');
    
//     return hasHealthyProvider;
//   }

//   public getRouter(): Router {
//     return this.router;
//   }
// }

//======================================================================
