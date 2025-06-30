import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Locker } from '../../entities/locker.entity';

@Injectable()
export class GetLockersService {

  constructor(
    @InjectRepository(Locker)
    private readonly LockerRepository: Repository<Locker>,
  ){}

  async getLockers(
    page = 1,
    limit = 10,
    user: User
  ) {

    const userId = user.id;

    const offset = (page - 1) * limit;

    const query = this.LockerRepository
      .createQueryBuilder('lockers')
      .leftJoinAndSelect('lockers.area', 'l_area')
      .leftJoinAndSelect('l_area.organization', 'a_org')
      .where('a_org.created_by = :userId', { userId })
      .orderBy('lockers.id', 'ASC')
      .skip(offset)
      .take(limit);

    const [lockers, total] = await query.getManyAndCount();

    const items = lockers.map(locker => ({
      id: locker.id,
      locker_number: locker.locker_number,
      area_id: locker.area.id,
      area_name: locker.area.name,
      organization_id: locker.area.organization.id,
      organization_name: locker.area?.organization.name,
    }));

    return {
      items,
      total,
      page,
      limit,
      has_next_page: (page * limit) < total,
      has_previous_page: page > 1
    }

  }

}