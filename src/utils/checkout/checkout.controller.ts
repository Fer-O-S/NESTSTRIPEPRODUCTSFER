import { Controller, Post, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('/createPayment')
  async createDynamicSession(@Body() createCheckoutDto: CreateCheckoutDto) {
    try {
      const session =
        await this.checkoutService.createDynamicCheckoutSession(
          createCheckoutDto,
        );

      return {
        success: true,
        data: session,
        message: 'Sesión de checkout creada exitosamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al crear la sesión de checkout',
      };
    }
  }
}
