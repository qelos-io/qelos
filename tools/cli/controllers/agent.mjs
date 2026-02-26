import { logger } from '../services/logger.mjs';
import { initializeSdk } from '../services/sdk.mjs';
import { getAgentConfig, getConfig } from '../services/load-config.mjs';
import { buildClientTools, loadContext } from '../services/agent-tools.mjs';
import { green, blue, yellow, red } from '../utils/colors.mjs';
import { createStreamingRenderer } from '../utils/streaming-markdown.mjs';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'node:chalk';

// Helper function to check if a string is a valid MongoDB ObjectId
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Helper function to search for integration by name in integrations folder
function findIntegrationByName(name, currentDir = process.cwd()) {
  let searchDir = currentDir;
  let integrationsDir = null;

  for (let i = 0; i < 5; i++) {
    const potentialDir = path.join(searchDir, 'integrations');
    if (fs.existsSync(potentialDir) && fs.statSync(potentialDir).isDirectory()) {
      integrationsDir = potentialDir;
      break;
    }
    const parentDir = path.dirname(searchDir);
    if (parentDir === searchDir) break;
    searchDir = parentDir;
  }

  if (!integrationsDir) return null;

  try {
    const files = fs.readdirSync(integrationsDir);
    for (const file of files) {
      if (file.endsWith('.integration.json')) {
        const filePath = path.join(integrationsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const integration = JSON.parse(content);
        if (
          integration.trigger?.details?.name &&
          integration.trigger.details.name.toLowerCase() === name.toLowerCase()
        ) {
          return { id: integration._id, name: integration.trigger.details.name, file: filePath };
        }
      }
    }
  } catch (error) {
    // ignore
  }

  return null;
}

function saveToLogFile(logFile, messages) {
  try {
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(logFile, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (error) {
    console.warn(yellow(`Warning: Could not save to log file: ${error.message}`));
  }
}

function exportToFile(exportFile, content) {
  try {
    const exportDir = path.dirname(exportFile);
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    fs.writeFileSync(exportFile, content, 'utf-8');
    console.log(green(`\nResponse exported to: ${exportFile}`));
  } catch (error) {
    console.warn(yellow(`Warning: Could not export to file: ${error.message}`));
  }
}

/**
 * Parses tool call arguments, handling the case where the AI concatenates
 * multiple JSON objects in a single arguments string (e.g. batch reads).
 * Returns an array of args objects — one per JSON object found.
 *
 * @param {string} argStr
 * @returns {object[]}
 */
function parseToolArguments(argStr) {
  if (!argStr) return [{}];
  try {
    return [JSON.parse(argStr)];
  } catch {
    // Walk the string and extract each top-level JSON object
    const results = [];
    let remaining = argStr.trim();
    while (remaining.startsWith('{')) {
      let depth = 0;
      let i = 0;
      for (; i < remaining.length; i++) {
        if (remaining[i] === '{') depth++;
        else if (remaining[i] === '}') { depth--; if (depth === 0) { i++; break; } }
      }
      try { results.push(JSON.parse(remaining.slice(0, i))); } catch { break; }
      remaining = remaining.slice(i).trim();
    }
    return results.length > 0 ? results : [{}];
  }
}

/**
 * Streams a chat completion, handling client_tool_calls in a loop.
 * Re-calls the stream automatically when tools are executed.
 *
 * @returns {{ fullResponse: string, allMessages: object[] }}
 */
async function streamWithTools(sdk, integrationId, thread, chatOptions, clientTools, verbose, depth = 0, onMessages = null) {
  const MAX_TOOL_DEPTH = getConfig()?.maxToolDepth ?? 25;
  if (depth >= MAX_TOOL_DEPTH) {
    process.stdout.write(yellow(`\n[warning] Max tool call depth (${MAX_TOOL_DEPTH}) reached.\n\n`));
    const msgs = chatOptions.messages || [];
    onMessages?.(msgs);
    return { fullResponse: '', allMessages: msgs };
  }
  if (verbose) {
    console.log(blue('\n[debug] chatOptions.clientTools:'),
      JSON.stringify(chatOptions.clientTools, null, 2));
    console.log(blue('[debug] chatOptions.context:'),
      JSON.stringify(chatOptions.context ?? null));
    console.log(blue('[debug] chatOptions.messages count:'), chatOptions.messages?.length);
    console.log('');
  }

  let streamResponse;
  if (thread) {
    streamResponse = await sdk.ai.streamChatInThread(integrationId, thread, chatOptions);
  } else {
    streamResponse = await sdk.ai.streamChat(integrationId, chatOptions);
  }

  const processor = sdk.ai.parseSSEStream(streamResponse);

  let assistantContent = '';
  let pendingClientToolCalls = null;
  let labelWritten = false;
  let renderer = createStreamingRenderer();

  for await (const data of processor) {
    if (verbose && data.type !== 'chunk' && data.type !== 'followup_chunk') {
      if (labelWritten) process.stdout.write('\n');
      console.log(blue(`[debug:sse] type=${data.type}`), JSON.stringify(data, null, 2));
    }

    if (data.type === 'connection_established') continue;
    if (data.type === 'continuing_conversation') {
      assistantContent = '';
      renderer = createStreamingRenderer(); // Reset renderer
      continue;
    }
    if (data.type === 'chunk' || data.type === 'followup_chunk') {
      if (data.content) {
        if (!labelWritten) {
          process.stdout.write(green('Assistant: '));
          labelWritten = true;
        }
        assistantContent += data.content;
        // Stream the content with markdown formatting
        const formatted = renderer.process(data.content);
        process.stdout.write(formatted);
      }
      if (data.chunk?.choices?.[0]?.finish_reason === 'stop') break;
    } else if (data.type === 'function_executed') {
      let args = {};
      try { args = JSON.parse(data.functionCall?.arguments || '{}'); } catch {}
      console.log(blue(`\n[function_executed] ${data.functionCall?.function?.name}`), args);
    } else if (data.type === 'client_tool_calls') {
      pendingClientToolCalls = data;
    } else if (data.type === 'done') {
      break;
    }
  }

  // No pending tool calls — close formatting and add newlines
  if (!pendingClientToolCalls || !clientTools.length) {
    if (assistantContent) {
      // Close any open markdown formatting
      process.stdout.write(renderer.end());
      process.stdout.write('\n\n');
    } else {
      process.stdout.write('\n\n');
    }
    const finalMsgs = [
      ...(chatOptions.messages || []),
      { role: 'assistant', content: assistantContent },
    ];
    onMessages?.(finalMsgs);
    return { fullResponse: assistantContent, allMessages: finalMsgs };
  }

  // Handle client tool calls
  process.stdout.write('\n');
  const { functionCalls, backendResults, assistantToolCalls } = pendingClientToolCalls;

  const toolHandlers = new Map(
    clientTools.filter(t => t.handler).map(t => [t.name, t.handler])
  );

  const toolResultMessages = [];

  for (const fc of functionCalls) {
    const toolName = fc.function?.name ?? fc.name;
    const argsList = parseToolArguments(fc.function?.arguments ?? fc.arguments);

    const handler = toolHandlers.get(toolName);
    const results = [];

    for (const args of argsList) {
      let result = '';
      if (handler) {
        try {
          result = await handler(args);
          if (typeof result === 'object') result = JSON.stringify(result);
        } catch (err) {
          result = JSON.stringify({ error: err?.message || 'Tool execution failed' });
        }
      } else {
        result = JSON.stringify({ error: `No handler registered for tool "${toolName}"` });
      }
      if (result) results.push(result);
    }

    const combined = results.join('\n---\n');
    if (combined) {
      toolResultMessages.push({
        tool_call_id: fc.id,
        role: 'tool',
        name: toolName,
        content: combined,
      });
    }
  }

  if (toolResultMessages.length === 0) {
    process.stdout.write('\n');
    const msgs = chatOptions.messages || [];
    onMessages?.(msgs);
    return { fullResponse: assistantContent, allMessages: msgs };
  }

  // Build updated message history with tool results
  const currentMessages = chatOptions.messages || [];

  const assistantMsg = {
    role: 'assistant',
    content: assistantContent,
    tool_calls: assistantToolCalls,
  };

  const backendToolMessages = (backendResults || []).map(br => ({
    role: 'tool',
    content: br.content || '',
    tool_call_id: br.tool_call_id,
    name: br.name,
  }));

  const newMessages = [
    ...currentMessages,
    assistantMsg,
    ...backendToolMessages,
    ...toolResultMessages,
  ];

  const newChatOptions = { ...chatOptions, messages: newMessages };

  // Save incremental log after tool execution
  onMessages?.(newMessages);

  // Recursively stream the follow-up response
  const followUp = await streamWithTools(sdk, integrationId, thread, newChatOptions, clientTools, verbose, depth + 1, onMessages);

  const parts = [assistantContent, followUp.fullResponse].filter(s => s?.trim());
  return { fullResponse: parts.join('\n'), allMessages: followUp.allMessages };
}

export default async function agentController(argv) {
  const {
    integrationId,
    thread,
    json,
    stream,
    message,
    verbose,
    interactive,
    export: exportFile,
    log: logFile,
    tools: cliTools,
    context: contextArg,
    contextFile,
  } = argv;

  if (verbose) {
    process.env.VERBOSE = 'true';
  }

  try {
    // Resolve integration ID (could be ObjectId or name)
    let resolvedIntegrationId = integrationId;
    let integrationName = null;

    if (!isValidObjectId(integrationId)) {
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

    // Load agent config for this integration
    const agentConfig = getAgentConfig(integrationId) || getAgentConfig(integrationName) || {};

    // Load context (--context > --context-file > agent config)
    const context = loadContext({ context: contextArg, contextFile }, agentConfig);

    // Build client tools (--tools flag + config clientTools)
    const configClientTools = agentConfig.clientTools || [];
    const clientTools = buildClientTools(cliTools || [], configClientTools);

    if (verbose && clientTools.length) {
      console.log(blue(`Client tools enabled: ${clientTools.map(t => t.name).join(', ')}`));
    }
    if (verbose && context) {
      console.log(blue(`Context: ${JSON.stringify(context)}`));
    }

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

    // Get initial message (optional in interactive mode)
    let userMessage = message;
    if (!userMessage && !interactive) {
      if (process.stdin.isTTY) {
        console.log(yellow('Enter your message (press Ctrl+D when done):'));
      }
      let stdinContent = '';
      for await (const chunk of process.stdin) {
        stdinContent += chunk.toString();
      }
      userMessage = stdinContent.trim();
      if (!userMessage) {
        console.error(red('Error: No message provided. Use --message option or pipe message to stdin.'));
        process.exit(1);
      }
    }

    // Helper to build chat options for a given message list
    const buildChatOptions = (messages) => ({
      messages,
      ...(context ? { context } : {}),
      ...(clientTools.length
        ? { clientTools: clientTools.map(({ handler, ...rest }) => rest) }
        : {}),
    });

    console.log(blue(`\n=== Qelos AI Agent ===\n`));
    console.log(blue(`Integration: ${integrationName || resolvedIntegrationId}`));
    if (integrationName) console.log(blue(`ID: ${resolvedIntegrationId}`));
    if (thread) console.log(blue(`Thread: ${thread}`));
    if (context) console.log(blue(`Context: ${JSON.stringify(context)}`));
    if (clientTools.length) console.log(blue(`Tools: ${clientTools.map(t => t.name).join(', ')}`));
    if (interactive) console.log(blue(`Mode: interactive (type /exit to quit)`));
    else if (userMessage) console.log(blue(`Message: ${userMessage}`));
    console.log('');

    if (stream || interactive) {
      try {
        const onMessages = logFile ? (msgs) => saveToLogFile(logFile, msgs) : null;
        let currentMessages = conversationHistory;

        // Send initial message if provided
        if (userMessage) {
          const { fullResponse, allMessages } = await streamWithTools(
            sdk,
            resolvedIntegrationId,
            thread,
            buildChatOptions([...currentMessages, { role: 'user', content: userMessage }]),
            clientTools,
            verbose,
            0,
            onMessages,
          );
          currentMessages = allMessages;
          if (exportFile) exportToFile(exportFile, fullResponse);
        }

        // Interactive loop with basic input
        if (interactive) {
          while (true) {
            // Put "You:" on its own line
            console.log(chalk.cyan('You:'));
            
            // Try using process.stdin.read() directly
            const input = await new Promise((resolve) => {
              let buffer = '';
              let lines = [];
              
              // Set raw mode
              process.stdin.setRawMode(true);
              process.stdin.resume();
              process.stdin.setEncoding('utf8');
              
              // Clear any existing data
              process.stdin.removeAllListeners('readable');
              process.stdin.removeAllListeners('data');
              
              const onData = (chunk) => {
                const chars = chunk.toString();
                
                for (let i = 0; i < chars.length; i++) {
                  const char = chars[i];
                  
                  if (char === '\r' || char === '\n') {
                    // Move to next line
                    process.stdout.write('\n');
                    
                    // If buffer is empty and we already have content, submit
                    if (buffer === '' && lines.length > 0) {
                      process.stdin.setRawMode(false);
                      process.stdin.pause();
                      process.stdin.removeAllListeners('data');
                      resolve(lines.join('\n'));
                      return;
                    }
                    
                    // Add current line to lines
                    lines.push(buffer);
                    buffer = '';
                    
                    // Show continuation prompt
                    process.stdout.write('> ');
                    return;
                  }
                  
                  if (char === '\x03') {
                    // Ctrl+C
                    process.stdout.write('^C\n');
                    process.exit(0);
                    return;
                  }
                  
                  if (char === '\x7f' || char === '\x08') {
                    // Backspace
                    if (buffer.length > 0) {
                      buffer = buffer.slice(0, -1);
                      process.stdout.write('\b \b');
                    }
                    continue;
                  }
                  
                  // Regular character - only add if it's printable
                  if (char >= ' ' && char <= '~') {
                    buffer += char;
                    process.stdout.write(char);
                  }
                }
              };
              
              process.stdin.on('data', onData);
              process.stdout.write('> ');
            });
            
            if (!input || input.trim() === '/exit') break;

            try {
              const { fullResponse, allMessages } = await streamWithTools(
                sdk,
                resolvedIntegrationId,
                thread,
                buildChatOptions([...currentMessages, { role: 'user', content: input }]),
                clientTools,
                verbose,
                0,
                onMessages,
              );
              currentMessages = allMessages;
              if (exportFile) exportToFile(exportFile, fullResponse);
            } catch (err) {
              console.error(red('Error:'), err.message);
            }
          }

          console.log(blue('\nConversation ended.'));
        }
      } catch (error) {
        console.error(red('Streaming error:'), error.message);
        if (verbose) console.error(error.stack);
        process.exit(1);
      }
    } else {
      // Non-streaming mode (no tool support)
      try {
        const chatOptions = buildChatOptions([...conversationHistory, { role: 'user', content: userMessage }]);
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
            if (verbose) console.log('Full response:', JSON.stringify(response, null, 2));
          }
        }

        if (logFile) {
          const assistantMessage = { role: 'assistant', content: responseContent };
          saveToLogFile(logFile, [...conversationHistory, { role: 'user', content: userMessage }, assistantMessage]);
        }

        if (exportFile) {
          exportToFile(exportFile, responseContent);
        }
      } catch (error) {
        console.error(red('Chat completion error:'), error.message);
        if (verbose) console.error(error.stack);
        process.exit(1);
      }
    }
  } catch (error) {
    logger.error(error.message);
    if (verbose) console.error(error.stack);
    process.exit(1);
  }
}
