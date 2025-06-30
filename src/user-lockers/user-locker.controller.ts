import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode, UseGuards,
} from '@nestjs/common';
import { UserLockerService } from './user-locker.service';
import { PaginationDto } from '../commons/dtos/pagination.dto';
import { OrganizationIdParamDto } from './dto/organization-id-param.dto';
import { OptionalRoleDto} from '../commons/dtos/role-filter.dto';
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

    return {
      success: true,
      message: `Users${role ? ` with role ${role}` : ''} retrieved successfully`,
      data: data
    };
  }
}