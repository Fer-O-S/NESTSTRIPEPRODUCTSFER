import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'eduardo18@gmail.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'SecurePassword#123.' })
  password: string;
}
