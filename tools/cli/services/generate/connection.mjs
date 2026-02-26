import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { logger } from '../utils/logger.mjs';
import { interactiveSelect } from '../utils/interactive-select.mjs';

// Integration source kinds from global-types
const IntegrationSourceKind = {
  Qelos: 'qelos',
  OpenAI: 'openai',
  Email: 'email',
  N8n: 'n8n',
  Supabase: 'supabase',
  LinkedIn: 'linkedin',
  Http: 'http',
  ClaudeAi: 'claudeai',
  Facebook: 'facebook',
  Google: 'google',
  GitHub: 'github',
  Gemini: 'gemini',
  Sumit: 'sumit',
  AWS: 'aws',
  Cloudflare: 'cloudflare',
};

// Boilerplate templates for each connection kind
const connectionTemplates = {
  [IntegrationSourceKind.Qelos]: {
    authentication: {
      password: ''
    },
    metadata: {
      url: '',
      username: ''
    }
  },
  [IntegrationSourceKind.OpenAI]: {
    authentication: {
      token: ''
    },
    metadata: {
      organizationId: '',
      apiUrl: '',
      defaultModel: null,
      defaultTemperature: 0.7,
      defaultTopP: 1,
      defaultFrequencyPenalty: 0,
      defaultPresencePenalty: 0,
      defaultMaxTokens: null,
      defaultResponseFormat: ''
    }
  },
  [IntegrationSourceKind.Email]: {
    authentication: {
      password: ''
    },
    metadata: {
      username: '',
      email: '',
      pop3: '',
      smtp: '',
      senderName: ''
    }
  },
  [IntegrationSourceKind.N8n]: {
    authentication: {},
    metadata: {
      url: ''
    }
  },
  [IntegrationSourceKind.Supabase]: {
    authentication: {},
    metadata: {
      url: ''
    }
  },
  [IntegrationSourceKind.LinkedIn]: {
    authentication: {
      clientSecret: ''
    },
    metadata: {
      clientId: '',
      scope: ''
    }
  },
  [IntegrationSourceKind.Http]: {
    authentication: {
      securedHeaders: {}
    },
    metadata: {
      baseUrl: '',
      headers: {},
      method: 'GET',
      query: {}
    }
  },
  [IntegrationSourceKind.ClaudeAi]: {
    authentication: {},
    metadata: {}
  },
  [IntegrationSourceKind.Facebook]: {
    authentication: {
      clientSecret: ''
    },
    metadata: {
      clientId: '',
      scope: ''
    }
  },
  [IntegrationSourceKind.Google]: {
    authentication: {
      clientSecret: ''
    },
    metadata: {
      clientId: '',
      scope: ''
    }
  },
  [IntegrationSourceKind.GitHub]: {
    authentication: {
      clientSecret: ''
    },
    metadata: {
      clientId: '',
      scope: ''
    }
  },
  [IntegrationSourceKind.Gemini]: {
    authentication: {
      token: ''
    },
    metadata: {
      defaultModel: null,
      initialMessages: []
    }
  },
  [IntegrationSourceKind.Sumit]: {
    authentication: {
      apiKey: ''
    },
    metadata: {
      companyId: ''
    }
  },
  [IntegrationSourceKind.AWS]: {
    authentication: {
      secretAccessKey: ''
    },
    metadata: {
      region: '',
      accessKeyId: ''
    }
  },
  [IntegrationSourceKind.Cloudflare]: {
    authentication: {
      apiToken: ''
    },
    metadata: {
      accountId: '',
      workersDevSubdomain: ''
    }
  }
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for user input
function question(prompt) {
  return new Promise((resolve) => {
    // Create a new readline interface for each question to avoid conflicts
    const questionRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    questionRl.question(prompt, (answer) => {
      questionRl.close();
      resolve(answer);
    });
  });
}

// Helper function to prompt for sensitive input (masked)
function questionSecure(prompt) {
  return new Promise((resolve) => {
    // For now, just use regular question but add a warning
    // In a real environment, you'd use a proper password masking library
    console.log('\x1b[33m⚠ Note: Input will be visible. Use proper security measures in production.\x1b[0m');
    
    // Create a new readline interface for this question to avoid conflicts
    const secureRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    secureRl.question(prompt, (answer) => {
      secureRl.close();
      resolve(answer);
    });
  });
}

// Allow mocking for testing
globalThis.question = globalThis.question || question;
globalThis.questionSecure = globalThis.questionSecure || questionSecure;

// Helper function to mask sensitive values for display
function maskValue(value) {
  if (!value || value === '') return '';
  if (value.length <= 4) return '****';
  return value.substring(0, 2) + '***' + value.substring(value.length - 2);
}

// Helper function to check if a key should be treated as sensitive
function isSensitiveKey(key) {
  const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'secretaccesskey', 'apitoken'];
  return sensitiveKeys.some(sensitive => {
    // Exclude 'maxtokens' from being treated as sensitive
    if (key.toLowerCase().includes('maxtokens')) return false;
    return key.toLowerCase().includes(sensitive);
  });
}

// Helper function to ask for object properties recursively
async function askForObject(obj, objName = '') {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = objName ? `${objName} - ${key}` : key;
    const isSensitive = isSensitiveKey(key);
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      logger.step(`Configuring ${fullPath}...`);
      result[key] = await askForObject(value, fullPath);
    } else if (Array.isArray(value)) {
      result[key] = [];
      logger.info(`${fullPath} is an array. Current value: ${JSON.stringify(value, null, 2)}`);
      const addMore = await globalThis.question(`Add items to ${fullPath}? (y/n): `);
      if (addMore.toLowerCase() === 'y') {
        while (true) {
          const itemStr = await globalThis.question(`Enter item for ${fullPath} (or press Enter to finish): `);
          if (!itemStr.trim()) break;
          try {
            const item = JSON.parse(itemStr);
            result[key].push(item);
          } catch {
            result[key].push(itemStr);
          }
        }
      }
    } else {
      const currentValue = isSensitive ? maskValue(value) : value;
      const prompt = isSensitive 
        ? `Enter ${fullPath} (current: ${currentValue}): `
        : `Enter ${fullPath} (current: ${currentValue}): `;
      
      const answer = isSensitive 
        ? await globalThis.questionSecure(prompt)
        : await globalThis.question(prompt);
      
      if (answer.trim()) {
        // Try to parse as JSON, otherwise keep as string
        try {
          result[key] = JSON.parse(answer);
        } catch {
          result[key] = answer;
        }
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
}

// Helper function to ask for connection kind selection
async function askForKind() {
  const kindValues = {};
  Object.values(IntegrationSourceKind).forEach(kind => {
    kindValues[kind] = kind.charAt(0).toUpperCase() + kind.slice(1);
  });

  const result = await interactiveSelect({
    title: 'Select Connection Kind',
    message: 'Choose the type of integration you want to create:',
    values: kindValues,
    pageSize: 10
  });

  return result.id;
}

// Helper function to get default auth env var name based on connection kind and field
function getAuthEnvVarName(kind, name, field) {
  const kindUpper = kind.toUpperCase();
  const nameUpper = name.replace(/[^a-z0-9]+/g, '_').toUpperCase();
  const fieldUpper = field.toUpperCase();
  return `QELOS_CONNECTION_${kindUpper}_${nameUpper}_${fieldUpper}`;
}

// Helper function to check if .env file exists and create if not
async function ensureEnvFile(cwd) {
  const envPath = path.join(cwd, '.env');
  
  try {
    await fs.access(envPath);
    return envPath;
  } catch {
    // Create .env file if it doesn't exist
    await fs.writeFile(envPath, '# Qelos Connection Environment Variables\n', 'utf8');
    logger.success('Created .env file for connection credentials');
    return envPath;
  }
}

// Helper function to add env var to .env file
async function addEnvVar(envPath, varName, value) {
  try {
    let content = await fs.readFile(envPath, 'utf8');
    
    // Check if variable already exists
    const lines = content.split('\n');
    const existingIndex = lines.findIndex(line => line.startsWith(`${varName}=`));
    
    const newLine = `${varName}=${value}`;
    
    if (existingIndex >= 0) {
      lines[existingIndex] = newLine;
      logger.warning(`Updated existing environment variable: ${varName}`);
    } else {
      lines.push(newLine);
      logger.success(`Added environment variable: ${varName}`);
    }
    
    await fs.writeFile(envPath, lines.join('\n'), 'utf8');
  } catch (error) {
    logger.error(`Failed to add environment variable ${varName}:`, error);
    throw error;
  }
}

// Helper function to extract authentication fields and convert to env var references
function sanitizeConnectionForFile(connection) {
  const sanitized = {
    name: connection.name,
    kind: connection.kind,
    metadata: connection.metadata || {},
    authentication: {}
  };
  
  // Convert each auth field to env var reference
  Object.keys(connection.authentication || {}).forEach(field => {
    const envVarName = getAuthEnvVarName(connection.kind, connection.name, field);
    sanitized.authentication[field] = {
      $var: envVarName
    }
  });
  
  return sanitized;
}
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Main function to generate connection
export async function generateConnection(name, kind, cwd) {
  try {
    // Step 1: Check if connections folder exists, create if not
    const connectionsDir = path.join(cwd, 'connections');
    
    try {
      await fs.access(connectionsDir);
    } catch {
      logger.step('Creating connections folder...');
      await fs.mkdir(connectionsDir, { recursive: true });
    }

    // Step 2: Check if file already exists
    const filePath = path.join(connectionsDir, `${name}.connection.json`);
    
    if (await fileExists(filePath)) {
      logger.error(`Connection file already exists: ${filePath}`);
      logger.info('Please choose a different name.');
      return { success: false, message: 'File already exists' };
    }

    // Step 3: Ask for kind if not provided
    if (!kind) {
      kind = await askForKind();
    } else if (!Object.values(IntegrationSourceKind).includes(kind)) {
      logger.error(`Invalid kind: ${kind}`);
      return { success: false, message: 'Invalid connection kind' };
    }

    logger.step(`Creating ${kind} connection: ${name}`);

    // Step 4: Get boilerplate for the kind
    const template = connectionTemplates[kind];
    if (!template) {
      logger.error(`No template found for kind: ${kind}`);
      return { success: false, message: 'No template available' };
    }

    // Step 5: Interactive CLI for user input
    logger.info('Please provide the connection details:');
    
    const connectionData = {
      name,
      kind,
      metadata: await askForObject(template.metadata || {}, 'metadata'),
      authentication: await askForObject(template.authentication || {}, 'authentication'),
    };

    // Step 6: Ensure .env file exists and add authentication variables
    logger.step('Setting up environment variables for authentication...');
    const envPath = await ensureEnvFile(cwd);
    
    // Add each authentication field to .env file
    for (const [field, value] of Object.entries(connectionData.authentication || {})) {
      if (value && value.trim()) {
        const envVarName = getAuthEnvVarName(kind, connectionData.name, field);
        await addEnvVar(envPath, envVarName, value);
      }
    }

    // Step 7: Sanitize connection data for file storage (replace auth values with env var references)
    const sanitizedConnection = sanitizeConnectionForFile(connectionData);

    // Step 8: Write the connection file
    const jsonContent = JSON.stringify(sanitizedConnection, null, 2);
    await fs.writeFile(filePath, jsonContent, 'utf8');

    // Close readline interface
    rl.close();

    logger.success(`✅ Connection generated successfully!`);
    logger.info(`📁 Generated connection at: ${filePath}`);
    logger.info(`🔐 Environment variables added to: ${envPath}`);
    
    // Step 9: Suggest push command as final message
    const relativeFilePath = path.relative(cwd, filePath);
    logger.section('Next Steps:');
    logger.info(`To upload this connection to Qelos, run:`);
    console.log(`\x1b[36m  qelos push connections ${relativeFilePath}\x1b[0m`);
    console.log();

    return { success: true, filePath };

  } catch (error) {
    rl.close();
    throw error;
  }
}
