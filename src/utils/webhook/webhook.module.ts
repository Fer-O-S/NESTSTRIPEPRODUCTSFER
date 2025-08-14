import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PrismaModule } from 'src/config/prisma/prisma.module';
import { PrismaService } from 'src/config/prisma/prisma.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [WebhookController],
  providers: [WebhookService,PrismaService],
})
export class WebhookModule {}
