import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

import {
  GetMultipleProductsResponse,
  GetProductResponse,
  ProductReservationItem,
  ProductService,
  ReleaseReservationResponse,
  ReserveProductsResponse,
} from './product.interface'

@Injectable()
export class ProductGrpcService implements OnModuleInit {
  private productService: ProductService;

  constructor(@Inject('PRODUCT_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.productService = this.client.getService<ProductService>('ProductService');
  }

  /**
   * Get single product details
   */
  getProductDetails(product_id: string): Observable<GetProductResponse> {
    return this.productService.GetProduct({ product_id });
  }

  /**
   * Get multiple product details at once
   */
  getMultipleProductDetails(product_ids: string[]): Observable<GetMultipleProductsResponse> {
    return this.productService.GetMultipleProducts({ product_ids });
  }

  /**
   * Reserve products for an order
   */
  reserveProducts(
    products: ProductReservationItem[],
    reservation_id?: string,
    user_id?: string
  ): Observable<ReserveProductsResponse> {
    return this.productService.ReserveProducts({
      products,
      reservation_id,
      user_id
    });
  }

  /**
   * Release a product reservation
   */
  releaseReservation(
    reservationId: string,
    products: ProductReservationItem[]
  ): Observable<ReleaseReservationResponse> {
    return this.productService.ReleaseReservation({
      reservation_id: reservationId,      
      products
    });
  }

  /**
   * Check product availability
   */
  async checkProductAvailability(product_id: string, requestedQuantity: number): Promise<{
    available: boolean;
    product?: GetProductResponse;
    message: string;
  }> {
    try {
      const response = await this.getProductDetails(product_id).toPromise();
      
      if (!response) {
        return {
          available: false,
          message: `Product ${product_id} not found`
        };
      }

      if (!response.is_active) {
        return {
          available: false,
          product: response,
          message: `Product ${product_id} is not active`
        };
      }

      if (response.available_quantity < requestedQuantity) {
        return {
          available: false,
          product: response,
          message: `Insufficient stock. Available: ${response.available_quantity}, Requested: ${requestedQuantity}`
        };
      }

      return {
        available: true,
        product: response,
        message: 'Product is available'
      };

    } catch (error) {
      return {
        available: false,
        message: 'Error checking product availability'
      };
    }
  }

  /**
   * Check availability for multiple products
   */
  async checkMultipleProductsAvailability(
    items: { product_id: string; quantity: number }[]
  ): Promise<{
    allAvailable: boolean;
    results: Array<{
      product_id: string;
      available: boolean;
      product?: GetProductResponse;
      message: string;
    }>;
  }> {
    try {
      const product_ids = items.map(item => item.product_id);
      const response = await this.getMultipleProductDetails(product_ids).toPromise();
      
      if (!response || !response.products) {
        return {
          allAvailable: false,
          results: items.map(item => ({
            product_id: item.product_id,
            available: false,
            message: 'Product not found'
          }))
        };
      }

      const productMap = new Map(response.products.map(p => [p.product_id, p]));
      let allAvailable = true;
      const results = [];

      for (const item of items) {
        const product = productMap.get(item.product_id);
        
        if (!product) {
          allAvailable = false;
          results.push({
            product_id: item.product_id,
            available: false,
            message: `Product ${item.product_id} not found`
          });
          continue;
        }

        if (!product.is_active) {
          allAvailable = false;
          results.push({
            product_id: item.product_id,
            available: false,
            product,
            message: `Product ${item.product_id} is not active`
          });
          continue;
        }

        if (product.available_quantity < item.quantity) {
          allAvailable = false;
          results.push({
            product_id: item.product_id,
            available: false,
            product,
            message: `Insufficient stock for ${item.product_id}. Available: ${product.available_quantity}, Requested: ${item.quantity}`
          });
          continue;
        }

        results.push({
          product_id: item.product_id,
          available: true,
          product,
          message: 'Product is available'
        });
      }

      return {
        allAvailable,
        results
      };

    } catch (error) {
      return {
        allAvailable: false,
        results: items.map(item => ({
          product_id: item.product_id,
          available: false,
          message: 'Error checking product availability'
        }))
      };
    }
  }

  /**
   * Get product inventory summary
   */
  async getProductInventorySummary(product_id: string): Promise<{
    product_id: string;
    totalStock: number;
    reservedStock: number;
    availableStock: number;
    reservationPercentage: number;
  } | null> {
    try {
      const response = await this.getProductDetails(product_id).toPromise();
      
      if (!response) {
        return null;
      }

      const reservationPercentage = response.stock_quantity > 0 
        ? (response.reserved_quantity / response.stock_quantity) * 100 
        : 0;

      return {
        product_id: response.product_id,
        totalStock: response.stock_quantity,
        reservedStock: response.reserved_quantity,
        availableStock: response.available_quantity,
        reservationPercentage: Math.round(reservationPercentage * 100) / 100
      };

    } catch (error) {
      console.error(`Error getting inventory summary for product ${product_id}:`, error);
      return null;
    }
  }
}