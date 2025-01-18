
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
  authentication: string;
  metadata: any;
  name: string;
  labels: string[];
  kind: IntegrationSourceKind;
  created: Date;
}
