import { Controller, Get, HttpCode, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetOrganizationsService } from './get-organizations.service';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { PaginationDto } from '../../commons/dto/pagination.dto';

@Controller('api/organizations')
export class GetOrganizationsController {
  constructor(private readonly service: GetOrganizationsService) {}

  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getOrganizations(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user: User
  ) {

    const { page, limit } = paginationDto;

    const data = await this.service.getOrganizations(page, limit, user);

    return {
      success: true,
      message: 'Organizations retrieved successfully',
      data: data
    }
  }
}
