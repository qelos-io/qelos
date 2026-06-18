export interface NormalizeEmailUsernameResult {
  valid: boolean;
  username: string;
  error: string;
}

export function normalizeEmailUsername(username: unknown): NormalizeEmailUsernameResult {
  if (!username || typeof username !== 'string') {
    return { valid: false, username: '', error: 'username is required' };
  }
  const normalized = username.toLowerCase().trim().replace(/ /g, '+');
  if (!normalized.includes('@')) {
    return { valid: false, username: '', error: 'username should be an email address' };
  }
  return { valid: true, username: normalized, error: '' };
}
