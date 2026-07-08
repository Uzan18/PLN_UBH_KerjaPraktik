import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { TestSession } from './TestSession';
import type { Parameter } from './Parameter';
import type { JudgementLabel } from '@/types';

@Entity('test_result')
export class TestResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'test_session_id', type: 'varchar', length: 36 })
  testSessionId!: string;

  @ManyToOne('TestSession', 'testResults', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_session_id' })
  testSession!: TestSession;

  @Index()
  @Column({ name: 'parameter_id', type: 'varchar', length: 36 })
  parameterId!: string;

  @ManyToOne('Parameter', 'testResults')
  @JoinColumn({ name: 'parameter_id' })
  parameter!: Parameter;

  @Column({ type: 'decimal', precision: 20, scale: 6, nullable: true })
  value!: number | null;

  @Column({ name: 'is_not_applicable', type: 'smallint', default: 0 })
  isNotApplicable!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  score!: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  judgement!: JudgementLabel | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
