import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentService, CreatePaymentDto } from './payment.service';
import { CreatePaymentIntentDto } from '../stripe/dto/create-payment-intent.dto';
import { ConfirmPaymentDto, ConfirmPaymentWithDataDto, PaymentMethodDto } from '../stripe/dto/confirm-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment intent' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    // try{
    //   this.logger.log(`Creating payment for order: ${createPaymentDto.orderId}`);

    //   if (!createPaymentDto || !createPaymentDto.orderId) {
    //     throw new BadRequestException('Missing required fields');
    //   }
    //   return await this.paymentService.createPayment(createPaymentDto);
    // } 
    // catch (error) {
    //   console.error('Payment creation error:', error.message);
    //   console.error('Full error:', error);
    //   throw error;
    // }
    try {
    this.logger.log(`Creating payment for order: ${createPaymentDto.orderId}`);
    this.logger.log(`Request body:`, JSON.stringify(createPaymentDto));
    
    if (!createPaymentDto || !createPaymentDto.orderId) {
      throw new BadRequestException('Missing required fields');
    }
    
    return await this.paymentService.createPayment(createPaymentDto);
    } catch (error) {
      this.logger.error('Payment creation error:', error.message);
      this.logger.error('Error stack:', error.stack);
      
      // Log validation errors specifically
      if (error.response && error.response.message) {
        this.logger.error('Validation errors:', error.response.message);
      }
      
      throw error;
    }
  }

  @Post('payment-methods')
  @ApiOperation({ summary: 'Create a payment method' })
  @ApiBody({ type: PaymentMethodDto })
  @ApiResponse({ status: 201, description: 'Payment method created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createPaymentMethod(@Body() paymentMethodDto: PaymentMethodDto) {
    return this.paymentService.createPaymentMethod(paymentMethodDto);
  }

  @Post('confirm-with-data')
  @ApiOperation({ summary: 'Confirm payment with payment method data' })
  @ApiBody({ type: ConfirmPaymentWithDataDto })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async confirmPaymentWithData(@Body() confirmDto: ConfirmPaymentWithDataDto) {
    return this.paymentService.confirmPaymentWithData(confirmDto);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm a payment intent' })
  @ApiBody({ type: ConfirmPaymentDto })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async confirmPayment(@Body() confirmPaymentDto: ConfirmPaymentDto) {
    this.logger.log(`Confirming payment: ${confirmPaymentDto.payment_intent_id}`);
    return await this.paymentService.confirmPayment(confirmPaymentDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('id') id: string) {
    return await this.paymentService.getPayment(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment by order ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentByOrderId(@Param('orderId') orderId: string) {
    return await this.paymentService.getPaymentByOrderId(orderId);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get all payments for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Payments found' })
  async getPaymentsByCustomerId(@Param('customerId') customerId: string) {
    return await this.paymentService.getPaymentsByCustomerId(customerId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment canceled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel payment' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async cancelPayment(@Param('id') id: string) {
    this.logger.log(`Canceling payment: ${id}`);
    return await this.paymentService.cancelPayment(id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiQuery({ name: 'amount', required: false, description: 'Refund amount in cents' })
  @ApiResponse({ status: 200, description: 'Refund created successfully' })
  @ApiResponse({ status: 400, description: 'Cannot refund payment' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async refundPayment(
    @Param('id') id: string,
    @Query('amount') amount?: number,
  ) {
    this.logger.log(`Creating refund for payment: ${id}`);
    return await this.paymentService.refundPayment(id, amount);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync payment status with Stripe' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment status synced' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async syncPaymentStatus(@Param('id') id: string) {
    return await this.paymentService.syncPaymentStatus(id);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiResponse({ status: 200, description: 'Payment statistics' })
  async getPaymentStats(@Query('customerId') customerId?: string) {
    return await this.paymentService.getPaymentStats(customerId);
  }

  @Get()
  @ApiOperation({ summary: 'Search payments with filters' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'orderId', required: false, description: 'Filter by order ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by payment status' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results per page', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip', type: Number })
  @ApiResponse({ status: 200, description: 'Payments found' })
  async searchPayments(
    @Query('customerId') customerId?: string,
    @Query('orderId') orderId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const filters = {
      customerId,
      orderId,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: limit || 10,
      offset: offset || 0,
    };

    return await this.paymentService.searchPayments(filters);
  }
}