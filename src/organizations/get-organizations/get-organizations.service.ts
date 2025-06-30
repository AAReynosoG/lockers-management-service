import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '../../entities/organization.entity';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class GetOrganizationsService {

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async getOrganizations(
    page = 1,
    limit = 10,
    user: User
  ) {

    const userId = user.id;

    const offset = (page - 1) * limit;

    const query = this.organizationRepository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.areas', 'area')
      .where('org.created_by = :userId', { userId })
      .orderBy('org.id', 'ASC')
      .skip(offset)
      .take(limit);

    const [organizations, total] = await query.getManyAndCount();

    const items = organizations.map(org => ({
      id: org.id,
      created_by: userId,
      name: org.name,
      description: org.description,
      areas: org.areas.map(area => ({
        id: area.id,
        name: area.name,
        description: area.description
      }))
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