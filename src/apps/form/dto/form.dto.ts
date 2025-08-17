import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FormDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Eduardo' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'eduardo18@gmail.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ example: 'Contenido del mensaje...' })
  message: string;
}
