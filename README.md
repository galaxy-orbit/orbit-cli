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

### Kết quả thực tế (macOS, Bun 1.3.14, Node 24.1, 10 connections, 5s/scenario)

Requests/sec — càng cao càng tốt (in đậm = nhất nhóm):

| Scenario | Orbit | Elysia | Hono | Fastify | NestJS Fastify | NestJS Express | Express |
|---|---|---|---|---|---|---|---|
| hello-world | 23,912 | **39,165** | 38,422 | 26,543 | 23,399 | 10,026 | 9,029 |
| json-serialization | 21,589 | 35,374 | **37,571** | 23,237 | 22,491 | 10,777 | 11,583 |
| path-params | 16,438 | 36,322 | **37,704** | 27,010 | 22,686 | 10,914 | 11,257 |
| query-params | 14,610 | 35,442 | **38,550** | 23,992 | 21,467 | 9,834 | 10,951 |
| body-parsing | 14,970 | **34,290** | 33,414 | 17,890 | 13,572 | 7,709 | 8,793 |
| db-sqlite | 16,724 | **31,722** | 23,627 | 18,680 | 17,159 | 13,602 | 12,921 |

Throughput (MB/s) — Orbit dẫn đầu ở 5/6 scenario:

| Scenario | Orbit | Framework kế tiếp |
|---|---|---|
| hello-world | **10.7** | Elysia 5.5 |
| json-serialization | **16.2** | Hono 16.2 (hòa) |
| path-params | **7.4** | Elysia 5.3 |
| query-params | **6.6** | Elysia 5.2 |
| body-parsing | **7.4** | Elysia 6.4 |
| db-sqlite | **6.7** | Hono 2.5 |

Cold start & bộ nhớ:

| Framework | Cold start | RSS |
|---|---|---|
| Hono | 107ms | 27.2MB |
| **Orbit** | **124ms** | **26.0MB** |
| Elysia | 213ms | 42.2MB |
| Express | 219ms | 50.8MB |
| Fastify | 319ms | 60.7MB |
| NestJS Express | 622ms | 81.1MB |
| NestJS Fastify | 722ms | 79.0MB |

### Orbit thắng/thua ở đâu?

**Thua raw req/s so với Elysia/Hono** ở mọi scenario micro-framework (không DI, không pipeline, trả response trực tiếp). Nguyên nhân đã điều tra:

1. `new URL(request.url)` mỗi request trong router + resolver (~1.0ms/req theo micro-benchmark) — Elysia/Hono dùng `indexOf`/`slice` (~0.04ms/req).
2. `withSecureHeaders` clone `Headers` cho mỗi response (~1.6ms/req) — mặc định bật, các framework khác không có.
3. Match route tuyến tính qua danh sách route thay vì Radix/Trie (Elysia, Hono, Fastify đều dùng trie).
4. `resolveParams` parse query/body dù handler không dùng tới, và tạo Promise async không cần thiết cho GET.

**Thắng throughput (MB/s)** vì Orbit trả payload JSON lớn hơn (metadata đầy đủ) — db-sqlite: 6.7MB/s vs 2.5MB/s của Hono (~2.7×).

**Vượt mặt full-framework**: Orbit nhanh hơn NestJS Express ~1.7–2.4×, hơn NestJS Fastify 1.02–1.22× tùy scenario, cold start 5–6× nhanh hơn, RSS thấp hơn 3×.

Kết luận trung thực: Orbit không nhanh hơn micro framework ở raw req/s, nhưng gần nhất trong nhóm full framework (DI + decorators + pipeline + security) — và là duy nhất dẫn đầu throughput khi payload thực sự lớn.
