import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '../../entities/organization.entity';
import { Area } from '../../entities/area.entity';
import { Repository } from 'typeorm';
import { Locker } from '../../entities/locker.entity';
import { User } from '../../entities/user.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class CreateOrganizationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Area)
    private readonly areasRepository: Repository<Area>,
    @InjectRepository(Locker)
    private readonly lockerRepository: Repository<Locker>,
  ){}

  async createOrganizationAndArea(
    name: string,
    description: string,
    areaObj: {name: string, description: string},
    locker_serial_number: string,
    user: User
  ) {
    return await this.dataSource.transaction(async manager => {
      const orgRepo = manager.getRepository(Organization);
      const areaRepo = manager.getRepository(Area);
      const lockerRepo = manager.getRepository(Locker);

      const existingOrg = await orgRepo.findOneBy({ name });

      if (existingOrg) {
        throw new ConflictException({
          success: false,
          message: `Organization ${name} already exists`,
          errors: null
        });
      }

      const organization = orgRepo.create({
        name,
        description,
        createdBy: user
      });

      await orgRepo.save(organization);

      const existingArea = await areaRepo.findOne({
        where: {
          name: areaObj.name,
          organization: organization
        }
      });

      if (existingArea) {
        throw new ConflictException({
          success: false,
          message: `Area ${areaObj.name} already exists`,
          errors: null
        });
      }

      const area = areaRepo.create({
        name: areaObj.name,
        description: areaObj.description,
        organization
      });

      await areaRepo.save(area);

      const locker = await lockerRepo.findOne({
        where: { serial_number: locker_serial_number },
        relations: ['area']
      });

      if (!locker) {
        throw new NotFoundException({
          success: false,
          message: `Locker ${locker_serial_number} not found`,
          errors: null
        });
      }

      if (locker.area != null) {
        throw new ConflictException({
          success: false,
          message: `The locker with serial number ${locker_serial_number} is already linked to an organization and area`,
          errors: null
        });
      }

      const count = await lockerRepo.count({
        where: { area: { id: area.id } },
      });

      locker.area = area;
      locker.locker_number = count + 1;
      await lockerRepo.save(locker);

      return null;
    });
  }
}