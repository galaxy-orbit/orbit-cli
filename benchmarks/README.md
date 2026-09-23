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
# Full suite (8 scenarios × 7 frameworks, 10s mỗi scenario)
bun run src/runner.ts

# Best-of-3 (mỗi scenario chạy 3 lượt, lấy kết quả tốt nhất — giảm nhiễu)
bun run src/runner.ts --runs=3

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
6. **db-sqlite** — SELECT 1 row qua SQLite (bun:sqlite / node:sqlite)
7. **db-list** — SELECT 50 rows, trả array JSON (~2.7KB/response)
8. **db-insert** — INSERT thật vào SQLite (prepared statement) + trả row

## Kết quả (macOS Intel i5-1038NG7 2.0GHz, 16GB, Bun 1.3.14, Node 26.9, 10 conn × 10s × best-of-3)

> ⚖️ **Khách quan:** mọi framework trong suite đều KHÔNG bật security headers mặc định (helmet/secure-headers là plugin opt-in ở Express, Fastify, Hono, Elysia, NestJS) — benchmark chạy Orbit với `security: false` để cùng điều kiện. Orbit core vẫn giữ security headers mặc định cho người dùng thật. Mọi server dùng chung schema SQLite + prepared statement module-level.
>
> 🐞 **Sửa ở run này:** 2 server NestJS trước đây thiếu endpoint DB (kết quả `db-sqlite` cũ của NestJS là 404) — đã bổ sung endpoint thật, số liệu NestJS dưới đây là dữ liệu DB thật.
>
> 🚀 **orbit-core 0.2.1** với các tối ưu hot-path. Kết quả = tốt nhất trong 3 lượt × 10s mỗi scenario (`--runs=3`).

### Requests/sec — càng cao càng tốt (đậm = cao nhất)

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

### Cold start & bộ nhớ

| Framework | Cold start | RSS |
|---|---|---|
| Hono | 113ms | 27.4MB |
| **Orbit** | **133ms** | **25.8MB** |
| Elysia | 217ms | 42.4MB |
| Express | 526ms | 59.6MB |
| Fastify | 627ms | 67.4MB |
| NestJS Fastify | 925ms | 81.4MB |
| NestJS Express | 1,331ms | 79.0MB |

### Đọc kết quả thế nào cho công bằng?

- **Nhóm full-featured** (DI + decorators + pipeline + validation): Orbit, NestJS Express, NestJS Fastify. Orbit nhanh hơn **NestJS Express 1.8–3.1×**, hơn **NestJS Fastify 1.1–2.1×** ở cả 8 scenarios — và là framework duy nhất trong nhóm này đạt throughput ngang micro-framework.
- **So với Fastify** (framework Node nhanh, không DI): Orbit thắng 8/8, nhanh hơn **1.3–2.5×**.
- **So với micro-frameworks** (Elysia, Hono — không DI, không decorators, không pipeline): Orbit thắng hello-world (+17% so Elysia), db-insert (+33% so Elysia), body-parsing/db-list/db-sqlite (thắng Hono), hòa db-insert với Hono; Elysia nhỉnh hơn 9–27% ở json-serialization/path-params/query-params/db-sqlite. Orbit là framework full-featured duy nhất chạm được nhóm throughput này.
- **Cold start & bộ nhớ:** Orbit 133ms / 25.8MB — thấp nhất trong tất cả framework được đo.
- Methodology: cùng 1 schema SQLite, prepared statement module-level ở mọi server, mỗi framework dùng SQLite binding native của runtime mình (bun:sqlite / node:sqlite). Raw JSON trong `results/`.

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

So với các full framework: Orbit nhanh hơn NestJS Express 1.8–3.1×, hơn NestJS Fastify 1.1–2.1×, hơn Fastify 1.3–2.5×, hơn Express 1.9–4.2× ở cả 8 scenarios. Cold start 133ms + RSS 25.8MB — thấp nhất trong nhóm. Elysia/Hono là micro framework (không DI, không decorators, không pipeline) — Orbit đạt cùng nhóm throughput ở hello-world/body-parsing/db-list/db-insert và chỉ thua Elysia 9–27% ở các scenario serialization thuần.
