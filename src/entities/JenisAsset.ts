import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import type { Asset } from './Asset';
import type { TestType } from './TestType';

@Entity('jenis_asset')
@Unique(['category', 'name'])
export class JenisAsset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, default: 'Trafo' })
  category!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'info_fields', type: 'varchar', length: 1000, nullable: true })
  infoFields!: string | null;

  @OneToMany('Asset', 'jenisAsset')
  assets!: Asset[];

  @OneToMany('TestType', 'jenisAsset')
  testTypes!: TestType[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
