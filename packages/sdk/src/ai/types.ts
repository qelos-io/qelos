export interface IMessage {
  role: string;
  content: string;
  timestamp?: Date | string;
  tool_calls?: any[];
  name?: string;
  tool_call_id?: string;
  function_call?: any;
  message_id?: string;
}

export interface IMessageSummary {
  fromIndex: number;
  toIndex: number;
  summary: string;
}

export interface IThread {
  _id?: string;
  integration: string;
  title?: string;
  messages: IMessage[];
  messageSummaries: IMessageSummary[];
  created?: Date;
  updated?: Date;
  user?: string;
  workspace?: string;
}

export interface IChatCompletionOptions {
  messages: IMessage[];
  model?: string;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  max_tokens?: number;
  response_format?: any;
  context?: Record<string, any>;
  stream?: boolean;
  queryParams?: Record<string, any>;
}

export interface ISSEStreamProcessor extends AsyncIterable<any> {
  processManually(onData: (data: any) => void | boolean): Promise<void>;
}

export interface IChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: IMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ICreateThreadRequest {
  integration: string;
  title?: string;
}

export interface ICreateVectorStorageRequest {
  integrationId: string;
  scope: 'thread' | 'user' | 'workspace' | 'tenant';
  subjectId?: string;
  expirationAfterDays?: number;
}

export interface IUploadContentRequest {
  integrationId?: string;
  vectorStoreId?: string;
  content: string | object;
  fileName?: string;
  metadata?: Record<string, any>;
}

export interface IClearStorageRequest {
  integrationId?: string;
  vectorStoreId?: string;
  fileIds?: string[];
}

export interface IVectorStore {
  _id: string;
  scope: string;
  subjectId?: string;
  tenant: string;
  agent: string;
  externalId: string;
  expirationAfterDays?: number;
  created: Date;
}
