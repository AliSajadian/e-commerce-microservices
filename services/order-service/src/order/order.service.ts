import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductGrpcService } from '../product/product.grpc.service';
import { lastValueFrom } from 'rxjs';

import { Order, OrderStatus } from './models/order.model';
import { IOrder } from './interfaces/order.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './models/order.item.model';

@Injectable()
export class OrderService {
  // Correct: Merge all dependencies into a single constructor
  constructor(
    private readonly productGrpcService: ProductGrpcService,
    @InjectRepository(Order) 
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>
  ) {}

  // Correct: Refactor the createOrder method to integrate the gRPC call.
  // We're using the DTO-based method to handle the full order creation flow.
  async createOrder(createOrderDto: CreateOrderDto): Promise<IOrder> {
    const orderItemsWithPrices = [];
    let totalPrice = 0;

    // 1. Fetch product details and check stock from the Product Service via gRPC
    for (const item of createOrderDto.items) {
      const productResponse = await lastValueFrom(
        this.productGrpcService.getProductDetails(item.productId)
      );
      
      if (!productResponse) {
        throw new NotFoundException(`Product with ID "${item.productId}" not found.`);
      }

      if (productResponse.stockQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product "${item.productId}".`);
      }
      
      orderItemsWithPrices.push({
        ...item,
        price: productResponse.price // Use the real price from the gRPC response
      });

      totalPrice += productResponse.price * item.quantity;
    }

    // 2. Create and save the new order if all validations pass
    const newOrder = this.orderRepository.create({
      userId: createOrderDto.userId,
      items: orderItemsWithPrices, // Use the items with fetched prices
      shippingAddress: createOrderDto.shippingAddress, 
      notes: createOrderDto.notes, 
      totalPrice,
      status: OrderStatus.PENDING,
    });

    return this.orderRepository.save(newOrder);
  }

  async getOrderById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'], // Eager loading is also an option, but this is explicit.
    });
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found.`);
    }
    return order;
  }
  
  async getAllOrders(): Promise<IOrder[]> {
    return this.orderRepository.find({ relations: ['items'] });
  }

  async updateOrderStatus(id: string, newStatus: OrderStatus): Promise<IOrder> {
    await this.orderRepository.update(id, { status: newStatus });
    return this.getOrderById(id);
  }

    async updateOrderPayment(id: string, paymentId: string): Promise<Order> {
    await this.orderRepository.update(id, { paymentId });
    return this.getOrderById(id);
  }
  
  async deleteOrder(id: string): Promise<void> {
    const result = await this.orderRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Order with ID "${id}" not found.`);
    }
  }
}