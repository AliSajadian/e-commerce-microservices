import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


// First, create an Outbox entity
@Entity()
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventType: string;

  @Column('json')
  payload: any;

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'PROCESSED' | 'FAILED';

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  processedAt: Date;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  error: string;
}

