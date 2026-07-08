import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Parameter } from './Parameter.entity';
import { EquipmentTestType } from './EquipmentTestType.entity';
import { DamageMechanismTestType } from './DamageMechanismTestType.entity';
import { TestSession } from './TestSession.entity';

@Entity('TEST_TYPE')
export class TestType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar2', length: 100 })
  name: string;

  @Column({ type: 'varchar2', length: 255, nullable: true })
  description: string;

  @Column({ type: 'number', precision: 1, default: 1 })
  isActive: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Parameter, param => param.testType)
  parameters: Parameter[];

  @OneToMany(() => EquipmentTestType, ett => ett.testType)
  equipmentMappings: EquipmentTestType[];

  @OneToMany(() => DamageMechanismTestType, dmtt => dmtt.testType)
  damageMechanismMappings: DamageMechanismTestType[];

  @OneToMany(() => TestSession, session => session.testType)
  testSessions: TestSession[];
}