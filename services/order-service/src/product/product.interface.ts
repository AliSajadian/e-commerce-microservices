import { Observable } from 'rxjs';


// Product interfaces based on the proto
export interface GetProductRequest {
  product_id: string;
}

export interface GetProductResponse {
  product_id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  is_active: boolean;
  sku: string;
}

export interface GetMultipleProductsRequest {
  product_ids: string[];
}

export interface GetMultipleProductsResponse {
  products: GetProductResponse[];
}

export interface ProductReservationItem {
  product_id: string;
  quantity: number;
}

export interface ReserveProductsRequest {
  products: ProductReservationItem[];
  reservation_id?: string;
  user_id?: string; // New field for user ID
}

export interface ProductReservationResult {
  product_id: string;
  success: boolean;
  reserved_quantity: number;
  message: string;
}

export interface ReserveProductsResponse {
  all_reserved: boolean;  // Change from all_reserved
  results: ProductReservationResult[];
  reservation_id: string; // Change from reservation_id
}

export interface ReleaseReservationRequest {
  products: ProductReservationItem[];
  reservation_id: string; // Change from reservation_id
}

export interface ReleaseReservationResponse {
  success: boolean;
  message: string;
}

// Updated ProductService interface with all methods
export interface ProductService {
  GetProduct(request: GetProductRequest): Observable<GetProductResponse>;
  GetMultipleProducts(request: GetMultipleProductsRequest): Observable<GetMultipleProductsResponse>;
  ReserveProducts(request: ReserveProductsRequest): Observable<ReserveProductsResponse>;
  ReleaseReservation(request: ReleaseReservationRequest): Observable<ReleaseReservationResponse>;
}
