import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class WebhookService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_API_KEY');
    if (!stripeKey) throw new Error('Stripe API key is missing');
    this.stripe = new Stripe(stripeKey);
  }

  async processWebhook(rawBody: Buffer, signature: string) {
    const endpointSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!endpointSecret) throw new Error('Webhook secret not configured');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret,
      );
    } catch {
      throw new Error('Invalid signature');
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
  }

  async handleCheckoutSessionCompleted(session: any) {
    const orderId = parseInt(session.metadata?.orderId);
    if (!orderId) return;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
        stripePaymentIntentId: session.payment_intent || undefined,
        paymentMethod: session.payment_method_types[0] || 'card',
      },
    });

    const existingPayment = await this.prisma.payment.findFirst({
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
      await this.prisma.payment.create({ data: paymentData });
    }

    if (session.payment_intent) {
      await this.updatePaymentWithReceiptUrl(session.payment_intent, orderId);
    }
  }

  async handlePaymentIntentSucceeded(paymentIntent: any) {
    const order = await this.prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });
    if (!order || order.status === OrderStatus.PAID) return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
      },
    });

    const existingPayment = await this.prisma.payment.findFirst({
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

      await this.prisma.payment.update({
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

    await this.prisma.payment.create({ data: createData });
  }

  async handleChargeSucceeded(charge: any) {
    if (!charge.payment_intent) return;

    let payment = await this.prisma.payment.findFirst({
      where: { stripeChargeId: charge.id },
    });

    if (!payment) {
      const order = await this.prisma.order.findFirst({
        where: { stripePaymentIntentId: charge.payment_intent },
      });

      if (order) {
        payment = await this.prisma.payment.findFirst({
          where: { orderId: order.id },
        });
      }
    }

    if (payment && charge.receipt_url) {
      const updateData: any = { stripeChargeId: charge.id };
      updateData.receiptUrl = charge.receipt_url;

      await this.prisma.payment.update({
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
        await this.prisma.payment.updateMany({
          where: { orderId },
          data: updateData,
        });
      }
    }
  }

  async handlePaymentIntentFailed(paymentIntent: any) {
    const order = await this.prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });
    if (!order) return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELED },
    });

    const payment = await this.prisma.payment.findFirst({
      where: { orderId: order.id },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
    }
  }
}
