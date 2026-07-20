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
  ManyToMany,
  JoinTable,
} from 'typeorm';
import type { UnitPembangkit } from './UnitPembangkit';
import type { JenisAsset } from './JenisAsset';
import type { TestSession } from './TestSession';
import type { TestType } from './TestType';

@Entity('asset')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'unit_pembangkit_id', type: 'varchar', length: 36 })
  unitPembangkitId!: string;

  @ManyToOne('UnitPembangkit', 'assets')
  @JoinColumn({ name: 'unit_pembangkit_id' })
  unitPembangkit!: UnitPembangkit;

  @Column({ type: 'varchar', length: 500 })
  name!: string;

  @Index()
  @Column({ name: 'jenis_asset_id', type: 'varchar', length: 36 })
  jenisAssetId!: string;

  @ManyToOne('JenisAsset', 'assets')
  @JoinColumn({ name: 'jenis_asset_id' })
  jenisAsset!: JenisAsset;

  @Column({ name: 'mfg_year', type: 'int', nullable: true })
  mfgYear!: number | null;

  @Column({ name: 'vector_group', type: 'varchar', length: 100, nullable: true })
  vectorGroup!: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 255, nullable: true })
  serialNumber!: string | null;

  @Column({ name: 'manufacture', type: 'varchar', length: 255, nullable: true })
  manufacture!: string | null;

  @Column({ name: 'type', type: 'varchar', length: 255, nullable: true })
  type!: string | null;

  @Column({ name: 'cooling_method', type: 'varchar', length: 100, nullable: true })
  coolingMethod!: string | null;

  @Column({ name: 'rated_power', type: 'varchar', length: 100, nullable: true })
  ratedPower!: string | null;

  @Column({ name: 'frequency', type: 'varchar', length: 100, nullable: true })
  frequency!: string | null;

  @Column({ name: 'hv_side', type: 'varchar', length: 100, nullable: true })
  hvSide!: string | null;

  @Column({ name: 'hv_rated_current', type: 'varchar', length: 100, nullable: true })
  hvRatedCurrent!: string | null;

  @Column({ name: 'lv_side', type: 'varchar', length: 100, nullable: true })
  lvSide!: string | null;

  @Column({ name: 'lv_rated_current', type: 'varchar', length: 100, nullable: true })
  lvRatedCurrent!: string | null;

  @Column({ name: 'custom_metadata', type: 'varchar', length: 4000, nullable: true })
  customMetadata!: string | null;

  @OneToMany('TestSession', 'asset')
  testSessions!: TestSession[];

  @ManyToMany('TestType', 'assets', { cascade: true })
  @JoinTable({
    name: 'asset_test_type',
    joinColumn: { name: 'asset_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'test_type_id', referencedColumnName: 'id' },
  })
  testTypes!: TestType[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
