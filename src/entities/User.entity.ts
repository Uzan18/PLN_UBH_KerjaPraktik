import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserUbpAccess } from './UserUbpAccess.entity';
import { TestSession } from './TestSession.entity';
import { AuditLog } from './AuditLog.entity';

export enum Role {
  VIEWER = 'VIEWER',
  INPUT = 'INPUT',
  QC = 'QC',
  ADMIN = 'ADMIN'
}

@Entity('USERS')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar2', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar2', length: 255, nullable: true })
  passwordHash: string;

  @Column({ type: 'varchar2', length: 100 })
  name: string;

  @Column({ type: 'varchar2', length: 50, default: Role.VIEWER })
  role: Role;

  @Column({ type: 'number', precision: 1, default: 1 })
  isActive: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UserUbpAccess, access => access.user)
  ubpAccess: UserUbpAccess[];

  @OneToMany(() => TestSession, session => session.createdBy)
  createdSessions: TestSession[];

  @OneToMany(() => TestSession, session => session.approvedBy)
  approvedSessions: TestSession[];

  @OneToMany(() => AuditLog, log => log.user)
  auditLogs: AuditLog[];
}