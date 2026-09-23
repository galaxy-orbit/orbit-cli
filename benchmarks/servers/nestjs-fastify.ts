import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Controller, Get, Post, Query, Param, Body, Module } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER)');
for (let i = 1; i <= 100; i++) {
  db.prepare('INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)').run(i, `User ${i}`, `user${i}@example.com`, 20 + (i % 50));
}
const getUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const listUsersStmt = db.prepare('SELECT id, name, email, age FROM users LIMIT 50');
const insertUserStmt = db.prepare('INSERT INTO users (name, email, age) VALUES (?, ?, ?)');

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

  @Get('db/users')
  listUsersFromDb() {
    return listUsersStmt.all();
  }

  @Get('db/users/:id')
  getUserFromDb(@Param('id') id) {
    return getUserStmt.get(Number(id));
  }

  @Post('db/users')
  insertUserToDb(@Body() body) {
    const info = insertUserStmt.run(body.name, body.email, body.age);
    return { id: Number(info.lastInsertRowid), name: body.name, email: body.email, age: body.age };
  }
}

@Module({ controllers: [BenchController] })
class AppModule {}

const app = await NestFactory.create(AppModule, new FastifyAdapter({ logger: false }));
await app.listen(3007);
console.log('NestJS (Fastify) server running on port 3007');
