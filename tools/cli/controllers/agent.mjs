import { logger } from '../services/logger.mjs';
import { initializeSdk } from '../services/sdk.mjs';
import { green, blue, yellow, red } from '../utils/colors.mjs';
import fs from 'node:fs';
import path from 'node:path';

// Helper function to check if a string is a valid MongoDB ObjectId
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Helper function to search for integration by name in integrations folder
function findIntegrationByName(name, currentDir = process.cwd()) {
  // Try to find integrations folder in current directory or parent directories
  let searchDir = currentDir;
  let integrationsDir = null;
  
  // Search up to 5 levels up for integrations folder
  for (let i = 0; i < 5; i++) {
    const potentialDir = path.join(searchDir, 'integrations');
    if (fs.existsSync(potentialDir) && fs.statSync(potentialDir).isDirectory()) {
      integrationsDir = potentialDir;
      break;
    }
    const parentDir = path.dirname(searchDir);
    if (parentDir === searchDir) break; // Reached root
    searchDir = parentDir;
  }
  
  if (!integrationsDir) {
    return null;
  }
  
  try {
    const files = fs.readdirSync(integrationsDir);
    for (const file of files) {
      if (file.endsWith('.integration.json')) {
        const filePath = path.join(integrationsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const integration = JSON.parse(content);
        
        // Check if the integration name matches (case-insensitive)
        if (integration.trigger?.details?.name && 
            integration.trigger.details.name.toLowerCase() === name.toLowerCase()) {
          return {
            id: integration._id,
            name: integration.trigger.details.name,
            file: filePath
          };
        }
      }
    }
  } catch (error) {
    if (verbose) {
      console.warn(yellow(`Warning: Could not search integrations: ${error.message}`));
    }
  }
  
  return null;
}

// Helper function to save conversation to log file
function saveToLogFile(logFile, messages) {
  try {
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(logFile, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (error) {
    console.warn(yellow(`Warning: Could not save to log file: ${error.message}`));
  }
}

// Helper function to export content to file
function exportToFile(exportFile, content) {
  try {
    const exportDir = path.dirname(exportFile);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    fs.writeFileSync(exportFile, content, 'utf-8');
    console.log(green(`\nResponse exported to: ${exportFile}`));
  } catch (error) {
    console.warn(yellow(`Warning: Could not export to file: ${error.message}`));
  }
}

export default async function agentController(argv) {
  const { integrationId, thread, json, stream, message, verbose, export: exportFile, log: logFile } = argv;
  
  if (verbose) {
    process.env.VERBOSE = 'true';
  }
  
  try {
    // Resolve integration ID (could be ObjectId or name)
    let resolvedIntegrationId = integrationId;
    let integrationName = null;
    
    if (!isValidObjectId(integrationId)) {
      // Try to find integration by name
      if (verbose) {
        console.log(blue(`Looking for integration with name: ${integrationId}`));
      }
      
      const integration = findIntegrationByName(integrationId);
      if (!integration) {
        console.error(red(`Error: Could not find integration with name "${integrationId}"`));
        console.error(yellow('Make sure:'));
        console.error(yellow('1. The integration name matches exactly (case-insensitive)'));
        console.error(yellow('2. You are in a project directory with an "integrations" folder'));
        console.error(yellow('3. The integration file has a .integration.json extension'));
        process.exit(1);
      }
      
      resolvedIntegrationId = integration.id;
      integrationName = integration.name;
      
      if (verbose) {
        console.log(green(`Found integration: ${integrationName} (${resolvedIntegrationId})`));
      }
    }
    
    // Initialize SDK
    const sdk = await initializeSdk();
    
    // Load conversation history from log file if provided
    let conversationHistory = [];
    if (logFile) {
      try {
        if (fs.existsSync(logFile)) {
          const logContent = fs.readFileSync(logFile, 'utf-8');
          conversationHistory = JSON.parse(logContent);
          if (!Array.isArray(conversationHistory)) {
            console.warn(yellow('Warning: Log file does not contain a valid message array, starting fresh.'));
            conversationHistory = [];
          }
        }
      } catch (error) {
        console.warn(yellow(`Warning: Could not read log file: ${error.message}`));
        conversationHistory = [];
      }
    }
    
    // Get message from command line or stdin
    let userMessage = message;
    if (!userMessage) {
      if (process.stdin.isTTY) {
        console.log(yellow('Enter your message (press Ctrl+D when done):'));
      }
      
      // Read from stdin
      let stdinContent = '';
      for await (const chunk of process.stdin) {
        stdinContent += chunk.toString();
      }
      userMessage = stdinContent.trim();
    }
    
    if (!userMessage) {
      console.error(red('Error: No message provided. Use --message option or pipe message to stdin.'));
      process.exit(1);
    }
    
    // Prepare chat options
    const userMessageObj = {
      role: 'user',
      content: userMessage
    };
    
    const chatOptions = {
      messages: [...conversationHistory, userMessageObj]
    };
    
    console.log(blue(`\n=== Qelos AI Agent ===\n`));
    console.log(blue(`Integration: ${integrationName || resolvedIntegrationId}`));
    if (integrationName) {
      console.log(blue(`ID: ${resolvedIntegrationId}`));
    }
    if (thread) {
      console.log(blue(`Thread: ${thread}`));
    }
    console.log(blue(`Message: ${userMessage}`));
    console.log('');
    
    if (stream) {
      // Streaming mode
      try {
        let streamFunction;
        if (thread) {
          streamFunction = sdk.ai.streamChatInThread(resolvedIntegrationId, thread, chatOptions);
        } else {
          streamFunction = sdk.ai.streamChat(resolvedIntegrationId, chatOptions);
        }
        
        const streamResponse = await streamFunction;
        const processor = sdk.ai.parseSSEStream(streamResponse);
        
        let fullResponse = '';
        const chunks = [];
        
        if (json) {
          // JSON output for streaming
          console.log('[');
          let first = true;
          for await (const chunk of processor) {
            chunks.push(chunk);
            if (!first) {
              console.log(',');
            }
            console.log(JSON.stringify(chunk, null, 2));
            first = false;
          }
          console.log(']');
        } else {
          // Human-readable output for streaming
          process.stdout.write(green('Assistant: '));
          for await (const chunk of processor) {
            chunks.push(chunk);
            if (chunk.choices && chunk.choices[0]?.delta?.content) {
              const content = chunk.choices[0].delta.content;
              process.stdout.write(content);
              fullResponse += content;
            } else if (chunk.content) {
              process.stdout.write(chunk.content);
              fullResponse += chunk.content;
            }
          }
          console.log('\n');
        }
        
        // Save to log file if provided
        if (logFile) {
          const assistantMessage = {
            role: 'assistant',
            content: fullResponse
          };
          const updatedHistory = [...conversationHistory, userMessageObj, assistantMessage];
          saveToLogFile(logFile, updatedHistory);
        }
        
        // Export response if requested
        if (exportFile) {
          const exportContent = json ? JSON.stringify(chunks, null, 2) : fullResponse;
          exportToFile(exportFile, exportContent);
        }
        
      } catch (error) {
        console.error(red('Streaming error:'), error.message);
        if (verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    } else {
      // Non-streaming mode
      try {
        let response;
        if (thread) {
          response = await sdk.ai.chat.chatInThread(resolvedIntegrationId, thread, chatOptions);
        } else {
          response = await sdk.ai.chat.chat(resolvedIntegrationId, chatOptions);
        }
        
        let responseContent = '';
        
        if (json) {
          console.log(JSON.stringify(response, null, 2));
          responseContent = JSON.stringify(response, null, 2);
        } else {
          if (response.choices && response.choices[0]?.message?.content) {
            responseContent = response.choices[0].message.content;
            console.log(green('Assistant:'), responseContent);
          } else if (response.content) {
            responseContent = response.content;
            console.log(green('Assistant:'), responseContent);
          } else {
            console.log(yellow('No response content received.'));
            if (verbose) {
              console.log('Full response:', JSON.stringify(response, null, 2));
            }
          }
        }
        
        // Save to log file if provided
        if (logFile) {
          const assistantMessage = {
            role: 'assistant',
            content: responseContent
          };
          const updatedHistory = [...conversationHistory, userMessageObj, assistantMessage];
          saveToLogFile(logFile, updatedHistory);
        }
        
        // Export response if requested
        if (exportFile) {
          exportToFile(exportFile, responseContent);
        }
        
      } catch (error) {
        console.error(red('Chat completion error:'), error.message);
        if (verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    }
    
  } catch (error) {
    logger.error(error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
