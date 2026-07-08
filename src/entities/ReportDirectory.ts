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
import type { ReportFile } from './ReportFile';

@Entity('report_directory')
export class ReportDirectory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index()
  @Column({ name: 'parent_id', type: 'varchar', length: 36, nullable: true })
  parentId!: string | null;

  @ManyToOne('ReportDirectory', 'children', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent!: ReportDirectory | null;

  @OneToMany('ReportDirectory', 'parent', { cascade: true })
  children!: ReportDirectory[];

  @OneToMany('ReportFile', 'directory', { cascade: true })
  files!: ReportFile[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
