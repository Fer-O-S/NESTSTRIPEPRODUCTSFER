import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { UserDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { Stripe } from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  private stripe: Stripe;

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

  async createUser(data: UserDto) {
    // Hash the password before saving the user
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create the user in Stripe
    const stripeUser = await this.stripe.customers.create({
      name: data.name,
      email: data.email,
    });

    // // Save the user in the database
    // const user = await this.prisma.users.create({
    //   data: {
    //     email: data.email,
    //     name: data.name,
    //     password: hashedPassword,
    //     stripeCustomerId: stripeUser.id,
    //   },
    // });

    return { message: 'User Created Successfully'};
  }

  async getUserById(user_id: number) {
    const foundUser = await this.prisma.users.findFirst({
      where: { id: user_id },
      // Seleccionar campos a devolver
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log(foundUser);
    if (foundUser) {
      return foundUser;
    }

    return { message: 'User not found' };
  }
}
