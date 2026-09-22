import { spawn } from 'bun';
import chalk from 'chalk';

export interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  pattern?: string;
}

export async function testCommand(options: TestOptions): Promise<void> {
  console.log(chalk.cyan('Running tests...'));
  
  const args = ['test'];
  
  if (options.watch) {
    args.push('--watch');
  }
  
  if (options.coverage) {
    args.push('--coverage');
  }
  
  if (options.pattern) {
    args.push(options.pattern);
  }
  
  const proc = spawn(['bun', ...args], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  
  const exitCode = await proc.exited;
  process.exit(exitCode);
}
