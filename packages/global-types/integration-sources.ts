export enum IntegrationSourceKind {
  Qelos = 'qelos',
  OpenAI = 'openai',
  Email = 'email',
  N8n = 'n8n',
  Supabase = 'supabase',
  LinkedIn = 'linkedin',
}

export interface IIntegrationSource {
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