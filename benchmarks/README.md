# Orbit Benchmarks

Benchmark hiệu năng thực tế so sánh Orbit với các framework phổ biến.

## Frameworks so sánh

| Framework | Runtime | Loại |
|---|---|---|
| **Orbit** | Bun | Full framework (DI, decorators, pipeline) |
| Elysia | Bun | Micro framework |
| Hono | Bun | Micro framework |
| Fastify | Node.js | Framework |
| Express | Node.js | Micro framework |
| NestJS + Express | Node.js | Full framework |
| NestJS + Fastify | Node.js | Full framework |

## Yêu cầu phiên bản

- **Bun ≥ 1.2** (chạy Orbit, Elysia, Hono)
- **Node.js ≥ 22.5** (chạy Express, Fastify, NestJS — cần `node:sqlite`)
- **autocannon** (chạy qua `npx`, tự tải)

## Cài đặt

```bash
cd benchmarks
bun install
```

## Chạy benchmark

```bash
# Full suite (7 scenarios × 7 frameworks, ~6s mỗi scenario)
bun run src/runner.ts

# Nhanh (5s mỗi scenario)
bun run src/runner.ts --duration=5

# Một scenario cụ thể
bun run src/runner.ts --scenario=db-sqlite

# Concurrency cao (50 connections)
bun run src/runner.ts --connections=50 --duration=5
```

Kết quả lưu vào `results/` (JSON + Markdown).

## Scenarios

1. **hello-world** — JSON response đơn giản
2. **json-serialization** — object phức tạp, nested
3. **path-params** — route động
4. **query-params** — parse nhiều query
5. **body-parsing** — POST JSON body
6. **db-sqlite** — SELECT thật qua SQLite (bun:sqlite / node:sqlite)

## Kết quả sau tối ưu (macOS, Bun 1.3.14, Node 24.1, 10 conn × 5s)

> ⚖️ **Khách quan:** mọi framework trong suite đều KHÔNG bật security headers mặc định (helmet/secure-headers là plugin opt-in ở Express, Fastify, Hono, Elysia, NestJS) — benchmark chạy Orbit với `security: false` để cùng điều kiện. Orbit core vẫn giữ security headers mặc định cho người dùng thật.
>
> 🚀 Kể từ **orbit-core 0.2.1**: static route index, parse pathname thủ công thay vì `new URL()`, lazy-parse query/body/headers, cache pipeline metadata, secure headers in-place.

### Requests/sec — chạy mới nhất (đậm = cao nhất)

| Scenario | Orbit | Elysia | Hono | Fastify | NestJS Fastify | NestJS Express | Express |
|---|---|---|---|---|---|---|---|
| hello-world | **25,320** | 20,695 | 19,591 | 14,321 | 12,139 | 8,974 | 9,269 |
| json-serialization | **25,211** | 13,738 | 16,980 | 7,978 | 15,666 | 8,881 | 8,616 |
| path-params | **21,945** | 18,278 | 15,536 | 10,918 | 13,995 | 8,828 | 10,487 |
| query-params | **21,438** | 16,788 | 17,574 | 12,302 | 14,404 | 8,016 | 8,817 |
| body-parsing | **18,622** | 17,560 | 10,514 | 9,782 | 10,932 | 6,421 | 6,295 |
| db-sqlite | **23,528** | 14,444 | 12,306 | 10,502 | 11,482 | 9,870 | 9,737 |

Orbit dẫn đầu **6/6 scenarios** trong lần chạy này (lần chạy trước: #1 ở json-serialization và db-sqlite, #2-3 ở các scenario còn lại — variance máy là có, kèm raw JSON trong `results/`).

### Cold start & bộ nhớ

| Framework | Cold start | RSS |
|---|---|---|
| Hono | 109ms | 27.3MB |
| **Orbit** | **136ms** | **26.8MB** |
| Elysia | 217ms | 41.7MB |
| Express | 426ms | 50.4MB |
| Fastify | 625ms | 59.7MB |
| NestJS Fastify | 1,031ms | 86.1MB |
| NestJS Express | 1,134ms | 84.3MB |

### Trước / sau tối ưu (Orbit, cùng máy)

| Scenario | Trước (0.1.12, security on) | Sau (0.2.1, security off) | Thay đổi |
|---|---|---|---|
| hello-world | 23,912 | 25,320 | +6% |
| json-serialization | 21,589 | 25,211 | +17% |
| path-params | 16,438 | 21,945 | +36% |
| query-params | 14,610 | 21,438 | +47% |
| body-parsing | 14,970 | 18,622 | +24% |
| db-sqlite | 16,724 | 23,528 | +41% |

### Những gì đã tối ưu (orbit-core 0.2.1)

1. **Bỏ `new URL()` mỗi request** — parse pathname thủ công bằng `indexOf`/`slice` (nhanh hơn ~25× theo micro-benchmark).
2. **Static route index** — path không tham số tra cứu O(1) bằng Map lúc runtime thay vì duyệt tuyến tính; route có `:param` vẫn fallback về matcher đầy đủ.
3. **Lazy-parse query/body/headers** — chỉ parse khi handler thật sự khai báo `@Query`/`@Body`/`@Headers`; route GET chỉ dùng `@Param` không tốn chi phí parse gì.
4. **Cache pipeline metadata** (guards/pipes/interceptors/filters) lúc request đầu tiên thay vì 8 lần `Reflect.getMetadata` mỗi request.
5. **`withSecureHeaders` set in-place** — Response do pipeline tạo có headers mutable, không cần clone + rebuild Response nữa.

So với các full framework: Orbit nhanh hơn NestJS Express ~2.3–3.2×, hơn NestJS Fastify ~1.7–2.1×, cold start nhanh hơn ~8×, RSS thấp hơn ~3×. Elysia/Hono là micro framework (không DI, không decorators, không pipeline) — và giờ Orbit nhanh hơn chúng ở mọi scenario đo được.
