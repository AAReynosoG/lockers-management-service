import { IsOptional, IsEnum } from 'class-validator';
import { LockerUserRoleEnum } from '../enums/locker-user-role.enum';

export class RoleDto {
  @IsEnum(LockerUserRoleEnum, {
    message: 'role must be a valid value: ' + Object.values(LockerUserRoleEnum).join(', '),
  })
  role: LockerUserRoleEnum;
}

export class OptionalRoleDto {
  @IsOptional()
  @IsEnum(LockerUserRoleEnum, {
    message: 'role must be a valid value: ' + Object.values(LockerUserRoleEnum).join(', '),
  })
  role?: LockerUserRoleEnum;
}