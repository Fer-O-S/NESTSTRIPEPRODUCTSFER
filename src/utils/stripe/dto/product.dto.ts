import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

//Cada producto/plan tiene los stripeProductId y stripePriceId que se generan al sincronizar con Stripe.
export class ProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Playera negra' })
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: '200.00' }) //200 pesos mexicanos
  price: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'mxn' })
  currency: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'payment' })
  mode: string;
}
