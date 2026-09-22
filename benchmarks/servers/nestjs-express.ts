import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Controller, Get, Post, Query, Param, Body, Module } from '@nestjs/common';

const JSON_PAYLOAD = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'New York',
    country: 'USA',
    zip: '10001',
  },
  tags: ['developer', 'typescript', 'bun'],
  createdAt: new Date().toISOString(),
  metadata: {
    lastLogin: new Date().toISOString(),
    loginCount: 42,
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  },
};

@Controller()
class BenchController {
  @Get()
  hello() {
    return { message: 'Hello World!' };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('json')
  json() {
    return JSON_PAYLOAD;
  }

  @Get('users/:id')
  getUser(@Param('id') id) {
    return { id, name: 'User ' + id };
  }

  @Get('search')
  search(@Query('q') q, @Query('page') page, @Query('limit') limit) {
    return { q, page: parseInt(page || '1'), limit: parseInt(limit || '10') };
  }

  @Post('users')
  createUser(@Body() body) {
    return { id: Date.now(), ...body };
  }
}

@Module({ controllers: [BenchController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(3006);
console.log('NestJS (Express) server running on port 3006');
