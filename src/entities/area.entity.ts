import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Locker } from './locker.entity';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Organization, org => org.areas)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Locker, locker => locker.area)
  lockers: Locker[];
}
