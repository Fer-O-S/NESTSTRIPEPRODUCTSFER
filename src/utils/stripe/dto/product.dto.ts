import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Playera negra' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Descripción del producto', required: false })
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 200.0 })
  price: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'mxn' })
  currency: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 500, required: false })
  stock?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'https://imagendelproducto.com', required: false })
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'payment' })
  mode: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, required: false })
  active?: boolean;
}
