import { describe, test, expect, afterAll } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addImportToModule, findNearestModule, formatModuleUpdate } from './ast-utils';

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'orbit-ast-'));
  roots.push(dir);
  return dir;
}

const sampleModule = `import { Module } from '@galaxy-stack/orbit-core';
import { UserService } from './user.service';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService],
})
export class AppModule {}
`;

describe('addImportToModule', () => {
  test('adds import statement and registers in providers array', async () => {
    const dir = makeTmp();
    const modPath = join(dir, 'app.module.ts');
    writeFileSync(modPath, sampleModule);

    const result = await addImportToModule(
      modPath, 'ConfigModule', './config/config.module', 'imports',
    );
    expect(result.success).toBe(true);

    const content = readFileSync(modPath, 'utf-8');
    expect(content).toContain(`import { ConfigModule } from './config/config.module';`);
    expect(content).toContain('imports: [ConfigModule]');
    // untouched arrays stay intact
    expect(content).toContain('controllers: [UserController]');
    expect(content).toContain('providers: [UserService]');
  });

  test('is idempotent: registering the same class twice reports already exists', async () => {
    const dir = makeTmp();
    const modPath = join(dir, 'app.module.ts');
    writeFileSync(modPath, sampleModule);

    await addImportToModule(modPath, 'UserService', './user.service', 'providers');
    const result = await addImportToModule(
      modPath, 'UserService', './user.service', 'providers',
    );
    expect(result.success).toBe(true);
    expect(result.message).toContain('already exists');

    const content = readFileSync(modPath, 'utf-8');
    // import statement + providers entry, nothing duplicated
    expect((content.match(/UserService/g) || []).length).toBe(2);
  });

  test('appends to a non-empty array with trailing comma', async () => {
    const dir = makeTmp();
    const modPath = join(dir, 'app.module.ts');
    writeFileSync(modPath, sampleModule);

    await addImportToModule(modPath, 'LoggerModule', './logger', 'imports');
    const content = readFileSync(modPath, 'utf-8');
    expect(content).toMatch(/imports:\s*\[\s*LoggerModule\s*\]/);
  });

  test('fails gracefully when the array does not exist', async () => {
    const dir = makeTmp();
    const modPath = join(dir, 'app.module.ts');
    writeFileSync(modPath, `export class BareModule {}\n`);

    const result = await addImportToModule(
      modPath, 'ConfigModule', './config', 'imports',
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain('Could not find imports array');
  });

  test('fails gracefully when file does not exist', async () => {
    const dir = makeTmp();
    const result = await addImportToModule(
      join(dir, 'missing.module.ts'), 'X', './x', 'imports',
    );
    expect(result.success).toBe(false);
  });

  test('does not duplicate the import statement when class already imported', async () => {
    const dir = makeTmp();
    const modPath = join(dir, 'app.module.ts');
    writeFileSync(modPath, `import { Module } from '@galaxy-stack/orbit-core';
import { UserService } from './user.service';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService],
  exports: [],
})
export class AppModule {}
`);

    // UserService already imported; add it to exports
    const result = await addImportToModule(
      modPath, 'UserService', './user.service', 'exports',
    );
    expect(result.success).toBe(true);
    const content = readFileSync(modPath, 'utf-8');
    // original import stays single
    expect((content.match(/import \{ UserService \} from '\.\/user\.service';/g) || []).length).toBe(1);
    expect(content).toContain('exports: [UserService]');
  });

  test('reports failure when target array is missing', async () => {
    const dir = makeTmp();
    const modPath = join(dir, 'app.module.ts');
    writeFileSync(modPath, sampleModule);

    const result = await addImportToModule(
      modPath, 'UserService', './user.service', 'exports',
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain('Could not find exports array');
  });
});

describe('findNearestModule', () => {
  test('finds app.module.ts in the same directory', async () => {
    const dir = makeTmp();
    const modPath = join(dir, 'app.module.ts');
    writeFileSync(modPath, 'export class AppModule {}');

    const found = await findNearestModule(join(dir, 'nested', 'deep'));
    // walks up from nested/deep to dir
    expect(found).toBe(modPath);
  });

  test('walks up parent directories to find app.module.ts', async () => {
    const dir = makeTmp();
    writeFileSync(join(dir, 'app.module.ts'), 'export class AppModule {}');
    const nested = join(dir, 'users', 'dto');
    mkdirSync(nested, { recursive: true });

    const found = await findNearestModule(join(nested, 'create-user.dto.ts'));
    expect(found).toBe(join(dir, 'app.module.ts'));
  });

  test('falls back to any *.module.ts in current directory', async () => {
    const dir = makeTmp();
    mkdirSync(join(dir, 'users'), { recursive: true });
    const customModule = join(dir, 'users', 'users.module.ts');
    writeFileSync(customModule, 'export class UsersModule {}');

    const found = await findNearestModule(join(dir, 'users', 'service.ts'));
    expect(found).toBe(customModule);
  });

  test('returns null when nothing exists up to the root', async () => {
    const found = await findNearestModule('/nonexistent/orbit/path');
    expect(found).toBeNull();
  });
});

describe('formatModuleUpdate', () => {
  test('formats the update message', () => {
    expect(formatModuleUpdate('AppModule', 'UserService', 'providers')).toBe(
      '  Updated AppModule: added UserService to providers',
    );
  });
});
