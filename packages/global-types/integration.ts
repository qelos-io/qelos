export interface IDataManipulationStep {
  map: Record<string, string> // JQ expressions to be assigned to the key
  // populate data from given object using qelos source. If blueprint is provided, it will be used to fetch the blueprint entity
  populate: Record<string, { source: 'user' | 'workspace' | 'blueprintEntity'; blueprint?: string; }>
}

export interface IIntegration {
  _id: string;
  tenant: string;
  plugin?: string;
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
