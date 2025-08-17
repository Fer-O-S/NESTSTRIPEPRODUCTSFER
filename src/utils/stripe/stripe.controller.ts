import { Controller, Post, Body, Get } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { ProductDto } from './dto/product.dto';

@Controller('stripe')
export class StripeController {
  constructor(private stripeService: StripeService) {}

  @Post('/createProduct')
  async createProduct(@Body() productDto: ProductDto) {
    return await this.stripeService.createProduct(productDto);
  }

  @Get('/stripeProducts')
  async getProductsStripe() {
    return await this.stripeService.getProductsStripe();
  }

  @Get('dbProducts')
  async getProductsDB() {
    return await this.stripeService.getProductsDB();
  }
}
