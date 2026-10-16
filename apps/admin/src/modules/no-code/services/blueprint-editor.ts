import {
  BlueprintPropertyType,
  CRUDOperation,
  IBlueprint,
  IBlueprintPropertyDescriptor,
} from '@qelos/global-types';

type Blueprint = Partial<IBlueprint>;

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  [BlueprintPropertyType.STRING]: 'Text',
  [BlueprintPropertyType.NUMBER]: 'Number',
  [BlueprintPropertyType.BOOLEAN]: 'Yes / No',
  [BlueprintPropertyType.DATE]: 'Date',
  [BlueprintPropertyType.TIME]: 'Time',
  [BlueprintPropertyType.DATETIME]: 'Date & time',
  [BlueprintPropertyType.OBJECT]: 'Object',
  [BlueprintPropertyType.FILE]: 'File',
};

export const OPERATIONS: CRUDOperation[] = [
  CRUDOperation.CREATE,
  CRUDOperation.READ,
  CRUDOperation.UPDATE,
  CRUDOperation.DELETE,
];

export interface PropertyRow extends IBlueprintPropertyDescriptor {
  key: string;
}

export function propertyRows(properties: Blueprint['properties']): PropertyRow[] {
  return Object.entries(properties || {}).map(([key, value]) => ({ key, ...value }));
}

/** `Due date` -> `due_date`, the key style the old form produced. */
export function keyFromTitle(title: string): string {
  return String(title ?? '')
    .trim()
    .replace(/ /g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
}

export function uniquePropertyKey(properties: Blueprint['properties'], base: string): string {
  const taken = new Set(Object.keys(properties || {}));
  const root = base || 'property';
  if (!taken.has(root)) return root;
  let index = 2;
  while (taken.has(`${root}_${index}`)) index++;
  return `${root}_${index}`;
}

/** Facts worth showing next to a property in the list; the values are i18n keys or already-formatted text. */
export function describeProperty(property: IBlueprintPropertyDescriptor): { typeLabel: string; facts: string[] } {
  const facts: string[] = [];
  if (property.multi) facts.push('List');
  if (property.type === BlueprintPropertyType.STRING && property.enum?.length) {
    facts.push(property.enum.length <= 3 ? property.enum.join(' / ') : `${property.enum.slice(0, 3).join(' / ')} +${property.enum.length - 3}`);
  }
  if (property.type === BlueprintPropertyType.NUMBER) {
    const { min, max } = property;
    if (min != null && max != null) facts.push(`${min} - ${max}`);
    else if (min != null) facts.push(`≥ ${min}`);
    else if (max != null) facts.push(`≤ ${max}`);
  }
  if (property.type === BlueprintPropertyType.STRING && property.max != null) facts.push(`≤ ${property.max}`);
  return { typeLabel: PROPERTY_TYPE_LABELS[property.type] || String(property.type), facts };
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Renames a property and everything that points at it (links, calculated fields, limits), keeping the order. */
export function renameProperty(blueprint: Blueprint, oldKey: string, newKey: string): Blueprint {
  if (!newKey || newKey === oldKey || !blueprint.properties?.[oldKey] || blueprint.properties[newKey]) return blueprint;
  const reference = new RegExp(`(\\.metadata\\.)${escapeRegExp(oldKey)}(?![A-Za-z0-9_])`, 'g');
  return {
    ...blueprint,
    properties: Object.fromEntries(Object.entries(blueprint.properties).map(([key, value]) => [key === oldKey ? newKey : key, value])),
    relations: (blueprint.relations || []).map((relation) => (relation.key === oldKey ? { ...relation, key: newKey } : relation)),
    updateMapping: Object.fromEntries(
      Object.entries(blueprint.updateMapping || {}).map(([key, value]) => [key === oldKey ? newKey : key, String(value).replace(reference, `$1${newKey}`)]),
    ),
    limitations: (blueprint.limitations || []).map((limitation) => ({
      ...limitation,
      properties: (limitation.properties || []).map((key) => (key === oldKey ? newKey : key)),
    })),
  };
}

export function removeProperty(blueprint: Blueprint, key: string): Blueprint {
  const { [key]: _removed, ...properties } = blueprint.properties || {};
  const { [key]: _mapping, ...updateMapping } = blueprint.updateMapping || {};
  return {
    ...blueprint,
    properties,
    relations: (blueprint.relations || []).filter((relation) => relation.key !== key),
    updateMapping,
    limitations: (blueprint.limitations || []).map((limitation) => ({
      ...limitation,
      properties: (limitation.properties || []).filter((item) => item !== key),
    })),
  };
}

export function getPropertyLink(blueprint: Blueprint, key: string): string | undefined {
  return blueprint.relations?.find((relation) => relation.key === key)?.target;
}

/** A link is a relation on a property; `null` removes it. A linked property always holds the other entity's id (text). */
export function setPropertyLink(blueprint: Blueprint, key: string, target: string | null): Blueprint {
  const others = (blueprint.relations || []).filter((relation) => relation.key !== key);
  if (!target) return { ...blueprint, relations: others };
  const properties = { ...blueprint.properties };
  if (properties[key]) properties[key] = { ...properties[key], type: BlueprintPropertyType.STRING };
  return { ...blueprint, properties, relations: [...others, { key, target }] };
}

export function summarizeBlueprint(blueprint: Blueprint) {
  return {
    properties: Object.keys(blueprint.properties || {}).length,
    links: (blueprint.relations || []).length,
    rules: (blueprint.permissions || []).length,
    calculated: Object.keys(blueprint.updateMapping || {}).length,
    events: Object.values(blueprint.dispatchers || {}).filter(Boolean).length,
    limits: (blueprint.limitations || []).length,
  };
}

/** Roles, workspace roles and workspace labels other blueprints already use, so the editor can suggest them. */
export function collectVocabulary(blueprints: Blueprint[] | undefined) {
  const roles = new Set(['admin', 'user']);
  const workspaceRoles = new Set(['admin', 'member']);
  const workspaceLabels = new Set(['*']);
  for (const blueprint of blueprints || []) {
    for (const permission of blueprint.permissions || []) {
      (permission.roleBased || []).forEach((role) => roles.add(role));
      (permission.workspaceRoleBased || []).forEach((role) => workspaceRoles.add(role));
      (permission.workspaceLabelsBased || []).forEach((label) => workspaceLabels.add(label));
    }
    for (const limitation of blueprint.limitations || []) {
      (limitation.roles || []).forEach((role) => roles.add(role));
      (limitation.workspaceLabels || []).forEach((label) => workspaceLabels.add(label));
    }
  }
  const sorted = (set: Set<string>) => [...set].filter(Boolean).sort((a, b) => (a === '*' ? -1 : b === '*' ? 1 : a.localeCompare(b)));
  return { roles: sorted(roles), workspaceRoles: sorted(workspaceRoles), workspaceLabels: sorted(workspaceLabels) };
}

/** A rule only matches users through a role or a workspace role (`*` for any), unless it is for guests. */
export function ruleMatchesNobody(permission: Partial<NonNullable<Blueprint['permissions']>[number]>): boolean {
  if (permission.guest) return false;
  return !(permission.roleBased?.length || permission.workspaceRoleBased?.length);
}

export function groupPermissions(permissions: Blueprint['permissions']) {
  const list = permissions || [];
  return OPERATIONS.map((operation) => ({
    operation,
    rules: list.map((permission, index) => ({ permission, index })).filter(({ permission }) => permission.operation === operation),
  }));
}

export interface EditorIssue {
  section: 'properties' | 'access' | 'automation' | 'limits' | 'settings';
  message: string;
}

/** What blocks a save; messages are i18n keys. */
export function validateBlueprint(blueprint: Blueprint, isNew: boolean): EditorIssue[] {
  const issues: EditorIssue[] = [];
  if (!String(blueprint.name ?? '').trim()) issues.push({ section: 'settings', message: 'Give the blueprint a name first' });
  if (isNew && !/^[a-z0-9_]+$/.test(String(blueprint.identifier ?? ''))) {
    issues.push({ section: 'settings', message: 'The identifier can only use lowercase letters, numbers and underscores' });
  }
  for (const [key, property] of Object.entries(blueprint.properties || {})) {
    if (!key.trim() || !String(property.title ?? '').trim()) {
      issues.push({ section: 'properties', message: 'Every property needs a title' });
      break;
    }
  }
  for (const relation of blueprint.relations || []) {
    if (!relation.target) {
      issues.push({ section: 'properties', message: 'A linked property needs a blueprint to point at' });
      break;
    }
  }
  for (const [key, value] of Object.entries(blueprint.updateMapping || {})) {
    if (!key.trim() || !String(value).trim()) {
      issues.push({ section: 'automation', message: 'A calculated field needs both a property and a calculation' });
      break;
    }
  }
  for (const permission of blueprint.permissions || []) {
    if (!permission.operation) {
      issues.push({ section: 'access', message: 'Every permission rule needs an action' });
      break;
    }
  }
  return issues;
}
