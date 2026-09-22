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
