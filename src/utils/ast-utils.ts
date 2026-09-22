import { readFile, writeFile } from 'fs/promises';

export async function addImportToModule(
  modulePath: string,
  importName: string,
  importPath: string,
  arrayName: 'imports' | 'controllers' | 'providers' | 'exports'
): Promise<{ success: boolean; message: string }> {
  try {
    const content = await readFile(modulePath, 'utf-8');
    
    const importStatement = `import { ${importName} } from '${importPath}';`;
    const hasImport = content.includes(importStatement) || 
                      content.includes(`{ ${importName} }`) ||
                      content.includes(`${importName},`) ||
                      content.includes(`, ${importName}`);
    
    let newContent = content;
    
    if (!hasImport) {
      const lastImportMatch = content.match(/^import .+;$/gm);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        newContent = newContent.replace(lastImport, `${lastImport}\n${importStatement}`);
      } else {
        newContent = `${importStatement}\n${newContent}`;
      }
    }
    
    const arrayRegex = new RegExp(`(${arrayName}:\\s*\\[)([^\\]]*)`, 's');
    const match = newContent.match(arrayRegex);
    
    if (match) {
      const arrayContent = match[2].trim();
      
      if (arrayContent.includes(importName)) {
        return { success: true, message: `${importName} already exists in ${arrayName}` };
      }
      
      let newArrayContent: string;
      if (arrayContent === '') {
        newArrayContent = importName;
      } else if (arrayContent.endsWith(',')) {
        newArrayContent = `${arrayContent} ${importName}`;
      } else {
        newArrayContent = `${arrayContent}, ${importName}`;
      }
      
      newContent = newContent.replace(arrayRegex, `$1${newArrayContent}`);
    } else {
      return { success: false, message: `Could not find ${arrayName} array in module` };
    }
    
    await writeFile(modulePath, newContent);
    return { success: true, message: `Added ${importName} to ${arrayName}` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function findNearestModule(startPath: string): Promise<string | null> {
  const { dirname, join, resolve } = await import('path');
  
  let currentDir = resolve(startPath);
  const maxDepth = 10;
  let depth = 0;
  
  while (depth < maxDepth) {
    const appModulePath = join(currentDir, 'app.module.ts');
    try {
      if (await Bun.file(appModulePath).exists()) {
        return appModulePath;
      }
    } catch {}
    
    try {
      const glob = new Bun.Glob('*.module.ts');
      for await (const file of glob.scan({ cwd: currentDir, onlyFiles: true })) {
        return join(currentDir, file);
      }
    } catch {}
    
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
    depth++;
  }
  
  return null;
}

export function formatModuleUpdate(
  moduleName: string,
  importName: string,
  arrayName: string
): string {
  return `  Updated ${moduleName}: added ${importName} to ${arrayName}`;
}
