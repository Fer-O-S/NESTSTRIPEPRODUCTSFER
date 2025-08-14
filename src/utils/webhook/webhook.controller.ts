import {
  Controller,
  Post,
  Body,
  Headers,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('stripe')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() rawBody: Buffer,
  ) {
    if (!signature) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    try {
      await this.webhookService.processWebhook(rawBody, signature);
      return { received: true };
    } catch (error) {
      if (error.message === 'Invalid signature') {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
      if (error.message === 'Webhook secret not configured') {
        throw new HttpException(
          'Webhook secret not configured',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }
}