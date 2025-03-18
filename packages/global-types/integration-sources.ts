export enum IntegrationSourceKind {
  Qelos = 'qelos',
  OpenAI = 'openai',
  Email = 'email',
  N8n = 'n8n',
  Supabase = 'supabase',
  LinkedIn = 'linkedin',
  Http = 'http',
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
}

export enum QelosTargetOperation {
  webhook = 'webhook',
  createBlueprintEntity = 'createBlueprintEntity',
  createUser = 'createUser',
  updateUser = 'updateUser',
  setUserRoles = 'setUserRoles',
  setWorkspaceLabels = 'setWorkspaceLabels',
}

export enum OpenAITargetOperation {
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

export interface IHttpSource extends IIntegrationSource {
  _id?: string;
  kind: IntegrationSourceKind.Http;
  authentication: {
    securedHeaders: Record<string, string>;
  };
  metadata: {
    baseUrl: string;
    headers: Record<string, string>;
    query: Record<string, string>;
  };
}
