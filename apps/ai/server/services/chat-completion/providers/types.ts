import { IClaudeAiSource, IGeminiSource, IOpenAISource } from '@qelos/global-types';

export interface AIServiceOptions {
  model: string;
  messages: any[];
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  max_tokens?: number;
  tools?: any[];
  response_format?: any;
  unsafeUserContext?: Record<string, string>;
  stream?: boolean;
  loggingContext?: {
    tenant?: string;
    userId?: string;
    workspaceId?: string;
    integrationId?: string;
    integrationName?: string;
  };
  input?: any;
  tool_resources?: any;
}

export type AIServiceSource = IOpenAISource | IClaudeAiSource | IGeminiSource;

export interface AIServiceAuthentication {
  token?: string;
}
