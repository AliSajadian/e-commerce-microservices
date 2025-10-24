import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ProductGrpcService } from './product.grpc.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PRODUCT_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: 'localhost:50051',
          package: 'product',
          protoPath: join(__dirname, '../proto/product.proto'),
          // Optional: Add additional gRPC options
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
          // Optional: Add retry configuration
          maxReceiveMessageLength: 4 * 1024 * 1024, // 4MB
          maxSendMessageLength: 4 * 1024 * 1024, // 4MB
        },
      },
    ]),
  ],
  providers: [ProductGrpcService],
  exports: [ProductGrpcService], // Export the service to be used in other modules
})
export class ProductModule {}