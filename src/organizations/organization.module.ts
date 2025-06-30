import { Module } from '@nestjs/common';
import { CreateOrganizationController } from './create-organization/create-organization.controller';
import { Locker } from '../entities/locker.entity';
import { Organization } from '../entities/organization.entity';
import { Area } from '../entities/area.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateOrganizationService } from './create-organization/create-organization.service';
import { User } from '../entities/user.entity';
import { GetOrganizationsController } from './get-organizations/get-organizations.controller';
import { GetOrganizationsService } from './get-organizations/get-organizations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Locker, Organization, Area, User
    ])
  ],
  controllers: [CreateOrganizationController, GetOrganizationsController],
  providers: [CreateOrganizationService, GetOrganizationsService]
})
export class OrganizationModule {}