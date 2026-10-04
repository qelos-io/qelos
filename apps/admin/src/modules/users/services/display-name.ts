import type { IUser } from '@/modules/core/store/types/user';

function decode(value?: string) {
  try {
    return decodeURIComponent(value ?? '');
  } catch {
    return value ?? '';
  }
}

export function getUserDisplayName(user: Partial<Pick<IUser, 'fullName' | 'firstName' | 'lastName' | 'username' | 'email'>>): string {
  if (user.fullName) return decode(user.fullName);
  const name = `${decode(user.firstName)} ${decode(user.lastName)}`.trim();
  return name || user.username || user.email || '';
}
