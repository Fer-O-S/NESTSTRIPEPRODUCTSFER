import {
  Controller,
  Post,
  Body,
  Headers,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import Stripe from 'stripe';

@Controller('stripe')
export class WebhookController {
  private stripe: Stripe;

  constructor(
    private readonly webhookService: WebhookService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_API_KEY');
    if (!stripeKey) throw new Error('Stripe API key is missing');
    this.stripe = new Stripe(stripeKey);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() rawBody: Buffer,
  ) {
    const endpointSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!signature)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    if (!endpointSecret)
      throw new HttpException(
        'Webhook secret not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret,
      );
    } catch {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Manejar eventos
    switch (event.type) {
      case 'checkout.session.completed':
        await this.webhookService.handleCheckoutSessionCompleted(
          event.data.object,
        );
        break;
      case 'payment_intent.succeeded':
        await this.webhookService.handlePaymentIntentSucceeded(
          event.data.object,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.webhookService.handlePaymentIntentFailed(event.data.object);
        break;
    }

    return { received: true };
  }
}
