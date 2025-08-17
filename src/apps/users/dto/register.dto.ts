import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(15)
  @ApiProperty({ example: 'Eduardo' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @IsEmail()
  @ApiProperty({ example: 'eduardo18@gmail.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({ example: 'SecurePassword#123.' })
  password: string;
}
