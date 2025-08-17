import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { UserService } from './users.service';
import { UserDto } from './dto/register.dto';
import { get } from 'http';
import { text } from 'stream/consumers';

@Controller('Register')
export class UserController {
  constructor(private readonly registerService: UserService) {}

  @Post()
  async createUser(@Body() registeruserDto: UserDto) {
    return await this.registerService.createUser(registeruserDto);
  }

  @Get('text')
  async gettext() {
    return 'Hola mundo fer';
  }

  @Get(':id')
  async getUserById(@Param('id') user_id: number) {
    return await this.registerService.getUserById(user_id);
  }
}
