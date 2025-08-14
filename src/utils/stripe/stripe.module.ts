import { Module } from '@nestjs/common';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/config/prisma/prisma.module';

@Module({
  controllers: [StripeController],
  providers: [StripeService],
  imports: [ConfigModule, PrismaModule],
})
export class StripeModule {}
