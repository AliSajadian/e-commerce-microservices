import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserSyncEvent } from '../entities/user-sync-event.entity';
import { UserSyncEventType } from '../enums/user-sync-event-type.enum';
import { UserSyncStatus } from '../enums/user-sync-status.enum';

export class UserSyncEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: UserSyncEventType })
  eventType: UserSyncEventType;

  @ApiProperty()
  userData: Record<string, any>;

  @ApiProperty({ enum: UserSyncStatus })
  status: UserSyncStatus;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  retryCount: number;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  constructor(event: UserSyncEvent) {
    this.id = event.id;
    this.userId = event.userId;
    this.eventType = event.eventType;
    this.userData = event.userData;
    this.status = event.status;
    this.errorMessage = event.errorMessage;
    this.retryCount = event.retryCount;
    this.processedAt = event.processedAt;
    this.createdAt = event.createdAt;
  }
}
