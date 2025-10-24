// src/order/dto/create-order.dto.ts

import { IsNotEmpty, IsUUID, IsNumber, IsArray, ValidateNested, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderItemDto } from './order.item.dto';
import { AddressDto } from './address.dto';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'The unique ID of the product.',
    example: '50197295-1294-45dd-b1ad-262f8ffe9855',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'The quantity of the product.',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}

export class CreateOrderDto1 {
  @ApiProperty({
    description: 'The unique ID of the user placing the order.',
    example: 'd9330b96-f282-472a-9350-065143067adf',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'A list of items included in the order.',
    type: [CreateOrderItemDto],
    example: [
      {
        productId: '50197295-1294-45dd-b1ad-262f8ffe9855',
        quantity: 2,
      },
      {
        productId: '99782c3a-fa5a-4068-b9b7-18556c3bfc9c',
        quantity: 1,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}


export class CreateOrderDto {
  @ApiProperty({ example: 'b9d1563c-7efc-4c8b-9787-5a90241a4a50' })
  @IsUUID()
  userId: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiProperty({ example: 'Please leave the package at the front door.' })
  @IsOptional()
  @IsString()
  notes?: string;
}