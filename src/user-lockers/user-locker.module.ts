import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLockerController } from './user-locker.controller';
import { UserLockerService } from './user-locker.service';
import { User } from '../entities/user.entity';
import { LockerUserRole } from '../entities/locker-user-role.entity';
import { Locker } from '../entities/locker.entity';
import { Area } from '../entities/area.entity';
import { Organization } from '../entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, LockerUserRole, Locker, Area, Organization])
  ],
  controllers: [UserLockerController],
  providers: [UserLockerService]
})
export class UserLockerModule {}