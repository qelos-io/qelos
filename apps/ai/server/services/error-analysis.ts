import logger from './logger';

/**
 * Error categories for AI chat completion failures
 */
export const ERROR_CATEGORIES = {
  TIMEOUT: {
    patterns: ['timeout', 'ETIMEDOUT', 'timed out', 'TimeoutError'],
    possibleCauses: [
      'Model is overloaded or experiencing high demand',
      'Request is too complex or processing is taking too long',
      'Network connectivity issues',
      'Function execution is taking too long'
    ],
    suggestedFixes: [
      'Try again with a simpler request',
      'Reduce the number of messages in the conversation',
      'Disable function calls if not essential',
      'Use a faster model (e.g., gpt-3.5-turbo instead of gpt-4)',
      'Check network connectivity',
      'Increase timeout settings if possible'
    ]
  },
  RATE_LIMIT: {
    patterns: ['rate limit', '429', 'too many requests', 'quota', 'RateLimitError'],
    possibleCauses: [
      'API quota exceeded',
      'Too many requests in a short period',
      'Concurrent request limit reached'
    ],
    suggestedFixes: [
      'Wait and retry after the suggested time',
      'Implement exponential backoff',
      'Reduce request frequency',
      'Upgrade your API plan for higher limits',
      'Use caching for repeated requests'
    ]
  },
  AUTHENTICATION: {
    patterns: ['unauthorized', '401', 'invalid api key', 'authentication', 'auth'],
    possibleCauses: [
      'Invalid or expired API key',
      'Incorrect authentication credentials',
      'API key permissions insufficient'
    ],
    suggestedFixes: [
      'Verify API key is correct and active',
      'Check API key permissions',
      'Regenerate API key if necessary',
      'Ensure the key has access to the selected model'
    ]
  },
  INVALID_REQUEST: {
    patterns: ['invalid request', '400', 'invalid', 'malformed', 'bad request'],
    possibleCauses: [
      'Invalid model name',
      'Malformed request parameters',
      'Missing required fields',
      'Invalid message format'
    ],
    suggestedFixes: [
      'Check model name is correct for the provider',
      'Validate request parameters',
      'Ensure all required fields are present',
      'Check message format follows API specifications'
    ]
  },
  INSUFFICIENT_PERMISSIONS: {
    patterns: ['permission', 'forbidden', '403', 'access denied'],
    possibleCauses: [
      'API key lacks permission for this operation',
      'Model not available in your region',
      'Organization restrictions'
    ],
    suggestedFixes: [
      'Check API key permissions',
      'Verify model availability in your region',
      'Contact support for access requests'
    ]
  },
  MODEL_UNAVAILABLE: {
    patterns: ['model not found', 'model unavailable', 'deprecated', '404'],
    possibleCauses: [
      'Model name is incorrect',
      'Model has been deprecated',
      'Model not available for your API tier'
    ],
    suggestedFixes: [
      'Verify model name spelling',
      'Check if model is still supported',
      'Use an alternative model',
      'Update to a newer model version'
    ]
  },
  CONTENT_POLICY: {
    patterns: ['content policy', 'safety', 'filtered', 'inappropriate', '400'],
    possibleCauses: [
      'Request violates content policies',
      'Prompt contains flagged content',
      'Safety filters triggered'
    ],
    suggestedFixes: [
      'Review and modify prompt content',
      'Remove sensitive or inappropriate content',
      'Use content filtering before sending',
      'Contact support if content is wrongly flagged'
    ]
  },
  TOKEN_LIMIT: {
    patterns: ['token', 'too long', 'maximum', 'limit', 'context length'],
    possibleCauses: [
      'Request exceeds model\'s token limit',
      'Conversation history is too long',
      'Function definitions add too many tokens'
    ],
    suggestedFixes: [
      'Reduce conversation history',
      'Summarize older messages',
      'Use a model with higher token limit',
      'Split into multiple requests',
      'Optimize function descriptions'
    ]
  },
  FUNCTION_ERROR: {
    patterns: ['function', 'tool', 'tool_call', 'execution'],
    possibleCauses: [
      'Function execution failed',
      'Invalid function definition',
      'Function timeout',
      'Function returned invalid response'
    ],
    suggestedFixes: [
      'Check function definitions are correct',
      'Verify function implementation',
      'Add error handling in functions',
      'Reduce function complexity',
      'Check function logs for details'
    ]
  },
  NETWORK: {
    patterns: ['network', 'connection', 'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED'],
    possibleCauses: [
      'Network connectivity issues',
      'DNS resolution problems',
      'Firewall blocking requests',
      'Proxy configuration issues'
    ],
    suggestedFixes: [
      'Check internet connection',
      'Verify DNS settings',
      'Check firewall rules',
      'Test with different network',
      'Configure proxy if needed'
    ]
  }
} as const;

export type ErrorCategory = keyof typeof ERROR_CATEGORIES;
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Context information for error analysis
 */
export interface ErrorContext {
  provider: string;
  model: string;
  integrationId: string;
  tenant: string; // Required - app should not work without tenant
  hasFunctionCalls: boolean;
  messageCount: number;
  isStreaming: boolean;
}

/**
 * Result of error analysis
 */
export interface ErrorAnalysis {
  category: ErrorCategory | 'UNKNOWN';
  possibleCauses: string[];
  suggestedFixes: string[];
  severity: ErrorSeverity;
  isRetryable: boolean;
}

/**
 * Analyzes chat completion errors to provide actionable insights
 */
export function analyzeChatCompletionError(error: any, context: ErrorContext): ErrorAnalysis {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStatus = error?.status || error?.response?.status;
  const errorCode = error?.code;
  
  // Determine error category
  let category: ErrorCategory | 'UNKNOWN' = 'UNKNOWN';
  let possibleCauses: string[] = ['Unknown error occurred'];
  let suggestedFixes: string[] = ['Contact support with error details'];
  
  for (const [key, value] of Object.entries(ERROR_CATEGORIES)) {
    if (value.patterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
      errorStatus?.toString().includes(pattern) ||
      errorCode?.toLowerCase().includes(pattern.toLowerCase())
    )) {
      category = key as ErrorCategory;
      possibleCauses = [...value.possibleCauses];
      suggestedFixes = [...value.suggestedFixes];
      break;
    }
  }
  
  // Add context-specific suggestions
  if (context.hasFunctionCalls && category === 'TIMEOUT') {
    suggestedFixes.push('Consider reducing the number of function calls');
    suggestedFixes.push('Optimize function execution time');
  }
  
  if (context.messageCount > 10 && category === 'TOKEN_LIMIT') {
    suggestedFixes.push('Consider reducing conversation history');
    suggestedFixes.push('Implement message summarization');
  }
  
  return {
    category,
    possibleCauses,
    suggestedFixes,
    severity: getErrorSeverity(category, errorStatus),
    isRetryable: isRetryableError(category, errorStatus)
  };
}

/**
 * Determines the severity of an error based on category and status code
 */
function getErrorSeverity(category: ErrorCategory | 'UNKNOWN', status?: number): ErrorSeverity {
  if (status && status >= 500) return 'critical';
  if (category === 'AUTHENTICATION' || category === 'INSUFFICIENT_PERMISSIONS') return 'high';
  if (category === 'RATE_LIMIT' || category === 'MODEL_UNAVAILABLE') return 'medium';
  return 'low';
}

/**
 * Determines if an error is retryable based on category and status code
 */
function isRetryableError(category: ErrorCategory | 'UNKNOWN', status?: number): boolean {
  const retryableCategories: ErrorCategory[] = ['TIMEOUT', 'RATE_LIMIT', 'NETWORK', 'MODEL_UNAVAILABLE'];
  return retryableCategories.includes(category as ErrorCategory) || !!(status && status >= 500);
}

/**
 * Creates a standardized error response object
 */
export function createErrorResponse(error: any, analysis: ErrorAnalysis, requestId?: string) {
  return {
    error: 'AI chat completion failed',
    message: error instanceof Error ? error.message : String(error),
    category: analysis.category,
    possibleCauses: analysis.possibleCauses,
    suggestedFixes: analysis.suggestedFixes,
    severity: analysis.severity,
    isRetryable: analysis.isRetryable,
    requestId: requestId || 'unknown'
  };
}

/**
 * Logs error with structured data for better debugging
 */
export function logError(loggerInstance: any, message: string, error: any, analysis: ErrorAnalysis, context: Record<string, any>) {
  loggerInstance.error(message, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    analysis,
    context
  });
}
