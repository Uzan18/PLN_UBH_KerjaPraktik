import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Parameter } from './Parameter.entity';

@Entity('CRITERIA')
export class Criteria {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'number' })
  parameterId!: number;

  @Column({ type: 'float' })
  good!: number;

  @Column({ type: 'float' })
  fair!: number;

  @Column({ type: 'float' })
  poor!: number;

  @Column({ type: 'clob' })
  judgementBasis!: string;

  @Column({ type: 'timestamp' })
  effectiveFrom!: Date;

  @Column({ type: 'timestamp', nullable: true })
  effectiveTo!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Parameter, param => param.criteriaList)
  @JoinColumn({ name: 'parameterId' })
  parameter!: Parameter;
}