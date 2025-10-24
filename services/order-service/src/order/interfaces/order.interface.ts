// src/order/interfaces/order.interface.ts

import { AddressDto } from '../dto/address.dto';
import { OrderStatus } from '../models/order.model';

// In a real-world scenario, OrderItem would likely be its own interface as well
export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface IOrder {
  id: string;
  userId: string;
  items: OrderItem[];
  reservationId: string;
  shippingAddress?: AddressDto; // Optional, can be an AddressDto in a more complex scenario
  notes?: string; // Optional notes for the order
  totalPrice: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}