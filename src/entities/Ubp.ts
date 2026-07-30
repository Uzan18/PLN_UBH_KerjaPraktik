import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { UnitPembangkit } from './UnitPembangkit';

@Entity('ubp')
export class Ubp {
  // @ts-expect-error - Override Function.name for TypeORM metadata resolution in Next.js SWC bundler
  static get name() { return 'Ubp'; }

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name!: string;

  @OneToMany('UnitPembangkit', 'ubp')
  unitPembangkit!: UnitPembangkit[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
