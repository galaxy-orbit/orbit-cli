export interface TransformResult {
  code: string;
  changes: string[];
  warnings: string[];
}

export function transformImports(code: string): TransformResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  let result = code;

  const importMappings: Record<string, string> = {
    '@nestjs/common': '@galaxy-stack/orbit-common',
    '@nestjs/core': '@galaxy-stack/orbit-core',
    '@nestjs/config': '@galaxy-stack/orbit-config',
    '@nestjs/graphql': '@galaxy-stack/orbit-graphql',
    '@nestjs/microservices': '@galaxy-stack/orbit-microservices',
    '@nestjs/websockets': '@galaxy-stack/orbit-websockets',
    '@nestjs/schedule': '@galaxy-stack/orbit-schedule',
    '@nestjs/terminus': '@galaxy-stack/orbit-terminus',
    '@nestjs/throttler': '@galaxy-stack/orbit-throttler',
    '@nestjs/jwt': '@galaxy-stack/orbit-auth',
    '@nestjs/passport': '@galaxy-stack/orbit-auth',
    '@nestjs/cache-manager': '@galaxy-stack/orbit-cache',
    '@nestjs/swagger': '@galaxy-stack/orbit-swagger',
    '@nestjs/testing': '@galaxy-stack/orbit-testing',
  };

  for (const [from, to] of Object.entries(importMappings)) {
    const regex = new RegExp(`(['"])${escapeRegex(from)}\\1`, 'g');
    if (regex.test(result)) {
      result = result.replace(regex, `'${to}'`);
      changes.push(`Import: ${from} → ${to}`);
    }
  }

  return { code: result, changes, warnings };
}

export function transformFactoryMethods(code: string): TransformResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  let result = code;

  if (result.includes('NestFactory')) {
    result = result.replace(/NestFactory\.create/g, 'OrbitFactory.create');
    result = result.replace(/NestFactory\.createMicroservice/g, 'OrbitFactory.createMicroservice');
    result = result.replace(/NestFactory\.createApplicationContext/g, 'OrbitFactory.createApplicationContext');
    changes.push('NestFactory → OrbitFactory');
  }

  return { code: result, changes, warnings };
}

export function transformPlatformAdapters(code: string): TransformResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  let result = code;

  const platformPatterns = [
    { pattern: /NestExpressApplication/g, replacement: 'BunApplication' },
    { pattern: /NestFastifyApplication/g, replacement: 'BunApplication' },
    { pattern: /FastifyAdapter/g, replacement: '' },
    { pattern: /ExpressAdapter/g, replacement: '' },
  ];

  for (const { pattern, replacement } of platformPatterns) {
    if (pattern.test(result)) {
      if (replacement) {
        result = result.replace(pattern, replacement);
        changes.push(`Platform type updated`);
      } else {
        warnings.push('Platform adapter usage detected - manual review needed');
      }
    }
  }

  return { code: result, changes, warnings };
}

export function transformTypeOrmToDb(code: string): TransformResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  let result = code;

  if (result.includes('TypeOrmModule')) {
    warnings.push('TypeORM detected - consider migrating to @galaxy-stack/orbit-database (Drizzle)');
  }

  if (result.includes('@InjectRepository')) {
    warnings.push('@InjectRepository usage - replace with @InjectDatabase');
  }

  if (result.includes('getRepository')) {
    warnings.push('getRepository usage - use Repository pattern from @galaxy-stack/orbit-database');
  }

  return { code: result, changes, warnings };
}

export function transformPassportToAuth(code: string): TransformResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  let result = code;

  if (result.includes('PassportStrategy')) {
    warnings.push('PassportStrategy detected - use @galaxy-stack/orbit-auth guards instead');
  }

  if (result.includes('AuthGuard(')) {
    result = result.replace(/AuthGuard\(['"]jwt['"]\)/g, 'JwtAuthGuard');
    result = result.replace(/AuthGuard\(['"]local['"]\)/g, 'LocalAuthGuard');
    changes.push('AuthGuard strategy → specific guard');
  }

  return { code: result, changes, warnings };
}

export function transformBcryptToBun(code: string): TransformResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  let result = code;

  if (result.includes('bcrypt')) {
    const bcryptPatterns = [
      { pattern: /await\s+bcrypt\.hash\(([^,]+),\s*\d+\)/g, replacement: 'await Bun.password.hash($1)' },
      { pattern: /await\s+bcrypt\.compare\(([^,]+),\s*([^)]+)\)/g, replacement: 'await Bun.password.verify($1, $2)' },
    ];

    for (const { pattern, replacement } of bcryptPatterns) {
      if (pattern.test(result)) {
        result = result.replace(pattern, replacement);
        changes.push('bcrypt → Bun.password');
      }
    }

    result = result.replace(/import\s*\*?\s*as?\s*bcrypt\s*from\s*['"]bcrypt['"]/g, '// Removed bcrypt import - using Bun.password');
  }

  return { code: result, changes, warnings };
}

export function transformClassValidator(code: string): TransformResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  let result = code;

  if (result.includes('class-validator') || result.includes('class-transformer')) {
    warnings.push('class-validator detected - consider using Zod with @galaxy-stack/orbit-validation');
  }

  return { code: result, changes, warnings };
}

export function transformAll(code: string): TransformResult {
  const transformers = [
    transformImports,
    transformFactoryMethods,
    transformPlatformAdapters,
    transformTypeOrmToDb,
    transformPassportToAuth,
    transformBcryptToBun,
    transformClassValidator,
  ];

  let result = code;
  const allChanges: string[] = [];
  const allWarnings: string[] = [];

  for (const transformer of transformers) {
    const { code: newCode, changes, warnings } = transformer(result);
    result = newCode;
    allChanges.push(...changes);
    allWarnings.push(...warnings);
  }

  return {
    code: result,
    changes: allChanges,
    warnings: allWarnings,
  };
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
