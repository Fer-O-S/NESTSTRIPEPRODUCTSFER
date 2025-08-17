import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client'; // enums del schema

@Injectable()
export class WebhookService {
  private stripe: Stripe;
  private logger = new Logger('WebhookService');

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

  async handleStripeEvent(payload: Buffer, sig: string) {
    if (!sig) {
      throw new Error('No se encontró el header stripe-signature');
    }

    const endpointSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!endpointSecret) {
      throw new Error('No se encontró STRIPE_WEBHOOK_SECRET en .env');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      throw new Error('Webhook signature verification failed');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object);
        break;
      case 'charge.succeeded':
        await this.handleChargeSucceeded(event.data.object);
        break;
    }

    return { received: true };
  }

  // Manejar checkout session completada
  async handleCheckoutSessionCompleted(session: any) {
    const orderId = parseInt(session.metadata?.orderId);
    if (!orderId) return;

    const updatedOrder = await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
        stripePaymentIntentId: session.payment_intent || undefined,
        paymentMethod: session.payment_method_types[0] || 'card',
      },
    });

    const existingPayment = await this.prisma.payments.findFirst({
      where: { orderId },
    });

    if (!existingPayment) {
      const paymentData: any = {
        orderId,
        userId: updatedOrder.userId,
        amount: new Prisma.Decimal(session.amount_total / 100),
        currency: session.currency,
        status: PaymentStatus.SUCCEEDED,
      };
      if (session.payment_intent) {
        paymentData.stripeChargeId = session.payment_intent;
      }
      await this.prisma.payments.create({ data: paymentData });
    }

    if (session.payment_intent) {
      await this.updatePaymentWithReceiptUrl(session.payment_intent, orderId);
    }
  }

  // Manejar payment intent exitoso
  async handlePaymentIntentSucceeded(paymentIntent: any) {
    const order = await this.prisma.orders.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });
    if (!order || order.status === OrderStatus.PAID) return;

    await this.prisma.orders.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
      },
    });

    const existingPayment = await this.prisma.payments.findFirst({
      where: { orderId: order.id },
    });

    const charges = await this.stripe.charges.list({
      payment_intent: paymentIntent.id,
      limit: 1,
    });

    let chargeId: string | undefined;
    let receiptUrl: string | undefined;

    if (charges.data.length > 0) {
      chargeId = charges.data[0].id;
      receiptUrl = charges.data[0].receipt_url || undefined;
    }

    if (existingPayment) {
      const updateData: any = { status: PaymentStatus.SUCCEEDED };
      if (chargeId) updateData.stripeChargeId = chargeId;
      if (receiptUrl) updateData.receiptUrl = receiptUrl;

      await this.prisma.payments.update({
        where: { id: existingPayment.id },
        data: updateData,
      });
      return;
    }

    const createData: any = {
      orderId: order.id,
      userId: order.userId,
      amount: new Prisma.Decimal(paymentIntent.amount_received / 100),
      currency: paymentIntent.currency,
      status: PaymentStatus.SUCCEEDED,
    };
    if (chargeId) createData.stripeChargeId = chargeId;
    if (receiptUrl) createData.receiptUrl = receiptUrl;

    await this.prisma.payments.create({ data: createData });
  }

  async handleChargeSucceeded(charge: any) {
    if (!charge.payment_intent) return;

    let payment = await this.prisma.payments.findFirst({
      where: { stripeChargeId: charge.id },
    });

    if (!payment) {
      const order = await this.prisma.orders.findFirst({
        where: { stripePaymentIntentId: charge.payment_intent },
      });

      if (order) {
        payment = await this.prisma.payments.findFirst({
          where: { orderId: order.id },
        });
      }
    }

    if (payment && charge.receipt_url) {
      const updateData: any = { stripeChargeId: charge.id };
      updateData.receiptUrl = charge.receipt_url;

      await this.prisma.payments.update({
        where: { id: payment.id },
        data: updateData,
      });
    }
  }

  private async updatePaymentWithReceiptUrl(
    paymentIntentId: string,
    orderId: number,
  ) {
    const charges = await this.stripe.charges.list({
      payment_intent: paymentIntentId,
      limit: 1,
    });

    if (charges.data.length > 0) {
      const charge = charges.data[0];
      if (charge.receipt_url) {
        const updateData: any = {
          stripeChargeId: charge.id,
          receiptUrl: charge.receipt_url,
        };
        await this.prisma.payments.updateMany({
          where: { orderId },
          data: updateData,
        });
      }
    }
  }

  // Manejar payment intent fallido
  async handlePaymentIntentFailed(paymentIntent: any) {
    const order = await this.prisma.orders.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });
    if (!order) return;

    await this.prisma.orders.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELED },
    });

    const payment = await this.prisma.payments.findFirst({
      where: { orderId: order.id },
    });

    if (payment) {
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
    }
  }
}
