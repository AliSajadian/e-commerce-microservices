// /src/events/events.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEventsController } from './controllers/user-events.controller';
import { UserSyncService } from './services/user-sync.service';
import { User, UserSyncEvent } from '../notification/entities';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSyncEvent]),
    NotificationModule,
  ],
  controllers: [UserEventsController],
  providers: [UserSyncService],
  exports: [UserSyncService],
})
export class EventsModule {}