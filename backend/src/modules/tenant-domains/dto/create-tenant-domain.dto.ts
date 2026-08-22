import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateTenantDomainDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
    {
      message: 'hostname must be a valid domain name',
    },
  )
  hostname: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
