import { Controller, Get, HttpCode, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { PaginationDto } from '../../commons/dto/pagination.dto';
import { GetLockerCompartmentsService } from './get-locker-compartments.service';

@Controller('api')
export class GetLockerCompartmentsController {
  constructor(private readonly service: GetLockerCompartmentsService) {}

  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  @Get('lockers/:lockerId/compartments')
  async getLockerCompartments(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user: User,
    @Param('lockerId', ParseIntPipe) lockerId: number,
  ){

    const { page, limit } = paginationDto;

    const data = await this.service.getOrganizations(page, limit, lockerId, user)

    return {
      success: true,
      message: 'Compartments retrieved successfully',
      data: data
    }

  }
}