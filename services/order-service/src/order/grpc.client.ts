import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { GetProductResponse, ProductService } from 'src/product/product.interface';


@Injectable()
export class OrderService implements OnModuleInit {
  private productService: ProductService;

  constructor(@Inject('PRODUCT_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.productService = this.client.getService<ProductService>('ProductService');
  }

  /**
   * Create an order with product reservation
   */
  async createOrder(product_id: string, quantity: number): Promise<{
    status: string;
    message: string;
    orderId?: string;
    reservationId?: string;
  }> {
    try {
      // 1. Get product details
      const productResponse = await lastValueFrom(
        this.productService.GetProduct({ product_id })
      );

      if (!productResponse) {
        return {
          status: 'failed',
          message: `Product ${product_id} not found`
        };
      }

      // 2. Check if product is active and has sufficient stock
      if (!productResponse.is_active) {
        return {
          status: 'failed',
          message: `Product ${product_id} is not active`
        };
      }

      if (productResponse.available_quantity < quantity) {
        return {
          status: 'failed',
          message: `Insufficient stock. Available: ${productResponse.available_quantity}, Requested: ${quantity}`
        };
      }

      // 3. Reserve the product
      const reservationResponse = await lastValueFrom(
        this.productService.ReserveProducts({
          products: [{ product_id, quantity }],
          // reservationId will be auto-generated if not provided
        })
      );

      if (!reservationResponse?.allReserved) {
        const failedResults = reservationResponse?.results?.filter(r => !r.success) || [];
        const errorMessages = failedResults.map(r => r.message).join(', ');
        return {
          status: 'failed',
          message: `Failed to reserve products: ${errorMessages}`
        };
      }

      // 4. Create the order (simulate order creation)
      const orderId = `ORDER-${Date.now()}`;
      console.log(`Successfully reserved ${quantity} units of product ${product_id}`);
      console.log(`Created order ${orderId} with reservation ${reservationResponse.reservationId}`);

      // In a real scenario, you would:
      // - Save order to database
      // - Process payment
      // - If payment succeeds, keep the reservation
      // - If payment fails, release the reservation

      return {
        status: 'success',
        message: 'Order created successfully',
        orderId,
        reservationId: reservationResponse.reservationId
      };

    } catch (error) {
      console.error('Error creating order:', error);
      return {
        status: 'failed',
        message: 'Internal server error'
      };
    }
  }

  /**
   * Create an order for multiple products
   */
  async createBulkOrder(items: { product_id: string; quantity: number }[]): Promise<{
    status: string;
    message: string;
    orderId?: string;
    reservationId?: string;
  }> {
    try {
      // 1. Get details for all products
      const product_ids = items.map(item => item.product_id);
      const productsResponse = await lastValueFrom(
        this.productService.GetMultipleProducts({ product_ids })
      );

      if (!productsResponse || productsResponse.products.length === 0) {
        return {
          status: 'failed',
          message: 'No products found'
        };
      }

      // 2. Validate all products
      const productMap = new Map(
        productsResponse.products.map(p => [p.product_id, p])
      );

      for (const item of items) {
        const product = productMap.get(item.product_id);
        if (!product) {
          return {
            status: 'failed',
            message: `Product ${item.product_id} not found`
          };
        }

        if (!product.is_active) {
          return {
            status: 'failed',
            message: `Product ${item.product_id} is not active`
          };
        }

        if (product.available_quantity < item.quantity) {
          return {
            status: 'failed',
            message: `Insufficient stock for ${item.product_id}. Available: ${product.available_quantity}, Requested: ${item.quantity}`
          };
        }
      }

      // 3. Reserve all products
      const reservationItems = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const reservationResponse = await lastValueFrom(
        this.productService.ReserveProducts({
          products: reservationItems
        })
      );

      if (!reservationResponse?.allReserved) {
        const failedResults = reservationResponse?.results?.filter(r => !r.success) || [];
        const errorMessages = failedResults.map(r => `${r.product_id}: ${r.message}`).join(', ');
        return {
          status: 'failed',
          message: `Failed to reserve products: ${errorMessages}`
        };
      }

      // 4. Create the bulk order
      const orderId = `BULK-ORDER-${Date.now()}`;
      console.log(`Successfully reserved products for bulk order`);
      console.log(`Created bulk order ${orderId} with reservation ${reservationResponse.reservationId}`);

      return {
        status: 'success',
        message: 'Bulk order created successfully',
        orderId,
        reservationId: reservationResponse.reservationId
      };

    } catch (error) {
      console.error('Error creating bulk order:', error);
      return {
        status: 'failed',
        message: 'Internal server error'
      };
    }
  }

  /**
   * Cancel an order and release reservation
   */
  async cancelOrder(reservationId: string, items: { product_id: string; quantity: number }[]): Promise<{
    status: string;
    message: string;
  }> {
    try {
      const releaseResponse = await lastValueFrom(
        this.productService.ReleaseReservation({
          reservationId,
          products: items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
          }))
        })
      );

      if (releaseResponse?.success) {
        return {
          status: 'success',
          message: 'Order cancelled and reservation released successfully'
        };
      } else {
        return {
          status: 'failed',
          message: releaseResponse?.message || 'Failed to release reservation'
        };
      }

    } catch (error) {
      console.error('Error cancelling order:', error);
      return {
        status: 'failed',
        message: 'Internal server error'
      };
    }
  }

  /**
   * Retrieves product details from the product-service.
   * Uses lastValueFrom to correctly handle the single-response gRPC Observable.
   */
  async getProductDetails(product_id: string): Promise<GetProductResponse | null> {
    try {
      const response = await lastValueFrom(
        this.productService.GetProduct({ product_id })
      );
      return response || null;
    } catch (error) {
      console.error('Error getting product details:', error);
      // It is good practice to handle the specific error type from gRPC if needed
      return null;
    }
  }
}
