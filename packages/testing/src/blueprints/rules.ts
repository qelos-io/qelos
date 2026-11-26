import { generateId } from '../state/ids.js';

/**
 * What the data service accepts as a blueprint and how it stores it: `apps/no-code/server/controllers/blueprints.ts`,
 * its model, and the rules of `indexed` properties (`services/entity-indexes.service.ts`).
 */

type Values = Record<string, any>;

/** the fields of a blueprint a request may set; anything else is dropped */
export const BLUEPRINT_FIELDS = ['identifier', 'name', 'description', 'entityIdentifierMechanism', 'limitations', 'permissions', 'permissionScope', 'properties', 'relations', 'updateMapping', 'dispatchers'];

const SCOPES = ['user', 'workspace', 'tenant'];
const OPERATIONS = ['create', 'read', 'update', 'delete'];
const MECHANISMS = ['objectid', 'guid'];
const NOT_INDEXABLE = ['object', 'file'];
const MAX_INDEXED = 5;
const BOOLEANS = new Map<unknown, boolean>([
  [true, true], ['true', true], [1, true], ['1', true], ['yes', true],
  [false, false], ['false', false], [0, false], ['0', false], ['no', false],
]);

const isObject = (value: unknown): value is Values => !!value && typeof value === 'object' && !Array.isArray(value);

/** a property is kept when it has a title and a type, with the settings the service knows */
export function validProperties(properties: unknown): Values {
  return Object.fromEntries(
    Object.entries((properties || {}) as Values)
      .filter(([, property]) => property && property.title && property.type)
      .map(([key, { title, type, required, multi, min, max, enum: values, description, schema, indexed }]) => [
        key,
        {
          title,
          description: description || '',
          type: typeof type === 'string' ? type : 'string',
          required: !!required,
          multi: !!multi,
          ...(indexed === true ? { indexed } : {}),
          ...(min !== undefined ? { min } : {}),
          ...(max !== undefined ? { max } : {}),
          ...(values !== undefined ? { enum: values } : {}),
          ...(type === 'object' && schema !== undefined ? { schema } : {}),
        },
      ]),
  );
}

/** why the `indexed` properties are refused, or undefined */
export function indexedError(properties: Values | undefined): string | undefined {
  const flagged = Object.entries(properties || {}).filter(([, property]) => property?.indexed);
  const invalid = flagged.find(([key, property]) => NOT_INDEXABLE.includes(property.type) || key.includes('.') || key.startsWith('$'));
  if (invalid) {
    return `property "${invalid[0]}" cannot be indexed (objects, files and keys with "." or a leading "$" are not supported)`;
  }
  return flagged.length > MAX_INDEXED ? `at most ${MAX_INDEXED} properties of a blueprint can be indexed` : undefined;
}

class Refused extends Error {}
const refuse = (): never => {
  throw new Refused();
};
const text = (value: unknown) => (['string', 'number', 'boolean'].includes(typeof value) ? String(value) : refuse());
const requiredText = (value: unknown) => text(value) || refuse();
const oneOf = (value: unknown, allowed: string[]) => (allowed.includes(value as string) ? value : refuse());
const boolean = (value: unknown) => BOOLEANS.get(value) ?? refuse();
const strings = (value: unknown) => (value === undefined || value === null ? [] : ([] as unknown[]).concat(value).map(text));
const optional = (item: Values, key: string, read: (value: unknown) => unknown) =>
  item[key] === undefined || item[key] === null ? {} : { [key]: read(item[key]) };

/** a list of sub-documents, each with an id */
const list = (value: unknown, read: (item: Values) => Values) =>
  value === undefined || value === null
    ? []
    : ([] as unknown[]).concat(value).map((item) => (isObject(item) ? { ...read(item), _id: item._id ?? generateId() } : refuse()));

function document(fields: Values): Values {
  const { updateMapping, properties, dispatchers = {} } = fields;
  return {
    identifier: requiredText(fields.identifier),
    name: requiredText(fields.name),
    ...optional(fields, 'description', text),
    entityIdentifierMechanism: fields.entityIdentifierMechanism === undefined ? 'objectid' : oneOf(fields.entityIdentifierMechanism, MECHANISMS),
    ...optional(fields, 'permissionScope', (value) => oneOf(value, SCOPES)),
    permissions: list(fields.permissions, (p) => ({
      ...optional(p, 'scope', (value) => oneOf(value, SCOPES)),
      ...optional(p, 'operation', (value) => oneOf(value, OPERATIONS)),
      guest: p.guest === undefined ? false : boolean(p.guest),
      roleBased: strings(p.roleBased),
      workspaceRoleBased: strings(p.workspaceRoleBased),
      workspaceLabelsBased: strings(p.workspaceLabelsBased),
    })),
    limitations: list(fields.limitations, (l) => ({
      scope: oneOf(l.scope, SCOPES),
      value: l.value !== null && l.value !== '' && Number.isFinite(Number(l.value)) ? Number(l.value) : refuse(),
      workspaceLabels: strings(l.workspaceLabels),
      roles: strings(l.roles),
      properties: strings(l.properties),
    })),
    relations: list(fields.relations, (r) => ({ ...optional(r, 'key', text), ...optional(r, 'target', text) })),
    properties: properties ?? {},
    // an empty mapping is not stored
    ...(isObject(updateMapping) && Object.keys(updateMapping).length ? { updateMapping } : {}),
    dispatchers: Object.fromEntries(
      ['create', 'update', 'delete'].map((event) => [event, dispatchers?.[event] === undefined ? false : boolean(dispatchers[event])]),
    ),
  };
}

/** the blueprint as it is stored, or undefined when the database would refuse it */
export function blueprintDocument(fields: Values): Values | undefined {
  try {
    return document(fields);
  } catch (e) {
    if (e instanceof Refused) return undefined;
    throw e;
  }
}
