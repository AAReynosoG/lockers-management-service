import { Module } from '@nestjs/common';
import { GetLockerCompartmentsService } from './get-locker-compartments/get-locker-compartments.service';
import { GetLockerCompartmentsController } from './get-locker-compartments/get-locker-compartments.controller';
import { Locker } from '../entities/locker.entity';
import { Compartment } from '../entities/compartment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetLockersController } from './get-lockers/get-lockers.controller';
import { GetLockersService } from './get-lockers/get-lockers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Locker, Compartment])
  ],
  controllers: [GetLockerCompartmentsController, GetLockersController],
  providers: [GetLockerCompartmentsService, GetLockersService],
})
export class LockerModule {}