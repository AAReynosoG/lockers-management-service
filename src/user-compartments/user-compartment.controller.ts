import {
  Controller,
  Put,
  Param,
  ParseIntPipe,
  NotFoundException,
  Body,
  ParseEnumPipe,
  HttpCode,
} from '@nestjs/common';
import { LockerUserRoleEnum } from '../commons/enums/locker-user-role.enum';
import { UserCompartmentService } from './user-compartment.service';

@Controller('api')
export class UserCompartmentController {

  constructor(private readonly service: UserCompartmentService) {}

  @HttpCode(201)
  @Put('lockers/:lockerId/:compartmentNumber/users')
  async assignUserToCompartment(
    @Param('lockerId', ParseIntPipe) lockerId: number,
    @Param('compartmentNumber', ParseIntPipe) compartmentNumber: number,
    @Body('user_email') userEmail: string,
    @Body('role', new ParseEnumPipe(LockerUserRoleEnum)) role: LockerUserRoleEnum,
  ) {

    const data = await this.service.assignUserToLockerCompartment(lockerId, compartmentNumber, userEmail, role)

    if (!data) {
      throw new NotFoundException({ success: false, message: 'Resource not found', errors: null });
    }

    return {
      success: true,
      message: 'Operation completed successfully',
      data: null
    }

  }

}