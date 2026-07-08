import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Parameter } from './Parameter';

@Entity('criteria')
export class Criteria {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'parameter_id', type: 'varchar', length: 36 })
  parameterId!: string;

  @ManyToOne('Parameter', 'criteria')
  @JoinColumn({ name: 'parameter_id' })
  parameter!: Parameter;

  @Column({ name: 'good_value', type: 'varchar', length: 255, nullable: true })
  goodValue!: string | null;

  @Column({ name: 'fair_value', type: 'varchar', length: 255, nullable: true })
  fairValue!: string | null;

  @Column({ name: 'poor_value', type: 'varchar', length: 255, nullable: true })
  poorValue!: string | null;

  @Column({ name: 'bad_value', type: 'varchar', length: 255, nullable: true })
  badValue!: string | null;

  @Index()
  @Column({ name: 'effective_from', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamp', nullable: true })
  effectiveTo!: Date | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36 })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
