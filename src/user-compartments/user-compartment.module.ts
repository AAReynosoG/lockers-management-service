import { Module } from '@nestjs/common';
import { UserCompartmentController } from './user-compartment.controller';
import { UserCompartmentService } from './user-compartment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessPermissionCompartment } from '../entities/access_permission_compartment.entity';
import { Locker } from '../entities/locker.entity';
import { Compartment } from '../entities/compartment.entity';
import { User } from '../entities/user.entity';
import { LockerUserRole } from '../entities/locker-user-role.entity';
import { AccessPermission } from '../entities/access_permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Locker, Compartment, User, LockerUserRole, AccessPermission, AccessPermissionCompartment]),
  ],
  controllers: [UserCompartmentController],
  providers: [UserCompartmentService],
})
export class UserCompartmentModule {}