import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { MailtrapConfig, MailtrapEmailOptions, MailtrapEmailResponse } from './mailtrap.types';
import { EmailProviderInterface } from '../interfaces/email-provider.interface';

@Injectable()
export class MailtrapService implements EmailProviderInterface {
  private readonly logger = new Logger(MailtrapService.name);
  private readonly config: MailtrapConfig;
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      token: this.configService.get<string>('mailtrap.token'),
      accountId: this.configService.get<string>('mailtrap.accountId'),
      inboxId: this.configService.get<string>('mailtrap.inboxId'),
      testInboxId: this.configService.get<string>('mailtrap.testInboxId'),
      sandboxMode: this.configService.get<boolean>('mailtrap.sandboxMode'),
    };

    if (!this.config.token) {
      throw new Error('Mailtrap token is required');
    }

    this.httpClient = axios.create({
      baseURL: this.config.sandboxMode 
        ? 'https://sandbox.api.mailtrap.io/api'
        : 'https://send.api.mailtrap.io/api',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    this.logger.log(`Mailtrap service initialized in ${this.config.sandboxMode ? 'sandbox' : 'production'} mode`);
  }

  async sendEmail(options: MailtrapEmailOptions): Promise<MailtrapEmailResponse> {
    try {
      const emailData = this.buildEmailData(options);
      const endpoint = this.config.sandboxMode 
        ? `/send/${this.config.testInboxId || this.config.inboxId}`
        : '/send';

      const response = await this.httpClient.post(endpoint, emailData);

      this.logger.log(`Email sent successfully. Message ID: ${response.data.message_id}`);

      return {
        messageId: response.data.message_id,
        status: response.data.status || 'sent',
      };
    } catch (error) {
      this.logger.error('Failed to send email:', error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        throw new BadRequestException(`Mailtrap Error: ${error.response.data.message || 'Bad request'}`);
      }
      
      if (error.response?.status === 401) {
        throw new BadRequestException('Mailtrap authentication failed. Check your API token.');
      }
      
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendTemplate(templateId: string, to: string | string[], variables?: Record<string, any>): Promise<MailtrapEmailResponse> {
    try {
      const emailData = {
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        template_uuid: templateId,
        template_variables: variables || {},
      };

      const endpoint = this.config.sandboxMode 
        ? `/send/${this.config.testInboxId || this.config.inboxId}`
        : '/send';

      const response = await this.httpClient.post(endpoint, emailData);

      this.logger.log(`Template email sent successfully. Template ID: ${templateId}, Message ID: ${response.data.message_id}`);

      return {
        messageId: response.data.message_id,
        status: response.data.status || 'sent',
      };
    } catch (error) {
      this.logger.error(`Failed to send template email (${templateId}):`, error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        throw new BadRequestException(`Mailtrap Error: ${error.response.data.message || 'Bad request'}`);
      }
      
      throw new InternalServerErrorException('Failed to send template email');
    }
  }

  async getDeliveryStatus(messageId: string): Promise<any> {
    try {
      if (this.config.sandboxMode) {
        // In sandbox mode, we can't get real delivery status
        return {
          messageId,
          status: 'delivered',
          note: 'Sandbox mode - simulated delivery status',
        };
      }

      // In production mode, you would implement actual status checking
      // This would require additional Mailtrap API endpoints
      const response = await this.httpClient.get(`/messages/${messageId}/events`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get delivery status for message ${messageId}:`, error);
      throw new InternalServerErrorException('Failed to get delivery status');
    }
  }

  // Implementation of EmailProviderInterface
  async send(to: string | string[], subject: string, content: string, options?: any): Promise<any> {
    return this.sendEmail({
      to,
      subject,
      html: content,
      ...options,
    });
  }

  private buildEmailData(options: MailtrapEmailOptions): any {
    const emailData: any = {
      to: Array.isArray(options.to) 
        ? options.to.map(email => ({ email })) 
        : [{ email: options.to }],
      subject: options.subject,
    };

    if (options.from) {
      emailData.from = options.from;
    }

    if (options.cc) {
      emailData.cc = Array.isArray(options.cc) 
        ? options.cc.map(email => ({ email })) 
        : [{ email: options.cc }];
    }

    if (options.bcc) {
      emailData.bcc = Array.isArray(options.bcc) 
        ? options.bcc.map(email => ({ email })) 
        : [{ email: options.bcc }];
    }

    if (options.html) {
      emailData.html = options.html;
    }

    if (options.text) {
      emailData.text = options.text;
    }

    if (options.templateId) {
      emailData.template_uuid = options.templateId;
      emailData.template_variables = options.templateVariables || {};
    }

    if (options.attachments) {
      emailData.attachments = options.attachments;
    }

    if (options.headers) {
      emailData.headers = options.headers;
    }

    if (options.customArgs) {
      emailData.custom_args = options.customArgs;
    }

    return emailData;
  }
}


//======================================================================
// src/services/emailService.ts
// import nodemailer, { Transporter } from 'nodemailer';
// import { EmailOptions, EmailTemplate } from './emailtrap.types';

// export class MailtrapService {
//   private transporter: Transporter;

//   constructor() {
//     this.transporter = nodemailer.createTransport({
//       host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
//       port: parseInt(process.env.MAILTRAP_PORT || '2525'),
//       auth: {
//         user: process.env.MAILTRAP_USER,
//         pass: process.env.MAILTRAP_PASS,
//       },
//     });

//     // Verify connection configuration
//     this.verifyConnection();
//   }

//   private async verifyConnection(): Promise<void> {
//     try {
//       await this.transporter.verify();
//       console.log('✅ Mailtrap SMTP connection verified successfully');
//     } catch (error) {
//       console.error('❌ Mailtrap SMTP connection failed:', error);
//     }
//   }

//   async sendEmail(options: EmailOptions): Promise<boolean> {
//     try {
//       const mailOptions = {
//         from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
//         to: options.to,
//         subject: options.subject,
//         text: options.text,
//         html: options.html,
//         cc: options.cc,
//         bcc: options.bcc,
//         attachments: options.attachments,
//       };

//       const result = await this.transporter.sendMail(mailOptions);
//       console.log('📧 Email sent successfully:', result.messageId);
//       return true;
//     } catch (error) {
//       console.error('❌ Failed to send email:', error);
//       return false;
//     }
//   }

//   // Template-based email methods
//   async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #333;">Welcome to Our Platform!</h2>
//         <p>Hi ${userName},</p>
//         <p>Thank you for joining us! We're excited to have you on board.</p>
//         <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
//           <p><strong>What's next?</strong></p>
//           <ul>
//             <li>Complete your profile setup</li>
//             <li>Explore our features</li>
//             <li>Connect with other users</li>
//           </ul>
//         </div>
//         <p>Best regards,<br>The Team</p>
//       </div>
//     `;

//     return this.sendEmail({
//       to,
//       subject: 'Welcome to Our Platform!',
//       html: htmlContent,
//       text: `Hi ${userName}, Welcome to our platform! Thank you for joining us.`,
//     });
//   }

//   async sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
//     const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #333;">Password Reset Request</h2>
//         <p>You requested a password reset for your account.</p>
//         <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
//           <p><strong>Click the button below to reset your password:</strong></p>
//           <a href="${resetUrl}" 
//              style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">
//             Reset Password
//           </a>
//         </div>
//         <p><small>This link will expire in 1 hour. If you didn't request this, please ignore this email.</small></p>
//       </div>
//     `;

//     return this.sendEmail({
//       to,
//       subject: 'Password Reset Request',
//       html: htmlContent,
//       text: `Password reset requested. Visit: ${resetUrl}`,
//     });
//   }

//   async sendOrderConfirmationEmail(
//     to: string,
//     orderDetails: { orderId: string; items: any[]; total: number }
//   ): Promise<boolean> {
//     const { orderId, items, total } = orderDetails;
    
//     const itemsHtml = items.map(item => 
//       `<tr>
//         <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
//         <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
//         <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
//       </tr>`
//     ).join('');

//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #28a745;">Order Confirmation</h2>
//         <p>Thank you for your order! Here are the details:</p>
        
//         <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
//           <p><strong>Order ID:</strong> ${orderId}</p>
//         </div>

//         <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
//           <thead>
//             <tr style="background-color: #f8f9fa;">
//               <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
//               <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
//               <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${itemsHtml}
//           </tbody>
//           <tfoot>
//             <tr>
//               <td colspan="2" style="padding: 12px 8px; font-weight: bold; border-top: 2px solid #ddd;">Total:</td>
//               <td style="padding: 12px 8px; font-weight: bold; text-align: right; border-top: 2px solid #ddd;">$${total.toFixed(2)}</td>
//             </tr>
//           </tfoot>
//         </table>

//         <p>We'll send you another email when your order ships!</p>
//       </div>
//     `;

//     return this.sendEmail({
//       to,
//       subject: `Order Confirmation - ${orderId}`,
//       html: htmlContent,
//       text: `Order ${orderId} confirmed. Total: $${total.toFixed(2)}`,
//     });
//   }

//   async sendBulkEmail(recipients: string[], subject: string, content: string): Promise<void> {
//     const promises = recipients.map(recipient => 
//       this.sendEmail({
//         to: recipient,
//         subject,
//         html: content,
//         text: content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
//       })
//     );

//     try {
//       await Promise.allSettled(promises);
//       console.log(`📧 Bulk email sent to ${recipients.length} recipients`);
//     } catch (error) {
//       console.error('❌ Bulk email failed:', error);
//     }
//   }
// }

