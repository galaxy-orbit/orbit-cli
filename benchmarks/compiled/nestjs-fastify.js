var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
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
let BenchController = class BenchController {
    hello() {
        return { message: 'Hello World!' };
    }
    health() {
        return { status: 'ok' };
    }
    json() {
        return JSON_PAYLOAD;
    }
    getUser(id) {
        return { id, name: 'User ' + id };
    }
    search(q, page, limit) {
        return { q, page: parseInt(page || '1'), limit: parseInt(limit || '10') };
    }
    createUser(body) {
        return { id: Date.now(), ...body };
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BenchController.prototype, "hello", null);
__decorate([
    Get('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BenchController.prototype, "health", null);
__decorate([
    Get('json'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BenchController.prototype, "json", null);
__decorate([
    Get('users/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BenchController.prototype, "getUser", null);
__decorate([
    Get('search'),
    __param(0, Query('q')),
    __param(1, Query('page')),
    __param(2, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], BenchController.prototype, "search", null);
__decorate([
    Post('users'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BenchController.prototype, "createUser", null);
BenchController = __decorate([
    Controller()
], BenchController);
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({ controllers: [BenchController] })
], AppModule);
const app = await NestFactory.create(AppModule, new FastifyAdapter({ logger: false }));
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER)');
for (let i = 1; i <= 100; i++) {
  db.prepare('INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)').run(i, `User ${i}`, `user${i}@example.com`, 20 + (i % 50));
}
const httpAdapter = app.getHttpAdapter();
const fastifyInstance = httpAdapter.getInstance();
fastifyInstance.get('/db/users/:id', (req, reply) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  reply.send(row);
});

await app.listen(3007);
console.log('NestJS (Fastify) server running on port 3007');
