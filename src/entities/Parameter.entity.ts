import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TestType } from './TestType.entity';
import { Criteria } from './Criteria.entity';
import { TestResult } from './TestResult.entity';

@Entity('PARAMETER')
export class Parameter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'number' })
  testTypeId: number;

  @Column({ type: 'varchar2', length: 100 })
  name: string;

  @Column({ type: 'varchar2', length: 50, nullable: true })
  unit: string;

  @Column({ type: 'varchar2', length: 10 })
  comparisonDirection: 'MIN' | 'MAX';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => TestType, type => type.parameters)
  @JoinColumn({ name: 'testTypeId' })
  testType: TestType;

  @OneToMany(() => Criteria, criteria => criteria.parameter)
  criteriaList: Criteria[];

  @OneToMany(() => TestResult, result => result.parameter)
  testResults: TestResult[];
}