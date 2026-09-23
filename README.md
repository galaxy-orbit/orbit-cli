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
bun run src/runner.ts --runs=3   # full suite (7 framework × 8 scenario, best-of-3)
bun run src/runner.ts --duration=5   # chạy nhanh
bun run src/runner.ts --scenario=db-sqlite   # một scenario cụ thể
```

### Yêu cầu phiên bản

- **Bun ≥ 1.2** (Orbit, Elysia, Hono) — khuyến nghị 1.3.x
- **Node.js ≥ 22.5** (Express, Fastify, NestJS — cần `node:sqlite` builtin)
- `autocannon` tự tải qua `npx` khi chạy lần đầu

### Kết quả mới nhất (macOS Intel i5 2.0GHz, Bun 1.3.14, Node 26.9, 10 connections × 10s × best-of-3)

Orbit **0.2.1** với các tối ưu hot-path, `security: false` trong benchmark (mọi framework đều không bật security headers mặc định — helmet/secure-headers là plugin opt-in). Mọi server dùng chung schema SQLite + prepared statement. Đậm = cao nhất:

| Scenario | Orbit | Elysia | Hono | Fastify | NestJS Fastify | NestJS Express | Express |
|---|---|---|---|---|---|---|---|
| hello-world | **31,315** | 26,804 | 29,825 | 23,813 | 23,227 | 10,741 | 7,499 |
| json-serialization | 28,816 | **31,463** | 28,687 | 18,682 | 21,617 | 10,296 | 9,006 |
| path-params | 28,445 | **32,594** | 30,037 | 20,277 | 21,873 | 10,187 | 9,975 |
| query-params | 23,112 | **31,853** | 29,618 | 18,142 | 20,529 | 8,990 | 8,901 |
| body-parsing | 22,859 | **27,258** | 19,672 | 12,819 | 13,529 | 7,475 | 7,248 |
| db-sqlite | 27,771 | **35,129** | 25,294 | 21,766 | 23,556 | 15,730 | 14,330 |
| db-list | 13,972 | **15,371** | 11,533 | 5,583 | 6,780 | 4,601 | 4,534 |
| db-insert | 17,049 | 12,815 | **17,142** | 11,459 | 12,539 | 6,406 | 7,433 |

Cold start & bộ nhớ:

| Framework | Cold start | RSS |
|---|---|---|
| Hono | 113ms | 27.4MB |
| **Orbit** | **133ms** | **25.8MB** |
| Elysia | 217ms | 42.4MB |
| Express | 526ms | 59.6MB |
| Fastify | 627ms | 67.4MB |
| NestJS Fastify | 925ms | 81.4MB |
| NestJS Express | 1,331ms | 79.0MB |

### Điều gì khiến Orbit nhanh?

Kể từ 0.2.1: static route index O(1), parse pathname bằng `indexOf`/`slice` thay vì `new URL()` (~25× nhanh hơn), lazy-parse query/body/headers, cache pipeline metadata, secure headers set in-place. Full chi tiết trong [benchmarks/README.md](./benchmarks/README.md).

**Kết luận thực tế:** Orbit nhanh hơn mọi full framework ở cả 8 scenarios — hơn **NestJS Express 1.8–3.1×**, hơn **NestJS Fastify 1.1–2.1×**, hơn **Fastify 1.3–2.5×**, hơn **Express 1.9–4.2×** — trong khi là framework duy nhất của nhóm này có cold start 133ms + RSS 25.8MB thấp nhất. So với micro-frameworks (Elysia, Hono — không DI/decorators/pipeline): Orbit thắng hello-world (+17% so Elysia), db-insert (+33%), body-parsing/db-list/db-sqlite (thắng Hono); Elysia nhỉnh hơn 9–27% ở json/path/query — một sự cân bằng rất sát cho một framework có đủ DI + pipeline.
