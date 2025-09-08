import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductModule } from '../product/product.module'; // Import ProductModule
import { 
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
  UserSyncService 
} from './services';
import { 
  NotificationController, 
  NotificationTemplateController, 
  NotificationPreferenceController, 
  NotificationDeviceController 
} from './controllers';

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
    ProductModule
  ],
  controllers: [
    NotificationController, 
    NotificationTemplateController, 
    NotificationPreferenceController, 
    NotificationDeviceController
  ],
  providers: [
    UserSyncService, 
    NotificationService, 
    NotificationTemplateService, 
    NotificationPreferenceService, 
    NotificationService, 
    NotificationDeliveryService
  ],
})
export class notificationModule {}