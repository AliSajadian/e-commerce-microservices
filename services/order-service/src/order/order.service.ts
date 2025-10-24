import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ProductGrpcService } from '../product/product.grpc.service';
import { lastValueFrom } from 'rxjs';

import { Order, OrderStatus } from './models/order.model';
import { IOrder } from './interfaces/order.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './models/order.item.model';
import { CreateOrderSaga } from './saga/create-order.saga';
import { OutboxEvent } from './outbox';

@Injectable()
export class OrderService {
  constructor(
    private readonly productGrpcService: ProductGrpcService,
    @InjectRepository(Order) 
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>
  ) {}

  /**
   * Create order with product reservation
   */
  async createOrder(createOrderDto: CreateOrderDto): Promise<IOrder> {
    console.log('=== CREATE ORDER WITH TRANSACTION SAFETY ===');
    console.log('Request:', JSON.stringify(createOrderDto, null, 2));
    
    let createdOrderId: string | null = null;
    let reservationId: string | null = null;

    try {
      // 1. Check availability for all products first (read-only operation)
      const availabilityResult = await this.productGrpcService.checkMultipleProductsAvailability(
        createOrderDto.items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity
        }))
      );
      
      console.log('Availability check result:', JSON.stringify(availabilityResult, null, 2));
      
      if (!availabilityResult.allAvailable) {
        const errors = availabilityResult.results
          .filter(result => !result.available)
          .map(result => `${result.product_id}: ${result.message}`)
          .join('; ');
        throw new BadRequestException(`Product validation failed: ${errors}`);
      }

      // 2. Calculate order items and total price
      const orderItemsWithPrices = [];
      let totalPrice = 0;

      for (const result of availabilityResult.results) {
        if (result.available && result.product) {
          const requestedItem = createOrderDto.items.find(item => item.productId === result.product_id);
          orderItemsWithPrices.push({
            productId: result.product_id,
            quantity: requestedItem.quantity,
            price: result.product.price
          });
          totalPrice += result.product.price * requestedItem.quantity;
        }
      }

      // 3. Create the order first (local transaction)
      const newOrder = new Order();
      newOrder.userId = createOrderDto.userId;
      newOrder.totalPrice = totalPrice;
      newOrder.status = OrderStatus.PENDING; // Keep as PENDING until reservation is confirmed
      // Don't set reservationId yet

      if (createOrderDto.notes) {
        newOrder.notes = createOrderDto.notes;
      }
      if (createOrderDto.shippingAddress) {
        newOrder.shippingAddressStreet = createOrderDto.shippingAddress.street;
        newOrder.shippingAddressCity = createOrderDto.shippingAddress.city;
        newOrder.shippingAddressState = createOrderDto.shippingAddress.state;
        newOrder.shippingAddressZipcode = createOrderDto.shippingAddress.zipCode;
        newOrder.shippingAddressCountry = createOrderDto.shippingAddress.country;
      }

      // Start database transaction for order creation
      const savedOrder = await this.orderRepository.manager.transaction(async transactionalEntityManager => {
        const order = await transactionalEntityManager.save(Order, newOrder);
        
        // Save order items within the same transaction
        const orderItems = orderItemsWithPrices.map(item => {
          const orderItem = new OrderItem();
          orderItem.order = order;
          orderItem.productId = item.productId;
          orderItem.quantity = item.quantity;
          orderItem.price = item.price;
          return orderItem;
        });

        await transactionalEntityManager.save(OrderItem, orderItems);
        return order;
      });

      createdOrderId = savedOrder.id;
      console.log(`Order created successfully: ${createdOrderId}`);

      // 4. Now reserve products with the order ID as reference
      const reservationItems = createOrderDto.items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity
      }));

      const reservationResponse = await lastValueFrom(
        this.productGrpcService.reserveProducts(reservationItems, createOrderDto.userId, createdOrderId)
      );

      console.log('Reservation response:', JSON.stringify(reservationResponse, null, 2));

      const allReserved = reservationResponse?.all_reserved ?? reservationResponse?.all_reserved;
      const results = reservationResponse?.results ?? [];

      if (!allReserved) {
        const failedResults = results.filter(r => !r.success) || [];
        const errorMessages = failedResults.length > 0 
          ? failedResults.map(r => `${r.product_id}: ${r.message}`).join(', ')
          : 'Unknown reservation error - check logs';
        
        console.error('Reservation failed after order creation:', {
          orderId: createdOrderId,
          allReserved,
          results,
          failedResults,
          errorMessages
        });
        
        // Reservation failed, need to clean up the order
        throw new BadRequestException(`Failed to reserve products: ${errorMessages}`);
      }

      reservationId = reservationResponse.reservation_id ?? reservationResponse.reservation_id;
      console.log(`Products reserved with reservation ID: ${reservationId}`);

      // 5. Update order with reservation ID and confirm status
      await this.orderRepository.update(createdOrderId, {
        reservationId: reservationId,
        status: OrderStatus.CONFIRMED // Or whatever status indicates successful reservation
      });

      console.log(`Order ${createdOrderId} updated with reservation: ${reservationId}`);
      
      return this.getOrderById(createdOrderId);

    } catch (error) {
      console.error('Error creating order:', error);
      
      // Cleanup logic: if order was created but reservation failed, delete the order
      if (createdOrderId && !reservationId) {
        console.log(`Cleaning up order ${createdOrderId} due to reservation failure`);
        try {
          await this.orderRepository.manager.transaction(async transactionalEntityManager => {
            // Delete order items first (foreign key constraint)
            await transactionalEntityManager.delete(OrderItem, { order: { id: createdOrderId } });
            // Then delete the order
            await transactionalEntityManager.delete(Order, createdOrderId);
          });
          console.log(`Order ${createdOrderId} cleaned up successfully`);
        } catch (cleanupError) {
          console.error('Failed to cleanup order during error handling:', cleanupError);
          // Consider adding this to a dead letter queue or alerting system
        }
      }
      
      throw error;
    }
  }

  /**
   * Create order with product reservation by saga
   */
  async createOrderSaga(createOrderDto: CreateOrderDto): Promise<IOrder> {
    const saga = new CreateOrderSaga(
      this.orderRepository,
      this.orderItemRepository,
      this.productGrpcService
    );
    
    return this.getOrderById(await saga.execute(createOrderDto));
  }

  // Modified createOrder method using outbox pattern
  async createOrderOutBox(createOrderDto: CreateOrderDto): Promise<IOrder> {
    console.log('=== CREATE ORDER WITH OUTBOX PATTERN ===');
    
    try {
      // 1. Check availability first (read-only operation)
      const availabilityResult = await this.productGrpcService.checkMultipleProductsAvailability(
        createOrderDto.items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity
        }))
      );
      
      if (!availabilityResult.allAvailable) {
        const errors = availabilityResult.results
          .filter(result => !result.available)
          .map(result => `${result.product_id}: ${result.message}`)
          .join('; ');
        throw new BadRequestException(`Product validation failed: ${errors}`);
      }

      // 2. Calculate order details
      const orderItemsWithPrices = [];
      let totalPrice = 0;

      for (const result of availabilityResult.results) {
        if (result.available && result.product) {
          const requestedItem = createOrderDto.items.find(item => item.productId === result.product_id);
          orderItemsWithPrices.push({
            productId: result.product_id,
            quantity: requestedItem.quantity,
            price: result.product.price
          });
          totalPrice += result.product.price * requestedItem.quantity;
        }
      }

      // 3. Create order and outbox event in single transaction
      const result = await this.orderRepository.manager.transaction(async transactionalEntityManager => {
        // Create order
        const newOrder = new Order();
        newOrder.userId = createOrderDto.userId;
        newOrder.totalPrice = totalPrice;
        newOrder.status = OrderStatus.PENDING; // Will be updated after reservation

        if (createOrderDto.notes) newOrder.notes = createOrderDto.notes;
        if (createOrderDto.shippingAddress) {
          newOrder.shippingAddressStreet = createOrderDto.shippingAddress.street;
          newOrder.shippingAddressCity = createOrderDto.shippingAddress.city;
          newOrder.shippingAddressState = createOrderDto.shippingAddress.state;
          newOrder.shippingAddressZipcode = createOrderDto.shippingAddress.zipCode;
          newOrder.shippingAddressCountry = createOrderDto.shippingAddress.country;
        }

        const savedOrder = await transactionalEntityManager.save(Order, newOrder);

        // Create order items
        const orderItems = orderItemsWithPrices.map(item => {
          const orderItem = new OrderItem();
          orderItem.order = savedOrder;
          orderItem.productId = item.productId;
          orderItem.quantity = item.quantity;
          orderItem.price = item.price;
          return orderItem;
        });

        await transactionalEntityManager.save(OrderItem, orderItems);

        // Create outbox event for product reservation
        const outboxEvent = new OutboxEvent();
        outboxEvent.eventType = 'RESERVE_PRODUCTS';
        outboxEvent.payload = {
          orderId: savedOrder.id,
          userId: createOrderDto.userId,
          items: createOrderDto.items.map(item => ({
            product_id: item.productId,
            quantity: item.quantity
          }))
        };
        outboxEvent.status = 'PENDING';
        outboxEvent.createdAt = new Date();

        await transactionalEntityManager.save(OutboxEvent, outboxEvent);

        return { order: savedOrder, outboxEvent };
      });

      console.log(`Order created: ${result.order.id}, Outbox event: ${result.outboxEvent.id}`);

      // 4. Process outbox event immediately (synchronous for user experience)
      try {
        await this.processOutboxEvent(result.outboxEvent);
      } catch (error) {
        console.error('Failed to process outbox event synchronously:', error);
        // The background processor will retry this
      }

      return this.getOrderById(result.order.id);

    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Outbox event processor
  async processOutboxEvent(event: OutboxEvent): Promise<void> {
    try {
      if (event.eventType === 'RESERVE_PRODUCTS') {
        const { orderId, userId, items } = event.payload;

        const reservationResponse = await lastValueFrom(
          this.productGrpcService.reserveProducts(items, userId, orderId)
        );

        const allReserved = reservationResponse?.all_reserved ?? reservationResponse?.all_reserved;

        if (!allReserved) {
          const results = reservationResponse?.results ?? [];
          const failedResults = results.filter(r => !r.success) || [];
          const errorMessages = failedResults.length > 0 
            ? failedResults.map(r => `${r.product_id}: ${r.message}`).join(', ')
            : 'Unknown reservation error';

          // Mark order as failed and outbox event as failed
          await this.orderRepository.manager.transaction(async transactionalEntityManager => {
            await transactionalEntityManager.update(Order, orderId, {
              status: OrderStatus.FAILED
            });

            await transactionalEntityManager.update(OutboxEvent, event.id, {
              status: 'FAILED',
              error: errorMessages,
              processedAt: new Date()
            });
          });

          throw new Error(`Reservation failed: ${errorMessages}`);
        }

        // Success - update order and mark event as processed
        const reservationId = reservationResponse.reservation_id ?? reservationResponse.reservation_id;
        
        await this.orderRepository.manager.transaction(async transactionalEntityManager => {
          await transactionalEntityManager.update(Order, orderId, {
            reservationId: reservationId,
            status: OrderStatus.CONFIRMED
          });

          await transactionalEntityManager.update(OutboxEvent, event.id, {
            status: 'PROCESSED',
            processedAt: new Date()
          });
        });

        console.log(`Order ${orderId} confirmed with reservation ${reservationId}`);
      }
    } catch (error) {
      // Update retry count and error
      
      // await this.outboxRepository.update(event.id, {
      //   retryCount: event.retryCount + 1,
      //   error: error.message,
      //   status: event.retryCount >= 3 ? 'FAILED' : 'PENDING'
      // });
      
      throw error;
    }
  }

  // Background job to process pending outbox events
  
  // @Cron('*/30 * * * * *') // Every 30 seconds
  // async processOutboxEvents(): Promise<void> {
  //   const pendingEvents = await this.outboxRepository.find({
  //     where: { 
  //       status: 'PENDING',
  //       retryCount: LessThan(3)
  //     },
  //     order: { createdAt: 'ASC' },
  //     take: 10
  //   });

  //   for (const event of pendingEvents) {
  //     try {
  //       await this.processOutboxEvent(event);
  //     } catch (error) {
  //       console.error(`Failed to process outbox event ${event.id}:`, error);
  //     }
  //   }
  // }

  /**
   * Update order status with reservation management
   */
  async updateOrderStatus(id: string, newStatus: OrderStatus): Promise<IOrder> {
    const order = await this.getOrderById(id);
    
    // If order is being cancelled and has a reservation, release it
    if (newStatus === OrderStatus.CANCELLED && order.reservationId) {
      await this.cancelOrderAndReleaseReservation(id);
      return this.getOrderById(id);
    }
    
    // If order is being confirmed/fulfilled, we keep the reservation
    // The reservation will expire naturally or be released when stock is actually deducted
    await this.orderRepository.update(id, { status: newStatus });
    return this.getOrderById(id);
  }

  /**
   * Cancel order and release its reservation
   */
  async cancelOrderAndReleaseReservation(orderId: string): Promise<IOrder> {
    const order = await this.getOrderById(orderId);
    
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    try {
      // Release reservation if exists
      if (order.reservationId) {
        const reservationItems = order.items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity
        }));

        const releaseResponse = await lastValueFrom(
          this.productGrpcService.releaseReservation(order.reservationId, reservationItems)
        );

        if (!releaseResponse?.success) {
          console.warn(`Failed to release reservation ${order.reservationId}: ${releaseResponse?.message}`);
          // Continue with cancellation even if reservation release fails
        } else {
          console.log(`Successfully released reservation ${order.reservationId} for cancelled order ${orderId}`);
        }
      }

      // Update order status to cancelled
      await this.orderRepository.update(orderId, { 
        status: OrderStatus.CANCELLED,
        updatedAt: new Date()
      });

      return this.getOrderById(orderId);

    } catch (error) {
      console.error('Error cancelling order and releasing reservation:', error);
      throw new BadRequestException('Failed to cancel order and release reservation');
    }
  }

  /**
   * Helper method to release reservation
   */
  private async releaseReservation(
    reservationId: string, 
    items: { product_id: string; quantity: number }[]
  ): Promise<void> {
    try {
      const releaseResponse = await lastValueFrom(
        this.productGrpcService.releaseReservation(reservationId, items)
      );
      
      if (!releaseResponse?.success) {
        console.warn(`Failed to release reservation ${reservationId}: ${releaseResponse?.message}`);
      } else {
        console.log(`Successfully released reservation ${reservationId}`);
      }
    } catch (error) {
      console.error(`Error releasing reservation ${reservationId}:`, error);
    }
  }

  /**
   * Process payment and finalize order
   */
  async processPaymentAndFinalizeOrder(orderId: string, paymentId: string): Promise<IOrder> {
    const order = await this.getOrderById(orderId);
    
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in pending status');
    }

    try {
      // Update order with payment information
      await this.orderRepository.update(orderId, { 
        paymentId,
        status: OrderStatus.CONFIRMED,
        updatedAt: new Date()
      });

      console.log(`Order ${orderId} payment processed successfully. Reservation ${order.reservationId} will be maintained until fulfillment.`);
      
      return this.getOrderById(orderId);

    } catch (error) {
      console.error('Error processing payment:', error);
      throw new BadRequestException('Failed to process payment');
    }
  }

  /**
   * Mark order as fulfilled and handle reservation cleanup
   */
  async fulfillOrder(orderId: string): Promise<IOrder> {
    const order = await this.getOrderById(orderId);
    
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Order must be confirmed before fulfillment');
    }

    try {
      // Mark order as fulfilled
      await this.orderRepository.update(orderId, { 
        status: OrderStatus.FULFILLED,
        updatedAt: new Date()
      });

      // Note: In a real-world scenario, you might want to:
      // 1. Actually deduct the stock from inventory
      // 2. Then release the reservation
      // 3. Or convert the reservation to actual stock deduction
      
      console.log(`Order ${orderId} fulfilled. Reservation ${order.reservationId} should be converted to actual stock deduction.`);
      
      return this.getOrderById(orderId);

    } catch (error) {
      console.error('Error fulfilling order:', error);
      throw new BadRequestException('Failed to fulfill order');
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found.`);
    }
    return order;
  }

  /**
   * Get all orders
   */
  async getAllOrders(): Promise<IOrder[]> {
    return this.orderRepository.find({ relations: ['items'] });
  }

  /**
   * Update order payment
   */
  async updateOrderPayment(id: string, paymentId: string): Promise<Order> {
    await this.orderRepository.update(id, { paymentId });
    return this.getOrderById(id);
  }

  /**
   * Delete order (with reservation cleanup)
   */
  async deleteOrder(id: string): Promise<void> {
    const order = await this.getOrderById(id);
    
    // Release reservation if exists before deleting
    if (order.reservationId && order.status !== OrderStatus.CANCELLED) {
      console.log(`Releasing reservation ${order.reservationId} before deleting order ${id}`);
      
      const reservationItems = order.items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity
      }));
      
      try {
        const releaseResponse = await lastValueFrom(
          this.productGrpcService.releaseReservation(order.reservationId, reservationItems)
        );
        
        if (releaseResponse?.success) {
          console.log(`Successfully released reservation ${order.reservationId} before deleting order`);
        } else {
          console.warn(`Failed to release reservation ${order.reservationId}: ${releaseResponse?.message}`);
        }
      } catch (error) {
        console.error(`Error releasing reservation during order deletion:`, error);
        // Continue with deletion even if reservation release fails
      }
    }
    
    const result = await this.orderRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Order with ID "${id}" not found.`);
    }
    
    console.log(`Order ${id} deleted successfully`);
  }

  /**
   * Get orders by reservation status (for debugging/monitoring)
   */
  async getOrdersByReservationStatus(): Promise<{
    withReservation: IOrder[];
    withoutReservation: IOrder[];
  }> {
    const allOrders = await this.getAllOrders();
    
    return {
      withReservation: allOrders.filter(order => order.reservationId),
      withoutReservation: allOrders.filter(order => !order.reservationId)
    };
  }
}