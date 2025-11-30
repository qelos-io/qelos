export function formatTitle(value) {
  return (value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function toIdentifier(collectionName) {
  const sanitized = (collectionName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized || `collection_${Date.now()}`;
}

export function ensureSingular(value = '') {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  if (lower.endsWith('ies')) {
    return normalized.slice(0, -3) + normalized.slice(-3).replace(/ies$/i, 'y');
  }

  if (/(sses|xes|zes|ches|shes)$/i.test(lower)) {
    return normalized.slice(0, -2);
  }

  if (lower.endsWith('s') && !lower.endsWith('ss')) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

export function detectBlueprintType(value) {
  if (value === null || value === undefined) {
    return 'string';
  }

  if (value instanceof Date) {
    return 'datetime';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'object') {
    if (value?._bsontype === 'ObjectId') {
      return 'string';
    }
    return 'object';
  }

  return 'string';
}

export function mapBlueprintTypeToJsonSchema(type) {
  switch (type) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}
