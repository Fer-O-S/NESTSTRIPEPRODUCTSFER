import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_API_KEY');

    if (!stripeKey) {
      throw new Error('No se encontró la apikey en .env');
    }
    this.stripe = new Stripe(stripeKey);
  } //constructor

  async createProduct(productDto: ProductDto) {
    const stripeProduct = await this.stripe.products.create({
      name: productDto.name,
      description: productDto.description || undefined,
      images: productDto.imageUrl ? [productDto.imageUrl] : undefined,
    });

    const price = await this.stripe.prices.create({
      currency: productDto.currency,
      unit_amount: productDto.price * 100, //según usa centavos
      product: stripeProduct.id,
    });

    const product = await this.prisma.products.create({
      data: {
        name: productDto.name,
        description: productDto.description,
        price: productDto.price,
        currency: productDto.currency,
        stock: productDto.stock ?? 0,
        imageUrl: productDto.imageUrl,
        stripeProductId: stripeProduct.id,
        stripePriceId: price.id,
        mode: productDto.mode,
        active: productDto.active ?? true,
      },
    });

    return product;
  } //createProduct

  async getProductsStripe() {
    const products = await this.stripe.products.list();
    return products;
  } //getProductsStripe

  async getProductsDB() {
    const productsDB = await this.prisma.products.findMany();
    return productsDB;
  } //getProductsDB
} //class
