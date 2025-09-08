// src/controllers/notificationController.ts
import { Request, Response } from 'express';
import { EmailService } from './email.notification,service';
import { EmailType } from './emil.notification.types';

export class NotificationController {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Send welcome email
  async sendWelcomeEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, userName } = req.body;

      if (!email || !userName) {
        res.status(400).json({ 
          success: false, 
          message: 'Email and userName are required' 
        });
        return;
      }

      const success = await this.emailService.sendWelcomeEmail(email, userName);

      if (success) {
        res.status(200).json({ 
          success: true, 
          message: 'Welcome email sent successfully' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send welcome email' 
        });
      }
    } catch (error) {
      console.error('Welcome email error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, resetToken } = req.body;

      if (!email || !resetToken) {
        res.status(400).json({ 
          success: false, 
          message: 'Email and resetToken are required' 
        });
        return;
      }

      const success = await this.emailService.sendPasswordResetEmail(email, resetToken);

      if (success) {
        res.status(200).json({ 
          success: true, 
          message: 'Password reset email sent successfully' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send password reset email' 
        });
      }
    } catch (error) {
      console.error('Password reset email error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Send order confirmation email
  async sendOrderConfirmationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, orderDetails } = req.body;

      if (!email || !orderDetails) {
        res.status(400).json({ 
          success: false, 
          message: 'Email and orderDetails are required' 
        });
        return;
      }

      const success = await this.emailService.sendOrderConfirmationEmail(email, orderDetails);

      if (success) {
        res.status(200).json({ 
          success: true, 
          message: 'Order confirmation email sent successfully' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send order confirmation email' 
        });
      }
    } catch (error) {
      console.error('Order confirmation email error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Send custom email
  async sendCustomEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to, subject, html, text } = req.body;

      if (!to || !subject || (!html && !text)) {
        res.status(400).json({ 
          success: false, 
          message: 'to, subject, and content (html or text) are required' 
        });
        return;
      }

      const success = await this.emailService.sendEmail({ to, subject, html, text });

      if (success) {
        res.status(200).json({ 
          success: true, 
          message: 'Email sent successfully' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send email' 
        });
      }
    } catch (error) {
      console.error('Custom email error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Send bulk email
  async sendBulkEmail(req: Request, res: Response): Promise<void> {
    try {
      const { recipients, subject, content } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ 
          success: false, 
          message: 'Recipients array is required and must not be empty' 
        });
        return;
      }

      if (!subject || !content) {
        res.status(400).json({ 
          success: false, 
          message: 'Subject and content are required' 
        });
        return;
      }

      await this.emailService.sendBulkEmail(recipients, subject, content);

      res.status(200).json({ 
        success: true, 
        message: `Bulk email sent to ${recipients.length} recipients` 
      });
    } catch (error) {
      console.error('Bulk email error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Health check endpoint
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({ 
        success: true, 
        message: 'Notification service is running',
        timestamp: new Date().toISOString(),
        service: 'notification-service'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Service unavailable' 
      });
    }
  }
}