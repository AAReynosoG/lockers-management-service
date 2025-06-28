import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { LockerUserRoleEnum } from '../commons/enums/locker-user-role.enum';

@Injectable()
export class UserLockerService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async findUsersByOrganizationWithLockers(
    organizationId: number,
    page = 1,
    limit = 10,
    role?: LockerUserRoleEnum
  ) {

    const orgExists = await this.organizationRepository.findOne({where: {id: organizationId}});
    if (!orgExists) {
      return {
        success: false,
        message: 'Organization not found'
      }
    }

    const offset = (page - 1) * limit;

    const query = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.lockerRoles', 'role')
      .leftJoinAndSelect('role.locker', 'locker')
      .leftJoinAndSelect('locker.area', 'area')
      .leftJoinAndSelect('area.organization', 'org')
      .where('org.id = :organizationId', { organizationId });

    if (role) {
      query.andWhere('role.role = :role', { role });
    }

    query.orderBy('user.id', 'ASC')
      .skip(offset)
      .take(limit);

    const [users, total] = await query.getManyAndCount();

    const items = users.map(user => ({
      id: user.id,
      name: user.name,
      last_name: user.last_name,
      second_last_name: user.second_last_name,
      email: user.email,
      assigned_lockers: user.lockerRoles.map(role => ({
        serial_number: role.locker.serial_number,
        role: role.role,
        organization: role.locker.area.organization.name,
        area: role.locker.area.name,
        locker_number_in_area: role.locker.locker_number
      }))
    }));

    return {
      success: true,
      items,
      total,
      page,
      limit,
      has_next_page: (page * limit) < total,
      has_previous_page: page > 1
    };
  }
}
