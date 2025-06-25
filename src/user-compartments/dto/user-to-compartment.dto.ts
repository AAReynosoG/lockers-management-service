import { IsEmail, IsEnum, IsInt } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LockerUserRoleEnum } from '../../commons/enums/locker-user-role.enum';

export class UserToCompartmentBodyDto {
  @IsEmail()
  user_email: string;

  @IsEnum(LockerUserRoleEnum, {
    message: 'role must be a valid value: ' + Object.values(LockerUserRoleEnum).join(', '),
  })
  role: LockerUserRoleEnum;
}

export class UserToCompartmentRouteDto {
  @Type(() => Number)
  @IsInt()
  lockerId: number;

  @Type(() => Number)
  @IsInt()
  compartmentNumber: number;
}