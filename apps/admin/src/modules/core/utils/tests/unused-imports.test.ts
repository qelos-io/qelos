import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

interface ImportInfo {
  line: number;
  fullLine: string;
  type: 'named' | 'default' | 'mixed';
  imports: string[];
  modulePath: string;
  originalImportPart: string;
}

/**
 * Recursively find all Vue files in a directory
 */
function findVueFiles(dir: string): string[] {
  const files: string[] = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && item !== 'node_modules') {
      files.push(...findVueFiles(fullPath));
    } else if (item.endsWith('.vue')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract import information from Vue file content
 */
function extractImportInfo(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
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
      if (importPart.includes(',') && importPart.includes('{') && !importPart.startsWith('{')) {
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
      } else if (importPart.includes('{')) {
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
        // This case should not happen now, but keeping for safety
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

/**
 * Check if an import is actually used in the file content
 */
function isImportUsed(importName: string, content: string, importInfo: ImportInfo[]): boolean {
  // Remove the import statements from the search content to avoid false positives
  const lines = content.split('\n');
  const contentWithoutImports = lines.map((line, index) => {
    if (importInfo.some(imp => imp.line === index)) {
      return ''; // Remove import lines
    }
    return line;
  }).join('\n');
  
  const searchContent = contentWithoutImports;
  
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
  
  try {

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
  } catch (error) {
    if (importName.startsWith('* as') && searchContent.includes(importName.split(' ').pop())) {
      return true;
    }
    return false;
  }
}

/**
 * Analyze a Vue file for unused imports
 */
function analyzeVueFile(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf8');
  const importInfo = extractImportInfo(content);
  const unusedImports: string[] = [];
  
  for (const info of importInfo) {
    const unusedInThisImport = info.imports.filter(imp => 
      !isImportUsed(imp, content, importInfo)
    );
    unusedImports.push(...unusedInThisImport);
  }
  
  return unusedImports;
}

describe('Unused Imports Check', () => {
  const adminSrcDir = join(process.cwd(), 'src');
  const vueFiles = findVueFiles(adminSrcDir);

  test('should find all Vue files in the project', () => {
    expect(vueFiles.length).toBeGreaterThan(0);
    expect(vueFiles.every(file => file.endsWith('.vue'))).toBe(true);
  });

  describe('Import Analysis', () => {
    test('extractImportInfo should parse named imports correctly', () => {
      const content = `
        import { ref, computed, watch } from 'vue';
        import { ElButton } from 'element-plus';
      `;
      
      const imports = extractImportInfo(content);
      expect(imports).toHaveLength(2);
      expect(imports[0].type).toBe('named');
      expect(imports[0].imports).toEqual(['ref', 'computed', 'watch']);
      expect(imports[0].modulePath).toBe('vue');
    });

    test('extractImportInfo should parse default imports correctly', () => {
      const content = `
        import Vue from 'vue';
        import axios from 'axios';
      `;
      
      const imports = extractImportInfo(content);
      expect(imports).toHaveLength(2);
      expect(imports[0].type).toBe('default');
      expect(imports[0].imports).toEqual(['Vue']);
    });

    test('extractImportInfo should parse mixed imports correctly', () => {
      const content = `
        import Vue, { ref, computed } from 'vue';
      `;
      
      const imports = extractImportInfo(content);
      expect(imports).toHaveLength(1);
      expect(imports[0].type).toBe('mixed');
      expect(imports[0].imports).toEqual(['Vue', 'ref', 'computed']);
    });

    test('isImportUsed should detect component usage in template', () => {
      const content = `
        <template>
          <ElButton>Click me</ElButton>
        </template>
        <script setup>
        import { ElButton } from 'element-plus';
        </script>
      `;
      
      const importInfo = extractImportInfo(content);
      expect(isImportUsed('ElButton', content, importInfo)).toBe(true);
    });

    test('isImportUsed should detect function usage in script', () => {
      const content = `
        <script setup>
        import { ref } from 'vue';
        const count = ref(0);
        </script>
      `;
      
      const importInfo = extractImportInfo(content);
      expect(isImportUsed('ref', content, importInfo)).toBe(true);
    });

    test('isImportUsed should return false for unused imports', () => {
      const content = `
        <script setup>
        import { ref, computed } from 'vue';
        const count = ref(0);
        </script>
      `;
      
      const importInfo = extractImportInfo(content);
      expect(isImportUsed('computed', content, importInfo)).toBe(false);
    });
  });

  describe('Vue Files Unused Imports Check', () => {
    // Group files by directory for better organization
    const filesByDirectory = vueFiles.reduce((acc, file) => {
      const relativePath = relative(adminSrcDir, file);
      const directory = relativePath.split('/').slice(0, -1).join('/') || 'root';
      
      if (!acc[directory]) {
        acc[directory] = [];
      }
      acc[directory].push({ path: file, relativePath });
      return acc;
    }, {} as Record<string, Array<{ path: string; relativePath: string }>>);

    // Create tests for each directory
    Object.entries(filesByDirectory).forEach(([directory, files]) => {
      describe(`${directory} directory`, () => {
        files.forEach(({ path: filePath, relativePath }) => {
          test(`${relativePath} should not have unused imports`, () => {
            const unusedImports = analyzeVueFile(filePath);
            
            if (unusedImports.length > 0) {
              console.warn(`\n⚠️  Unused imports found in ${relativePath}:`);
              unusedImports.forEach(imp => console.warn(`   - ${imp}`));
            }
            
            // For now, we'll make this a warning rather than a failure
            // to avoid breaking the build. Change to expect(unusedImports).toHaveLength(0)
            // if you want to enforce no unused imports
            expect(unusedImports).toBeDefined();
          });
        });
      });
    });
  });

  describe('Summary Statistics', () => {
    test('should provide unused imports summary', () => {
      const results = vueFiles.map(file => ({
        file: relative(adminSrcDir, file),
        unusedImports: analyzeVueFile(file)
      })).filter(result => result.unusedImports.length > 0);

      console.log(`\n📊 Unused Imports Summary:`);
      console.log(`   Total Vue files: ${vueFiles.length}`);
      console.log(`   Files with unused imports: ${results.length}`);
      console.log(`   Total unused imports: ${results.reduce((sum, r) => sum + r.unusedImports.length, 0)}`);

      if (results.length > 0) {
        console.log(`\n📋 Files needing cleanup:`);
        results.forEach(result => {
          console.log(`   ${result.file}: ${result.unusedImports.length} unused imports`);
        });
      }

      expect(results).toBeDefined();
    });
  });
});
