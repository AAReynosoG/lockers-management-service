import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Locker } from './locker.entity';
import { AccessPermissionCompartment } from './access_permission_compartment.entity';
import { User } from './user.entity';

@Entity('access_permissions')
export class AccessPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  has_fingerprint: boolean;

  @ManyToOne(() => Locker, locker => locker.accessPermissions)
  @JoinColumn({ name: 'locker_id' })
  locker: Locker;

  @OneToMany(() => AccessPermissionCompartment, accessPermissionCompartment => accessPermissionCompartment.accessPermission)
  accessPermissions: AccessPermissionCompartment[];

  @ManyToOne(() => User, user => user.accessPermissions)
  @JoinColumn({ name: 'user_id' })
  user: User;
}