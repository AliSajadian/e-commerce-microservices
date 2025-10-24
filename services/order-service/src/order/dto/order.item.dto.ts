import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsNumber, IsString, IsArray, ValidateNested, IsOptional, IsEnum } from 'class-validator';


export class OrderItemDto {
  @ApiProperty({ example: '50197295-1294-45dd-b1ad-262f8ffe9855' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  quantity: number;
}