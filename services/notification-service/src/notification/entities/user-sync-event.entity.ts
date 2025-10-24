import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { UserSyncEventType, UserSyncStatus } from '../enums';


@Entity('user_sync_events')
@Index(['userId', 'eventType'])
@Index(['status', 'createdAt'])
export class UserSyncEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: UserSyncEventType,
  })
  eventType: UserSyncEventType;

  @Column({ type: 'json' })
  userData: Record<string, any>; // The user data from auth-service

  @Column({
    type: 'enum',
    enum: UserSyncStatus,
    default: UserSyncStatus.PENDING,
  })
  status: UserSyncStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}

