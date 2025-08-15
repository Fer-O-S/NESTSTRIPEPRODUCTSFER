import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @IsInt()
  @ApiProperty({ example: 1 })
  productId: number;

  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1 })
  quantity?: number = 1;

  @IsInt()
  @ApiProperty({ example: 1 })
  userId: number;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
