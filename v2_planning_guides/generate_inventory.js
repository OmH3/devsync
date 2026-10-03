const fs = require('fs');
const path = require('path');

const targetDirs = [
  'server/src/controllers',
  'server/src/services',
  'server/src/models',
  'server/src/routes',
  'server/src/middleware',
  'server/src/utils',
  'client/src/store',
  'client/src/services'
];

const basePath = path.join(__dirname, '..');
const outputDir = path.join(basePath, 'v2_planning_guides');

function extractFunctions(content) {
  const functions = [];
  
  // Match exported arrow functions: export const funcName = (args) =>
  const arrowRegex = /export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?(?:asyncHandler\()?(\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/g;
  let match;
  while ((match = arrowRegex.exec(content)) !== null) {
    functions.push({ name: match[1], params: match[2].trim() });
  }

  // Match exported standard functions: export function funcName(args)
  const funcRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*(\([^)]*\))/g;
  while ((match = funcRegex.exec(content)) !== null) {
    functions.push({ name: match[1], params: match[2].trim() });
  }

  // Match Zustand stores (export const useStore = create(...))
  const storeRegex = /export\s+const\s+(use[a-zA-Z0-9_]+)\s*=\s*create\(/g;
  while ((match = storeRegex.exec(content)) !== null) {
    functions.push({ name: match[1], params: '(Zustand Store)' });
  }

  return functions;
}

targetDirs.forEach(dir => {
  const fullPath = path.join(basePath, dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`Directory not found: ${fullPath}`);
    return;
  }

  const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.js') || f.endsWith('.jsx'));
  if (files.length === 0) return;

  const categoryName = dir.replace(/\//g, '_');
  const outputFile = path.join(outputDir, `v1_${categoryName}_inventory.md`);
  
  let markdown = `# V1 Inventory: ${dir}\n\n`;
  markdown += `This document lists all exported functions in the \`${dir}\` directory to serve as a checklist during the V2 migration.\n\n`;

  files.forEach(file => {
    const fileContent = fs.readFileSync(path.join(fullPath, file), 'utf-8');
    const funcs = extractFunctions(fileContent);
    
    markdown += `## 📄 \`${file}\`\n`;
    if (funcs.length === 0) {
      markdown += `- No exported functions detected or purely structural file.\n\n`;
    } else {
      funcs.forEach(f => {
        let params = f.params;
        if (params.startsWith('asyncHandler(')) {
            params = params.replace('asyncHandler(', '');
        }
        markdown += `- \`${f.name}${params}\`\n`;
      });
      markdown += '\n';
    }
  });

  fs.writeFileSync(outputFile, markdown);
  console.log(`Generated: ${outputFile}`);
});
