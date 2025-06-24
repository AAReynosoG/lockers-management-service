import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Locker } from './locker.entity';
import { Compartment } from './compartment.entity';

@Entity('locker_user_roles')
export class LockerUserRole {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['super_admin', 'admin', 'user'] })
  role: 'super_admin' | 'admin' | 'user';

  @ManyToOne(() => Locker, locker => locker.lockerUserRoles)
  @JoinColumn({ name: 'locker_id' })
  locker: Locker;

  @ManyToOne(() => User, user => user.lockerRoles)
  @JoinColumn({name: 'user_id'})
  user: User;
}