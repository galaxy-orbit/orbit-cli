import { spawn, type Subprocess } from 'bun';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

interface BenchmarkConfig {
  name: string;
  port: number;
  command: string[];
  runtime: 'bun' | 'node';
}

interface BenchmarkResult {
  framework: string;
  scenario: string;
  requestsPerSec: number;
  latencyAvg: number;
  latencyP50: number;
  latencyP99: number;
  latencyMax: number;
  throughput: number;
  errors: number;
  timeouts: number;
}

interface ColdStartResult {
  framework: string;
  coldStart: number;
  rss: number | null;
}

interface ScenarioConfig {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  body?: object;
  headers?: Record<string, string>;
}

const frameworks: BenchmarkConfig[] = [
  {
    name: 'Orbit',
    port: 3001,
    command: ['bun', 'run', 'servers/orbit.ts'],
    runtime: 'bun',
  },
  {
    name: 'Elysia',
    port: 3002,
    command: ['bun', 'run', 'servers/elysia.ts'],
    runtime: 'bun',
  },
  {
    name: 'Hono',
    port: 3003,
    command: ['bun', 'run', 'servers/hono.ts'],
    runtime: 'bun',
  },
  {
    name: 'Fastify',
    port: 3004,
    command: ['node', 'servers/fastify.mjs'],
    runtime: 'node',
  },
  {
    name: 'Express',
    port: 3005,
    command: ['node', 'servers/express.mjs'],
    runtime: 'node',
  },
  {
    name: 'NestJS Express',
    port: 3006,
    command: ['node', 'compiled/nestjs-express.js'],
    runtime: 'node',
  },
  {
    name: 'NestJS Fastify',
    port: 3007,
    command: ['node', 'compiled/nestjs-fastify.js'],
    runtime: 'node',
  },
];

const scenarios: ScenarioConfig[] = [
  {
    name: 'hello-world',
    path: '/',
    method: 'GET',
  },
  {
    name: 'json-serialization',
    path: '/json',
    method: 'GET',
  },
  {
    name: 'path-params',
    path: '/users/123',
    method: 'GET',
  },
  {
    name: 'query-params',
    path: '/search?q=test&page=1&limit=10',
    method: 'GET',
  },
  {
    name: 'body-parsing',
    path: '/users',
    method: 'POST',
    body: { name: 'John Doe', email: 'john@example.com', age: 30 },
    headers: { 'Content-Type': 'application/json' },
  },
  {
    name: 'db-sqlite',
    path: '/db/users/123',
    method: 'GET',
  },
  {
    name: 'db-list',
    path: '/db/users',
    method: 'GET',
  },
  {
    name: 'db-insert',
    path: '/db/users',
    method: 'POST',
    body: { name: 'John Doe', email: 'john@example.com', age: 30 },
    headers: { 'Content-Type': 'application/json' },
  },
];

async function runAutocannon(
  url: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    connections?: number;
    duration?: number;
  } = {}
): Promise<any> {
  const args = [
    '-c', String(options.connections || 10),
    '-d', String(options.duration || 10),
    '-j',
    '-m', options.method || 'GET',
  ];

  if (options.body) {
    args.push('-b', options.body);
  }

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      args.push('-H', `${key}: ${value}`);
    }
  }

  args.push(url);

  const proc = spawn(['npx', 'autocannon', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  try {
    return JSON.parse(output);
  } catch {
    console.error('Failed to parse autocannon output:', output);
    return null;
  }
}

async function waitForServer(port: number, timeout = 10000): Promise<boolean> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) return true;
    } catch {
      await Bun.sleep(100);
    }
  }
  
  return false;
}

async function runBenchmark(
  framework: BenchmarkConfig,
  scenario: ScenarioConfig,
  options: { connections: number; duration: number }
): Promise<BenchmarkResult | null> {
  console.log(`  Running ${scenario.name}...`);

  const url = `http://localhost:${framework.port}${scenario.path}`;
  
  const result = await runAutocannon(url, {
    method: scenario.method,
    body: scenario.body ? JSON.stringify(scenario.body) : undefined,
    headers: scenario.headers,
    connections: options.connections,
    duration: options.duration,
  });

  if (!result) return null;

  return {
    framework: framework.name,
    scenario: scenario.name,
    requestsPerSec: result.requests?.average || 0,
    latencyAvg: result.latency?.average || 0,
    latencyP50: result.latency?.p50 || 0,
    latencyP99: result.latency?.p99 || 0,
    latencyMax: result.latency?.max || 0,
    throughput: result.throughput?.average || 0,
    errors: result.errors || 0,
    timeouts: result.timeouts || 0,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const connections = parseInt(args.find(a => a.startsWith('--connections='))?.split('=')[1] || '10');
  const duration = parseInt(args.find(a => a.startsWith('--duration='))?.split('=')[1] || '10');
  const scenarioFilter = args.find(a => a.startsWith('--scenario='))?.split('=')[1];
  const runs = parseInt(args.find(a => a.startsWith('--runs='))?.split('=')[1] || '1');

  console.log('\n🚀 Orbit Benchmark Suite\n');
  console.log(`Connections: ${connections}`);
  console.log(`Duration: ${duration}s per scenario`);
  console.log('');

  const results: BenchmarkResult[] = [];
  const processes: Subprocess[] = [];

  const filteredScenarios = scenarioFilter
    ? scenarios.filter(s => s.name === scenarioFilter)
    : scenarios;

  const coldStarts: ColdStartResult[] = [];

  for (const framework of frameworks) {
    console.log(`\n📦 Starting ${framework.name} on port ${framework.port}...`);

    const bootStart = Date.now();
    const proc = spawn(framework.command, {
      stdout: 'ignore',
      stderr: 'ignore',
      cwd: import.meta.dir.replace('/src', ''),
    });
    processes.push(proc);

    const ready = await waitForServer(framework.port);
    if (!ready) {
      console.log(`  ❌ Failed to start ${framework.name}`);
      proc.kill();
      continue;
    }

    const coldStart = Date.now() - bootStart;
    console.log(`  ✅ ${framework.name} ready in ${coldStart}ms (cold start)`);

    // RSS from /proc is Linux-only; on macOS sample via ps
    let rss = 0;
    try {
      const rssProc = spawn(['ps', '-o', 'rss=', '-p', String(proc.pid)]);
      const rssOut = await new Response(rssProc.stdout).text();
      rss = parseInt(rssOut.trim(), 10) || 0;
    } catch {}

    coldStarts.push({ framework: framework.name, coldStart, rss });

    for (const scenario of filteredScenarios) {
      let best: BenchmarkResult | null = null;
      for (let i = 0; i < runs; i++) {
        const result = await runBenchmark(framework, scenario, { connections, duration });
        if (result && (!best || result.requestsPerSec > best.requestsPerSec)) {
          best = result;
        }
        if (runs > 1 && i < runs - 1) await Bun.sleep(500);
      }
      if (best) {
        results.push(best);
        console.log(`     ✓ ${best.requestsPerSec.toLocaleString()} req/s (best of ${runs})`);
      }
    }

    proc.kill();
    await Bun.sleep(500);
  }

  await mkdir('results', { recursive: true });
  await writeFile(join('results', `coldstart-${Date.now()}.json`), JSON.stringify(coldStarts, null, 2));
  console.log('\n⏱  Cold start summary:');
  for (const c of coldStarts) {
    console.log(`   ${c.framework.padEnd(18)} ${String(c.coldStart).padStart(6)}ms  rss=${(c.rss / 1024).toFixed(1)}MB`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = join('results', `benchmark-${timestamp}.json`);
  const mdPath = join('results', `benchmark-${timestamp}.md`);

  await writeFile(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n📊 Results saved to ${jsonPath}`);

  const markdown = generateMarkdownReport(results);
  await writeFile(mdPath, markdown);
  console.log(`📊 Report saved to ${mdPath}`);

  printSummary(results);
}

function generateMarkdownReport(results: BenchmarkResult[]): string {
  const byScenario = new Map<string, BenchmarkResult[]>();
  
  for (const r of results) {
    const list = byScenario.get(r.scenario) || [];
    list.push(r);
    byScenario.set(r.scenario, list);
  }

  let md = '# Orbit Benchmark Results\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;

  for (const [scenario, scenarioResults] of byScenario) {
    md += `## ${scenario}\n\n`;
    md += '| Framework | Req/sec | Latency (avg) | Latency (p99) | Throughput |\n';
    md += '|-----------|---------|---------------|---------------|------------|\n';

    const sorted = scenarioResults.sort((a, b) => b.requestsPerSec - a.requestsPerSec);
    
    for (const r of sorted) {
      md += `| ${r.framework} | ${r.requestsPerSec.toLocaleString()} | ${r.latencyAvg.toFixed(2)}ms | ${r.latencyP99.toFixed(2)}ms | ${formatBytes(r.throughput)}/s |\n`;
    }
    
    md += '\n';
  }

  return md;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function printSummary(results: BenchmarkResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY - Requests per second (higher is better)');
  console.log('='.repeat(80) + '\n');

  const byScenario = new Map<string, BenchmarkResult[]>();
  
  for (const r of results) {
    const list = byScenario.get(r.scenario) || [];
    list.push(r);
    byScenario.set(r.scenario, list);
  }

  for (const [scenario, scenarioResults] of byScenario) {
    console.log(`\n${scenario}:`);
    const sorted = scenarioResults.sort((a, b) => b.requestsPerSec - a.requestsPerSec);
    
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      console.log(`  ${medal} ${r.framework.padEnd(20)} ${r.requestsPerSec.toLocaleString().padStart(10)} req/s`);
    }
  }
}

main().catch(console.error);
