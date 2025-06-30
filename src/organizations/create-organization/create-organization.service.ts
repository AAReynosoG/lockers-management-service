import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '../../entities/organization.entity';
import { Area } from '../../entities/area.entity';
import { Repository } from 'typeorm';
import { Locker } from '../../entities/locker.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class CreateOrganizationService {
  constructor(
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
  ){

    let organization = await this.organizationRepository.findOneBy({name})

    if(organization){
      throw new ConflictException({
        success: false,
        message: `Organization ${name} already exists`,
        errors: null
      })
    }

    organization = this.organizationRepository.create({
      name,
      description,
      createdBy: user
    })

    await this.organizationRepository.save(organization);

    let area = await this.areasRepository.findOne({
      where: {
        name: areaObj.name,
        organization: organization
      }
    })

    if(area) {
      throw new ConflictException({
        success: false,
        message: `Area ${areaObj.name} already exists`,
        errors: null
      })
    }

    area = this.areasRepository.create({
      name: areaObj.name,
      description: areaObj.description,
      organization: organization
    })

    await this.areasRepository.save(area);

    const locker = await this.lockerRepository.findOne({
      where: { serial_number: locker_serial_number },
      relations: ['area']
    });

    if(!locker) {
      throw new NotFoundException({
        success: false,
        message: `Locker ${locker_serial_number} not found`,
        errors: null
      })
    }

    if(locker.area != null) {
      console.log('DEBUG')
      throw new ConflictException({
        success: false,
        message: `The locker with serial number ${locker_serial_number} is already linked to an organization and area`,
        errors: null
      })
    }

    const count = await this.lockerRepository.count({
      where: { area: { id: area.id } },
    });

    locker.area = area;
    locker.locker_number = count + 1;
    await this.lockerRepository.save(locker);

    return null;
  }

}