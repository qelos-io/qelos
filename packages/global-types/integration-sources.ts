export enum IntegrationSourceKind {
  Qelos = 'qelos',
  OpenAI = 'openai',
  Email = 'email',
  N8n = 'n8n',
  Supabase = 'supabase',
  LinkedIn = 'linkedin',
  Http = 'http',
  ClaudeAi = 'claudeai',
  Facebook = 'facebook',
  Google = 'google',
  GitHub = 'github',
  Gemini = 'gemini',
}

export interface IIntegrationSource {
  _id?: string;
  tenant: string;
  plugin?: string;
  user: string;
  authentication: any;
  metadata: any;
  name: string;
  labels: string[];
  kind: IntegrationSourceKind;
  created: Date;
}

export enum HttpTargetOperation {
  makeRequest = 'makeRequest',
}

export enum QelosTriggerOperation {
  webhook = 'webhook',
  chatCompletion = 'chatCompletion',
}

export enum QelosTargetOperation {
  webhook = 'webhook',
  createBlueprintEntity = 'createBlueprintEntity',
  createUser = 'createUser',
  updateUser = 'updateUser',
  setUserRoles = 'setUserRoles',
  setWorkspaceLabels = 'setWorkspaceLabels',
  updateBlueprintEntity = 'updateBlueprintEntity',
  chatCompletion = 'chatCompletion',
}

export const OpenAITargetOperation = {
  chatCompletion: 'chatCompletion',
  functionCalling: 'functionCalling',
} as const;

export const EmailTargetOperation = {
  sendEmail: 'sendEmail',
} as const;

export enum ClaudeAITargetOperation {
  chatCompletion = 'chatCompletion',
}

export interface ILinkedInSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.LinkedIn;
  authentication: {
    clientSecret?: string;
  };
  metadata: {
    clientId: string;
    scope: string;
  };
}

export interface IQelosSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.Qelos;
  authentication: {
    password: string;
  };
  metadata: {
    url: string;
    username: string;
  };
}

export interface ISupabaseSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.Supabase;
  metadata: {
    url: string;
  };
}

export interface IOpenAISource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.OpenAI;
  authentication: {
    token: string;
  }
}

export interface IClaudeAiSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.ClaudeAi;
}

export interface IGeminiSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.Gemini;
  authentication: {
    token: string;
  };
  metadata: {
    defaultModel?: string | null;
    initialMessages?: { role: string; content: string }[];
  };
}

export interface IN8nSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.N8n;
  metadata: {
    url: string;
  };
}

export interface IEmailSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.Email;
  authentication: {
    password: string;
  };
  metadata: {
    username: string;
    email: string;
    pop3: string;
    smtp: string;
    senderName: string;
  };
}

export interface IFacebookSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.Facebook;
  authentication: {
    clientSecret: string;
  };
  metadata: {
    clientId: string;
    scope: string;
  };
}

export interface IHttpSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.Http;
  authentication: {
    securedHeaders: Record<string, string>;
  };
  metadata: {
    baseUrl: string;
    headers: Record<string, string>;
    method: string;
    query: Record<string, string>;
  };
}

export interface IGoogleSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.Google;
  authentication: {
    clientSecret: string;
  };
  metadata: {
    clientId: string;
    scope: string;
  };
}

export interface IGithubSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.GitHub;
  authentication: {
    clientSecret: string;
  };
  metadata: {
    clientId: string;
    scope: string;
  };
}
