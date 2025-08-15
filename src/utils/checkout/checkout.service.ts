import { Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CheckoutService {
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
  }

  // Método original
  async createCheckoutSession(): Promise<Stripe.Checkout.Session> {
    const session = await this.stripe.checkout.sessions.create({
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price: 'price_1MotwRLkdIwHu7ixYcPLm5uZ',
          quantity: 2,
        },
      ],
    });

    return session;
  }

  //Método dinámico que usa DB
  async createDynamicCheckoutSession(createCheckoutDto: CreateCheckoutDto) {
    // 1. Validar que el producto exista en tu DB
    const product = await this.prisma.products.findUnique({
      where: { id: createCheckoutDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!product.stripePriceId) {
      throw new Error('El producto no tiene un Price ID de Stripe configurado');
    }

    // 2. Validar que el usuario exista
    const user = await this.prisma.user.findUnique({
      where: { id: createCheckoutDto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 3. Crear orden en la DB (estado PENDING)
    const totalAmount = product.price * (createCheckoutDto.quantity || 1);

    const order = await this.prisma.order.create({
      data: {
        userId: createCheckoutDto.userId,
        productId: createCheckoutDto.productId,
        quantity: createCheckoutDto.quantity || 1,
        totalAmount: new Prisma.Decimal(totalAmount),
        currency: product.currency,
      },
    });

    // 4. Crear Checkout Session en Stripe
    const session = await this.stripe.checkout.sessions.create({
      success_url:
        createCheckoutDto.successUrl || 'http://localhost:3000/success',
      cancel_url: createCheckoutDto.cancelUrl || 'http://localhost:3000/cancel',
      payment_method_types: ['card'],
      mode: product.mode as Stripe.Checkout.SessionCreateParams.Mode,
      line_items: [
        {
          price: product.stripePriceId!,
          quantity: createCheckoutDto.quantity || 1,
        },
      ],
      metadata: {
        orderId: order.id.toString(),
        userId: createCheckoutDto.userId.toString(),
        productId: createCheckoutDto.productId.toString(),
      },
      customer_email: user.email,
    });

    // 5. Actualizar orden con el session_id de Stripe
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        stripeCheckoutSessionId: session.id,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
      orderId: order.id,
      totalAmount: order.totalAmount.toString(),
      currency: order.currency,
    };
  }

  // Método para obtener el estado de una sesión
  async getCheckoutSession(sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    // Buscar orden relacionada
    const order = await this.prisma.order.findFirst({
      where: { stripeCheckoutSessionId: sessionId },
      include: {
        product: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        payments: true,
      },
    });

    return {
      session,
      order,
    };
  }
}
