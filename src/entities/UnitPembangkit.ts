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
import type { Asset } from './Asset';

@Entity('unit_pembangkit')
export class UnitPembangkit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index()
  @Column({ name: 'ubp_id', type: 'varchar', length: 36 })
  ubpId!: string;

  @ManyToOne('Ubp', 'unitPembangkit')
  @JoinColumn({ name: 'ubp_id' })
  ubp!: Ubp;

  @OneToMany('Asset', 'unitPembangkit')
  assets!: Asset[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
