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

function extractImportInfo(content) {
  const imports = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Match import statements
    const importMatch = trimmedLine.match(/^import\s+(.+)\s+from\s+['"`]([^'"`]+)['"`]/);
    if (importMatch) {
      const importPart = importMatch[1].trim();
      const modulePath = importMatch[2];
      
      // Parse different import patterns
      if (importPart.includes('{')) {
        // Named imports: import { a, b, c } from 'module'
        const namedMatch = importPart.match(/\{\s*([^}]+)\s*\}/);
        if (namedMatch) {
          const namedImports = namedMatch[1].split(',').map(imp => {
            const cleanImport = imp.trim().replace(/\s+as\s+\w+/, '');
            return cleanImport;
          }).filter(imp => imp);
          
          imports.push({
            line: i,
            fullLine: line,
            type: 'named',
            imports: namedImports,
            modulePath,
            originalImportPart: importPart
          });
        }
      } else if (importPart.includes(',')) {
        // Mixed imports: import Default, { named } from 'module'
        const parts = importPart.split(',');
        const defaultImport = parts[0].trim();
        const namedPart = parts.slice(1).join(',').trim();
        const namedMatch = namedPart.match(/\{\s*([^}]+)\s*\}/);
        
        const allImports = [defaultImport];
        if (namedMatch) {
          const namedImports = namedMatch[1].split(',').map(imp => imp.trim()).filter(imp => imp);
          allImports.push(...namedImports);
        }
        
        imports.push({
          line: i,
          fullLine: line,
          type: 'mixed',
          imports: allImports,
          modulePath,
          originalImportPart: importPart
        });
      } else {
        // Default import: import Something from 'module'
        imports.push({
          line: i,
          fullLine: line,
          type: 'default',
          imports: [importPart],
          modulePath,
          originalImportPart: importPart
        });
      }
    }
  }
  
  return imports;
}

function isImportUsed(importName, content, importInfo) {
  // Remove the import statements from the search content to avoid false positives
  let searchContent = content;
  
  // Remove all import lines
  const lines = content.split('\n');
  const contentWithoutImports = lines.map((line, index) => {
    if (importInfo.some(imp => imp.line === index)) {
      return ''; // Remove import lines
    }
    return line;
  }).join('\n');
  
  searchContent = contentWithoutImports;
  
  // Special handling for Vue composition API functions that might be used implicitly
  const compositionApiFunctions = [
    'ref', 'reactive', 'computed', 'watch', 'watchEffect', 'onMounted', 'onUnmounted', 
    'onBeforeMount', 'onBeforeUnmount', 'onUpdated', 'onBeforeUpdate', 'nextTick',
    'defineProps', 'defineEmits', 'defineExpose', 'inject', 'provide', 'toRef', 'toRefs',
    'storeToRefs', 'onBeforeRouteLeave', 'onBeforeRouteUpdate'
  ];
  
  if (compositionApiFunctions.includes(importName)) {
    // These might be used implicitly in script setup
    const usagePatterns = [
      new RegExp(`\\b${importName}\\s*\\(`, 'g'),  // Function call
      new RegExp(`\\b${importName}\\s*<`, 'g'),    // Generic function call
      new RegExp(`const\\s+\\w+\\s*=\\s*${importName}\\b`, 'g'), // Assignment
    ];
    
    return usagePatterns.some(pattern => pattern.test(searchContent));
  }
  
  // Check if import is used in template or script
  const usagePatterns = [
    new RegExp(`\\b${importName}\\b`, 'g'),  // Direct usage
    new RegExp(`<${importName}`, 'gi'),      // Component usage in template
    new RegExp(`${importName}\\.`, 'g'),     // Method/property access
    new RegExp(`\\b${importName}\\s*\\(`, 'g'), // Function call
  ];
  
  return usagePatterns.some(pattern => {
    const matches = searchContent.match(pattern);
    return matches && matches.length > 0;
  });
}

function removeUnusedImports(content, filePath) {
  const importInfo = extractImportInfo(content);
  const lines = content.split('\n');
  let modified = false;
  
  for (const info of importInfo) {
    const usedImports = info.imports.filter(imp => 
      isImportUsed(imp, content, importInfo)
    );
    
    if (usedImports.length === 0) {
      // Remove entire import line
      lines[info.line] = '';
      modified = true;
      console.log(`Removed entire import line: ${info.fullLine.trim()}`);
    } else if (usedImports.length < info.imports.length) {
      // Partial removal - reconstruct import statement
      if (info.type === 'named') {
        const newImportPart = `{ ${usedImports.join(', ')} }`;
        const newLine = info.fullLine.replace(
          /\{\s*[^}]+\s*\}/, 
          newImportPart
        );
        lines[info.line] = newLine;
        modified = true;
        console.log(`Modified import line: ${info.fullLine.trim()} -> ${newLine.trim()}`);
      } else if (info.type === 'mixed') {
        // Handle mixed imports more carefully
        const defaultImport = info.imports[0];
        const namedImports = info.imports.slice(1);
        const usedNamed = namedImports.filter(imp => usedImports.includes(imp));
        
        let newImportPart;
        if (usedImports.includes(defaultImport) && usedNamed.length > 0) {
          newImportPart = `${defaultImport}, { ${usedNamed.join(', ')} }`;
        } else if (usedImports.includes(defaultImport)) {
          newImportPart = defaultImport;
        } else if (usedNamed.length > 0) {
          newImportPart = `{ ${usedNamed.join(', ')} }`;
        }
        
        if (newImportPart) {
          const newLine = info.fullLine.replace(
            info.originalImportPart,
            newImportPart
          );
          lines[info.line] = newLine;
          modified = true;
          console.log(`Modified mixed import: ${info.fullLine.trim()} -> ${newLine.trim()}`);
        }
      }
    }
  }
  
  if (modified) {
    // Clean up empty lines that were import statements
    const cleanedLines = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '' && i > 0 && i < lines.length - 1) {
        // Check if this was an import line by looking at surrounding context
        const prevLine = lines[i - 1]?.trim();
        const nextLine = lines[i + 1]?.trim();
        
        // If we have consecutive empty lines from removed imports, keep only one
        if (prevLine === '' || nextLine === '') {
          continue;
        }
      }
      cleanedLines.push(lines[i]);
    }
    
    return cleanedLines.join('\n');
  }
  
  return content;
}

// Main execution
const adminSrcDir = '/Users/davidmeirlevy/dev/qelos/qelos/apps/admin/src';
const vueFiles = findVueFiles(adminSrcDir);

console.log(`Processing ${vueFiles.length} Vue files to remove unused imports...\n`);

let totalFilesModified = 0;

for (const file of vueFiles) {
  const relativePath = path.relative(adminSrcDir, file);
  console.log(`\nProcessing: ${relativePath}`);
  
  const originalContent = fs.readFileSync(file, 'utf8');
  const modifiedContent = removeUnusedImports(originalContent, file);
  
  if (originalContent !== modifiedContent) {
    fs.writeFileSync(file, modifiedContent, 'utf8');
    totalFilesModified++;
    console.log(`✓ Modified ${relativePath}`);
  } else {
    console.log(`- No changes needed for ${relativePath}`);
  }
}

console.log(`\n✅ Completed! Modified ${totalFilesModified} files.`);
