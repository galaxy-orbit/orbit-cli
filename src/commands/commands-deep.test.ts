import { describe, test, expect, afterAll } from 'bun:test';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newProjectCommand } from './new';
import { transpileFile } from './dev';
import {
  mainTsTemplate,
  appModuleTemplate,
  packageJsonUpdates,
  tsconfigUpdates,
  generateMigrationGuide,
} from './migrate/templates';

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function tmpRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'orbit-cli-'));
  roots.push(dir);
  return dir;
}

describe('newProjectCommand — scaffolding', () => {
  test('creates the full project skeleton with skipInstall', async () => {
    const root = mkdtempSync(join(tmpdir(), 'orbit-new-'));
    roots.push(root);

    const projectDir = join(root, 'my-app');
    await newProjectCommand('my-app', { directory: projectDir, skipInstall: true, orbitVersions: { core: '^0.2.1', common: '^0.1.14' } });

    expect(existsSync(join(projectDir, 'package.json'))).toBe(true);
    expect(existsSync(join(projectDir, 'tsconfig.json'))).toBe(true);
    expect(existsSync(join(projectDir, 'src/main.ts'))).toBe(true);
    expect(existsSync(join(projectDir, 'src/app.module.ts'))).toBe(true);
    expect(existsSync(join(projectDir, 'src/app.controller.ts'))).toBe(true);
    expect(existsSync(join(projectDir, 'src/app.service.ts'))).toBe(true);
    expect(existsSync(join(projectDir, '.gitignore'))).toBe(true);
    expect(existsSync(join(projectDir, 'README.md'))).toBe(true);

    // generated code targets the canonical API
    const mainTs = readFileSync(join(projectDir, 'src/main.ts'), 'utf-8');
    expect(mainTs).toContain('OrbitFactory');
    expect(mainTs).not.toContain('BunFactory');

    const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('my-app');
    expect(Object.keys(pkg.dependencies ?? {})).toContain('@galaxy-stack/orbit-core');
    // Scaffolded projects must install Orbit releases that ship type declarations.
    expect(pkg.dependencies['@galaxy-stack/orbit-core']).toMatch(/^\^0\.2\./);
    expect(pkg.dependencies['@galaxy-stack/orbit-common']).toMatch(/^\^0\.1\.1[0-9]/);
  }, 30000);

  test('default directory is the project name', async () => {
    const root = mkdtempSync(join(tmpdir(), 'orbit-new-'));
    roots.push(root);

    const prevCwd = process.cwd();
    process.chdir(root);
    try {
      await newProjectCommand('default-dir-app', { skipInstall: true, orbitVersions: { core: '^0.2.1', common: '^0.1.14' } });
      expect(existsSync(join(root, 'default-dir-app', 'src', 'main.ts'))).toBe(true);
    } finally {
      process.chdir(prevCwd);
    }
  }, 30000);
});

describe('dev command — transpileFile', () => {
  test('transpiles a TypeScript file and reports timing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'orbit-dev-'));
    roots.push(dir);
    const filePath = join(dir, 'entry.ts');
    await Bun.write(filePath, `export const x: number = 42;\nconst y = x + 1;\n`);

    const result = await transpileFile(filePath);
    expect(result).not.toBeNull();
    expect(result!.code).toContain('42');
    expect(result!.time).toBeGreaterThanOrEqual(0);
  });

  test('returns null for unreadable files', async () => {
    const result = await transpileFile('/nonexistent/entry.ts');
    expect(result).toBeNull();
  });
});

describe('migrate templates', () => {
  test('mainTsTemplate uses OrbitFactory from orbit-core', () => {
    expect(mainTsTemplate).toContain("import { OrbitFactory } from '@galaxy-stack/orbit-core'");
    expect(mainTsTemplate).toContain('OrbitFactory.create(AppModule)');
    expect(mainTsTemplate).not.toContain('BunFactory');
  });

  test('appModuleTemplate declares AppModule with orbit-core Module', () => {
    expect(appModuleTemplate).toContain("@galaxy-stack/orbit-core");
    expect(appModuleTemplate).toContain('export class AppModule');
  });

  test('packageJsonUpdates target orbit packages', () => {
    const deps = { ...packageJsonUpdates.dependencies, ...packageJsonUpdates.devDependencies };
    const keys = Object.keys(deps);
    expect(keys.some((k) => k.startsWith('@galaxy-stack/orbit-'))).toBe(true);
  });

  test('tsconfigUpdates carries compiler options', () => {
    expect(Object.keys(tsconfigUpdates).length).toBeGreaterThan(0);
  });

  test('generateMigrationGuide always includes the automatic-changes section', () => {
    const guide = generateMigrationGuide({
      hasTypeOrm: false, hasMongoose: false, hasPassport: false,
      hasBcrypt: false, hasClassValidator: false,
    });

    expect(guide).toContain('# Orbit Migration Guide');
    expect(guide).toContain('Automatic Changes');
    expect(guide).toContain('OrbitFactory');
    expect(guide).not.toContain('TypeORM → Drizzle');
  });

  test('guide sections appear conditionally based on the analysis', () => {
    const full = generateMigrationGuide({
      hasTypeOrm: true, hasMongoose: true, hasPassport: true,
      hasBcrypt: true, hasClassValidator: true,
    });

    expect(full).toContain('TypeORM → Drizzle');
    expect(full).toContain('Passport');
    expect(full).toContain('Bun.password');
  });
});
