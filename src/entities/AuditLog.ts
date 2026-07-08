import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  entity!: string;

  @Index()
  @Column({ name: 'entity_id', type: 'varchar', length: 36 })
  entityId!: string;

  @Column({ name: 'before_data', type: 'clob', nullable: true })
  beforeData!: string | null;

  @Column({ name: 'after_data', type: 'clob', nullable: true })
  afterData!: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
