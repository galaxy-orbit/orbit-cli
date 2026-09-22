import { describe, test, expect } from 'bun:test';
import {
  transformImports,
  transformFactoryMethods,
  transformPlatformAdapters,
  transformTypeOrmToDb,
  transformPassportToAuth,
  transformBcryptToBun,
  transformClassValidator,
  transformAll,
} from './transformers';

describe('transformImports', () => {
  test('maps @nestjs/common to orbit-common', () => {
    const { code, changes } = transformImports(
      `import { Controller, Get } from '@nestjs/common';`,
    );
    expect(code).toContain(`from '@galaxy-stack/orbit-common'`);
    expect(changes.some(c => c.includes('@nestjs/common'))).toBe(true);
  });

  test('maps @nestjs/core to orbit-core', () => {
    const { code } = transformImports(
      `import { NestFactory } from "@nestjs/core";`,
    );
    expect(code).toContain(`from '@galaxy-stack/orbit-core'`);
  });

  test('maps jwt and passport both to orbit-auth', () => {
    const { code } = transformImports(
      `import { JwtService } from '@nestjs/jwt';\nimport { Passport } from '@nestjs/passport';`,
    );
    expect((code.match(/orbit-auth/g) || []).length).toBe(2);
  });

  test('leaves unrelated imports untouched', () => {
    const src = `import { something } from 'my-lib';`;
    const { code, changes } = transformImports(src);
    expect(code).toBe(src);
    expect(changes).toHaveLength(0);
  });

  test('does not rewrite substring-embedded package names', () => {
    // '@nestjs/common-extra' should not become '@galaxy-stack/orbit-common-extra'
    const { code } = transformImports(
      `import { x } from '@nestjs/common-extra';`,
    );
    expect(code).toContain(`from '@nestjs/common-extra'`);
  });
});

describe('transformFactoryMethods', () => {
  test('rewrites NestFactory.create to OrbitFactory.create', () => {
    const { code, changes } = transformFactoryMethods(
      `const app = await NestFactory.create(AppModule);`,
    );
    expect(code).toContain('OrbitFactory.create(AppModule)');
    expect(code).not.toContain('BunFactory');
    expect(changes).toContain('NestFactory → OrbitFactory');
  });

  test('rewrites microservice and application-context factories', () => {
    const { code } = transformFactoryMethods(
      `NestFactory.createMicroservice(AppModule);\nNestFactory.createApplicationContext(AppModule);`,
    );
    expect(code).toContain('OrbitFactory.createMicroservice');
    expect(code).toContain('OrbitFactory.createApplicationContext');
});

  test('idempotent on already-migrated code', () => {
    const src = `await OrbitFactory.create(AppModule);`;
    const { code, changes } = transformFactoryMethods(src);
    expect(code).toBe(src);
    expect(changes).toHaveLength(0);
  });
});

describe('transformPlatformAdapters', () => {
  test('rewrites NestExpressApplication to BunApplication', () => {
    const { code, changes } = transformPlatformAdapters(
      `async function boot(app: NestExpressApplication) {}`,
    );
    expect(code).toContain('BunApplication');
    expect(changes).toContain('Platform type updated');
  });

  test('rewrites NestFastifyApplication to BunApplication', () => {
    const { code } = transformPlatformAdapters(
      `const app: NestFastifyApplication;`,
    );
    expect(code).toContain('BunApplication');
    expect(code).not.toContain('NestFastifyApplication');
  });

  test('warns on adapter constructors needing manual review', () => {
    const { warnings } = transformPlatformAdapters(
      `new FastifyAdapter()`,
    );
    expect(warnings.some(w => w.includes('manual review'))).toBe(true);
  });
});

describe('transformTypeOrmToDb', () => {
  test('warns on TypeORM usage without changing code', () => {
    const src = `TypeOrmModule.forFeature([User])`;
    const { code, warnings } = transformTypeOrmToDb(src);
    expect(code).toBe(src);
    expect(warnings.some(w => w.includes('orbit-database'))).toBe(true);
  });

  test('warns on getRepository usage', () => {
    const { warnings } = transformTypeOrmToDb(`getRepository(User)`);
    expect(warnings.some(w => w.includes('Repository pattern'))).toBe(true);
  });
});

describe('transformPassportToAuth', () => {
  test('rewrites jwt strategy guard to specific guard', () => {
    const { code, changes } = transformPassportToAuth(
      `@UseGuards(AuthGuard('jwt'))`,
    );
    expect(code).toContain('JwtAuthGuard');
    expect(changes).toContain('AuthGuard strategy → specific guard');
  });

  test('rewrites local strategy guard', () => {
    const { code } = transformPassportToAuth(`AuthGuard('local')`);
    expect(code).toContain('LocalAuthGuard');
  });

  test('leaves unknown strategies untouched', () => {
    const src = `AuthGuard('saml')`;
    const { code } = transformPassportToAuth(src);
    expect(code).toBe(src);
  });
});

describe('transformBcryptToBun', () => {
  test('rewrites bcrypt.hash with cost to Bun.password.hash', () => {
    const { code, changes } = transformBcryptToBun(
      `const h = await bcrypt.hash(password, 10);`,
    );
    expect(code).toContain('await Bun.password.hash(password)');
    expect(code).not.toContain('bcrypt.hash');
    expect(changes).toContain('bcrypt → Bun.password');
  });

  test('rewrites bcrypt.compare to Bun.password.verify', () => {
    const { code } = transformBcryptToBun(
      `const ok = await bcrypt.compare(plain, hash);`,
    );
    expect(code).toContain('await Bun.password.verify(plain, hash)');
  });

  test('comments out the bcrypt import', () => {
    const { code } = transformBcryptToBun(
      `import * as bcrypt from 'bcrypt';\nawait bcrypt.hash(pw, 10);`,
    );
    expect(code).toContain('// Removed bcrypt import');
  });
});

describe('transformClassValidator', () => {
  test('warns on class-validator without changing code', () => {
    const src = `import { IsString } from 'class-validator';`;
    const { code, warnings } = transformClassValidator(src);
    expect(code).toBe(src);
    expect(warnings.some(w => w.includes('Zod'))).toBe(true);
  });
});

describe('transformAll', () => {
  test('runs every transformer in one pass', () => {
    const src = [
      `import { Controller } from '@nestjs/common';`,
      `import { NestFactory } from '@nestjs/core';`,
      `const app = await NestFactory.create(AppModule);`,
      `await bcrypt.hash(pw, 12);`,
    ].join('\n');

    const { code, changes, warnings } = transformAll(src);
    expect(code).toContain(`from '@galaxy-stack/orbit-common'`);
    expect(code).toContain('OrbitFactory.create');
    expect(code).toContain('Bun.password.hash(pw)');
    expect(changes.length).toBeGreaterThanOrEqual(3);
    expect(warnings).toEqual([]);
  });

  test('collects warnings from multiple transformers', () => {
    const src = [
      `TypeOrmModule.forFeature([User])`,
      `import { IsEmail } from 'class-validator';`,
    ].join('\n');
    const { warnings } = transformAll(src);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  test('is idempotent on already-migrated code', () => {
    const src = `import { Controller } from '@galaxy-stack/orbit-common';`;
    const first = transformAll(src);
    const second = transformAll(first.code);
    expect(second.code).toBe(first.code);
    expect(second.changes).toHaveLength(0);
  });
});
