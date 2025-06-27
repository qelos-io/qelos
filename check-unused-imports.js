#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function findVueFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && item !== 'node_modules') {
      files.push(...findVueFiles(fullPath));
    } else if (item.endsWith('.vue')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractImports(content) {
  const imports = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match various import patterns
    const importPatterns = [
      /^import\s+(\w+)\s+from/,  // import Something from
      /^import\s+\{\s*([^}]+)\s*\}\s+from/,  // import { Something } from
      /^import\s+(\w+),\s*\{\s*([^}]+)\s*\}\s+from/,  // import Default, { Named } from
    ];
    
    for (const pattern of importPatterns) {
      const match = line.match(pattern);
      if (match) {
        if (pattern.source.includes('\\{')) {
          // Named imports
          const namedImports = match[1] || match[2];
          if (namedImports) {
            namedImports.split(',').forEach(imp => {
              const cleanImport = imp.trim().replace(/\s+as\s+\w+/, '');
              if (cleanImport) imports.push(cleanImport);
            });
          }
        } else {
          // Default import
          if (match[1]) imports.push(match[1]);
        }
      }
    }
  }
  
  return imports;
}

function isImportUsed(importName, content) {
  // Remove the script setup section to avoid false positives from imports
  const scriptSetupRegex = /<script\s+setup[^>]*>([\s\S]*?)<\/script>/;
  const scriptSetupMatch = content.match(scriptSetupRegex);
  
  let searchContent = content;
  if (scriptSetupMatch) {
    // Remove import statements from the search content
    const scriptContent = scriptSetupMatch[1];
    const importsRemoved = scriptContent.replace(/^import\s+.*$/gm, '');
    searchContent = content.replace(scriptSetupMatch[1], importsRemoved);
  }
  
  // Check if import is used in template or script
  const usagePatterns = [
    new RegExp(`\\b${importName}\\b`, 'g'),  // Direct usage
    new RegExp(`<${importName}`, 'g'),       // Component usage in template
    new RegExp(`${importName}\\.`, 'g'),     // Method/property access
  ];
  
  return usagePatterns.some(pattern => {
    const matches = searchContent.match(pattern);
    return matches && matches.length > 1; // More than just the import statement
  });
}

function analyzeVueFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = extractImports(content);
  const unusedImports = [];
  
  for (const importName of imports) {
    if (!isImportUsed(importName, content)) {
      unusedImports.push(importName);
    }
  }
  
  return unusedImports;
}

// Main execution
const adminSrcDir = '/Users/davidmeirlevy/dev/qelos/qelos/apps/admin/src';
const vueFiles = findVueFiles(adminSrcDir);

console.log(`Analyzing ${vueFiles.length} Vue files for unused imports...\n`);

const results = [];

for (const file of vueFiles) {
  const unusedImports = analyzeVueFile(file);
  if (unusedImports.length > 0) {
    const relativePath = path.relative(adminSrcDir, file);
    results.push({
      file: relativePath,
      unusedImports
    });
  }
}

if (results.length === 0) {
  console.log('No unused imports found!');
} else {
  console.log('Files with unused imports:');
  results.forEach(result => {
    console.log(`\n${result.file}:`);
    result.unusedImports.forEach(imp => console.log(`  - ${imp}`));
  });
}
