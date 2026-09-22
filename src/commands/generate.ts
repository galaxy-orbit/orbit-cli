import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, dirname, relative } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { templates, schematicAliases, resourceTemplate, graphqlResourceTemplate, microserviceResourceTemplate } from '../templates';
import { addImportToModule, findNearestModule, formatModuleUpdate } from '../utils/ast-utils';

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export interface GenerateOptions {
  path?: string;
  flat?: boolean;
  spec?: boolean;
  dryRun?: boolean;
  skipImport?: boolean;
  module?: string;
}

interface GeneratedFile {
  path: string;
  content: string;
}

interface ModuleUpdate {
  modulePath: string;
  importName: string;
  importPath: string;
  arrayName: 'imports' | 'controllers' | 'providers' | 'exports';
}

export async function generateCommand(
  schematic: string,
  name: string,
  options: GenerateOptions
): Promise<void> {
  const spinner = ora(`Generating ${schematic}...`).start();
  
  try {
    const resolvedSchematic = schematicAliases[schematic] || schematic;
    const kebabName = toKebabCase(name);
    const className = toPascalCase(name);
    
    const basePath = options.path || 'src';
    const targetDir = options.flat ? basePath : join(basePath, kebabName);
    
    if (resolvedSchematic === 'resource') {
      await generateResource(kebabName, className, targetDir, options, spinner);
      return;
    }
    
    if (resolvedSchematic === 'graphql-resource') {
      await generateGraphqlResource(kebabName, className, targetDir, options, spinner);
      return;
    }
    
    if (resolvedSchematic === 'microservice-resource') {
      await generateMicroserviceResource(kebabName, className, targetDir, options, spinner);
      return;
    }
    
    const template = templates[resolvedSchematic];
    if (!template) {
      spinner.fail(chalk.red(`Unknown schematic: ${schematic}`));
      console.log(chalk.yellow(`Available schematics: ${Object.keys(templates).join(', ')}`));
      console.log(chalk.yellow(`Aliases: ${Object.entries(schematicAliases).map(([k, v]) => `${k}=${v}`).join(', ')}`));
      return;
    }
    
    const fileName = `${kebabName}.${resolvedSchematic}.ts`;
    const filePath = join(targetDir, fileName);
    const content = template(kebabName, className);
    
    const filesToCreate: GeneratedFile[] = [{ path: filePath, content }];
    
    if (options.spec !== false) {
      const specPath = join(targetDir, `${kebabName}.${resolvedSchematic}.spec.ts`);
      const specContent = generateSpecFile(resolvedSchematic, kebabName, className);
      filesToCreate.push({ path: specPath, content: specContent });
    }
    
    const moduleUpdates: ModuleUpdate[] = [];
    
    if (!options.skipImport && shouldUpdateModule(resolvedSchematic)) {
      const modulePath = options.module || await findNearestModule(targetDir) || await findNearestModule(basePath);
      
      if (modulePath) {
        const importName = getImportName(resolvedSchematic, className);
        const importPath = getRelativeImportPath(modulePath, filePath);
        const arrayName = getArrayName(resolvedSchematic);
        
        moduleUpdates.push({
          modulePath,
          importName,
          importPath,
          arrayName,
        });
      }
    }
    
    if (options.dryRun) {
      spinner.info(chalk.cyan('Dry run - no files will be created'));
      console.log(chalk.yellow('\nFiles to create:'));
      for (const file of filesToCreate) {
        console.log(chalk.gray(`  CREATE ${file.path}`));
      }
      if (moduleUpdates.length > 0) {
        console.log(chalk.yellow('\nModule updates:'));
        for (const update of moduleUpdates) {
          console.log(chalk.gray(`  UPDATE ${update.modulePath}`));
          console.log(chalk.gray(`    - Add ${update.importName} to ${update.arrayName}`));
        }
      }
      return;
    }
    
    await mkdir(targetDir, { recursive: true });
    
    for (const file of filesToCreate) {
      const fileExists = await Bun.file(file.path).exists();
      if (fileExists) {
        console.log(chalk.yellow(`  SKIP ${file.path} (already exists)`));
        continue;
      }
      await writeFile(file.path, file.content);
      console.log(chalk.green(`  CREATE ${file.path}`));
    }
    
    for (const update of moduleUpdates) {
      const result = await addImportToModule(
        update.modulePath,
        update.importName,
        update.importPath,
        update.arrayName
      );
      if (result.success) {
        console.log(chalk.blue(`  UPDATE ${update.modulePath}`));
        console.log(chalk.gray(`    Added ${update.importName} to ${update.arrayName}`));
      }
    }
    
    spinner.succeed(chalk.green(`Generated ${resolvedSchematic}: ${className}`));
    
  } catch (error) {
    spinner.fail(chalk.red(`Failed to generate ${schematic}`));
    console.error(error);
  }
}

async function generateResource(
  name: string,
  className: string,
  targetDir: string,
  options: GenerateOptions,
  spinner: ReturnType<typeof ora>
): Promise<void> {
  const resourceFiles = resourceTemplate(name, className);
  
  const files: GeneratedFile[] = [
    { path: join(targetDir, `${name}.controller.ts`), content: resourceFiles.controller },
    { path: join(targetDir, `${name}.service.ts`), content: resourceFiles.service },
    { path: join(targetDir, `${name}.module.ts`), content: resourceFiles.module },
    { path: join(targetDir, `${name}.dto.ts`), content: resourceFiles.dto },
  ];
  
  const moduleUpdates: ModuleUpdate[] = [];
  const basePath = options.path || 'src';
  
  if (!options.skipImport) {
    const appModulePath = options.module || await findNearestModule(basePath);
    
    if (appModulePath) {
      const resourceModulePath = join(targetDir, `${name}.module.ts`);
      const importPath = getRelativeImportPath(appModulePath, resourceModulePath);
      
      moduleUpdates.push({
        modulePath: appModulePath,
        importName: `${className}Module`,
        importPath,
        arrayName: 'imports',
      });
    }
  }
  
  if (options.dryRun) {
    spinner.info(chalk.cyan('Dry run - no files will be created'));
    console.log(chalk.yellow('\nFiles to create:'));
    for (const file of files) {
      console.log(chalk.gray(`  CREATE ${file.path}`));
    }
    if (moduleUpdates.length > 0) {
      console.log(chalk.yellow('\nModule updates:'));
      for (const update of moduleUpdates) {
        console.log(chalk.gray(`  UPDATE ${update.modulePath}`));
        console.log(chalk.gray(`    - Add ${update.importName} to ${update.arrayName}`));
      }
    }
    return;
  }
  
  await mkdir(targetDir, { recursive: true });
  
  for (const file of files) {
    await writeFile(file.path, file.content);
    console.log(chalk.green(`  CREATE ${file.path}`));
  }
  
  for (const update of moduleUpdates) {
    const result = await addImportToModule(
      update.modulePath,
      update.importName,
      update.importPath,
      update.arrayName
    );
    if (result.success) {
      console.log(chalk.blue(`  UPDATE ${update.modulePath}`));
      console.log(chalk.gray(`    Added ${update.importName} to ${update.arrayName}`));
    }
  }
  
  spinner.succeed(chalk.green(`Generated resource: ${className}`));
}

async function generateGraphqlResource(
  name: string,
  className: string,
  targetDir: string,
  options: GenerateOptions,
  spinner: ReturnType<typeof ora>
): Promise<void> {
  const resourceFiles = graphqlResourceTemplate(name, className);
  
  const files: GeneratedFile[] = [
    { path: join(targetDir, `${name}.resolver.ts`), content: resourceFiles.resolver },
    { path: join(targetDir, `${name}.service.ts`), content: resourceFiles.service },
    { path: join(targetDir, `${name}.entity.ts`), content: resourceFiles.entity },
    { path: join(targetDir, `${name}.input.ts`), content: resourceFiles.input },
    { path: join(targetDir, `${name}.module.ts`), content: resourceFiles.module },
  ];
  
  const moduleUpdates: ModuleUpdate[] = [];
  const basePath = options.path || 'src';
  
  if (!options.skipImport) {
    const appModulePath = options.module || await findNearestModule(basePath);
    
    if (appModulePath) {
      const resourceModulePath = join(targetDir, `${name}.module.ts`);
      const importPath = getRelativeImportPath(appModulePath, resourceModulePath);
      
      moduleUpdates.push({
        modulePath: appModulePath,
        importName: `${className}Module`,
        importPath,
        arrayName: 'imports',
      });
    }
  }
  
  if (options.dryRun) {
    spinner.info(chalk.cyan('Dry run - no files will be created'));
    console.log(chalk.yellow('\nFiles to create:'));
    for (const file of files) {
      console.log(chalk.gray(`  CREATE ${file.path}`));
    }
    if (moduleUpdates.length > 0) {
      console.log(chalk.yellow('\nModule updates:'));
      for (const update of moduleUpdates) {
        console.log(chalk.gray(`  UPDATE ${update.modulePath}`));
        console.log(chalk.gray(`    - Add ${update.importName} to ${update.arrayName}`));
      }
    }
    return;
  }
  
  await mkdir(targetDir, { recursive: true });
  
  for (const file of files) {
    await writeFile(file.path, file.content);
    console.log(chalk.green(`  CREATE ${file.path}`));
  }
  
  for (const update of moduleUpdates) {
    const result = await addImportToModule(
      update.modulePath,
      update.importName,
      update.importPath,
      update.arrayName
    );
    if (result.success) {
      console.log(chalk.blue(`  UPDATE ${update.modulePath}`));
      console.log(chalk.gray(`    Added ${update.importName} to ${update.arrayName}`));
    }
  }
  
  spinner.succeed(chalk.green(`Generated GraphQL resource: ${className}`));
}

async function generateMicroserviceResource(
  name: string,
  className: string,
  targetDir: string,
  options: GenerateOptions,
  spinner: ReturnType<typeof ora>
): Promise<void> {
  const resourceFiles = microserviceResourceTemplate(name, className);
  
  const files: GeneratedFile[] = [
    { path: join(targetDir, `${name}.handler.ts`), content: resourceFiles.handler },
    { path: join(targetDir, `${name}.service.ts`), content: resourceFiles.service },
    { path: join(targetDir, `${name}.module.ts`), content: resourceFiles.module },
    { path: join(targetDir, `${name}.client.ts`), content: resourceFiles.client },
  ];
  
  const moduleUpdates: ModuleUpdate[] = [];
  const basePath = options.path || 'src';
  
  if (!options.skipImport) {
    const appModulePath = options.module || await findNearestModule(basePath);
    
    if (appModulePath) {
      const resourceModulePath = join(targetDir, `${name}.module.ts`);
      const importPath = getRelativeImportPath(appModulePath, resourceModulePath);
      
      moduleUpdates.push({
        modulePath: appModulePath,
        importName: `${className}Module`,
        importPath,
        arrayName: 'imports',
      });
    }
  }
  
  if (options.dryRun) {
    spinner.info(chalk.cyan('Dry run - no files will be created'));
    console.log(chalk.yellow('\nFiles to create:'));
    for (const file of files) {
      console.log(chalk.gray(`  CREATE ${file.path}`));
    }
    if (moduleUpdates.length > 0) {
      console.log(chalk.yellow('\nModule updates:'));
      for (const update of moduleUpdates) {
        console.log(chalk.gray(`  UPDATE ${update.modulePath}`));
        console.log(chalk.gray(`    - Add ${update.importName} to ${update.arrayName}`));
      }
    }
    return;
  }
  
  await mkdir(targetDir, { recursive: true });
  
  for (const file of files) {
    await writeFile(file.path, file.content);
    console.log(chalk.green(`  CREATE ${file.path}`));
  }
  
  for (const update of moduleUpdates) {
    const result = await addImportToModule(
      update.modulePath,
      update.importName,
      update.importPath,
      update.arrayName
    );
    if (result.success) {
      console.log(chalk.blue(`  UPDATE ${update.modulePath}`));
      console.log(chalk.gray(`    Added ${update.importName} to ${update.arrayName}`));
    }
  }
  
  spinner.succeed(chalk.green(`Generated microservice resource: ${className}`));
}

function shouldUpdateModule(schematic: string): boolean {
  return ['controller', 'service', 'guard', 'pipe', 'interceptor', 'middleware', 'filter', 'module'].includes(schematic);
}

function getImportName(schematic: string, className: string): string {
  const suffixes: Record<string, string> = {
    controller: 'Controller',
    service: 'Service',
    guard: 'Guard',
    pipe: 'Pipe',
    interceptor: 'Interceptor',
    middleware: 'Middleware',
    filter: 'Filter',
    module: 'Module',
  };
  return `${className}${suffixes[schematic] || toPascalCase(schematic)}`;
}

function getArrayName(schematic: string): 'imports' | 'controllers' | 'providers' | 'exports' {
  switch (schematic) {
    case 'controller':
      return 'controllers';
    case 'module':
      return 'imports';
    default:
      return 'providers';
  }
}

function getRelativeImportPath(fromPath: string, toPath: string): string {
  const fromDir = dirname(fromPath);
  let relativePath = relative(fromDir, toPath);
  
  relativePath = relativePath.replace(/\.ts$/, '');
  
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

function generateSpecFile(schematic: string, name: string, className: string): string {
  const importPath = `./${name}.${schematic}`;
  const entityName = `${className}${toPascalCase(schematic)}`;
  
  return `import { describe, it, expect, beforeEach } from 'bun:test';
import { ${entityName} } from '${importPath}';

describe('${entityName}', () => {
  let ${schematic}: ${entityName};

  beforeEach(() => {
    ${schematic} = new ${entityName}();
  });

  it('should be defined', () => {
    expect(${schematic}).toBeDefined();
  });
});
`;
}
