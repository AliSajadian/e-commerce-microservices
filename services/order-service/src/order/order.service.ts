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
  constructor(
    private readonly productGrpcService: ProductGrpcService,
    @InjectRepository(Order) 
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>
  ) {}

  /**
   * Validate product ID format
   */
  private validateProductId(productId: string): boolean {
    // UUID v4 format validation
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(productId);
  }

  /**
   * Sanitize product ID (in case the service expects different format)
   */
  private sanitizeProductId(productId: string): string {
    // Remove any whitespace
    let sanitized = productId.trim();
    
    // Ensure lowercase (some services are case-sensitive)
    sanitized = sanitized.toLowerCase();
    
    // Log for debugging
    console.log(`Original productId: "${productId}"`);
    console.log(`Sanitized productId: "${sanitized}"`);
    console.log(`ProductId length: ${sanitized.length}`);
    
    return sanitized;
  }

  async createOrder(createOrderDto: CreateOrderDto): Promise<IOrder> {
    console.log('=== CREATE ORDER (ALTERNATIVE) ===');
    console.log('Request:', JSON.stringify(createOrderDto, null, 2));

    const orderItemsWithPrices = [];
    let totalPrice = 0;

    // 1. Check availability for all products at once (more efficient)
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

    // 2. Build order items with prices
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

    // 3. Create the order (same as before)
    const newOrder = new Order();
    newOrder.userId = createOrderDto.userId;
    newOrder.totalPrice = totalPrice;
    newOrder.status = OrderStatus.PENDING;

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

    const savedOrder = await this.orderRepository.save(newOrder);

    // 4. Save order items
    const orderItems = orderItemsWithPrices.map(item => {
      const orderItem = new OrderItem();
      orderItem.order = savedOrder;
      orderItem.productId = item.productId;
      orderItem.quantity = item.quantity;
      orderItem.price = item.price;
      return orderItem;
    });

    await this.orderItemRepository.save(orderItems);

    console.log(`Order created successfully: ${savedOrder.id}`);
    return this.getOrderById(savedOrder.id);
  }

  async createOrder1(createOrderDto: CreateOrderDto): Promise<IOrder> {
    console.log('=== CREATE ORDER DEBUG ===');
    console.log('Request payload:', JSON.stringify(createOrderDto, null, 2));
    
    const orderItemsWithPrices = [];
    let totalPrice = 0;

    // 1. Fetch product details and check stock from the Product Service via gRPC
    for (const item of createOrderDto.items) {
      console.log(`Processing item: ${JSON.stringify(item)}`);
      
      // Validate product ID format
      if (!this.validateProductId(item.productId)) {
        console.error(`Invalid product ID format: "${item.productId}"`);
        throw new BadRequestException(`Invalid product ID format: "${item.productId}". Expected UUID v4 format.`);
      }

      // Sanitize product ID
      const sanitizedProductId = this.sanitizeProductId(item.productId);
      
      try {
        console.log(`Calling gRPC service for product: "${sanitizedProductId}"`);
        
        const productResponse = await lastValueFrom(
          this.productGrpcService.getProductDetails(item.productId)
        );
             
        console.log(`Product response:`, JSON.stringify(productResponse, null, 2));

        if (!productResponse) {
          console.error(`Product not found: "${sanitizedProductId}"`);
          throw new NotFoundException(`Product with ID "${item.productId}" not found.`);
        }

        // Check stock using availableQuantity instead of stockQuantity
        if (productResponse.stock_quantity < item.quantity) {
          console.error(`Insufficient stock for product "${sanitizedProductId}". Available: ${productResponse.available_quantity}, Requested: ${item.quantity}`);
          throw new BadRequestException(`Insufficient stock for product "${item.productId}".`);
        }
              
        // Check if product is active
        if (!productResponse.is_active) {
          console.error(`Product "${sanitizedProductId}" is not active`);
          throw new BadRequestException(`Product "${item.productId}" is not available for purchase.`);
        }

        orderItemsWithPrices.push({
          ...item,
          productId: sanitizedProductId, // Use sanitized ID
          price: productResponse.price // Use the real price from the gRPC response
        });

        totalPrice += productResponse.price * item.quantity;
        console.log(`Added item to order. Price: ${productResponse.price}, Quantity: ${item.quantity}, Subtotal: ${productResponse.price * item.quantity}`);
      
      } catch (error) {
        console.error(`Error fetching product details for "${sanitizedProductId}":`, error);

        // Handle specific gRPC errors
        if (error.code === 3) { // INVALID_ARGUMENT
          throw new BadRequestException(`Invalid product ID: "${item.productId}". ${error.details || error.message}`);
        } else if (error.code === 5) { // NOT_FOUND
          throw new NotFoundException(`Product with ID "${item.productId}" not found.`);
        } else if (error.code === 14) { // UNAVAILABLE
          throw new BadRequestException('Product service is temporarily unavailable. Please try again later.');
        }
        
        // Re-throw the original error if it's already a NestJS exception
        if (error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error;
        }
        
        // Generic error handling
        throw new BadRequestException(`Failed to validate product "${item.productId}": ${error.message}`);
      }
    }

    console.log(`Total calculated price: ${totalPrice}`);
    console.log('All products validated successfully. Creating order...');

    // 2. Create the new order manually (avoiding repository.create() type issues)
    const newOrder = new Order();
    
    // Set basic properties
    newOrder.userId = createOrderDto.userId;
    newOrder.totalPrice = totalPrice;
    newOrder.status = OrderStatus.PENDING;
    
    // Set optional properties
    if (createOrderDto.notes) {
      newOrder.notes = createOrderDto.notes;
    }
    
    // Handle shipping address mapping
    if (createOrderDto.shippingAddress) {
      newOrder.shippingAddressStreet = createOrderDto.shippingAddress.street;
      newOrder.shippingAddressCity = createOrderDto.shippingAddress.city;
      newOrder.shippingAddressState = createOrderDto.shippingAddress.state;
      newOrder.shippingAddressZipcode = createOrderDto.shippingAddress.zipCode;
      newOrder.shippingAddressCountry = createOrderDto.shippingAddress.country;
    }

    // 3. Save the order first to get the ID
    const savedOrder = await this.orderRepository.save(newOrder);
    console.log(`Order saved with ID: ${savedOrder.id}`);

    // 4. Create and save order items with the order reference
    const orderItems = orderItemsWithPrices.map(item => {
      const orderItem = new OrderItem();
      orderItem.order = savedOrder;
      orderItem.productId = item.productId;
      orderItem.quantity = item.quantity;
      orderItem.price = item.price;
      return orderItem;
    });

    await this.orderItemRepository.save(orderItems);
    console.log(`Saved ${orderItems.length} order items`);

    // 5. Return the complete order
    const completeOrder = await this.getOrderById(savedOrder.id);
    console.log('Order created successfully:', completeOrder.id);
    return completeOrder;
  }

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

// @Injectable()
// export class OrderService {
//   // Correct: Merge all dependencies into a single constructor
//   constructor(
//     private readonly productGrpcService: ProductGrpcService,
//     @InjectRepository(Order) 
//     private readonly orderRepository: Repository<Order>,
//     @InjectRepository(OrderItem)
//     private readonly orderItemRepository: Repository<OrderItem>
//   ) {}

//   // Correct: Refactor the createOrder method to integrate the gRPC call.
//   // We're using the DTO-based method to handle the full order creation flow.
//   async createOrder(createOrderDto: CreateOrderDto): Promise<IOrder> {
//     const orderItemsWithPrices = [];
//     let totalPrice = 0;

//     // 1. Fetch product details and check stock from the Product Service via gRPC
//     for (const item of createOrderDto.items) {
//       const productResponse = await lastValueFrom(
//         this.productGrpcService.getProductDetails(item.productId)
//       );
      
//       if (!productResponse) {
//         throw new NotFoundException(`Product with ID "${item.productId}" not found.`);
//       }

//       if (productResponse.stockQuantity < item.quantity) {
//         throw new BadRequestException(`Insufficient stock for product "${item.productId}".`);
//       }
      
//       orderItemsWithPrices.push({
//         ...item,
//         price: productResponse.price // Use the real price from the gRPC response
//       });

//       totalPrice += productResponse.price * item.quantity;
//     }

//     // 2. Create and save the new order if all validations pass
//     const newOrder = this.orderRepository.create({
//       userId: createOrderDto.userId,
//       items: orderItemsWithPrices, // Use the items with fetched prices
//       // shippingAddress: createOrderDto.shippingAddress, 
//       shippingAddressStreet: createOrderDto.shippingAddress?.street,
//       shippingAddressCity: createOrderDto.shippingAddress?.city,
//       shippingAddressState: createOrderDto.shippingAddress?.state,
//       shippingAddressZipcode: createOrderDto.shippingAddress?.zipCode,
//       shippingAddressCountry: createOrderDto.shippingAddress?.country,
//       notes: createOrderDto.notes, 
//       totalPrice,
//       status: OrderStatus.PENDING,
//     });

//     return this.orderRepository.save(newOrder);
//   }

//   async getOrderById(id: string): Promise<Order> {
//     const order = await this.orderRepository.findOne({
//       where: { id },
//       relations: ['items'], // Eager loading is also an option, but this is explicit.
//     });
//     if (!order) {
//       throw new NotFoundException(`Order with ID "${id}" not found.`);
//     }
//     return order;
//   }
  
//   async getAllOrders(): Promise<IOrder[]> {
//     return this.orderRepository.find({ relations: ['items'] });
//   }

//   async updateOrderStatus(id: string, newStatus: OrderStatus): Promise<IOrder> {
//     await this.orderRepository.update(id, { status: newStatus });
//     return this.getOrderById(id);
//   }

//     async updateOrderPayment(id: string, paymentId: string): Promise<Order> {
//     await this.orderRepository.update(id, { paymentId });
//     return this.getOrderById(id);
//   }
  
//   async deleteOrder(id: string): Promise<void> {
//     const result = await this.orderRepository.delete(id);
//     if (result.affected === 0) {
//       throw new NotFoundException(`Order with ID "${id}" not found.`);
//     }
//   }
// }