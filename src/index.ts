#!/usr/bin/env bun

import { Command } from 'commander';
import { generateCommand } from './commands/generate';
import { newProjectCommand } from './commands/new';
import { devCommand } from './commands/dev';
import { buildCommand } from './commands/build';
import { testCommand } from './commands/test';

const program = new Command();

program
  .name('orbit')
  .description('Orbit CLI - A NestJS-like framework for Bun')
  .version('0.0.1');

program
  .command('new <name>')
  .alias('n')
  .description('Create a new Orbit project')
  .option('-d, --directory <directory>', 'Specify the destination directory')
  .option('--skip-install', 'Skip package installation')
  .action(newProjectCommand);

program
  .command('generate <schematic> <name>')
  .alias('g')
  .description('Generate a component (controller, service, module, guard, pipe, interceptor, middleware, filter, resource)')
  .option('-p, --path <path>', 'Specify the path (default: src)')
  .option('--flat', 'Do not generate a directory')
  .option('--no-spec', 'Do not generate spec file')
  .option('-d, --dry-run', 'Preview changes without writing files')
  .option('--skip-import', 'Do not add to nearest module')
  .option('-m, --module <module>', 'Specify the module to add to')
  .action(generateCommand);

program
  .command('dev')
  .alias('d')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Specify the port')
  .option('-e, --entry <entry>', 'Specify entry file (default: src/main.ts)')
  .action(devCommand);

program
  .command('build')
  .alias('b')
  .description('Build the application for production')
  .option('-e, --entry <entry>', 'Specify entry file (default: src/main.ts)')
  .option('-o, --outdir <outdir>', 'Specify output directory (default: dist)')
  .option('--minify', 'Minify the output')
  .action(buildCommand);

program
  .command('test')
  .alias('t')
  .description('Run tests')
  .option('-w, --watch', 'Watch mode')
  .option('-c, --coverage', 'Collect coverage')
  .option('-p, --pattern <pattern>', 'Test file pattern')
  .action(testCommand);

program
  .command('info')
  .alias('i')
  .description('Display Orbit project information')
  .action(() => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                     Orbit CLI                          ║
╠═══════════════════════════════════════════════════════════╣
║  Orbit Version : 0.0.1                                 ║
║  Bun Version       : ${Bun.version.padEnd(35)}║
║  OS                : ${process.platform.padEnd(35)}║
║  Architecture      : ${process.arch.padEnd(35)}║
╚═══════════════════════════════════════════════════════════╝

Available Commands:
  new <name>              Create a new Orbit project
  generate <type> <name>  Generate a component
  dev                     Start development server
  build                   Build for production
  test                    Run tests
  info                    Display CLI information

Generate Schematics:
  controller (co)   Service (s)      Module (mo)
  Guard (gu)        Pipe (pi)        Interceptor (in)
  Middleware (mi)   Filter (f)       Resource (res)
    `);
  });

program.parse();
