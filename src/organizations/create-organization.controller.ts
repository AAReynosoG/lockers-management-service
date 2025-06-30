import {
  Controller,
  Post,
  Body,
  HttpCode, UseGuards,
} from '@nestjs/common';
import { CreateOrganizationService } from './create-organization.service';
import { CreateOrganizationAreaLockerDto } from './dto/create-organization.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../entities/user.entity';
import { CurrentUser } from '../commons/decorators/current-user.decorator';

@Controller('api/organizations')
export class CreateOrganizationController {
  constructor(private readonly organizationService: CreateOrganizationService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @HttpCode(201)
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationAreaLockerDto,
    @CurrentUser() user: User
  ){
    const {name, description, area, locker_serial_number} = createOrganizationDto;

    const data = await this.organizationService.createOrganizationAndArea(name, description, area, locker_serial_number, user);

    if(data) return {
      success: true,
      message: 'Organization created successfully.',
      data: null
    }
  }
}