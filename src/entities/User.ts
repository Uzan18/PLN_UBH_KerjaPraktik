import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { TestSession } from './TestSession';
import type { UserRole } from '@/types';

@Entity('siat_user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: UserRole;

  @Column({ name: 'allowed_ubp_ids', type: 'varchar', length: 2000, nullable: true })
  allowedUbpIds!: string | null;

  @Column({ name: 'is_active', type: 'smallint', default: 1 })
  isActive!: boolean;

  @OneToMany('TestSession', 'createdBy')
  createdSessions!: TestSession[];

  @OneToMany('TestSession', 'validatedBy')
  validatedSessions!: TestSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
