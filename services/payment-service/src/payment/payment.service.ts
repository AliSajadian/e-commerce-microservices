import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './models/payment.model';
import { CreatePaymentDto } from './dto/create-payment.dto'

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Creates a new payment record with a PENDING status.
   * In a real-world scenario, this would also initiate a call to a payment gateway.
   * @param createPaymentDto The DTO containing payment details.
   * @returns The newly created payment entity.
   */
  async createPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // In a production app, you would integrate with a payment gateway here (e.g., Stripe, PayPal).
    // The gateway call would return a transaction ID and a response object.
    // For this example, we'll create the payment with a PENDING status.
    
    const newPayment = this.paymentRepository.create({
      ...createPaymentDto,
      status: PaymentStatus.PENDING,
      // gatewayTransactionId: result.transactionId,
      // gatewayResponse: result.response,
    });

    return this.paymentRepository.save(newPayment);
  }

  /**
   * Retrieves a single payment by its ID.
   * @param id The UUID of the payment.
   * @returns The found payment entity.
   * @throws NotFoundException if the payment does not exist.
   */
  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found.`);
    }
    return payment;
  }

  /**
   * Retrieves all payment records.
   * @returns An array of all payment entities.
   */
  async getAllPayments(): Promise<Payment[]> {
    return this.paymentRepository.find();
  }

  /**
   * Updates the status of a payment.
   * @param id The UUID of the payment.
   * @param newStatus The new payment status.
   * @returns The updated payment entity.
   */
  async updatePaymentStatus(id: string, newStatus: PaymentStatus): Promise<Payment> {
    const payment = await this.getPaymentById(id);
    payment.status = newStatus;
    return this.paymentRepository.save(payment);
  }
}
