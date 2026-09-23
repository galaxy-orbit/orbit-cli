# @galaxy-stack/orbit-cli

## 0.1.11

Version parity release — 0.1.7 through 0.1.11 were published from the orbit
monorepo era without standalone changelog entries. This repository is now the
single source of truth for the package. Content matches the npm-published
0.1.11, plus the cwd-restore test fix (captured `prevCwd` instead of a
hardcoded macOS path) synced from monorepo commit d52d16e.

## 0.1.6


First release from the standalone `orbit-cli` repository.

- CLI is Bun-runtime only (uses Bun.spawn, Bun.Transpiler, fs/promises.exists)
- `orbit new` pins scaffolded dependencies to published npm ranges (^0.1.0)
- Repository metadata points to the standalone repository

## 0.1.2 — 2026-09-21

- Stability release for the published trio
- Live integration suite verified: `orbit new`, `orbit generate`, scaffolded app boot
