import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { LockerUserRole } from './locker-user-role.entity';
import { AccessPermission } from './access_permission.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  last_name: string;

  @Column()
  second_last_name: string;

  @Column()
  email: string;

  @OneToMany(() => LockerUserRole, lur => lur.user)
  lockerRoles: LockerUserRole[];

  @OneToMany(() => AccessPermission, accessPermission => accessPermission.user)
  accessPermissions: AccessPermission[];
}