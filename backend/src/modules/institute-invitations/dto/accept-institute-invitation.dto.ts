import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInstituteInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
