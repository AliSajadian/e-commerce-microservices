import { Controller, Get, Post, Body, Param, Put, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';

import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './models/order.model';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { IOrder } from './interfaces/order.interface';


@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @Permissions('order:create')
  @Post()
  @ApiBody({
    type: CreateOrderDto,
    examples: {
      aValidOrder: {
        value: {
          userId: 'd9330b96-f282-472a-9350-065143067adf',
          items: [
            {
              productId: '50197295-1294-45dd-b1ad-262f8ffe9855',
              quantity: 2,
            },
            {
              productId: '99782c3a-fa5a-4068-b9b7-18556c3bfc9c',
              quantity: 1,
            },
          ],
        } as CreateOrderDto,
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOrderDto: CreateOrderDto): Promise<IOrder> {
    return this.orderService.createOrder(createOrderDto);
  }  

  @ApiBearerAuth('JWT-auth') 
  @UseGuards(JwtAuthGuard, PermissionsGuard) // This line protects the endpoint
  @Permissions('order:read')
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<IOrder> {
    return this.orderService.getOrderById(id);
  }
  
  // @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @Permissions('order:read')
  @Get()
  async findAll(): Promise<IOrder[]> {
    return this.orderService.getAllOrders();
  }

  @ApiBearerAuth('JWT-auth') 
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('order:write')
  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') newStatus: OrderStatus): Promise<IOrder> {
    return this.orderService.updateOrderStatus(id, newStatus);
  }
  
  @ApiBearerAuth('JWT-auth') 
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('order:write')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.orderService.deleteOrder(id);
  }
}