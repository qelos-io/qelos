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

export interface OpenAITargetPayload {
  messages: (any & {role: string, content: string})[];
  model?: string;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  max_tokens?: number;
  response_format?: { type: "text" | "json_object" };
  system?: string;
  triggerResponse?: {
    source?: string,
    kind?: string,
    eventName?: string,
    description?: string,
    metadata?: Record<string, any>,
  }
}