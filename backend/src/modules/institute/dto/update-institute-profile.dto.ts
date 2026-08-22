import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateInstituteProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
