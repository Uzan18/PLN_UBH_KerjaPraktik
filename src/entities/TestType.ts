import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import type { Parameter } from './Parameter';
import type { Asset } from './Asset';

@Entity('test_type')
export class TestType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name!: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @Column({ name: 'standard', type: 'varchar', length: 500, nullable: true })
  standard!: string | null;

  @OneToMany('Parameter', 'testType')
  parameters!: Parameter[];

  @ManyToMany('Asset', 'testTypes')
  assets!: Asset[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
