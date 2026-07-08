import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DamageMechanismTestType } from './DamageMechanismTestType.entity';

@Entity('DAMAGE_MECHANISM')
export class DamageMechanism {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar2', length: 100 })
  name: string;

  @Column({ type: 'varchar2', length: 255, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => DamageMechanismTestType, dmtt => dmtt.damageMechanism)
  testTypeMappings: DamageMechanismTestType[];
}