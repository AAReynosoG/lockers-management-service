import {
  Controller,
  Put,
  Param,
  Body,
  HttpCode, UseGuards,
} from '@nestjs/common';
import { UserCompartmentService } from './user-compartment.service';
import { UserToCompartmentBodyDto, UserToCompartmentRouteDto } from './dto/user-to-compartment.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('api')
export class UserCompartmentController {

  constructor(private readonly service: UserCompartmentService) {}

  @UseGuards(AuthGuard('jwt'))
  @HttpCode(201)
  @Put('lockers/:lockerId/:compartmentNumber/users')
  async assignUserToCompartment(
    @Param() userToCompartmentRouteDto: UserToCompartmentRouteDto,
    @Body() userToCompartmentBodyDto: UserToCompartmentBodyDto
  ) {

    const { lockerId, compartmentNumber } = userToCompartmentRouteDto;
    const { role, user_email } = userToCompartmentBodyDto;

    const data = await this.service.assignUserToLockerCompartment(lockerId, compartmentNumber, user_email, role)

    return {
      success: true,
      message: `Operation completed successfully`,
      data: data
    }

  }

}