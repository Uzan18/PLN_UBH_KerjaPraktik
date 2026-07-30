import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Parameter } from './Parameter';
import type { Asset } from './Asset';
import type { JenisAsset } from './JenisAsset';

@Entity('test_type')
export class TestType {
  // @ts-expect-error - Override Function.name for TypeORM metadata resolution in Next.js SWC bundler
  static get name() { return 'TestType'; }

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'jenis_asset_id', type: 'varchar', length: 255, nullable: true })
  jenisAssetId!: string | null;

  @ManyToOne('JenisAsset', 'testTypes', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'jenis_asset_id' })
  jenisAsset?: JenisAsset | null;

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
