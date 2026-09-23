# @galaxy-stack/orbit-cli

[![npm version](https://img.shields.io/npm/v/@galaxy-stack/orbit-cli.svg)](https://www.npmjs.com/package/@galaxy-stack/orbit-cli)
[![docs](https://img.shields.io/badge/docs-galaxy--orbit--framework.vercel.app-blue)](https://galaxy-orbit-framework.vercel.app)

Part of the [Orbit framework](https://github.com/galaxy-orbit/orbit) — a NestJS-style backend framework for [Bun](https://bun.sh).

## Installation

```bash
bun add @galaxy-stack/orbit-cli
```

# orbit

## Mô tả
CLI tool cho Orbit framework để scaffolding projects và generate components.

## Cài đặt

```bash
bun add -g orbit
# hoặc
npx orbit
```

## Commands

### 1. Tạo Project mới

```bash
orbit new my-app
orbit new my-app --template api
orbit new my-app --template graphql
orbit new my-app --template microservice
```

### 2. Generate Components

```bash
# Controller
orbit generate controller user
orbit g co user

# Service
orbit generate service user
orbit g s user

# Module
orbit generate module user
orbit g mo user

# Guard
orbit generate guard auth
orbit g gu auth

# Pipe
orbit generate pipe validation
orbit g pi validation

# Interceptor
orbit generate interceptor logging
orbit g in logging

# Middleware
orbit generate middleware cors
orbit g mi cors

# Filter
orbit generate filter http-exception
orbit g f http-exception

# Resource (CRUD)
orbit generate resource user
orbit g res user
```

### 3. Development Server

```bash
orbit dev
orbit dev --port 3000
orbit dev --watch
```

### 4. Build

```bash
orbit build
orbit build --minify
orbit build --target bun
```

### 5. Test

```bash
orbit test
orbit test --watch
orbit test --coverage
```

## Auto-import

CLI tự động update module imports khi generate:

```typescript
// Trước
@Module({
  controllers: [],
  providers: [],
})
class AppModule {}

// Sau generate controller user
@Module({
  controllers: [UserController],  // Auto-imported
  providers: [],
})
class AppModule {}
```

## Project Structure

```
my-app/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── users/
│       ├── users.module.ts
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── dto/
│           └── create-user.dto.ts
├── test/
│   └── app.e2e-spec.ts
├── package.json
├── tsconfig.json
└── bunfig.toml
```

## Options

```bash
# Generate với spec file
orbit g co user --spec

# Generate không có spec
orbit g co user --no-spec

# Dry run (không tạo file)
orbit g co user --dry-run

# Flat structure (không tạo folder)
orbit g co user --flat
```

## Benchmark hiệu năng

Repo này kèm bộ benchmark thực tế so sánh Orbit với Elysia, Hono, Fastify, Express, NestJS (Express/Fastify) — từ hello-world đơn giản đến kết nối SQLite thật. Xem chi tiết tại [benchmarks/README.md](./benchmarks/README.md).

### Cài đặt & chạy nhanh

```bash
git clone https://github.com/galaxy-orbit/orbit-cli.git
cd orbit-cli/benchmarks
bun install
bun run src/runner.ts            # full suite (7 framework × 6 scenario)
bun run src/runner.ts --duration=5   # chạy nhanh
bun run src/runner.ts --scenario=db-sqlite   # một scenario cụ thể
```

### Yêu cầu phiên bản

- **Bun ≥ 1.2** (Orbit, Elysia, Hono) — khuyến nghị 1.3.x
- **Node.js ≥ 22.5** (Express, Fastify, NestJS — cần `node:sqlite` builtin)
- `autocannon` tự tải qua `npx` khi chạy lần đầu

### Kết quả mới nhất (macOS, Bun 1.3.14, Node 24.1, 10 connections, 5s/scenario)

Orbit **0.2.1** với các tối ưu hot-path, `security: false` trong benchmark (mọi framework đều không bật security headers mặc định — helmet/secure-headers là plugin opt-in). Đậm = cao nhất:

| Scenario | Orbit | Elysia | Hono | Fastify | NestJS Fastify | NestJS Express | Express |
|---|---|---|---|---|---|---|---|
| hello-world | **25,320** | 20,695 | 19,591 | 14,321 | 12,139 | 8,974 | 9,269 |
| json-serialization | **25,211** | 13,738 | 16,980 | 7,978 | 15,666 | 8,881 | 8,616 |
| path-params | **21,945** | 18,278 | 15,536 | 10,918 | 13,995 | 8,828 | 10,487 |
| query-params | **21,438** | 16,788 | 17,574 | 12,302 | 14,404 | 8,016 | 8,817 |
| body-parsing | **18,622** | 17,560 | 10,514 | 9,782 | 10,932 | 6,421 | 6,295 |
| db-sqlite | **23,528** | 14,444 | 12,306 | 10,502 | 11,482 | 9,870 | 9,737 |

Cold start & bộ nhớ:

| Framework | Cold start | RSS |
|---|---|---|
| Hono | 109ms | 27.3MB |
| **Orbit** | **136ms** | **26.8MB** |
| Elysia | 217ms | 41.7MB |
| Express | 426ms | 50.4MB |
| Fastify | 625ms | 59.7MB |
| NestJS Fastify | 1,031ms | 86.1MB |
| NestJS Express | 1,134ms | 84.3MB |

### Điều gì khiến Orbit nhanh?

Kể từ 0.2.1: static route index O(1), parse pathname bằng `indexOf`/`slice` thay vì `new URL()` (~25× nhanh hơn), lazy-parse query/body/headers, cache pipeline metadata, secure headers set in-place. Full chi tiết trong [benchmarks/README.md](./benchmarks/README.md).

**Kết luận thực tế:** Orbit dẫn đầu 6/6 scenarios trong lần chạy mới nhất — nhanh hơn NestJS Express ~2.3–3.2×, hơn NestJS Fastify ~1.7–2.1×, và vượt cả các micro framework (Elysia, Hono) vốn không có DI/decorators/pipeline. Cold start chỉ 136ms, RSS 26.8MB — thấp nhất trong tất cả các framework test.
