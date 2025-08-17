import { IsString, IsInt, Min, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutItemDto {
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 1 })
  userId: number;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty({ example: 1 })
  productId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @ApiProperty({ example: 1 })
  quantity: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'https://miapp.com/success' })
  successUrl?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'https://miapp.com/cancel' })
  cancelUrl?: string;
}
