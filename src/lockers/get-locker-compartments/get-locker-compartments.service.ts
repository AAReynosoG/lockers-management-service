import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Compartment } from '../../entities/compartment.entity';
import { Locker } from '../../entities/locker.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class GetLockerCompartmentsService {

  constructor(
    @InjectRepository(Compartment)
    private readonly compartmentRepository: Repository<Compartment>,
    @InjectRepository(Locker)
    private readonly lockerRepository: Repository<Locker>,
  ){}

  async getOrganizations(
    page = 1,
    limit = 10,
    lockerId: number,
    user: User
  ){

    const offset = (page - 1) * limit;

    const locker = await this.lockerRepository
      .createQueryBuilder('locker')
      .leftJoinAndSelect('locker.lockerUserRoles', 'lur')
      .where('locker.id = :lockerId', { lockerId })
      .andWhere('lur.user_id = :userId', { userId: user.id })
      .andWhere('lur.role IN (:...roles)', { roles: ['admin', 'super_admin'] })
      .getOne();

    if (!locker) {
      throw new ForbiddenException({
        success: false,
        message: `You do not have access to locker ${lockerId}`,
        errors: null
      });
    }

    const [compartments, total] = await this.compartmentRepository
      .createQueryBuilder('compartment')
      .leftJoinAndSelect('compartment.accessPermissionCompartments', 'apc')
      .leftJoinAndSelect('apc.accessPermission', 'ap')
      .leftJoinAndSelect('ap.user', 'user')
      .leftJoinAndSelect('ap.locker', 'locker')
      .leftJoinAndSelect('locker.lockerUserRoles', 'lur')
      .leftJoinAndSelect('lur.user', 'lur_u')
      .where('compartment.locker_id = :lockerId', { lockerId })
      .orderBy('compartment.id', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const items = compartments.map(comp => {
      const usersMap = new Map<number, {
        id: number,
        name: string,
        last_name: string,
        second_last_name: string,
        email: string,
        role: string
      }>();

      for (const apc of comp.accessPermissionCompartments) {
        const ap = apc.accessPermission;
        const u = ap.user;

        const lur = ap.locker.lockerUserRoles.find(l => l.user.id === u.id);

        usersMap.set(u.id, {
          id: u.id,
          name: u.name,
          last_name: u.last_name,
          second_last_name: u.second_last_name,
          email: u.email,
          role: lur?.role ?? 'user'
        });
      }

      return {
        id: comp.id,
        compartment_number: comp.compartment_number,
        status: comp.status,
        users: Array.from(usersMap.values())
      };
    });

    return {
      items,
      total,
      page,
      limit,
      has_next_page: offset + items.length < total,
      has_previous_page: page > 1
    };
  }
}