import { Module } from '@nestjs/common';
import { CreateOrganizationController } from './create-organization.controller';
import { Locker } from '../entities/locker.entity';
import { Organization } from '../entities/organization.entity';
import { Area } from '../entities/area.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateOrganizationService } from './create-organization.service';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Locker, Organization, Area, User
    ])
  ],
  controllers: [CreateOrganizationController],
  providers: [CreateOrganizationService]
})
export class OrganizationModule {}