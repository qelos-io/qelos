
export enum IntegrationSourceKind {
  Qelos = 'qelos',
  OpenAI = 'openai',
  SMTP = 'smtp',
  N8n = 'n8n',
  Supabase = 'supabase',
}

export interface IIntegrationSource {
  tenant: string;
  plugin?: string;
  user: string;
  authentication: string;
  metadata: any;
  name: string;
  labels: string[];
  kind: IntegrationSourceKind;
  created: Date;
}
