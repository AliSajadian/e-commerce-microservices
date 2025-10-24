import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notification_service_users')
export class NotificationServiceUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Notification-specific user settings
  @Column({ type: 'boolean', default: true })
  globalNotificationsEnabled: boolean;

  @Column({ type: 'json', nullable: true })
  quietHours?: {
    start: string; // "22:00"
    end: string;   // "08:00"
    timezone: string;
  };

  @Column({ type: 'int', default: 50 })
  maxNotificationsPerDay: number;

  @Column({ type: 'int', default: 0 })
  todayNotificationCount: number;

  @Column({ type: 'date', nullable: true })
  lastNotificationDate?: Date;

  @Column({ type: 'boolean', default: false })
  isVip: boolean; // VIP users can receive more notifications

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
