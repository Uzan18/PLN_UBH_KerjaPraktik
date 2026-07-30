import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
  Unique,
} from 'typeorm';
import type { TestType } from './TestType';
import type { Criteria } from './Criteria';
import type { TestResult } from './TestResult';
import type { DamageMechanism } from './DamageMechanism';

@Entity('parameter')
@Unique(['testTypeId', 'name'])
export class Parameter {
  // @ts-expect-error - Override Function.name for TypeORM metadata resolution in Next.js SWC bundler
  static get name() { return 'Parameter'; }

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

  @ManyToMany('DamageMechanism', 'parameters')
  @JoinTable({
    name: 'parameter_damage_mechanism',
    joinColumn: { name: 'parameter_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'damage_mechanism_name', referencedColumnName: 'name' },
  })
  damageMechanisms!: DamageMechanism[];

  @OneToMany('Criteria', 'parameter')
  criteria!: Criteria[];

  @OneToMany('TestResult', 'parameter')
  testResults!: TestResult[];
}
