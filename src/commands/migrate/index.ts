import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import chalk from 'chalk';
import ora from 'ora';

interface MigrationResult {
  file: string;
  changes: string[];
  warnings: string[];
}

interface MigrationReport {
  totalFiles: number;
  modifiedFiles: number;
  results: MigrationResult[];
  summary: {
    decoratorsUpdated: number;
    importsUpdated: number;
    configUpdated: number;
    warnings: number;
  };
}

const nestToGalaxyImports: Record<string, string> = {
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
  '@nestjs/typeorm': '@galaxy-stack/orbit-database',
  '@nestjs/mongoose': '@galaxy-stack/orbit-database',
  '@nestjs/sequelize': '@galaxy-stack/orbit-database',
};

const platformImports: Record<string, string> = {
  '@nestjs/platform-express': '@galaxy-stack/orbit-platform-bun',
  '@nestjs/platform-fastify': '@galaxy-stack/orbit-platform-bun',
};

const deprecatedImports = [
  '@nestjs/platform-express',
  '@nestjs/platform-fastify',
  '@nestjs/platform-socket.io',
  '@nestjs/platform-ws',
];

export function createMigrateCommand(): Command {
  const migrate = new Command('migrate');

  migrate
    .description('Migrate a NestJS project to Orbit')
    .argument('[path]', 'Path to NestJS project', '.')
    .option('--dry-run', 'Preview changes without modifying files')
    .option('--verbose', 'Show detailed output')
    .option('--skip-backup', 'Skip creating backup files')
    .action(async (projectPath: string, options) => {
      await runMigration(projectPath, options);
    });

  migrate
    .command('analyze')
    .description('Analyze a NestJS project for migration compatibility')
    .argument('[path]', 'Path to NestJS project', '.')
    .action(async (projectPath: string) => {
      await analyzeProject(projectPath);
    });

  migrate
    .command('imports')
    .description('Update only import statements')
    .argument('[path]', 'Path to project', '.')
    .option('--dry-run', 'Preview changes')
    .action(async (projectPath: string, options) => {
      await migrateImports(projectPath, options);
    });

  return migrate;
}

async function runMigration(projectPath: string, options: { dryRun?: boolean; verbose?: boolean; skipBackup?: boolean }) {
  const spinner = ora('Starting migration...').start();
  
  const absolutePath = join(process.cwd(), projectPath);
  
  if (!existsSync(absolutePath)) {
    spinner.fail(`Project path not found: ${absolutePath}`);
    return;
  }

  const packageJsonPath = join(absolutePath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    spinner.fail('No package.json found. Is this a valid project?');
    return;
  }

  spinner.text = 'Analyzing project...';

  const report: MigrationReport = {
    totalFiles: 0,
    modifiedFiles: 0,
    results: [],
    summary: {
      decoratorsUpdated: 0,
      importsUpdated: 0,
      configUpdated: 0,
      warnings: 0,
    },
  };

  const tsFiles = findTypeScriptFiles(absolutePath);
  report.totalFiles = tsFiles.length;

  spinner.text = `Processing ${tsFiles.length} TypeScript files...`;

  for (const file of tsFiles) {
    const result = await migrateFile(file, absolutePath, options);
    
    if (result.changes.length > 0 || result.warnings.length > 0) {
      report.results.push(result);
      
      if (result.changes.length > 0) {
        report.modifiedFiles++;
      }
      
      for (const change of result.changes) {
        if (change.includes('import')) report.summary.importsUpdated++;
        if (change.includes('decorator')) report.summary.decoratorsUpdated++;
      }
      
      report.summary.warnings += result.warnings.length;
    }
  }

  spinner.text = 'Updating package.json...';
  await migratePackageJson(packageJsonPath, options);
  report.summary.configUpdated++;

  const mainTsPath = join(absolutePath, 'src', 'main.ts');
  if (existsSync(mainTsPath)) {
    spinner.text = 'Updating main.ts bootstrap...';
    await migrateMainTs(mainTsPath, options);
  }

  spinner.succeed('Migration complete!');

  console.log('\n' + chalk.bold('Migration Report'));
  console.log('─'.repeat(50));
  console.log(`Total files scanned: ${report.totalFiles}`);
  console.log(`Files modified: ${report.modifiedFiles}`);
  console.log(`Imports updated: ${report.summary.importsUpdated}`);
  console.log(`Warnings: ${chalk.yellow(report.summary.warnings)}`);

  if (report.summary.warnings > 0) {
    console.log('\n' + chalk.yellow('Warnings:'));
    for (const result of report.results) {
      for (const warning of result.warnings) {
        console.log(`  ${chalk.yellow('⚠')} ${relative(absolutePath, result.file)}: ${warning}`);
      }
    }
  }

  if (options.dryRun) {
    console.log('\n' + chalk.cyan('This was a dry run. No files were modified.'));
    console.log('Run without --dry-run to apply changes.');
  }

  console.log('\n' + chalk.green('Next steps:'));
  console.log('1. Review the changes made to your project');
  console.log('2. Run: bun install');
  console.log('3. Run: bun run dev');
  console.log('4. Check the Orbit docs for any manual adjustments');
}

async function migrateFile(
  filePath: string,
  projectRoot: string,
  options: { dryRun?: boolean; verbose?: boolean; skipBackup?: boolean }
): Promise<MigrationResult> {
  const result: MigrationResult = {
    file: filePath,
    changes: [],
    warnings: [],
  };

  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  for (const [nestImport, galaxyImport] of Object.entries(nestToGalaxyImports)) {
    const importRegex = new RegExp(`from\\s+['"]${escapeRegex(nestImport)}['"]`, 'g');
    
    if (importRegex.test(content)) {
      content = content.replace(importRegex, `from '${galaxyImport}'`);
      result.changes.push(`Updated import: ${nestImport} → ${galaxyImport}`);
      modified = true;
    }
  }

  for (const [nestImport, galaxyImport] of Object.entries(platformImports)) {
    const importRegex = new RegExp(`from\\s+['"]${escapeRegex(nestImport)}['"]`, 'g');
    
    if (importRegex.test(content)) {
      content = content.replace(importRegex, `from '${galaxyImport}'`);
      result.changes.push(`Updated platform import: ${nestImport} → ${galaxyImport}`);
      result.warnings.push(`Platform adapter changed. Review Bun.serve() usage.`);
      modified = true;
    }
  }

  if (content.includes('NestFactory.create')) {
    content = content.replace(/NestFactory\.create/g, 'OrbitFactory.create');
    content = content.replace(/NestFactory\.createMicroservice/g, 'OrbitFactory.createMicroservice');
    result.changes.push('Updated NestFactory → OrbitFactory');
    modified = true;
  }

  if (content.includes('NestExpressApplication') || content.includes('NestFastifyApplication')) {
    result.warnings.push('Platform-specific types need manual review');
  }

  if (content.includes('bcrypt')) {
    result.warnings.push('Consider replacing bcrypt with Bun.password for native hashing');
  }

  if (modified && !options.dryRun) {
    if (!options.skipBackup) {
      writeFileSync(filePath + '.bak', readFileSync(filePath));
    }
    writeFileSync(filePath, content);
  }

  return result;
}

async function migratePackageJson(packageJsonPath: string, options: { dryRun?: boolean }) {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  const nestDeps = Object.keys(pkg.dependencies || {}).filter(d => d.startsWith('@nestjs/'));
  const nestDevDeps = Object.keys(pkg.devDependencies || {}).filter(d => d.startsWith('@nestjs/'));

  const newDeps: Record<string, string> = {};
  const removeDeps: string[] = [];

  for (const dep of nestDeps) {
    if (nestToGalaxyImports[dep]) {
      newDeps[nestToGalaxyImports[dep]] = 'latest';
      removeDeps.push(dep);
    } else if (platformImports[dep]) {
      newDeps[platformImports[dep]] = 'latest';
      removeDeps.push(dep);
    }
  }

  newDeps['reflect-metadata'] = '^0.1.13';

  if (!options.dryRun) {
    for (const dep of removeDeps) {
      delete pkg.dependencies[dep];
    }
    
    pkg.dependencies = { ...pkg.dependencies, ...newDeps };

    for (const dep of nestDevDeps) {
      if (dep === '@nestjs/testing') {
        delete pkg.devDependencies[dep];
        pkg.devDependencies['@galaxy-stack/orbit-testing'] = 'latest';
      }
    }

    delete pkg.devDependencies['@nestjs/cli'];
    delete pkg.devDependencies['@nestjs/schematics'];

    writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
  }
}

async function migrateMainTs(mainTsPath: string, options: { dryRun?: boolean }) {
  let content = readFileSync(mainTsPath, 'utf-8');

  content = content.replace(
    /import\s*{\s*NestFactory\s*}\s*from\s*['"]@nestjs\/core['"]/g,
    "import { OrbitFactory } from '@galaxy-stack/orbit-core'"
  );

  content = content.replace(/NestFactory\.create/g, 'OrbitFactory.create');

  content = content.replace(/app\.enableCors\(\)/g, "app.use(new CorsMiddleware())");

  if (!options.dryRun) {
    writeFileSync(mainTsPath, content);
  }
}

async function analyzeProject(projectPath: string) {
  const absolutePath = join(process.cwd(), projectPath);
  
  console.log(chalk.bold('\nNestJS to Orbit Migration Analysis\n'));
  console.log('─'.repeat(50));

  const packageJsonPath = join(absolutePath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    console.log(chalk.red('No package.json found'));
    return;
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  
  const nestDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ].filter(d => d.startsWith('@nestjs/'));

  console.log(chalk.bold('NestJS Dependencies Found:'));
  for (const dep of nestDeps) {
    const replacement = nestToGalaxyImports[dep] || platformImports[dep];
    if (replacement) {
      console.log(`  ${chalk.green('✓')} ${dep} → ${replacement}`);
    } else {
      console.log(`  ${chalk.yellow('?')} ${dep} (manual review needed)`);
    }
  }

  const tsFiles = findTypeScriptFiles(absolutePath);
  console.log(`\n${chalk.bold('TypeScript Files:')} ${tsFiles.length}`);

  const issues: string[] = [];

  for (const file of tsFiles) {
    const content = readFileSync(file, 'utf-8');
    
    if (content.includes('TypeOrmModule')) {
      issues.push(`${relative(absolutePath, file)}: TypeORM usage - migrate to Drizzle`);
    }
    
    if (content.includes('MongooseModule')) {
      issues.push(`${relative(absolutePath, file)}: Mongoose usage - migrate to Drizzle MongoDB`);
    }
    
    if (content.includes('bcrypt')) {
      issues.push(`${relative(absolutePath, file)}: bcrypt - can use Bun.password instead`);
    }
  }

  if (issues.length > 0) {
    console.log(`\n${chalk.bold(chalk.yellow('Items Requiring Manual Review:'))}`);
    for (const issue of issues) {
      console.log(`  ${chalk.yellow('⚠')} ${issue}`);
    }
  }

  console.log(`\n${chalk.bold('Migration Compatibility:')} ${issues.length === 0 ? chalk.green('High') : chalk.yellow('Medium')}`);
  console.log(`\nRun ${chalk.cyan('orbit migrate')} to start the migration.`);
}

async function migrateImports(projectPath: string, options: { dryRun?: boolean }) {
  const absolutePath = join(process.cwd(), projectPath);
  const tsFiles = findTypeScriptFiles(absolutePath);
  
  let updatedCount = 0;

  for (const file of tsFiles) {
    let content = readFileSync(file, 'utf-8');
    let modified = false;

    for (const [nestImport, galaxyImport] of Object.entries(nestToGalaxyImports)) {
      const importRegex = new RegExp(`from\\s+['"]${escapeRegex(nestImport)}['"]`, 'g');
      
      if (importRegex.test(content)) {
        content = content.replace(importRegex, `from '${galaxyImport}'`);
        modified = true;
      }
    }

    if (modified) {
      updatedCount++;
      if (!options.dryRun) {
        writeFileSync(file, content);
      }
      console.log(`${options.dryRun ? '[dry-run] ' : ''}Updated: ${relative(absolutePath, file)}`);
    }
  }

  console.log(`\nUpdated ${updatedCount} files.`);
}

function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findTypeScriptFiles(fullPath, files);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
