import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TestType } from './TestType.entity';

@Entity('EQUIPMENT_TEST_TYPE')
export class EquipmentTestType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar2', length: 100 })
  equipmentType: string;

  @Column({ type: 'number' })
  testTypeId: number;

  @Column({ type: 'number', precision: 1, default: 0 })
  isMandatory: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => TestType, type => type.equipmentMappings)
  @JoinColumn({ name: 'testTypeId' })
  testType: TestType;
}