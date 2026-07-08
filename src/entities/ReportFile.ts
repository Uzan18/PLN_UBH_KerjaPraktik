import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { ReportDirectory } from './ReportDirectory';
import type { User } from './User';

@Entity('report_file')
export class ReportFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath!: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize!: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  @Index()
  @Column({ name: 'directory_id', type: 'varchar', length: 36 })
  directoryId!: string;

  @ManyToOne('ReportDirectory', 'files', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'directory_id' })
  directory!: ReportDirectory;

  @Index()
  @Column({ name: 'uploaded_by_id', type: 'varchar', length: 36 })
  uploadedById!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy!: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
