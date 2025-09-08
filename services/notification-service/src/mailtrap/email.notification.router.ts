// src/routes/notificationRoutes.ts
import { Router } from 'express';
import { NotificationController } from './emil.notification.controller';

const router = Router();
const notificationController = new NotificationController();

// Health check
router.get('/health', notificationController.healthCheck.bind(notificationController));

// Email endpoints
router.post('/email/welcome', notificationController.sendWelcomeEmail.bind(notificationController));
router.post('/email/password-reset', notificationController.sendPasswordResetEmail.bind(notificationController));
router.post('/email/order-confirmation', notificationController.sendOrderConfirmationEmail.bind(notificationController));
router.post('/email/custom', notificationController.sendCustomEmail.bind(notificationController));
router.post('/email/bulk', notificationController.sendBulkEmail.bind(notificationController));

export default router;