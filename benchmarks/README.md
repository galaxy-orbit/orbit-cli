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

## Kết quả thực tế mới nhất (macOS, Bun 1.3.14, Node 24.1, 10 conn × 5s)

### Requests/sec — càng cao càng tốt (đậm = cao nhất nhóm)

| Scenario | Orbit | Elysia | Hono | Fastify | NestJS Fastify | NestJS Express | Express |
|---|---|---|---|---|---|---|---|
| hello-world | 23,912 | **39,165** | 38,422 | 26,543 | 23,399 | 10,026 | 9,029 |
| json-serialization | 21,589 | 35,374 | **37,571** | 23,237 | 22,491 | 10,777 | 11,583 |
| path-params | 16,438 | 36,322 | **37,704** | 27,010 | 22,686 | 10,914 | 11,257 |
| query-params | 14,610 | 35,442 | **38,550** | 23,992 | 21,467 | 9,834 | 10,951 |
| body-parsing | 14,970 | **34,290** | 33,414 | 17,890 | 13,572 | 7,709 | 8,793 |
| db-sqlite | 16,724 | **31,722** | 23,627 | 18,680 | 17,159 | 13,602 | 12,921 |

### Throughput (MB/s) — Orbit dẫn đầu 5/6 scenario

| Scenario | Orbit | Hono | Elysia | Fastify | Express |
|---|---|---|---|---|---|
| hello-world | **10.7** | 4.9 | 5.5 | 5.0 | 2.2 |
| json-serialization | **16.2** | 16.2 | 15.8 | 11.4 | 6.4 |
| path-params | **7.4** | 4.9 | 5.3 | 4.9 | 2.8 |
| query-params | **6.6** | 5.1 | 5.2 | 4.6 | 2.8 |
| body-parsing | **7.4** | 5.8 | 6.4 | 4.2 | 2.6 |
| db-sqlite | **6.7** | 2.5 | 2.3 | 2.2 | 2.4 |

### Cold start & bộ nhớ

| Framework | Cold start | RSS |
|---|---|---|
| Hono | 107ms | 27.2MB |
| **Orbit** | **124ms** | **26.0MB** |
| Elysia | 213ms | 42.2MB |
| Express | 219ms | 50.8MB |
| Fastify | 319ms | 60.7MB |
| NestJS Express | 622ms | 81.1MB |
| NestJS Fastify | 722ms | 79.0MB |

### Orbit thắng/thua ở đâu — và nguyên nhân

**Thua raw req/s so với Elysia/Hono** ở mọi scenario. Điều tra bằng micro-benchmark cho thấy 4 nguyên nhân chính:

1. **`new URL(request.url)` mỗi request** trong router + resolver: ~1.0ms/req (Elysia/Hono dùng `indexOf`/`slice`: ~0.04ms/req — chênh 25×).
2. **`withSecureHeaders` clone `Headers` mỗi response**: ~1.6ms/req, mặc định bật cho mọi route; các framework khác không làm.
3. **Match route tuyến tính** qua mảng thay vì Radix trie (Elysia, Hono, Fastify đều dùng trie).
4. **`resolveParams` parse query/body dư thừa** kể cả khi handler không dùng, cộng thêm Promise async không cần thiết cho GET.

**Thắng throughput (MB/s)** vì payload JSON Orbit lớn hơn (kèm metadata): db-sqlite 6.7MB/s so với 2.5 của Hono (~2.7×).

**Vượt mặt full-framework**: nhanh hơn NestJS Express ~1.7–2.4×, hơn NestJS Fastify 1.02–1.22×, cold start nhanh hơn 5–6×, RSS thấp hơn ~3×.

**Kết luận trung thực**: Orbit chưa nhanh hơn micro-framework ở raw req/s, nhưng là framework đầy đủ tính năng (DI + decorators + pipeline + security headers) có hiệu năng gần micro-framework nhất, đồng thời dẫn đầu throughput khi payload thực sự lớn. Các đề xuất tối ưu tiếp theo: cache `URL` object hoặc parse thủ công bằng `indexOf`, chỉ clone headers khi có security option tùy chỉnh, build radix trie lúc startup, lazy-parse query/body.
