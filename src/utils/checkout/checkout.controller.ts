import { Controller, Post, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutItemDto } from './dto/checkout.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('/createPayment')
  async createPayment(@Body() dto: CheckoutItemDto) {
    try {
      const session = await this.checkoutService.createCheckoutSession(dto);

      return {
        success: true,
        message: 'Sesión de checkout creada exitosamente',
        data: session,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al crear la sesión de checkout',
        error: error instanceof Error ? error.message : error,
      };
    }
  }
}
