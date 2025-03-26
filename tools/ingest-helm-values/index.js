#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function replaceEnvVars(yamlContent) {
  // Find all ${VAR_NAME} patterns and replace with process.env values
  const envVarPattern = /\$\{([^}]+)\}/g;
  return yamlContent.replace(envVarPattern, (match, varName) => {
    return process.env[varName] || '';
  });
}

function main() {
  const rootDir = resolve(__dirname, '../..');
  const valuesPath = resolve(rootDir, 'helm/qelos/values.yaml');
  const outputPath = resolve(rootDir, 'helm/qelos/values-env.yaml');

  try {
    // Read values.yaml
    const valuesContent = readFileSync(valuesPath, 'utf8');
    
    // Replace ${VAR_NAME} with their values
    const newValuesContent = replaceEnvVars(valuesContent);
    
    // Write to new file
    writeFileSync(outputPath, newValuesContent);
    
    console.log('✅ Created helm/qelos/values-env.yaml with environment variable values');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();