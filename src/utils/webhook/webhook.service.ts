import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class WebhookService {
  constructor(private prisma: PrismaService) {}

  // Manejar checkout session completada
  async handleCheckoutSessionCompleted(session: any) {
    const orderId = parseInt(session.metadata?.orderId);
    if (!orderId) return;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
        stripePaymentIntentId: session.payment_intent,
        paymentMethod: session.payment_method_types[0] || 'card',
      },
    });

    await this.prisma.payment.create({
      data: {
        orderId,
        userId: updatedOrder.userId,
        amount: session.amount_total / 100,
        currency: session.currency,
        status: PaymentStatus.SUCCEEDED,
        stripeChargeId: session.payment_intent,
      },
    });
  }

  // Manejar payment intent exitoso
  async handlePaymentIntentSucceeded(paymentIntent: any) {
    const order = await this.prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });
    if (!order) return;
    if (order.status === OrderStatus.PAID) return;

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

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          stripeChargeId: paymentIntent.charges?.data[0]?.id,
          receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
        },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          amount: paymentIntent.amount_received / 100,
          currency: paymentIntent.currency,
          status: PaymentStatus.SUCCEEDED,
          stripeChargeId: paymentIntent.charges?.data[0]?.id,
          receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
        },
      });
    }
  }

  // Manejar payment intent fallido
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
