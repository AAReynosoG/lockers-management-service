import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
  ParseEnumPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UserLockerService } from './user-locker.service';
import { LockerUserRoleEnum } from '../commons/enums/locker-user-role.enum';

@Controller('api')
export class UserLockerController {
  constructor(private readonly service: UserLockerService) {}

  @Get('user-list/:organizationId')
  async getUsersWithLockers(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('page', new DefaultValuePipe(1)) page: number,
    @Query('limit', new DefaultValuePipe(10)) limit: number,
    @Query('role', new ParseEnumPipe(LockerUserRoleEnum, {optional: true})) role?: LockerUserRoleEnum,
  ) {
    const data = await this.service.findUsersByOrganizationWithLockers(organizationId, +page, +limit, role);

    if (!data) {
      throw new NotFoundException({ success: false, message: 'Resource not found', errors: null });
    }

    return {
      success: true,
      message: `Users${role ? ` with role ${role}` : ''} retrieved successfully`,
      data: data
    };
  }
}
// 4
// 1
// user1@test.com
// user