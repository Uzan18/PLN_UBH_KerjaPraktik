import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TestSession } from './TestSession.entity';
import { Parameter } from './Parameter.entity';

export enum JudgementLabel {
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  BAD = 'BAD'
}

@Entity('TEST_RESULT')
export class TestResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'number' })
  testSessionId: number;

  @Column({ type: 'number' })
  parameterId: number;

  @Column({ type: 'float', nullable: true })
  value!: number;

  @Column({ type: 'float', nullable: true })
  score!: number;

  @Column({ type: 'varchar2', length: 20 })
  judgement: JudgementLabel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => TestSession, session => session.testResults)
  @JoinColumn({ name: 'testSessionId' })
  testSession: TestSession;

  @ManyToOne(() => Parameter, param => param.testResults)
  @JoinColumn({ name: 'parameterId' })
  parameter: Parameter;
}