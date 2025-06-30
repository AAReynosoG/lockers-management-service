import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, ManyToOne } from 'typeorm';
import { Area } from './area.entity';
import { User } from './user.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;


  @ManyToOne(() => User, user => user.organizations)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => Area, area => area.organization)
  areas: Area[];
}
