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
        },
      },
    ]),
  ],
  providers: [ProductGrpcService],
  exports: [ProductGrpcService], // This is the crucial step!
})
export class ProductModule {}