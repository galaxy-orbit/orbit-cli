import { spawn } from 'bun';
import chalk from 'chalk';
import ora from 'ora';
import { exists } from 'fs/promises';

export interface BuildOptions {
  entry?: string;
  outdir?: string;
  minify?: boolean;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  const entryFile = options.entry || 'src/main.ts';
  const outDir = options.outdir || 'dist';
  
  if (!await exists(entryFile)) {
    console.log(chalk.red(`Entry file not found: ${entryFile}`));
    console.log(chalk.yellow('Make sure you are in a Orbit project directory.'));
    return;
  }
  
  const spinner = ora('Building application...').start();
  
  try {
    const args = [
      'build',
      entryFile,
      '--outdir',
      outDir,
      '--target',
      'bun',
    ];
    
    if (options.minify) {
      args.push('--minify');
    }
    
    const proc = spawn(['bun', ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    
    const exitCode = await proc.exited;
    
    if (exitCode === 0) {
      spinner.succeed(chalk.green(`Build complete: ${outDir}/`));
      console.log(chalk.gray(`  Entry: ${entryFile}`));
      console.log(chalk.gray(`  Output: ${outDir}/`));
    } else {
      spinner.fail(chalk.red('Build failed'));
      const stderr = await new Response(proc.stderr).text();
      console.error(stderr);
    }
  } catch (error) {
    spinner.fail(chalk.red('Build failed'));
    console.error(error);
  }
}
