var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __name = (target, name) => {
  Object.defineProperty(target, "name", {
    value: name,
    enumerable: false,
    configurable: true
  });
  return target;
};
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => (key in obj) ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== undefined && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({
  kind: __decoratorStrings[kind],
  name,
  metadata,
  addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null))
});
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length;i < n; i++)
    flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : {
    get [name]() {
      return __privateGet(this, extra);
    },
    set [name](x) {
      __privateSet(this, extra, x);
    }
  }, name));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
  for (var i = decorators.length - 1;i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => (name in x) };
      if (k ^ 3)
        access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name];
      if (k > 2)
        access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? undefined : { get: desc.get, set: desc.set } : target, ctx);
    done._ = 1;
    if (k ^ 4 || it === undefined)
      __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null)
      __typeError("Object expected");
    else
      __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p ? k ^ 4 ? extra : desc : target;
};

// servers/nestjs-fastify.mjs
import"reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Controller, Get, Post, Query, Param, Body, Module } from "@nestjs/common";
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
var _dec = [
  Controller()
];
var _dec2 = [
  Get()
];
var _dec3 = [
  Get("health")
];
var _dec4 = [
  Get("json")
];
var _dec5 = [
  Get("users/:id")
];
var _dec6 = [
  Get("search")
];
var _dec7 = [
  Post("users")
];
var _init = __decoratorStart(undefined);

class BenchController {
  constructor() {
    __runInitializers(_init, 5, this);
  }
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
}
__decorateElement(_init, 1, "hello", _dec2, BenchController);
__decorateElement(_init, 1, "health", _dec3, BenchController);
__decorateElement(_init, 1, "json", _dec4, BenchController);
__decorateElement(_init, 1, "getUser", _dec5, BenchController);
__decorateElement(_init, 1, "search", _dec6, BenchController);
__decorateElement(_init, 1, "createUser", _dec7, BenchController);
BenchController = __decorateElement(_init, 0, "BenchController", _dec, BenchController);
__runInitializers(_init, 1, BenchController);
__decoratorMetadata(_init, BenchController);
let _BenchController = BenchController;
var _dec = [
  Module({ controllers: [BenchController] })
];
var _init = __decoratorStart(undefined);

class AppModule {
}
AppModule = __decorateElement(_init, 0, "AppModule", _dec, AppModule);
__runInitializers(_init, 1, AppModule);
__decoratorMetadata(_init, AppModule);
let _AppModule = AppModule;
var app = await NestFactory.create(AppModule, new FastifyAdapter({ logger: false }));
await app.listen(3007);
console.log("NestJS (Fastify) server running on port 3007");
