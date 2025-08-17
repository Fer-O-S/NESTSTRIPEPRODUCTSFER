import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/config/prisma/prisma.module';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, ConfigModule],
  imports: [ConfigModule, PrismaModule],
})
export class CheckoutModule {}
