import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { ProductModule } from '../product/product.module'; // Import ProductModule
import { 
  Notification,
  NotificationDevice, 
  NotificationPreference, 
  NotificationServiceUser, 
  NotificationTemplate, 
  User, 
  UserSyncEvent 
} from './entities';
import { 
  NotificationDeliveryService, 
  NotificationPreferenceService, 
  NotificationService, 
  NotificationTemplateService, 
  UserSyncService, 
  AuthClientService
} from './services';
import { 
  NotificationController, 
  NotificationTemplateController, 
  NotificationPreferenceController, 
  NotificationDeviceController 
} from './controllers';
import { NotificationRepository } from './repositories/notification.repository';

@Module({
  imports: [
    // This connects our model to the database within this module
    TypeOrmModule.forFeature([
      User, 
      UserSyncEvent, 
      Notification, 
      NotificationTemplate, 
      NotificationServiceUser, 
      NotificationPreference,
      NotificationDevice
    ]),

    ProductModule,
    HttpModule
  ],
  controllers: [
    NotificationController, 
    NotificationTemplateController, 
    NotificationPreferenceController, 
    NotificationDeviceController,
  ],
  providers: [
    UserSyncService, 
    NotificationService, 
    NotificationTemplateService, 
    NotificationPreferenceService, 
    NotificationDeliveryService,
    NotificationRepository, 
    AuthClientService,
  ],
  exports: [
    AuthClientService,
    NotificationService,
  ]
})
export class NotificationModule {}

