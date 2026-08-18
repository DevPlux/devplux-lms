import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class TestDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @MinLength(3)
    message: string;
}