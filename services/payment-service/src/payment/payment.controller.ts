import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { ApiTags, ApiBody, ApiParam } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { Payment, PaymentStatus } from './models/payment.model';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiBody({ type: CreatePaymentDto })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto): Promise<Payment> {
    return this.paymentService.createPayment(createPaymentDto);
  }

  @Get()
  async findAll(): Promise<Payment[]> {
    return this.paymentService.getAllPayments();
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async findOne(@Param('id') id: string): Promise<Payment> {
    return this.paymentService.getPaymentById(id);
  }

  @Put(':id/status')
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(PaymentStatus),
        },
      },
    },
  })
  async updateStatus(@Param('id') id: string, @Body('status') newStatus: PaymentStatus): Promise<Payment> {
    return this.paymentService.updatePaymentStatus(id, newStatus);
  }
}
