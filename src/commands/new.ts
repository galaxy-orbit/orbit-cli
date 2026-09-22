import { mkdir, writeFile, exists } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

export interface NewProjectOptions {
  directory?: string;
  skipInstall?: boolean;
}

export async function newProjectCommand(
  name: string,
  options: NewProjectOptions
): Promise<void> {
  const spinner = ora('Creating new Orbit project...').start();
  
  try {
    const projectDir = options.directory || name;
    
    if (await exists(projectDir)) {
      spinner.fail(chalk.red(`Directory already exists: ${projectDir}`));
      return;
    }
    
    await mkdir(projectDir, { recursive: true });
    await mkdir(join(projectDir, 'src'), { recursive: true });
    
    await writeFile(join(projectDir, 'package.json'), packageJsonTemplate(name));
    await writeFile(join(projectDir, 'tsconfig.json'), tsconfigTemplate());
    await writeFile(join(projectDir, 'src/main.ts'), mainTemplate());
    await writeFile(join(projectDir, 'src/app.module.ts'), appModuleTemplate());
    await writeFile(join(projectDir, 'src/app.controller.ts'), appControllerTemplate());
    await writeFile(join(projectDir, 'src/app.service.ts'), appServiceTemplate());
    await writeFile(join(projectDir, '.gitignore'), gitignoreTemplate());
    await writeFile(join(projectDir, 'README.md'), readmeTemplate(name));
    
    spinner.succeed(chalk.green(`Created project: ${projectDir}`));
    
    if (!options.skipInstall) {
      const installSpinner = ora('Installing dependencies...').start();
      try {
        const proc = Bun.spawn(['bun', 'install'], {
          cwd: projectDir,
          stdout: 'pipe',
          stderr: 'pipe',
        });
        await proc.exited;
        if (proc.exitCode === 0) {
          installSpinner.succeed(chalk.green('Dependencies installed'));
        } else {
          installSpinner.warn(chalk.yellow('Failed to install dependencies. Run `bun install` manually.'));
        }
      } catch {
        installSpinner.warn(chalk.yellow('Failed to install dependencies. Run `bun install` manually.'));
      }
    }
    
    console.log('\n' + chalk.cyan('Next steps:'));
    console.log(chalk.gray(`  cd ${projectDir}`));
    if (options.skipInstall) {
      console.log(chalk.gray('  bun install'));
    }
    console.log(chalk.gray('  bun run dev'));
    console.log('');
    
  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    console.error(error);
  }
}

function packageJsonTemplate(name: string): string {
  return JSON.stringify({
    name,
    version: '0.0.1',
    type: 'module',
    scripts: {
      dev: 'bun run --watch src/main.ts',
      start: 'bun run src/main.ts',
      build: 'bun build src/main.ts --outdir dist --target bun',
      test: 'bun test',
    },
    dependencies: {
      // scaffolded projects live OUTSIDE this monorepo — pin the published
      // npm ranges instead of workspace protocol
      '@galaxy-stack/orbit-core': '^0.1.0',
      '@galaxy-stack/orbit-common': '^0.1.0',
      'reflect-metadata': '^0.2.2',
    },
    devDependencies: {
      '@types/bun': 'latest',
      typescript: '^5.0.0',
    },
  }, null, 2) + '\n';
}

function tsconfigTemplate(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      declaration: true,
      outDir: './dist',
      rootDir: './src',
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  }, null, 2) + '\n';
}

function mainTemplate(): string {
  return `import 'reflect-metadata';
import { OrbitFactory } from '@galaxy-stack/orbit-core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await OrbitFactory.create(AppModule, {
    port: 3000,
    logger: true,
  });

  await app.listen();
}

bootstrap().catch(console.error);
`;
}

function appModuleTemplate(): string {
  return `import { Module } from '@galaxy-stack/orbit-core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;
}

function appControllerTemplate(): string {
  return `import { Controller, Get } from '@galaxy-stack/orbit-core';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }
}
`;
}

function appServiceTemplate(): string {
  return `import { Injectable } from '@galaxy-stack/orbit-core';

@Injectable()
export class AppService {
  getHello() {
    return { message: 'Hello from Orbit!' };
  }
}
`;
}

function gitignoreTemplate(): string {
  return `node_modules/
dist/
.env
*.log
`;
}

function readmeTemplate(name: string): string {
  return `# ${name}

A Orbit application.

## Getting Started

\`\`\`bash
# Development
bun run dev

# Production
bun run build
bun run start

# Testing
bun test
\`\`\`

## Project Structure

\`\`\`
src/
├── main.ts           # Application entry point
├── app.module.ts     # Root module
├── app.controller.ts # Root controller
└── app.service.ts    # Root service
\`\`\`
`;
}
