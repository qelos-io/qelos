import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { logger } from '../utils/logger.mjs';
import { interactiveSelect } from '../utils/interactive-select.mjs';

const AI_PROVIDER_KINDS = ['openai', 'claudeai', 'gemini'];

const MODELS_BY_PROVIDER = {
  openai: [
    'gpt-5.2',
    'gpt-5.2-codex',
    'gpt-5.2-nano',
    'gpt-5.2-16k',
    'gpt-5.2-16k-nano',
    'gpt-5.1',
    'gpt-5.1-codex',
    'gpt-5.1-nano',
    'gpt-5',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'gpt-4-turbo-preview',
    'gpt-4-vision-preview',
    'gpt-3.5-turbo-16k',
    'gpt-4-32k',
    'gpt-4-1106-preview',
    'gpt-4-0125-preview'
  ],
  claudeai: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ],
  gemini: [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-pro',
    'gemini-pro-vision'
  ]
};

function question(prompt) {
  return new Promise((resolve) => {
    // Use the same pattern as generate-connection service
    const questionRl = readline.createInterface({
      terminal: false,
      input: process.stdin,
      output: process.stdout
    });
    
    questionRl.question(prompt, (answer) => {
      questionRl.close();
      resolve(answer);
    });
  });
}

function confirm(prompt) {
  return new Promise((resolve) => {
    const confirmRl = readline.createInterface({
      terminal: false,
      input: process.stdin,
      output: process.stdout
    });
    
    confirmRl.question(`${prompt} (y/n): `, (answer) => {
      confirmRl.close();
      const response = answer.toLowerCase().trim();
      resolve(response === 'y' || response === 'yes');
    });
  });
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    logger.success(`Created directory: ${dirPath}`);
  }
}

async function findQelosConnection(connectionsDir) {
  try {
    const files = await fs.readdir(connectionsDir);
    const connectionFiles = files.filter(file => file.endsWith('.connection.json'));
    
    for (const file of connectionFiles) {
      const filePath = path.join(connectionsDir, file);
      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
      
      if (content.kind === 'qelos' && !content.metadata?.url) {
        return { file, content };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

async function findAIConnections(connectionsDir) {
  try {
    const files = await fs.readdir(connectionsDir);
    const connectionFiles = files.filter(file => file.endsWith('.connection.json'));
    const aiConnections = [];
    
    for (const file of connectionFiles) {
      const filePath = path.join(connectionsDir, file);
      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
      
      if (AI_PROVIDER_KINDS.includes(content.kind)) {
        aiConnections.push({ file, content });
      }
    }
    
    return aiConnections;
  } catch {
    return [];
  }
}

async function createQelosConnection(connectionsDir) {
  const qelosConnection = {
    name: "Qelos",
    kind: "qelos",
    labels: [],
    metadata: {
      external: false
    },
    authentication: {}
  };
  
  const filePath = path.join(connectionsDir, 'qelos.connection.json');
  await fs.writeFile(filePath, JSON.stringify(qelosConnection, null, 2));
  logger.success(`Created Qelos connection: ${filePath}`);
  
  return { file: 'qelos.connection.json', content: qelosConnection };
}

async function createPromptFile(integrationsDir, agentName, initialContent) {
  const promptsDir = path.join(integrationsDir, 'prompts');
  await ensureDirectoryExists(promptsDir);
  
  const promptFileName = `${agentName}.md`;
  const promptFilePath = path.join(promptsDir, promptFileName);
  
  await fs.writeFile(promptFilePath, initialContent);
  logger.success(`Created prompt file: ${promptFilePath}`);
  
  return `./prompts/${promptFileName}`;
}

export async function generateAgent(name, cwd) {
  try {
    // Ensure integrations directory exists
    const integrationsDir = path.join(cwd, 'integrations');
    await ensureDirectoryExists(integrationsDir);
    
    // Ensure connections directory exists
    const connectionsDir = path.join(cwd, 'connections');
    await ensureDirectoryExists(connectionsDir);
    
    // Find or create Qelos connection
    let qelosConnection = await findQelosConnection(connectionsDir);
    if (!qelosConnection) {
      logger.info('No Qelos connection found. Creating one...');
      qelosConnection = await createQelosConnection(connectionsDir);
    } else {
      logger.success(`Found Qelos connection: ${qelosConnection.file}`);
    }
    
    // Find AI connections
    const aiConnections = await findAIConnections(connectionsDir);
    
    if (aiConnections.length === 0) {
      logger.error('No AI connections found. Please create one first:');
      logger.info('  qelos generate connection my-openai --kind openai');
      logger.info('  qelos generate connection my-claude --kind claudeai');
      logger.info('  qelos generate connection my-gemini --kind gemini');
      return { success: false, message: 'No AI connections available' };
    }
    
    // Get agent details first (before any interactive-select calls)
    const agentName = await question('\nEnter agent name: ');
    const agentDescription = await question('Enter agent description: ');
    
    // Web search and vector store options
    const webSearch = await confirm('Enable web search?');
    const vectorStore = await confirm('Enable vector store?');
    
    let vectorStoreExpirationDays = 16;
    let vectorStoreHardcodedIds = [];
    
    if (vectorStore) {
      const daysAnswer = await question('Vector store expiration days (default: 16): ');
      vectorStoreExpirationDays = parseInt(daysAnswer) || 16;
      
      const idsAnswer = await question('Vector store hardcoded IDs (comma-separated, leave empty for none): ');
      if (idsAnswer.trim()) {
        vectorStoreHardcodedIds = idsAnswer.split(',').map(id => id.trim()).filter(id => id);
      }
    }
    
    // Select target connection - auto-select if only one, interactive if multiple
    let selectedConnection;
    if (aiConnections.length === 1) {
      selectedConnection = aiConnections[0];
      logger.success(`Auto-selected target connection: ${selectedConnection.content.name} (${selectedConnection.content.kind})`);
    } else {
      const connectionOptions = aiConnections.reduce((acc, conn) => {
        acc[conn.file] = `${conn.content.name} (${conn.content.kind})`;
        return acc;
      }, {});
      
      const result = await interactiveSelect({
        title: 'Select Target AI Connection',
        message: 'Choose the AI provider to use for this agent:',
        values: connectionOptions,
        pageSize: 10
      });
      
      selectedConnection = aiConnections.find(conn => conn.file === result.id);
    }
    
    // Select model
    const provider = selectedConnection.content.kind;
    const availableModels = MODELS_BY_PROVIDER[provider];
    
    let selectedModel;
    const modelOptions = availableModels.reduce((acc, model) => {
      acc[model] = model;
      return acc;
    }, {});
    modelOptions['other'] = 'Enter model name manually';
    
    const modelResult = await interactiveSelect({
      title: `Select Model for ${provider}`,
      message: 'Choose the AI model to use:',
      values: modelOptions,
      pageSize: 12
    });
    
    if (modelResult.id === 'other') {
      selectedModel = await question('Enter model name: ');
      while (!selectedModel.trim()) {
        console.log('Model name cannot be empty. Please try again.');
        selectedModel = await question('Enter model name: ');
      }
    } else {
      selectedModel = modelResult.id;
    }
    
    // Create initial prompt content
    const initialPrompt = `You are ${agentName}, an AI assistant designed to ${agentDescription.toLowerCase()}.

Your role is to provide helpful, accurate, and contextually relevant responses based on the user's needs.

Key capabilities:
- ${agentDescription}
- Provide clear and concise responses
- Ask clarifying questions when needed
- Maintain a helpful and professional tone

Please respond to the user's requests based on the context and information provided.`;
    
    // Create prompt file
    const promptRef = await createPromptFile(integrationsDir, name, initialPrompt);
    
    // Generate agent integration
    const agentIntegration = {
      kind: ["qelos", provider],
      active: true,
      trigger: {
        source: {
          $refId: `../connections/${qelosConnection.file}`
        },
        operation: "chatCompletion",
        details: {
          roles: ["*"],
          workspaceRoles: ["*"],
          workspaceLabels: ["*"],
          name: agentName,
          description: agentDescription,
          webSearch: webSearch,
          ...(vectorStore && {
            vectorStore: true,
            vectorStoreExpirationDays: vectorStoreExpirationDays,
            vectorStoreHardcodedIds: vectorStoreHardcodedIds
          })
        }
      },
      target: {
        source: {
          $refId: `../connections/${selectedConnection.file}`
        },
        operation: "chatCompletion",
        details: {
          pre_messages: [
            {
              role: "system",
              content: {
                $ref: promptRef
              }
            }
          ],
          max_tokens: 128000,
          model: selectedModel
        }
      },
      dataManipulation: []
    };
    
    // Write agent integration file
    const agentFileName = `${name}.integration.json`;
    const agentFilePath = path.join(integrationsDir, agentFileName);
    await fs.writeFile(agentFilePath, JSON.stringify(agentIntegration, null, 2));
    
    logger.success(`Generated agent integration: ${agentFilePath}`);
    logger.success(`Generated prompt file: ${path.join(integrationsDir, 'prompts', `${name}.md`)}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Agent generated successfully!');
    console.log('='.repeat(60));
    console.log(`\nTo push the agent to Qelos, run:`);
    console.log(`  qelos push integrations ./integrations/${agentFileName}`);
    console.log(`\nTo edit the prompt, modify:`);
    console.log(`  ${path.join(integrationsDir, 'prompts', `${name}.md`)}`);
    console.log('\n' + '='.repeat(60));
    
    return { success: true };
    
  } catch (error) {
    throw error;
  }
}
