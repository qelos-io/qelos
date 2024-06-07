export interface IPluginCrud {
  name: string,
  display: {
    name: string;
    plural: string;
    capitalized: string;
    capitalizedPlural: string;
  },
  identifierKey: string;
  schema: any;
}