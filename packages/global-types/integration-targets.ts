export interface HttpTargetPayload {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, string>;
  triggerResponse?: {
    source?: string,
    kind?: string,
    eventName?: string,
    description?: string,
    metadata?: Record<string, any>,
  }
}


export interface OpenAIChatCompletionPayload {
  messages?: (any & {role: string, content: string})[];
  pre_messages?: (any & {role: string, content: string})[];
  model?: string;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  max_tokens?: number;
  response_format?: { type: "text" | "json_object" };
  system?: string;
  stop?: string | string[];
  embeddingType?: string;
  maxTools?: number;
  ingestedBlueprints?: string[];
  ingestedAgents?: string[];
  triggerResponse?: {
    source?: string,
    kind?: string,
    eventName?: string,
    description?: string,
    metadata?: Record<string, any>,
  };
}

export interface OpenAIUploadStoragePayload {
  vectorStoreId?: string;
  content: string | object;
  fileName?: string;
  metadata?: any;
}

export interface OpenAIClearStoragePayload {
  vectorStoreId?: string;
  fileIds?: string[];
}

export type OpenAITargetPayload = OpenAIChatCompletionPayload | OpenAIUploadStoragePayload | OpenAIClearStoragePayload;

