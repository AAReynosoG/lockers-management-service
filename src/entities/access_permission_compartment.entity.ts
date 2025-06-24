import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AccessPermission } from './access_permission.entity';
import { Compartment } from './compartment.entity';

@Entity('access_permission_compartments')
export class AccessPermissionCompartment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AccessPermission, accessPermission => accessPermission.accessPermissions)
  @JoinColumn({ name: 'access_permission_id' })
  accessPermission: AccessPermission;

  @ManyToOne(() => Compartment, compartment => compartment.accessPermissionCompartments)
  @JoinColumn({ name: 'compartment_id' })
  compartment: Compartment;
}