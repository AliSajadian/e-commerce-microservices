import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from './models/order.model';
import { OrderItem } from './models/order.item.model';
import { ProductModule } from '../product/product.module'; // Import ProductModule

@Module({
  imports: [
    // This connects our model to the database within this module
    TypeOrmModule.forFeature([Order, OrderItem]),
    ProductModule
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}