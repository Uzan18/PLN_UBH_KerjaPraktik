import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import type { TestType } from './TestType';
import type { Criteria } from './Criteria';
import type { TestResult } from './TestResult';

@Entity('parameter')
@Unique(['testTypeId', 'name'])
export class Parameter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'test_type_id', type: 'varchar', length: 36 })
  testTypeId!: string;

  @ManyToOne('TestType', 'parameters')
  @JoinColumn({ name: 'test_type_id' })
  testType!: TestType;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unit!: string | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @Column({ name: 'damage_mechanisms', type: 'varchar', length: 1000, nullable: true })
  damageMechanisms!: string | null;

  @OneToMany('Criteria', 'parameter')
  criteria!: Criteria[];

  @OneToMany('TestResult', 'parameter')
  testResults!: TestResult[];
}
