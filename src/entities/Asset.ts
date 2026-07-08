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
import type { Ubp } from './Ubp';
import type { TestSession } from './TestSession';

@Entity('asset')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'ubp_id', type: 'varchar', length: 36 })
  ubpId!: string;

  @ManyToOne('Ubp', 'assets')
  @JoinColumn({ name: 'ubp_id' })
  ubp!: Ubp;

  @Column({ type: 'varchar', length: 500 })
  name!: string;

  @Column({ name: 'equipment_type', type: 'varchar', length: 255 })
  equipmentType!: string;

  @Column({ name: 'mfg_year', type: 'int', nullable: true })
  mfgYear!: number | null;

  @Column({ name: 'vector_group', type: 'varchar', length: 100, nullable: true })
  vectorGroup!: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 255, nullable: true })
  serialNumber!: string | null;

  @OneToMany('TestSession', 'asset')
  testSessions!: TestSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
