export const PopulateSource = {
  user: 'user',
  workspace: 'workspace',
  blueprintEntity: 'blueprintEntity',
  blueprintEntities: 'blueprintEntities',
  vectorStores: 'vectorStores',
  apiWebhook: 'apiWebhook'
} as const;

export type PopulateSource = typeof PopulateSource[keyof typeof PopulateSource];

export interface IDataManipulationStep {
  map: Record<string, string> // JQ expressions to be assigned to the key
  // populate data from given object using qelos source. If blueprint is provided, it will be used to fetch the blueprint entity
  populate: Record<string, { 
    source: PopulateSource; 
    blueprint?: string;
    scope?: string;
    subjectId?: string;
    integration?: string
  }>,
  clean?: boolean,
  abort?: boolean | string
}

export interface IIntegration {
  _id: string;
  tenant: string;
  plugin?: string;
  active?: boolean;
  user: string;
  kind: string[];
  trigger: IIntegrationEntity;
  target: IIntegrationEntity;
  dataManipulation: IDataManipulationStep[]
  created: Date;
}

export interface IIntegrationEntity {
  source: string;
  operation: string;
  details: any;
}
