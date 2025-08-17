import { Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { CheckoutItemDto } from './dto/checkout.dto';

@Injectable()
export class CheckoutService {
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_API_KEY');
    if (!stripeKey) {
      throw new Error('No se encontró la API Key en .env');
    }
    this.stripe = new Stripe(stripeKey);
  }

  async createCheckoutSession(dto: CheckoutItemDto) {
    // Validar usuario
    const user = await this.prisma.users.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Crear cliente en Stripe si no tiene stripeCustomerId
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const stripeCustomer = await this.stripe.customers.create({
        name: user.name,
        email: user.email,
      });
      stripeCustomerId = stripeCustomer.id;

      // Actualizar el usuario en la base de datos
      await this.prisma.users.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // Validar producto
    const product = await this.prisma.products.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (!product.stripePriceId)
      throw new Error('Producto no tiene Price ID de Stripe');

    // Crear orden en DB
    const quantity = dto.quantity || 1;
    const order = await this.prisma.orders.create({
      data: {
        userId: dto.userId,
        productId: dto.productId,
        quantity,
        totalAmount: product.price * quantity,
        currency: product.currency,
      },
    });

    // Crear sesión de Stripe
    const session = await this.stripe.checkout.sessions.create({
      success_url: dto.successUrl || 'http://localhost:3000/success',
      cancel_url: dto.cancelUrl || 'http://localhost:3000/cancel',
      mode: product.mode as Stripe.Checkout.SessionCreateParams.Mode,
      payment_intent_data: { setup_future_usage: 'on_session' },
      line_items: [
        {
          price: product.stripePriceId,
          quantity,
        },
      ],
      metadata: {
        orderId: order.id.toString(),
        userId: dto.userId.toString(),
        productId: dto.productId.toString(),
      },
      customer: stripeCustomerId,
    });

    // Actualizar orden con el sessionId de Stripe
    await this.prisma.orders.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return {
      sessionId: session.id,
      url: session.url,
      orderId: order.id,
      totalAmount: order.totalAmount,
      currency: order.currency,
    };
  }

  // Método para obtener el estado de la sesión
  async getCheckoutSession(sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    const order = await this.prisma.orders.findFirst({
      where: { stripeCheckoutSessionId: sessionId },
      include: {
        product: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');

    return { session, order };
  }
}
