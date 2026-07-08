import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User.entity';

@Entity('AUDIT_LOG')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'number' })
  userId: number;

  @Column({ type: 'varchar2', length: 100 })
  action: string;

  @Column({ type: 'varchar2', length: 100 })
  tableName: string;

  @Column({ type: 'number' })
  recordId: number;

  @Column({ type: 'clob', nullable: true })
  oldData: string;

  @Column({ type: 'clob', nullable: true })
  newData: string;

  @Column({ type: 'varchar2', length: 1000, nullable: true })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, user => user.auditLogs)
  @JoinColumn({ name: 'userId' })
  user: User;
}