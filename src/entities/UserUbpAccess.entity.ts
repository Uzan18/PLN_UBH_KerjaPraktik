import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User.entity';
import { Ubp } from './Ubp.entity';

@Entity('USER_UBP_ACCESS')
export class UserUbpAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'number' })
  userId: number;

  @Column({ type: 'number' })
  ubpId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, user => user.ubpAccess)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Ubp, ubp => ubp.userAccess)
  @JoinColumn({ name: 'ubpId' })
  ubp: Ubp;
}