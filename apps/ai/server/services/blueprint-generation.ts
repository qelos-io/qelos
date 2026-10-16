import {
  BlueprintPropertyType,
  CRUDOperation,
  EntityIdentifierMechanism,
  PermissionScope,
} from '@qelos/global-types';

export const MAX_GENERATED_BLUEPRINTS = 10;

export interface BlueprintPlanItem {
  identifier: string;
  name: string;
  purpose: string;
  relatesTo: string[];
}

const PROPERTY_TYPES = Object.values(BlueprintPropertyType) as string[];
const SCOPES = Object.values(PermissionScope) as string[];
const OPERATIONS = Object.values(CRUDOperation) as string[];

/** Models wrap JSON in ```json fences or add a sentence around it - take the first complete JSON value. */
export function extractJson(text: string): unknown {
  const source = String(text ?? '')
    .replace(/```(?:json)?/gi, '')
    .trim();

  const start = source.search(/[\[{]/);
  if (start === -1) throw new Error('no JSON found in the AI response');

  const open = source[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) return JSON.parse(source.slice(start, i + 1));
  }
  throw new Error('the AI response ended in the middle of the JSON');
}

/** `Project Tasks` / `projectTasks` / `project-tasks` -> `project_tasks`, the shape of every blueprint identifier. */
export function toIdentifier(value: unknown): string {
  return String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

/** Blueprint identifiers and names are singular ("invoice", not "invoices"). Only unambiguous endings are touched. */
export function toSingular(identifier: string): string {
  if (/(ss|us|is)$/.test(identifier)) return identifier;
  if (/ies$/.test(identifier) && identifier.length > 4) return identifier.replace(/ies$/, 'y');
  if (/(ch|sh|x|z|ss)es$/.test(identifier)) return identifier.replace(/es$/, '');
  if (/[^s]s$/.test(identifier)) return identifier.replace(/s$/, '');
  return identifier;
}

export function toPropertyKey(value: unknown): string {
  const plain = String(value ?? '').trim();
  if (/^[a-z][a-zA-Z0-9]*$/.test(plain)) return plain;
  const words = String(value ?? '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '';
  const key = words
    .map((word, index) =>
      index === 0 && /^[a-z0-9]+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join('');
  const camel = key.charAt(0).toLowerCase() + key.slice(1);
  return /^[0-9]/.test(camel) ? `_${camel}` : camel;
}

/** The plan is a JSON array; fall back to the bulleted list older prompts produced. */
export function parseBlueprintPlan(text: string): BlueprintPlanItem[] {
  let rawItems: any[] = [];
  try {
    const parsed = extractJson(text) as any;
    rawItems = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.blueprints) ? parsed.blueprints : [];
  } catch {
    rawItems = String(text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^([-*•]|\d+[.)])\s+/.test(line))
      .map((line) => {
        const body = line.replace(/^([-*•]|\d+[.)])\s+/, '').replace(/\*\*/g, '');
        const [name, ...rest] = body.split(/\s+[-–—:]\s+|:\s+/);
        return { name: name.trim(), purpose: rest.join(' - ').trim() };
      });
  }

  const seen = new Set<string>();
  const plan: BlueprintPlanItem[] = [];
  for (const item of rawItems) {
    const name = String(item?.name ?? item?.identifier ?? '').trim();
    const identifier = toSingular(toIdentifier(item?.identifier || name));
    if (!identifier || seen.has(identifier)) continue;
    seen.add(identifier);
    plan.push({
      identifier,
      name: toSingularName(name || identifier),
      purpose: String(item?.purpose ?? item?.description ?? '').trim(),
      relatesTo: (Array.isArray(item?.relatesTo) ? item.relatesTo : []).map((id: unknown) => toSingular(toIdentifier(id))).filter(Boolean),
    });
    if (plan.length >= MAX_GENERATED_BLUEPRINTS) break;
  }
  return plan;
}

function toSingularName(name: string): string {
  const words = name.split(/\s+/);
  const last = words.pop() ?? '';
  const singular = toSingular(last.toLowerCase());
  const restored = last[0] === last[0]?.toUpperCase() ? singular.charAt(0).toUpperCase() + singular.slice(1) : singular;
  return [...words, restored].join(' ').trim();
}

const ROLES = ['admin', 'user'];
const WORKSPACE_ROLES = ['admin', 'member'];

export function defaultPermissions(scope: string = PermissionScope.USER) {
  const grant = (operation: string, permissionScope: string, workspaceRoleBased = WORKSPACE_ROLES) => ({
    operation,
    scope: permissionScope,
    guest: false,
    roleBased: ROLES,
    workspaceRoleBased,
    workspaceLabelsBased: ['*'],
  });
  return [
    grant(CRUDOperation.CREATE, PermissionScope.USER),
    grant(CRUDOperation.READ, scope),
    grant(CRUDOperation.UPDATE, PermissionScope.USER),
    grant(CRUDOperation.UPDATE, PermissionScope.WORKSPACE, ['admin']),
    grant(CRUDOperation.DELETE, PermissionScope.USER),
    grant(CRUDOperation.DELETE, PermissionScope.WORKSPACE, ['admin']),
  ];
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()) : [];

function normalizeProperty(key: string, raw: any) {
  const type = PROPERTY_TYPES.includes(raw?.type) ? raw.type : BlueprintPropertyType.STRING;
  const property: Record<string, unknown> = {
    title: String(raw?.title || '').trim() || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
    type,
    description: String(raw?.description ?? '').trim(),
    required: raw?.required === true,
  };
  const enumValues = asStringArray(raw?.enum);
  if (enumValues.length && type === BlueprintPropertyType.STRING) property.enum = enumValues;
  if (raw?.multi === true) property.multi = true;
  if (type === BlueprintPropertyType.NUMBER) {
    if (Number.isFinite(raw?.min)) property.min = raw.min;
    if (Number.isFinite(raw?.max)) property.max = raw.max;
  }
  if (type === BlueprintPropertyType.OBJECT && raw?.schema && typeof raw.schema === 'object') property.schema = raw.schema;
  return property;
}

/**
 * Turns whatever the model returned into a blueprint the API accepts:
 * valid enums, singular snake_case identifier, camelCase property keys, relations only to blueprints
 * of this batch (or itself) through a property that exists, and the platform's default permissions.
 */
export function normalizeBlueprint(raw: any, knownIdentifiers: string[], planned?: BlueprintPlanItem) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('the AI response is not a blueprint object');

  const identifier = toSingular(toIdentifier(planned?.identifier || raw.identifier || raw.name));
  if (!identifier) throw new Error('the blueprint has no identifier');

  const properties: Record<string, any> = {};
  for (const [rawKey, rawProperty] of Object.entries<any>(raw.properties || {})) {
    const key = toPropertyKey(rawKey);
    if (key && !properties[key]) properties[key] = normalizeProperty(key, rawProperty);
  }
  if (!Object.keys(properties).length) {
    properties.title = normalizeProperty('title', { title: 'Title', type: 'string', description: `The title of the ${identifier}`, required: true });
  }

  const targets = new Set([...knownIdentifiers, identifier]);
  const seenKeys = new Set<string>();
  const relations = (Array.isArray(raw.relations) ? raw.relations : [])
    .map((relation: any) => ({ key: toPropertyKey(relation?.key), target: toSingular(toIdentifier(relation?.target)) }))
    .filter((relation: { key: string; target: string }) => {
      if (!properties[relation.key] || !targets.has(relation.target) || seenKeys.has(relation.key)) return false;
      seenKeys.add(relation.key);
      return true;
    });
  // a relation lives in a string property that holds the related entity's id
  for (const relation of relations) properties[relation.key].type = BlueprintPropertyType.STRING;

  const permissionScope = SCOPES.includes(raw.permissionScope) ? raw.permissionScope : PermissionScope.USER;
  const permissions = (Array.isArray(raw.permissions) ? raw.permissions : [])
    .filter((permission: any) => OPERATIONS.includes(permission?.operation) && SCOPES.includes(permission?.scope))
    .map((permission: any) => ({
      operation: permission.operation,
      scope: permission.scope,
      guest: permission.guest === true,
      roleBased: asStringArray(permission.roleBased),
      workspaceRoleBased: asStringArray(permission.workspaceRoleBased),
      workspaceLabelsBased: asStringArray(permission.workspaceLabelsBased),
    }));

  const updateMapping =
    raw.updateMapping && typeof raw.updateMapping === 'object' && !Array.isArray(raw.updateMapping)
      ? Object.fromEntries(Object.entries(raw.updateMapping).filter(([, value]) => typeof value === 'string' && value.trim()))
      : {};

  const limitations = (Array.isArray(raw.limitations) ? raw.limitations : [])
    .filter((limitation: any) => SCOPES.includes(limitation?.scope) && Number.isFinite(limitation?.value))
    .map((limitation: any) => ({
      scope: limitation.scope,
      workspaceLabels: asStringArray(limitation.workspaceLabels),
      roles: asStringArray(limitation.roles),
      properties: asStringArray(limitation.properties).filter((key) => properties[key]),
      value: limitation.value,
    }));

  return {
    identifier,
    name: String(planned?.name || raw.name || identifier).trim(),
    description: String(raw.description || planned?.purpose || '').trim(),
    entityIdentifierMechanism: EntityIdentifierMechanism.OBJECT_ID,
    permissionScope,
    permissions: permissions.length ? permissions : defaultPermissions(permissionScope),
    properties,
    updateMapping,
    relations,
    limitations,
    dispatchers: {
      create: raw.dispatchers?.create === true,
      update: raw.dispatchers?.update === true,
      delete: raw.dispatchers?.delete === true,
    },
  };
}
