import 'reflect-metadata';
import { BunFactory, Module, Controller, Get, Post } from '@galaxy-stack/orbit-core';
import { Body, Param, Query } from '@galaxy-stack/orbit-common';
import { Database } from 'bun:sqlite';

const db = new Database(':memory:');
db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER)');
const seedStmt = db.prepare('INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)');
for (let i = 1; i <= 100; i++) {
  seedStmt.run(i, `User ${i}`, `user${i}@example.com`, 20 + (i % 50));
}
const getUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');

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
    return {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      address: { street: '123 Main St', city: 'New York', country: 'USA', zip: '10001' },
      tags: ['developer', 'typescript', 'bun'],
      createdAt: new Date().toISOString(),
      metadata: {
        lastLogin: new Date().toISOString(),
        loginCount: 42,
        preferences: { theme: 'dark', notifications: true },
      },
    };
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return { id, name: 'User ' + id };
  }

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('page') page: string,
    @Query('limit') limit: string
  ) {
    return { q, page: parseInt(page || '1'), limit: parseInt(limit || '10') };
  }

  @Post('users')
  createUser(@Body() body: any) {
    return { id: Date.now(), ...body };
  }

  @Get('db/users/:id')
  getUserFromDb(@Param('id') id: string) {
    return getUserStmt.get(Number(id));
  }
}

@Module({
  controllers: [BenchController],
})
class AppModule {}

const app = await BunFactory.create(AppModule);
await app.listen(3001);
console.log('Orbit server running on port 3001');
