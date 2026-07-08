import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Asset } from './Asset.entity';
import { TestType } from './TestType.entity';
import { User } from './User.entity';
import { TestResult } from './TestResult.entity';

export enum TestSessionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED'
}

@Entity('TEST_SESSION')
export class TestSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'number' })
  assetId: number;

  @Column({ type: 'number' })
  testTypeId: number;

  @Column({ type: 'number' })
  testYear: number;

  @Column({ type: 'varchar2', length: 50, default: TestSessionStatus.DRAFT })
  status: TestSessionStatus;

  @Column({ type: 'number', nullable: true })
  createdById: number;

  @Column({ type: 'number', nullable: true })
  approvedById: number;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Asset, asset => asset.testSessions)
  @JoinColumn({ name: 'assetId' })
  asset: Asset;

  @ManyToOne(() => TestType, type => type.testSessions)
  @JoinColumn({ name: 'testTypeId' })
  testType: TestType;

  @ManyToOne(() => User, user => user.createdSessions)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @ManyToOne(() => User, user => user.approvedSessions)
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @OneToMany(() => TestResult, result => result.testSession)
  testResults: TestResult[];
}