import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Asset } from './Asset';
import type { User } from './User';
import type { TestResult } from './TestResult';
import type { DataStatus } from '@/types';

@Entity('test_session')
export class TestSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'asset_id', type: 'varchar', length: 36 })
  assetId!: string;

  @ManyToOne('Asset', 'testSessions')
  @JoinColumn({ name: 'asset_id' })
  asset!: Asset;

  @Index()
  @Column({ name: 'test_year', type: 'int' })
  testYear!: number;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    default: 'DRAFT',
  })
  status!: DataStatus;

  @Index()
  @Column({ name: 'created_by_id', type: 'varchar', length: 36 })
  createdById!: string;

  @ManyToOne('User', 'createdSessions')
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @Column({ name: 'validated_by_id', type: 'varchar', length: 36, nullable: true })
  validatedById!: string | null;

  @ManyToOne('User', 'validatedSessions', { nullable: true })
  @JoinColumn({ name: 'validated_by_id' })
  validatedBy!: User | null;

  @Column({ name: 'validated_at', type: 'timestamp', nullable: true })
  validatedAt!: Date | null;

  @Column({ name: 'reject_reason', type: 'varchar', length: 2000, nullable: true })
  rejectReason!: string | null;

  @OneToMany('TestResult', 'testSession', { cascade: true })
  testResults!: TestResult[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
