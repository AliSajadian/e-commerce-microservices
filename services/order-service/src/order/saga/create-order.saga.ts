import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';

import { Order, OrderStatus } from '../models/order.model';
import { IOrder } from '../interfaces/order.interface';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderItem } from '../models/order.item.model';

interface SagaStep {
  execute(): Promise<any>;
  compensate(): Promise<void>;
}

export class CreateOrderSaga {
  private steps: SagaStep[] = [];
  private completedSteps: SagaStep[] = [];

  constructor(
    private orderRepository: Repository<Order>,
    private orderItemRepository: Repository<OrderItem>,
    private productGrpcService: any
  ) {}

  async execute(createOrderDto: CreateOrderDto): Promise<string> {
    let availabilityResult: any;
    let savedOrder: Order;
    let reservationResponse: any;

    // Step 1: Check availability
    this.steps.push({
      execute: async () => {
        availabilityResult = await this.productGrpcService.checkMultipleProductsAvailability(
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
        return availabilityResult;
      },
      compensate: async () => {
        // No compensation needed for read-only operation
      }
    });

    // Step 2: Create Order
    this.steps.push({
      execute: async () => {
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

        const newOrder = new Order();
        newOrder.userId = createOrderDto.userId;
        newOrder.totalPrice = totalPrice;
        newOrder.status = OrderStatus.PENDING;

        if (createOrderDto.notes) newOrder.notes = createOrderDto.notes;
        if (createOrderDto.shippingAddress) {
          newOrder.shippingAddressStreet = createOrderDto.shippingAddress.street;
          newOrder.shippingAddressCity = createOrderDto.shippingAddress.city;
          newOrder.shippingAddressState = createOrderDto.shippingAddress.state;
          newOrder.shippingAddressZipcode = createOrderDto.shippingAddress.zipCode;
          newOrder.shippingAddressCountry = createOrderDto.shippingAddress.country;
        }

        savedOrder = await this.orderRepository.manager.transaction(async transactionalEntityManager => {
          const order = await transactionalEntityManager.save(Order, newOrder);
          
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

        return savedOrder;
      },
      compensate: async () => {
        if (savedOrder?.id) {
          await this.orderRepository.manager.transaction(async transactionalEntityManager => {
            await transactionalEntityManager.delete(OrderItem, { order: { id: savedOrder.id } });
            await transactionalEntityManager.delete(Order, savedOrder.id);
          });
        }
      }
    });

    // Step 3: Reserve Products
    this.steps.push({
      execute: async () => {
        const reservationItems = createOrderDto.items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity
        }));

        reservationResponse = await lastValueFrom(
          this.productGrpcService.reserveProducts(reservationItems, createOrderDto.userId, savedOrder.id)
        );

        const allReserved = reservationResponse?.all_reserved ?? reservationResponse?.allReserved;
        
        if (!allReserved) {
          const results = reservationResponse?.results ?? [];
          const failedResults = results.filter(r => !r.success) || [];
          const errorMessages = failedResults.length > 0 
            ? failedResults.map(r => `${r.product_id}: ${r.message}`).join(', ')
            : 'Unknown reservation error';
          
          throw new BadRequestException(`Failed to reserve products: ${errorMessages}`);
        }

        return reservationResponse;
      },
      compensate: async () => {
        if (reservationResponse?.reservation_id) {
          try {
            await this.productGrpcService.releaseReservation(
              reservationResponse.reservation_id,
              createOrderDto.items.map(item => ({
                product_id: item.productId,
                quantity: item.quantity
              }))
            );
          } catch (error) {
            console.error('Failed to release reservation during compensation:', error);
          }
        }
      }
    });

    // Step 4: Update Order with Reservation
    this.steps.push({
      execute: async () => {
        await this.orderRepository.update(savedOrder.id, {
          reservationId: reservationResponse.reservation_id ?? reservationResponse.reservationId,
          status: OrderStatus.CONFIRMED
        });
        return savedOrder;
      },
      compensate: async () => {
        // Compensation handled by previous steps
      }
    });

    // Execute saga
    try {
      for (const step of this.steps) {
        const result = await step.execute();
        this.completedSteps.push(step);
        console.log('Saga step completed successfully');
      }

      return savedOrder.id;
    } catch (error) {
      console.error('Saga execution failed, starting compensation:', error);
      await this.compensate();
      throw error;
    }
  }

  private async compensate(): Promise<void> {
    // Execute compensation in reverse order
    for (let i = this.completedSteps.length - 1; i >= 0; i--) {
      try {
        await this.completedSteps[i].compensate();
        console.log(`Compensation step ${i} completed`);
      } catch (error) {
        console.error(`Compensation step ${i} failed:`, error);
        // Continue with other compensations even if one fails
      }
    }
  }
}


