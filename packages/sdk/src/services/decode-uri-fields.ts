/** Mirrors auth `encodeIfNeeded` — only decodes values that are URI-encoded. */
export function decodeIfNeeded(value?: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (encodeURIComponent(decoded) === value) {
      return decoded;
    }
  } catch {
    // not a valid encoded URI component
  }

  return value;
}

const ME_USER_STRING_FIELDS = ['name', 'fullName', 'firstName', 'lastName'] as const;

/** Decodes URI-encoded user fields returned by `GET/POST /api/me`. */
export function decodeMeUser<T extends Record<string, unknown>>(user: T): T {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const result = { ...user };

  for (const field of ME_USER_STRING_FIELDS) {
    const value = result[field];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[field] = decodeIfNeeded(value);
    }
  }

  const workspace = result.workspace;
  if (workspace && typeof workspace === 'object' && !Array.isArray(workspace)) {
    const ws = workspace as Record<string, unknown>;
    if (typeof ws.name === 'string') {
      (result as Record<string, unknown>).workspace = {
        ...ws,
        name: decodeIfNeeded(ws.name),
      };
    }
  }

  return result;
}
