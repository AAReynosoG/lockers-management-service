import {
  Controller,
  Put,
  Param,
  NotFoundException,
  Body,
  HttpCode,
} from '@nestjs/common';
import { UserCompartmentService } from './user-compartment.service';
import { UserToCompartmentBodyDto, UserToCompartmentRouteDto } from './dto/user-to-compartment.dto';

@Controller('api')
export class UserCompartmentController {

  constructor(private readonly service: UserCompartmentService) {}

  @HttpCode(201)
  @Put('lockers/:lockerId/:compartmentNumber/users')
  async assignUserToCompartment(
    @Param() userToCompartmentRouteDto: UserToCompartmentRouteDto,
    @Body() userToCompartmentBodyDto: UserToCompartmentBodyDto
  ) {

    const { lockerId, compartmentNumber } = userToCompartmentRouteDto;
    const { role, user_email } = userToCompartmentBodyDto;

    const data = await this.service.assignUserToLockerCompartment(lockerId, compartmentNumber, user_email, role)

    if (!data.success) {
      throw new NotFoundException({ success: false, message: data.message, errors: null });
    }

    return {
      success: true,
      message: data.message,
      data: null
    }

  }

}