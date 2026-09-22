import { spawn, Transpiler } from 'bun';
import chalk from 'chalk';
import { exists, readFile } from 'fs/promises';

export interface DevOptions {
  port?: string;
  entry?: string;
  transpile?: boolean;
}

const transpiler = new Transpiler({
  loader: 'tsx',
  target: 'bun',
  trimUnusedImports: true,
});

async function transpileFile(filePath: string): Promise<{ code: string; time: number } | null> {
  try {
    const start = performance.now();
    const source = await readFile(filePath, 'utf-8');
    const code = transpiler.transformSync(source);
    const time = performance.now() - start;
    return { code, time };
  } catch (error) {
    return null;
  }
}

export async function devCommand(options: DevOptions): Promise<void> {
  const entryFile = options.entry || 'src/main.ts';
  
  if (!await exists(entryFile)) {
    console.log(chalk.red(`Entry file not found: ${entryFile}`));
    console.log(chalk.yellow('Make sure you are in a Orbit project directory.'));
    return;
  }
  
  console.log(chalk.cyan('Starting development server with hot reload...'));
  console.log(chalk.gray(`Entry: ${entryFile}`));
  
  if (options.transpile) {
    const result = await transpileFile(entryFile);
    if (result) {
      console.log(chalk.green(`Transpiled ${entryFile} in ${result.time.toFixed(2)}ms`));
    }
  }
  
  if (options.port) {
    process.env.PORT = options.port;
  }
  
  const proc = spawn(['bun', 'run', '--watch', entryFile], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  
  process.on('SIGINT' as any, () => {
    proc.kill();
    process.exit(0);
  });
  
  process.on('SIGTERM' as any, () => {
    proc.kill();
    process.exit(0);
  });
  
  await proc.exited;
}

export { transpiler, transpileFile };
