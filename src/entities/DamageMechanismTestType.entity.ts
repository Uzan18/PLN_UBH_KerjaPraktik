import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DamageMechanism } from './DamageMechanism.entity';
import { TestType } from './TestType.entity';

@Entity('DM_TEST_TYPE')
export class DamageMechanismTestType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'number' })
  damageMechanismId: number;

  @Column({ type: 'number' })
  testTypeId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => DamageMechanism, dm => dm.testTypeMappings)
  @JoinColumn({ name: 'damageMechanismId' })
  damageMechanism: DamageMechanism;

  @ManyToOne(() => TestType, type => type.damageMechanismMappings)
  @JoinColumn({ name: 'testTypeId' })
  testType: TestType;
}