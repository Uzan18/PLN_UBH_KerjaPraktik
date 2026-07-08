import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Ubp } from './Ubp.entity';
import { TestSession } from './TestSession.entity';

@Entity('ASSET')
export class Asset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'number' })
  ubpId: number;

  @Column({ type: 'varchar2', length: 100 })
  name: string;

  @Column({ type: 'varchar2', length: 100 })
  equipmentType: string; // e.g. 'Main Trafo', 'Arrester'

  @Column({ type: 'clob', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Ubp, ubp => ubp.assets)
  @JoinColumn({ name: 'ubpId' })
  ubp: Ubp;

  @OneToMany(() => TestSession, session => session.asset)
  testSessions: TestSession[];
}