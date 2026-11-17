export const DEFAULT_LIMIT = 1000;

export interface PaginationResult {
  limit?: number;
  skip?: number;
}

/**
 * Resolves `$limit`, `$skip` (offset) and `$page` (1-based) query params into mongo limit/skip.
 * When both `$skip` and `$page` are sent, `$skip` wins and `$page` is ignored.
 * Any paging param without `$limit` falls back to DEFAULT_LIMIT.
 */
export function getPagination(rawQuery: { $limit?: any; $skip?: any; $page?: any }): PaginationResult {
  const limit = rawQuery.$limit ? (parseInt(rawQuery.$limit) || DEFAULT_LIMIT) : undefined;
  const hasSkip = rawQuery.$skip !== undefined && rawQuery.$skip !== null && rawQuery.$skip !== '';
  const hasPage = !!rawQuery.$page;

  if (hasSkip) {
    return {
      limit: limit || DEFAULT_LIMIT,
      skip: Math.max(parseInt(rawQuery.$skip) || 0, 0),
    };
  }
  if (hasPage) {
    const page = Math.max(parseInt(rawQuery.$page) || 1, 1);
    const effectiveLimit = limit || DEFAULT_LIMIT;
    return { limit: effectiveLimit, skip: (page - 1) * effectiveLimit };
  }
  return { limit, skip: undefined };
}
