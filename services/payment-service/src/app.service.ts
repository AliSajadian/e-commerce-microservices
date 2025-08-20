import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
// import { ProductGrpcService } from './product/product.grpc.service';
import { lastValueFrom, timeout, catchError, of } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    private readonly dataSource: DataSource,
    // private readonly productGrpcService: ProductGrpcService,
  ) {}

  getLivenessStatus() {
    return {
      status: 'ok',
      message: 'Service is up and running.',
      timestamp: new Date().toISOString(),
    };
  }

  // async getReadinessStatus() {
  //   const readiness = {
  //     database: false,
  //     productService: false,
  //     status: 'down',
  //   };

  //   // Check database connection
  //   try {
  //     await this.dataSource.query('SELECT 1');
  //     readiness.database = true;
  //   } catch (error) {
  //     // Log the error but don't stop the check
  //     console.error('Database readiness check failed', error);
  //   }

  //   // Check gRPC connection to Product Service
  //   try {
  //     // Make a lightweight, non-critical gRPC call to verify connectivity
  //     const result = await lastValueFrom(
  //       this.productGrpcService.getProductDetails("test-id").pipe(
  //         timeout(2000), // Timeout after 2 seconds
  //         catchError(() => of(null)), // Catch error and return null
  //       )
  //     );
  //     if (result !== null) {
  //       readiness.productService = true;
  //     }
  //   } catch (error) {
  //     console.error('gRPC readiness check failed', error);
  //   }

  //   if (readiness.database && readiness.productService) {
  //     readiness.status = 'up';
  //   }

  //   return readiness;
  // }
}