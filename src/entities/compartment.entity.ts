import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Locker } from './locker.entity';
import { AccessPermissionCompartment } from './access_permission_compartment.entity';

@Entity('compartments')
export class Compartment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({type: 'smallint', unsigned: true})
  compartment_number: number;

  @Column({type: 'enum', enum: ['open','closed','error','maintenance']})
  status: 'open' | 'closed' | 'error' | 'maintenance';

  @ManyToOne(() => Locker, locker => locker.lockerCompartments)
  @JoinColumn({ name: 'locker_id'})
  locker: Locker;

  @OneToMany(() => AccessPermissionCompartment, accessPermissionCompartment => accessPermissionCompartment.compartment)
  accessPermissionCompartments: AccessPermissionCompartment[];
}