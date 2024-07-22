export interface IScreenRequirement {
  key: string,
  fromHTTP?: {
    uri: string,
    method: string,
  },
  fromCrud?: {
    name: string,
    identifier?: string,
  },
  fromBlueprint?: {
    name: string,
    identifier?: string,
  },
  fromData?: any;
}