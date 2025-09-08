import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface ProductService {
  GetProduct(request: { productId: string }): Observable<{
    productId: string;
    name: string;
    description: string;
    price: number;
    stockQuantity: number;
  }>;
}

@Injectable()
export class ProductGrpcService implements OnModuleInit {
  private productService: ProductService;

  constructor(@Inject('PRODUCT_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.productService = this.client.getService<ProductService>('ProductService');
  }

  getProductDetails(productId: string) {
    return this.productService.GetProduct({ productId });
  }
}