export interface IScreenRequirement {
  key: string,
  fromHTTP?: {
    uri: string,
    method: string,
    query?: any,
  },
  fromCrud?: {
    name: string,
    identifier?: string,
    query?: any,
  },
  fromBlueprint?: {
    name: string,
    identifier?: string,
    query?: any,
  },
  fromData?: any;
}