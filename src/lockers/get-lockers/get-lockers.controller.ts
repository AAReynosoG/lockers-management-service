import { Controller, Get, HttpCode, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetLockersService } from './get-lockers.service';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { PaginationDto } from '../../commons/dtos/pagination.dto';

@Controller('api/lockers')
export class GetLockersController {

  constructor(private service: GetLockersService) {}

  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getLockers(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user: User) {

    const { page, limit } = paginationDto;

    const data = await this.service.getLockers(page, limit, user)

    return {
      success: true,
      message: 'Lockers retrieved successfully',
      data: data
    };
  }

}