import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface ProductService {
  GetProduct(request: { productId: string }): Observable<{ 
    productId: string;
    name: string;
    price: number;
    stockQuantity: number;
  }>;
}

@Injectable()
export class OrderService implements OnModuleInit {
  private productService: ProductService;

  constructor(@Inject('PRODUCT_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.productService = this.client.getService<ProductService>('ProductService');
  }

  async createOrder(productId: string, quantity: number) {
    // 1. Make the gRPC call to product-service
    const productResponse = await this.productService.GetProduct({ productId }).toPromise();
    
    // 2. Process the response
    if (!productResponse || productResponse.stockQuantity < quantity) {
      // Handle insufficient stock
      return { status: 'failed', message: 'Insufficient product stock' };
    }
    
    // 3. Log product details and proceed with order creation
    console.log(`Successfully retrieved product details: ${JSON.stringify(productResponse)}`);
    console.log(`Proceeding to create order for product ${productId}...`);
    
    // Add your order creation logic here...
    return { status: 'success', message: 'Order created' };
  }
}