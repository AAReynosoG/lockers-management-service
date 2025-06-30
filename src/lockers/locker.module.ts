import { Module } from '@nestjs/common';
import { GetLockerCompartmentsService } from './get-locker-compartments/get-locker-compartments.service';
import { GetLockerCompartmentsController } from './get-locker-compartments/get-locker-compartments.controller';
import { Locker } from '../entities/locker.entity';
import { Compartment } from '../entities/compartment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Locker, Compartment])
  ],
  controllers: [GetLockerCompartmentsController],
  providers: [GetLockerCompartmentsService]
})
export class LockerModule {}