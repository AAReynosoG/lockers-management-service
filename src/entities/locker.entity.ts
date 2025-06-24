import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Area } from './area.entity';
import { LockerUserRole } from './locker-user-role.entity';
import { Compartment } from './compartment.entity';
import { AccessPermission } from './access_permission.entity';

@Entity('lockers')
export class Locker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  locker_number: number;

  @Column()
  serial_number: string;

  @ManyToOne(() => Area, area => area.lockers, { nullable: true })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @OneToMany(() => LockerUserRole, lur => lur.locker)
  lockerUserRoles: LockerUserRole[];

  @OneToMany(() => Compartment, compartment => compartment.locker)
  lockerCompartments: Compartment[];

  @OneToMany(() => AccessPermission, accessPermission => accessPermission.locker)
  accessPermissions: AccessPermission[];
}
