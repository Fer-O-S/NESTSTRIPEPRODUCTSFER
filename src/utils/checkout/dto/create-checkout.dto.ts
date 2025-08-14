import { IsInt, IsOptional, Min, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @IsInt()
  userId: number;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
