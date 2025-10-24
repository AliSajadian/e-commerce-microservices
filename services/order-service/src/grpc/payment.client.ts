import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

interface PaymentService {
  getOrder(data: { order_id: string }): any;
  updateOrderStatus(data: { order_id: string; status: string; reason?: string }): any;
  getOrderItems(data: { order_id: string }): any;
  validateOrderForPayment(data: { order_id: string; payment_amount: number }): any;
}

@Injectable()
export class PaymentGrpcClient implements OnModuleInit {
  private paymentService: PaymentService;

  constructor(@Inject('PAYMENT_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.paymentService = this.client.getService<PaymentService>('OrderService');
  }

  /**
   * Get order details for payment processing
   */
  async getOrder(orderId: string): Promise<{
    success: boolean;
    order_id?: string;
    user_id?: string;
    status?: string;
    total_amount?: number;
    currency?: string;
    created_at?: string;
    updated_at?: string;
    error_message?: string;
  }> {
    try {
      const response = await lastValueFrom(
        this.paymentService.getOrder({ order_id: orderId })
      );
      return response;
    } catch (error) {
      console.error('Payment gRPC get order error:', error);
      return {
        success: false,
        error_message: 'Failed to get order details'
      };
    }
  }

  /**
   * Update order status after payment
   */
  async updateOrderStatus(
    orderId: string, 
    status: string, 
    reason?: string
  ): Promise<{
    success: boolean;
    error_message?: string;
  }> {
    try {
      const response = await lastValueFrom(
        this.paymentService.updateOrderStatus({ 
          order_id: orderId, 
          status: status,
          reason: reason 
        })
      );
      return response;
    } catch (error) {
      console.error('Payment gRPC update order status error:', error);
      return {
        success: false,
        error_message: 'Failed to update order status'
      };
    }
  }

  /**
   * Get order items for payment validation
   */
  async getOrderItems(orderId: string): Promise<{
    success: boolean;
    items?: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    error_message?: string;
  }> {
    try {
      const response = await lastValueFrom(
        this.paymentService.getOrderItems({ order_id: orderId })
      );
      return response;
    } catch (error) {
      console.error('Payment gRPC get order items error:', error);
      return {
        success: false,
        error_message: 'Failed to get order items'
      };
    }
  }

  /**
   * Validate order for payment processing
   */
  async validateOrderForPayment(
    orderId: string, 
    paymentAmount: number
  ): Promise<{
    valid: boolean;
    order_id?: string;
    expected_amount?: number;
    currency?: string;
    error_message?: string;
  }> {
    try {
      const response = await lastValueFrom(
        this.paymentService.validateOrderForPayment({ 
          order_id: orderId, 
          payment_amount: paymentAmount 
        })
      );
      return response;
    } catch (error) {
      console.error('Payment gRPC validate order error:', error);
      return {
        valid: false,
        error_message: 'Order validation failed'
      };
    }
  }
}

