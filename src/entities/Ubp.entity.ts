import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserUbpAccess } from './UserUbpAccess.entity';
import { Asset } from './Asset.entity';

@Entity('UBP')
export class Ubp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar2', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar2', length: 255, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UserUbpAccess, access => access.ubp)
  userAccess: UserUbpAccess[];

  @OneToMany(() => Asset, asset => asset.ubp)
  assets: Asset[];
}