const STORAGE_KEY = 'magic_tournament_access_ok';

export function isAccessGateEnabled(): boolean {
  const t = import.meta.env.VITE_APP_ACCESS_TOKEN;
  return typeof t === 'string' && t.trim().length > 0;
}

export function getExpectedAccessToken(): string {
  const t = import.meta.env.VITE_APP_ACCESS_TOKEN;
  return typeof t === 'string' ? t.trim() : '';
}

export function isAccessSessionUnlocked(): boolean {
  if (!isAccessGateEnabled()) {
    return true;
  }
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function unlockAccessSession(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAccessSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function tokenMatchesInput(input: string): boolean {
  const expected = getExpectedAccessToken();
  if (!expected) {
    return true;
  }
  return input.trim() === expected;
}
