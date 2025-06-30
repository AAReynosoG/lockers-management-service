import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  HttpCode, UseGuards,
} from '@nestjs/common';
import { UserLockerService } from './user-locker.service';
import { PaginationDto } from '../commons/dto/pagination.dto';
import { OrganizationIdParamDto } from './dto/organization-id-param.dto';
import { OptionalRoleDto} from '../commons/dto/role-filter.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('api')
export class UserLockerController {
  constructor(private readonly service: UserLockerService) {}

  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  @Get('user-list/:organizationId')
  async getUsersWithLockers(
    @Param() paramsDto: OrganizationIdParamDto,
    @Query() paginationDto: PaginationDto,
    @Query() roleDto: OptionalRoleDto
  ) {

    const { organizationId } = paramsDto;
    const { page, limit } = paginationDto;
    const { role } = roleDto;

    const data = await this.service.findUsersByOrganizationWithLockers(organizationId, +page, +limit, role);

    if (!data.success) {
      throw new NotFoundException({ success: false, message: 'Resource not found', errors: null });
    }

    return {
      success: true,
      message: `Users${role ? ` with role ${role}` : ''} retrieved successfully`,
      data: data
    };
  }
}