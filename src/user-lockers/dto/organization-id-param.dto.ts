import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
export class OrganizationIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organizationId: number = 1;
}