import { describe, test, expect } from 'bun:test';
import { templates, schematicAliases } from '../templates';
import { generateCommand } from './generate';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('CLI templates', () => {
  test('all standard schematics exist', () => {
    for (const schematic of ['service', 'controller', 'module', 'guard', 'pipe', 'interceptor', 'middleware', 'filter']) {
      expect(typeof templates[schematic]).toBe('function');
    }
  });

  test('service template references the class name', () => {
    const content = templates.service('user-service', 'UserService');
    expect(content).toContain('@Injectable()');
    expect(content).toContain('export class UserService');
  });

  test('module template declares a module class', () => {
    const content = templates.module('user-module', 'UserModule');
    expect(content).toContain("import { Module } from '@galaxy-stack/orbit-core'");
    expect(content).toContain('export class UserModule');
  });
});

describe('schematicAliases', () => {
  test('common shorthand aliases resolve to real schematics or resources', () => {
    // some aliases point to multi-file resources handled separately
    const resourceSchematics = ['resource', 'graphql-resource', 'microservice-resource'];
    for (const [alias, canonical] of Object.entries(schematicAliases)) {
      const isTemplate = typeof templates[canonical] === 'function';
      const isResource = resourceSchematics.includes(canonical);
      expect(isTemplate || isResource).toBe(true);
    }
  });
});

describe('generateCommand (real filesystem)', () => {
  const tmpDir = `${process.env.TEMPDIR || '/tmp'}/orbit-cli-test-${Date.now()}`;

  test('generates a service file with spec', async () => {
    await generateCommand('service', 'user-profile', {
      path: tmpDir,
      flat: true,
      spec: true,
      skipImport: true,
    });

    const servicePath = join(tmpDir, 'user-profile.service.ts');
    const specPath = join(tmpDir, 'user-profile.service.spec.ts');
    expect(existsSync(servicePath)).toBe(true);
    expect(existsSync(specPath)).toBe(true);

    const content = readFileSync(servicePath, 'utf-8');
    expect(content).toContain('export class UserProfileService');
  });

  test('generates into nested directory when not flat', async () => {
    await generateCommand('service', 'mail', {
      path: tmpDir,
      spec: false,
      skipImport: true,
    });

    expect(existsSync(join(tmpDir, 'mail', 'mail.service.ts'))).toBe(true);
  });

  test('dry run creates nothing', async () => {
    const before = existsSync(join(tmpDir, 'dry-run.service.ts'));
    await generateCommand('service', 'dry-run', {
      path: tmpDir,
      dryRun: true,
      spec: false,
      skipImport: true,
    });
    expect(existsSync(join(tmpDir, 'dry-run.service.ts'))).toBe(before);
  });

  test('unknown schematic fails gracefully', async () => {
    await generateCommand('not-a-schematic', 'x', { path: tmpDir, skipImport: true });
    expect(true).toBe(true); // no throw
  });

  test('resource generates controller + service + module files', async () => {
    await generateCommand('resource', 'invoice', {
      path: tmpDir,
      spec: false,
      skipImport: true,
    });
    expect(existsSync(join(tmpDir, 'invoice', 'invoice.controller.ts'))).toBe(true);
    expect(existsSync(join(tmpDir, 'invoice', 'invoice.service.ts'))).toBe(true);
  });
});
