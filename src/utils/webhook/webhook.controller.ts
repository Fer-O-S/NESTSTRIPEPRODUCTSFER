import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Request, Response } from 'express';

@Controller('webhook')
export class WebhookController {
  private logger = new Logger('WebhookController');

  constructor(private webhookService: WebhookService) {}

  @Post()
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      // Stripe necesita el body como Buffer
      const buf = req.body; // IMPORTANTE: debe estar raw
      const sig = req.headers['stripe-signature'] as string;

      const result = this.webhookService.handleStripeEvent(buf, sig);
      res.status(200).send(result);
    } catch (err) {
      this.logger.error(err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
