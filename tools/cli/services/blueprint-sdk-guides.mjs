import fs from 'node:fs';
import path from 'node:path';
import { formatTitle, detectBlueprintType } from './blueprint-shared.mjs';

export function generateSdkGuide({ blueprint, documents, targetDir }) {
  const guidePath = path.join(targetDir, `${blueprint.identifier}.sdk.md`);
  const interfaceName = `${formatTitle(blueprint.identifier).replace(/\s+/g, '')}Entity`;
  const entityVarName = `${toCamelCase(blueprint.identifier)}Entities`;
  const sampleDoc = documents.find((doc) => doc && typeof doc === 'object');
  const interfaceDefinition = buildInterfaceDefinition(interfaceName, blueprint);
  const exampleEntity = buildExampleEntity(blueprint, sampleDoc);
  const exampleLiteral = stringifyObjectLiteral(exampleEntity);

  const markdown = buildMarkdown({
    blueprint,
    interfaceName,
    entityVarName,
    interfaceDefinition,
    exampleLiteral,
  });

  fs.writeFileSync(guidePath, markdown);
  return guidePath;
}

function buildMarkdown({ blueprint, interfaceName, entityVarName, interfaceDefinition, exampleLiteral }) {
  return [
    `# ${blueprint.name} Blueprint SDK Guide`,
    '',
    '## Install the SDK',
    '```bash',
    'npm install @qelos/sdk',
    '```',
    '',
    '## Initialize the Administrator SDK',
    '```ts',
    "import QelosAdministratorSDK from '@qelos/sdk/administrator';",
    '',
    'const sdk = new QelosAdministratorSDK({',
    "  appUrl: process.env.QELOS_URL || 'http://localhost:3000',",
    '  fetch,',
    '});',
    '',
    `const ${entityVarName} = sdk.blueprints.entitiesOf<${interfaceName}>('${blueprint.identifier}');`,
    '```',
    '',
    '## TypeScript Interface',
    '```ts',
    interfaceDefinition,
    '```',
    '',
    '## Example Entity Payload',
    '```ts',
    `const sample${interfaceName} = ${exampleLiteral};`,
    '```',
    '',
    '## CRUD Examples',
    '',
    '### List Entities',
    '```ts',
    `const entities = await ${entityVarName}.getList({ $limit: 20, $sort: '-created' });`,
    '```',
    '',
    '### Fetch a Single Entity',
    '```ts',
    `const entity = await ${entityVarName}.getEntity('replace-with-entity-id');`,
    '```',
    '',
    '### Create an Entity',
    '```ts',
    `const created = await ${entityVarName}.create(${exampleLiteral});`,
    '```',
    '',
    '### Update an Entity',
    '```ts',
    `const updated = await ${entityVarName}.update('replace-with-entity-id', {\n  ...${exampleLiteral.replace(/\n/g, '\n  ')},\n});`,
    '```',
    '',
    '### Delete an Entity',
    '```ts',
    `await ${entityVarName}.remove('replace-with-entity-id');`,
    '```',
  ].join('\n');
}

function buildInterfaceDefinition(interfaceName, blueprint) {
  const lines = [`export interface ${interfaceName} {`];
  for (const [key, descriptor] of Object.entries(blueprint.properties)) {
    const tsType = mapBlueprintPropertyToTs(descriptor);
    const optionalFlag = descriptor.required ? '' : '?';
    const description = descriptor.title || key;
    lines.push(`  ${key}${optionalFlag}: ${tsType}; // ${description}`);
  }
  lines.push('}');
  return lines.join('\n');
}

function mapBlueprintPropertyToTs(descriptor) {
  const baseType = descriptor.type;
  let tsType;
  switch (baseType) {
    case 'number':
      tsType = 'number';
      break;
    case 'boolean':
      tsType = 'boolean';
      break;
    case 'date':
    case 'datetime':
    case 'time':
    case 'file':
    case 'string':
      tsType = 'string';
      break;
    case 'object':
      tsType = 'Record<string, any>';
      break;
    default:
      tsType = 'any';
  }

  if (descriptor.multi) {
    return `${tsType}[]`;
  }

  return tsType;
}

function buildExampleEntity(blueprint, sampleDoc = {}) {
  const entity = {};
  for (const [key, descriptor] of Object.entries(blueprint.properties)) {
    if (sampleDoc && sampleDoc[key] !== undefined) {
      entity[key] = sanitizeExampleValue(sampleDoc[key], descriptor);
    } else {
      entity[key] = getDefaultValueForDescriptor(descriptor, key);
    }
  }
  return entity;
}

function sanitizeExampleValue(value, descriptor) {
  if (Array.isArray(value)) {
    const normalizedItems = value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => sanitizeExampleValue(item, { ...descriptor, multi: false }));
    return descriptor.multi ? normalizedItems : normalizedItems[0];
  }

  if (value && typeof value === 'object') {
    if (value._bsontype) {
      return getDefaultValueForDescriptor(descriptor);
    }
    const result = {};
    for (const [innerKey, innerValue] of Object.entries(value)) {
      result[innerKey] = sanitizeExampleValue(innerValue, { type: detectBlueprintType(innerValue) });
    }
    return result;
  }

  return value;
}

function getDefaultValueForDescriptor(descriptor, key = '') {
  const baseValue = (() => {
    switch (descriptor.type) {
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'datetime':
      case 'date':
      case 'time':
        return new Date().toISOString();
      case 'object':
        return {};
      case 'file':
        return 'https://example.com/file';
      default:
        return `Sample ${formatTitle(key || 'value')}`;
    }
  })();

  if (descriptor.multi) {
    return [baseValue];
  }

  return baseValue;
}

function stringifyObjectLiteral(value, level = 0) {
  const indent = ' '.repeat(level + 2);
  const baseIndent = ' '.repeat(level);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const items = value
      .map((item) => `${indent}${stringifyObjectLiteral(item, level + 2)}`)
      .join(',\n');
    return `[\n${items}\n${baseIndent}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    const lines = entries.map(
      ([key, val]) => `${indent}${key}: ${stringifyObjectLiteral(val, level + 2)},`
    );
    return `\n${indent ? baseIndent : ''}{\n${lines.join('\n')}\n${baseIndent}}`;
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  return String(value);
}

function toCamelCase(value) {
  return (value || '')
    .replace(/[-_\s]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ''))
    .replace(/^(.)/, (match) => match.toLowerCase());
}
