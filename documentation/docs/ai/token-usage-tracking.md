# AI Token Usage Tracking

## Overview

The Qelos AI service automatically tracks token usage for all AI chat completions across all supported providers (OpenAI, Anthropic, and Gemini). This feature helps monitor API costs and usage patterns.

## Event Details

### Event Name: `token_usage`

The token usage event is emitted after every successful AI chat completion, whether streaming or non-streaming.

### Event Structure

```typescript
{
  tenant: string,           // Tenant ID
  user: string,             // User ID
  source: string,           // Source identifier (format: `ai_service:${provider}` or `ai_service:${sourceId}`)
  kind: 'ai_service',       // Event kind
  eventName: 'token_usage', // Event name
  description: string,      // Description of the event
  metadata: {
    provider: string,           // AI provider ('openai', 'anthropic', 'gemini')
    sourceId?: string,          // Source configuration ID
    integrationId?: string,     // Integration ID
    integrationName?: string,   // Integration name
    model: string,              // Model used (e.g., 'gpt-4.1-mini', 'claude-3-opus-20240229')
    usage: {
      prompt_tokens: number,     // Number of tokens in the prompt
      completion_tokens: number, // Number of tokens in the completion
      total_tokens: number,      // Total tokens used
    },
    stream: boolean,             // Whether this was a streaming request
    context?: any,              // Additional context information
    timestamp: string,          // ISO timestamp of the event
  }
}
```

## Provider-Specific Implementation

### OpenAI
- **Non-streaming**: Usage extracted from `response.usage`
- **Streaming**: Usage captured from the final chunk with `stream_options: { include_usage: true }`

### Anthropic
- **Non-streaming**: Usage extracted from `response.usage` (input_tokens/output_tokens)
- **Streaming**: Usage captured from the `message_delta` event

### Gemini
- **Non-streaming**: Usage extracted from `response.usageMetadata`
- **Streaming**: Usage captured from `chunk.usageMetadata`

## Context Information

The event includes contextual information passed through the `loggingContext` parameter:

```typescript
loggingContext: {
  tenant?: string,         // Tenant ID
  userId?: string,         // User ID
  workspaceId?: string,    // Workspace ID
  integrationId?: string,  // Integration ID
  integrationName?: string // Integration name
}
```

## Usage Examples

### Monitoring Token Consumption

```javascript
// Listen for token usage events
platformEventService.on('token_usage', (event) => {
  console.log(`Token usage for ${event.metadata.provider}:`);
  console.log(`  Model: ${event.metadata.model}`);
  console.log(`  Tokens: ${event.metadata.usage.total_tokens}`);
  console.log(`  User: ${event.user}`);
  console.log(`  Integration: ${event.metadata.integrationName}`);
});
```

### Cost Tracking

```javascript
// Calculate costs based on token usage
const PRICING = {
  'gpt-4.1-mini': { prompt: 0.00015, completion: 0.0006 },
  'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
  'gemini-1.5-pro': { prompt: 0.0025, completion: 0.0075 }
};

platformEventService.on('token_usage', (event) => {
  const pricing = PRICING[event.metadata.model];
  if (pricing) {
    const cost = (event.metadata.usage.prompt_tokens * pricing.prompt / 1000) +
                 (event.metadata.usage.completion_tokens * pricing.completion / 1000);
    console.log(`Cost: $${cost.toFixed(4)}`);
  }
});
```

## Implementation Notes

1. **Automatic Emission**: Token usage events are automatically emitted by the AI service - no manual tracking required
2. **Error Handling**: Events are only emitted for successful completions; errors are tracked separately
3. **Streaming Support**: Both streaming and non-streaming completions are tracked
4. **Multi-Provider**: Works consistently across all supported AI providers
5. **Context Preservation**: All contextual information (tenant, user, workspace, integration) is preserved in the event

## Related Events

- `function_execution_failed`: Emitted when function calls fail
- `function_execution_timeout`: Emitted when function calls time out
- `data-manipulation-failed`: Emitted when data manipulation fails
- `chat_completion_error`: Emitted when chat completions fail
- `quota_exceeded`: Emitted when API quotas are exceeded
