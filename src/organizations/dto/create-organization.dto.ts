import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AreaDto {
  @IsString()
  name: string;

  @IsString()
  description: string;
}

export class CreateOrganizationAreaLockerDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @ValidateNested()
  @Type(() => AreaDto)
  area: AreaDto;

  @IsString()
  locker_serial_number: string;
}
