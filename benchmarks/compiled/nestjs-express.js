var __legacyDecorateClassTS = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
    r = Reflect.decorate(decorators, target, key, desc);
  else
    for (var i = decorators.length - 1;i >= 0; i--)
      if (d = decorators[i])
        r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __legacyDecorateParamTS = (index, decorator) => (target, key) => decorator(target, key, index);
var __legacyMetadataTS = (k, v) => {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
    return Reflect.metadata(k, v);
};

// servers/nestjs-express.ts
import"reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Controller, Get, Post, Query, Param, Body, Module } from "@nestjs/common";
import { DatabaseSync } from "node:sqlite";
var db = new DatabaseSync(":memory:");
db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER)");
for (let i = 1;i <= 100; i++) {
  db.prepare("INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)").run(i, `User ${i}`, `user${i}@example.com`, 20 + i % 50);
}
var getUserStmt = db.prepare("SELECT * FROM users WHERE id = ?");
var listUsersStmt = db.prepare("SELECT id, name, email, age FROM users LIMIT 50");
var insertUserStmt = db.prepare("INSERT INTO users (name, email, age) VALUES (?, ?, ?)");
var JSON_PAYLOAD = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  age: 30,
  address: {
    street: "123 Main St",
    city: "New York",
    country: "USA",
    zip: "10001"
  },
  tags: ["developer", "typescript", "bun"],
  createdAt: new Date().toISOString(),
  metadata: {
    lastLogin: new Date().toISOString(),
    loginCount: 42,
    preferences: {
      theme: "dark",
      notifications: true
    }
  }
};

class BenchController {
  hello() {
    return { message: "Hello World!" };
  }
  health() {
    return { status: "ok" };
  }
  json() {
    return JSON_PAYLOAD;
  }
  getUser(id) {
    return { id, name: "User " + id };
  }
  search(q, page, limit) {
    return { q, page: parseInt(page || "1"), limit: parseInt(limit || "10") };
  }
  createUser(body) {
    return { id: Date.now(), ...body };
  }
  listUsersFromDb() {
    return listUsersStmt.all();
  }
  getUserFromDb(id) {
    return getUserStmt.get(Number(id));
  }
  insertUserToDb(body) {
    const info = insertUserStmt.run(body.name, body.email, body.age);
    return { id: Number(info.lastInsertRowid), name: body.name, email: body.email, age: body.age };
  }
}
__legacyDecorateClassTS([
  Get(),
  __legacyMetadataTS("design:type", Function),
  __legacyMetadataTS("design:paramtypes", []),
  __legacyMetadataTS("design:returntype", undefined)
], BenchController.prototype, "hello", null);
__legacyDecorateClassTS([
  Get("health"),
  __legacyMetadataTS("design:type", Function),
  __legacyMetadataTS("design:paramtypes", []),
  __legacyMetadataTS("design:returntype", undefined)
], BenchController.prototype, "health", null);
__legacyDecorateClassTS([
  Get("json"),
  __legacyMetadataTS("design:type", Function),
  __legacyMetadataTS("design:paramtypes", []),
  __legacyMetadataTS("design:returntype", undefined)
], BenchController.prototype, "json", null);
__legacyDecorateClassTS([
  Get("users/:id"),
  __legacyDecorateParamTS(0, Param("id")),
  __legacyMetadataTS("design:type", Function),
  __legacyMetadataTS("design:paramtypes", [
    Object
  ]),
  __legacyMetadataTS("design:returntype", undefined)
], BenchController.prototype, "getUser", null);
__legacyDecorateClassTS([
  Get("search"),
  __legacyDecorateParamTS(0, Query("q")),
  __legacyDecorateParamTS(1, Query("page")),
  __legacyDecorateParamTS(2, Query("limit")),
  __legacyMetadataTS("design:type", Function),
  __legacyMetadataTS("design:paramtypes", [
    Object,
    Object,
    Object
  ]),
  __legacyMetadataTS("design:returntype", undefined)
], BenchController.prototype, "search", null);
__legacyDecorateClassTS([
  Post("users"),
  __legacyDecorateParamTS(0, Body()),
  __legacyMetadataTS("design:type", Function),
  __legacyMetadataTS("design:paramtypes", [
    Object
  ]),
  __legacyMetadataTS("design:returntype", undefined)
], BenchController.prototype, "createUser", null);
__legacyDecorateClassTS([
  Get("db/users"),
  __legacyMetadataTS("design:type", Function),
  __legacyMetadataTS("design:paramtypes", []),
  __legacyMetadataTS("design:returntype", undefined)
], BenchController.prototype, "listUsersFromDb", null);
__legacyDecorateClassTS([
  Get("db/users/:id"),
  __legacyDecorateParamTS(0, Param("id")),
  __legacyMetadataTS("design:type", Function),
  __legacyMetadataTS("design:paramtypes", [
    Object
  ]),
  __legacyMetadataTS("design:returntype", undefined)
], BenchController.prototype, "getUserFromDb", null);
__legacyDecorateClassTS([
  Post("db/users"),
  __legacyDecorateParamTS(0, Body()),
  __legacyMetadataTS("design:type", Function),
  __legacyMetadataTS("design:paramtypes", [
    Object
  ]),
  __legacyMetadataTS("design:returntype", undefined)
], BenchController.prototype, "insertUserToDb", null);
BenchController = __legacyDecorateClassTS([
  Controller()
], BenchController);

class AppModule {
}
AppModule = __legacyDecorateClassTS([
  Module({ controllers: [BenchController] })
], AppModule);
var app = await NestFactory.create(AppModule, { logger: false });
await app.listen(3006);
console.log("NestJS (Express) server running on port 3006");
